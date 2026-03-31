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

/* ================= 1. PLACE ORDER & AUTO-FILL LOGIC ================= */
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
        return res.status(404).json({ message: `Uniform ${item.name} not found` });
      }

      if (uniform.stock < item.quantity) {
        return res.status(400).json({ message: `${uniform.name} is out of stock` });
      }

      // Stock reduction logic
      uniform.stock -= item.quantity;
      if (uniform.stock <= 0) {
        uniform.isAvailable = false;
        uniform.stock = 0;
      }
      await uniform.save();

      const price = uniform.price || 0;
      totalAmount += price * item.quantity;

      formattedItems.push({
        uniformId: uniform._id,
        name: uniform.name,
        price,
        quantity: item.quantity,
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

    // ⭐ Auto-fill: Update Parent profile with latest info
    await ParentModel.findByIdAndUpdate(parentId, {
      $set: { address, bankDetails }
    });

    // ⭐ Clear Cart
    await CartModel.deleteMany({ parentId });

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 2. ADMIN: GET ALL ORDERS ================= */
O_router.get("/admin/orders", async (req, res) => {
  try {
    const orders = await OrderModel.find()
      .populate("items.uniformId", "image name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 3. USER: GET ORDERS BY PARENT ================= */
O_router.get("/parent/:parentId", async (req, res) => {
  try {
    const orders = await OrderModel.find({ parentId: req.params.parentId })
      .populate("items.uniformId", "name image description price")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 4. GET SINGLE ORDER DETAILS ================= */
O_router.get("/single/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate("items.uniformId", "image name price description gender season")
      .populate("parentId", "name email mobile");

    if (!order) return res.status(404).json({ success: false, message: "Order nahi mila" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= 5. UPDATE ORDER STATUS & DROPON API ================= */
O_router.put("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await OrderModel.findById(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Dropon API Integration
    if (status === "Shipped" && !order.droponOrderId) {
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
            { headers: { Authorization: `Bearer ${DROPON_TOKEN}` }, timeout: 10000 }
          );
          if (response.data?.orderId) order.droponOrderId = response.data.orderId;
        }
      } catch (apiErr) {
        console.log("Dropon API Error Bypassed:", apiErr.message);
      }
    }

    order.status = status;
    await order.save();
    res.json({ success: true, message: `Status updated to ${status}`, order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update Failed: Check Status Enum" });
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

/* ================= 7. CANCEL / RETURN / DELETE ================= */
O_router.put("/cancel/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order || order.status !== "Pending") {
      return res.status(400).json({ message: "Cannot cancel order at this stage." });
    }
    order.status = "Cancelled";
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

O_router.put("/return/:id", async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await OrderModel.findById(req.params.id);
    if (!order || order.status !== "Delivered") {
      return res.status(400).json({ message: "Return only allowed after delivery." });
    }
    order.status = "Return Requested";
    order.returnReason = reason;
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

O_router.delete("/delete/:id", async (req, res) => {
  try {
    await OrderModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 8. SCHOOL WISE ORDERS (Admin) ================= */
O_router.get("/school-orders/:schoolName", async (req, res) => {
  try {
    const orders = await OrderModel.find({
      schoolName: { $regex: new RegExp(`^${req.params.schoolName}$`, "i") },
    }).sort({ createdAt: -1 });
    res.json(orders || []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = O_router;
