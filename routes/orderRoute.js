const axios = require('axios');
const DROPON_BASE_URL = process.env.DROPON_BASE_URL?.trim();
const DROPON_TOKEN = process.env.DROPON_TOKEN?.trim();

const express = require("express");
const ParentModel = require("../model/parent");
const OrderModel = require("../model/OrderModel");
const CartModel = require("../model/CartModel");
const UniformModel = require("../model/uniformModel");
const razorpay = require("razorpay");
const crypto = require("crypto");

const O_router = express.Router();

/* ⭐ Razorpay Instance */
const instance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_XXXXXXX",
  key_secret: process.env.RAZORPAY_SECRET || "rzp_test_secret"
});

/* ================= 1. PLACE ORDER ================= */
O_router.post("/order", async (req, res) => {
  try {
    const { parentId, items, deliveryType, address, paymentMethod, bankDetails } = req.body;
    const parentData = await ParentModel.findById(parentId).populate("schoolId");

    if (!parentData) {
      return res.status(404).json({ message: "Parent not found" });
    }

    let totalAmount = 0;
    const formattedItems = [];

    for (const item of items) {
      const uniform = await UniformModel.findById(item.uniformId._id);
      if (!uniform) {
        return res.status(404).json({ message: "Uniform not found" });
      }

      if (uniform.stock < item.quantity) {
        return res.status(400).json({ message: `${uniform.name} is out of stock` });
      }

      // Stock reduction
      uniform.stock = uniform.stock - item.quantity;
      if (uniform.stock === 0) {
        uniform.isAvailable = false;
      }
      await uniform.save();

      const price = uniform.price || 0;
      const qty = item.quantity;
      totalAmount += price * qty;

      formattedItems.push({
        uniformId: uniform._id,
        name: uniform.name,
        price,
        quantity: qty,
        size: item.size,
        childId: item.childId
      });
    }

    const order = new OrderModel({
      parentId,
      parentName: parentData.name,
      schoolName: parentData.schoolId?.name,
      items: formattedItems,
      totalAmount,
      deliveryType,
      address,
      bankDetails,
      paymentMethod,
      paymentStatus: paymentMethod === "Online" ? "Paid" : "Pending",
      status: "Pending"
    });

    await order.save();

    // Auto-fill address update for parent
    await ParentModel.findByIdAndUpdate(parentId, {
      $set: { address, bankDetails }
    });

    // Mark cart as ordered
    await CartModel.updateMany(
      { parentId, status: "active" },
      { $set: { status: "ordered" } }
    );

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 2. GET ALL ORDERS (Admin Main List) ================= */
O_router.get("/admin/orders", async (req, res) => {
  try {
    const orders = await OrderModel.find()
      .populate({
        path: "items.uniformId",
        select: "image name"
      })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 3. UPDATE ORDER STATUS (Fixed Logic) ================= */
/* ================= UPDATE ORDER STATUS (Final Fixed) ================= */
O_router.put("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await OrderModel.findById(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Handle Dropon API
    if ((status === "Shipped" || status === "On the Way") && !order.droponOrderId) {
      try {
        if (DROPON_BASE_URL && DROPON_TOKEN) {
          const response = await axios.post(
            `${DROPON_BASE_URL}v1/order/create`,
            {
              customerName: order.address.name,
              phone: order.address.phone,
              address: order.address.addressLine,
              city: order.address.city,
              pincode: order.address.pincode,
              amount: order.totalAmount
            },
            { 
              headers: { Authorization: `Bearer ${DROPON_TOKEN}` },
              timeout: 10000 // Timeout badha kar 10s kar diya
            }
          );
          if (response.data?.orderId) {
            order.droponOrderId = response.data.orderId;
          }
        }
      } catch (apiErr) {
        console.log("Dropon API Timeout/Error (Bypassed):", apiErr.message);
      }
    }

    // Database Update
    order.status = status;
    await order.save(); // Agar Enum mein 'On the Way' nahi hoga toh yahi line fail hogi
    
    res.json({ success: true, message: `Status updated to ${status}`, order });
  } catch (err) {
    console.error("Critical Update Error:", err.message);
    res.status(500).json({ success: false, message: "Validation Error: Check OrderModel status enum" });
  }
});

/* ================= 4. GET SINGLE ORDER DETAILS ================= */
O_router.get("/single/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate({
        path: "items.uniformId",
        select: "image name price"
      })
      .populate("parentId", "name email mobile");

    if (!order) return res.status(404).json({ success: false, message: "Order nahi mila" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= 5. GET ORDERS BY PARENT (User App) ================= */
O_router.get("/:parentId", async (req, res) => {
  try {
    const orders = await OrderModel.find({ parentId: req.params.parentId })
      .populate({
        path: "items.uniformId",
        select: "image name price" 
      })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 6. PAYMENT VERIFICATION ================= */
O_router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET || "rzp_test_secret")
      .update(body)
      .digest("hex");

    if (expected === razorpay_signature) {
      await OrderModel.findByIdAndUpdate(orderId, { paymentStatus: "Paid" });
      return res.json({ success: true });
    }
    res.status(400).json({ message: "Payment Verification failed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 7. CANCEL / DELETE ROUTES ================= */
O_router.put("/cancel/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "Pending") {
      return res.status(400).json({ message: "Cannot cancel processed order." });
    }
    order.status = "Cancelled";
    await order.save();
    res.json({ success: true, message: "Order cancelled successfully", order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

O_router.delete("/delete/:id", async (req, res) => {
  try {
    const order = await OrderModel.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order already deleted or not found." });
    res.json({ success: true, message: "Order permanently deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = O_router;