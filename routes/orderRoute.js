const axios = require("axios");
const express = require("express");

const ParentModel = require("../model/parent");
const OrderModel = require("../model/OrderModel");
const CartModel = require("../model/CartModel");
const UniformModel = require("../model/uniformModel");

const O_router = express.Router();

const DROPON_BASE_URL = process.env.DROPON_BASE_URL?.trim();
const DROPON_TOKEN = process.env.DROPON_TOKEN?.trim();

/* ================= 1. PLACE ORDER & SAVE ADDRESS ================= */
O_router.post("/order", async (req, res) => {
  try {
    const {
      parentId,
      items,
      deliveryType,
      address,
      paymentMethod,
      paymentStatus,
      razorpayOrderId,
      razorpayPaymentId,
    } = req.body;

    if (!parentId) {
      return res.status(400).json({ success: false, message: "parentId is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items are required" });
    }

    if (
      !address ||
      !address.name ||
      !address.phone ||
      !address.addressLine ||
      !address.city ||
      !address.pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete address is required",
      });
    }

    const parentData = await ParentModel.findById(parentId).populate("schoolId");

    if (!parentData) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    let totalAmount = 0;
    const formattedItems = [];

    for (const item of items) {
      const uniformId =
        item?.uniformId?._id || item?.uniformId || item?.productId || item?._id;

      if (!uniformId) {
        return res.status(400).json({
          success: false,
          message: "Invalid item data: uniformId missing",
        });
      }

      const uniform = await UniformModel.findById(uniformId);

      if (!uniform) {
        return res.status(404).json({
          success: false,
          message: "Uniform not found",
        });
      }

      if (uniform.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${uniform.name} is out of stock`,
        });
      }

      uniform.stock -= item.quantity;

      if (uniform.stock <= 0) {
        uniform.stock = 0;
        uniform.isAvailable = false;
      }

      await uniform.save();

      const price = uniform.price || 0;
      totalAmount += price * item.quantity;

      formattedItems.push({
        uniformId: uniform._id,
        name: uniform.name,
        price,
        quantity: item.quantity,
        size: item.size || "",
        childId: item.childId || null,
      });
    }

    const finalPaymentMethod = paymentMethod || "COD";
    const finalPaymentStatus =
      paymentStatus ||
      (finalPaymentMethod === "RAZORPAY" ? "Paid" : "Pending");

    const order = new OrderModel({
      parentId,
      parentName: parentData.name,
      schoolName: parentData.schoolId?.name || "",
      items: formattedItems,
      totalAmount,
      deliveryType: deliveryType || "Home Delivery",
      address,
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentStatus,
      razorpayOrderId: razorpayOrderId || "",
      razorpayPaymentId: razorpayPaymentId || "",
      status: "Pending",
    });

    await order.save();

    await ParentModel.findByIdAndUpdate(parentId, {
      $set: { address },
    });

    await CartModel.deleteMany({ parentId });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
      order,
    });
  } catch (err) {
    console.error("Order Create Error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Order creation failed",
    });
  }
});

/* ================= 2. PARENT PROFILE FOR CHECKOUT AUTO-FILL ================= */
O_router.get("/parent-profile/:parentId", async (req, res) => {
  try {
    const parent = await ParentModel.findById(req.params.parentId).select("address");

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    return res.json({
      success: true,
      address: parent.address || {},
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= 3. ADMIN: GET ALL ORDERS ================= */
O_router.get("/admin/orders", async (req, res) => {
  try {
    const orders = await OrderModel.find()
      .populate("items.uniformId", "image name price")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/* ================= 4. USER: GET ORDERS BY PARENT ================= */
O_router.get("/parent/:parentId", async (req, res) => {
  try {
    const orders = await OrderModel.find({ parentId: req.params.parentId })
      .populate("items.uniformId", "name image description price")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/* ================= 5. GET SINGLE ORDER DETAILS ================= */
O_router.get("/single/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate("items.uniformId", "image name price description gender season")
      .populate("parentId", "name email mobile");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order nahi mila",
      });
    }

    return res.json(order);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ================= 6. UPDATE ORDER STATUS & DROPON API ================= */
O_router.put("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (status === "Shipped" && !order.droponOrderId) {
      try {
        if (DROPON_BASE_URL && DROPON_TOKEN) {
          const response = await axios.post(
            `${DROPON_BASE_URL}v1/order/create`,
            {
              customerName: order.address?.name,
              phone: order.address?.phone,
              address: order.address?.addressLine,
              city: order.address?.city,
              pincode: order.address?.pincode,
              amount: order.totalAmount,
            },
            {
              headers: { Authorization: `Bearer ${DROPON_TOKEN}` },
              timeout: 10000,
            }
          );

          if (response.data?.orderId) {
            order.droponOrderId = response.data.orderId;
          }
        }
      } catch (apiErr) {
        console.log("Dropon API Error Bypassed:", apiErr.message);
      }
    }

    order.status = status;
    await order.save();

    return res.json({
      success: true,
      message: `Status updated to ${status}`,
      order,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Update Failed: Check Status Enum",
    });
  }
});

/* ================= 7. CANCEL ORDER ================= */
O_router.put("/cancel/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);

    if (!order || order.status !== "Pending") {
      return res.status(400).json({
        message: "Cannot cancel order at this stage.",
      });
    }

    order.status = "Cancelled";
    await order.save();

    return res.json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/* ================= 8. RETURN ORDER ================= */
O_router.put("/return/:id", async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await OrderModel.findById(req.params.id);

    if (!order || order.status !== "Delivered") {
      return res.status(400).json({
        message: "Return only allowed after delivery.",
      });
    }

    order.status = "Return Requested";
    order.returnReason = reason;
    await order.save();

    return res.json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/* ================= 9. DELETE ORDER ================= */
O_router.delete("/delete/:id", async (req, res) => {
  try {
    await OrderModel.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/* ================= 10. SCHOOL WISE ORDERS (Admin) ================= */
O_router.get("/school-orders/:schoolName", async (req, res) => {
  try {
    const orders = await OrderModel.find({
      schoolName: { $regex: new RegExp(`^${req.params.schoolName}$`, "i") },
    }).sort({ createdAt: -1 });

    return res.json(orders || []);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = O_router;
