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
=======
// O_router.post("/order", async (req,res)=>{

//  try{

//    const { parentId, items, deliveryType, address, paymentMethod } = req.body;

//    const parentData = await ParentModel
//    .findById(parentId)
//    .populate("schoolId");

//    if(!parentData){
//      return res.status(404).json({message:"Parent not found"});
//    }

//    let totalAmount = 0;

//    const formattedItems = items.map(item=>{
//      const price = item.uniformId.price;
//      const qty = item.quantity;

//      totalAmount += price * qty;

//      return {
//        uniformId:item.uniformId._id,
//        name:item.uniformId.name,
//        price,
//        quantity:qty
//      };
//    });

//    const order = new OrderModel({
//      parentId,
//      parentName:parentData.name,
//      schoolName:parentData.schoolId?.name,
//      items:formattedItems,
//      totalAmount,
//      deliveryType,
//      address,
//      paymentMethod,
//      paymentStatus: paymentMethod === "Online" ? "Paid" : "Pending",
//      status:"Pending"
//    });

//    await order.save();

//    /* ⭐ Clear Cart After Order */
//    await CartModel.deleteMany({ parentId });

//    res.json({
//      success:true,
//      orderId:order._id
//    });

//  }catch(err){
//    res.status(500).json(err.message);
//  }

// });
/* ================= PLACE ORDER & SAVE FOR AUTO-FILL ================= */
O_router.post("/order", async (req, res) => {
  try {
    const { parentId, items, deliveryType, address, paymentMethod, bankDetails } = req.body;

    const parentData = await ParentModel.findById(parentId).populate("schoolId");

    if (!parentData) {
      return res.status(404).json({ message: "Parent not found" });
    }

    let totalAmount = 0;
    const formattedItems = items.map(item => {
      const price = item.uniformId.price;
      const qty = item.quantity;
      totalAmount += price * qty;
      return {
        uniformId: item.uniformId._id,
        name: item.uniformId.name,
        price,
        quantity: qty
      };
    });

    const order = new OrderModel({
      parentId,
      parentName: parentData.name,
      schoolName: parentData.schoolId?.name,
      items: formattedItems,
      totalAmount,
      deliveryType,
      address,
      bankDetails, // Bank details saved in Order
      paymentMethod,
      paymentStatus: paymentMethod === "Online" ? "Paid" : "Pending",
      status: "Pending"
    });

    await order.save();

    /* ⭐ Auto-fill Logic: Update Parent Model with latest address and bank details */
    await ParentModel.findByIdAndUpdate(parentId, {
      $set: {
        address: address, // Pura address object save hoga
        bankDetails: bankDetails // Bank details save hongi
      }
    });

    /* ⭐ Clear Cart After Order */
    await CartModel.deleteMany({ parentId });

    res.json({
      success: true,
      orderId: order._id
    });

  } catch (err) {
    res.status(500).json(err.message);
  }
});

/* ================= GET PARENT PROFILE FOR AUTO-FILL ================= */
O_router.get("/parent-profile/:id", async (req, res) => {
  try {
    const parent = await ParentModel.findById(req.params.id);
    if (!parent) return res.status(404).json({ message: "Parent not found" });
    
    // Sirf wahi data bhej rahe hain jo checkout mein chahiye
    res.json({
      name: parent.name,
      phone: parent.phone || parent.mobile, // Aapke schema ke hisab se field name check karein
      address: parent.address,
      bankDetails: parent.bankDetails
    });
  } catch (err) {
    res.status(500).json(err.message);
  }
});
/* ================= GET ORDERS BY PARENT ⭐⭐⭐ (IMPORTANT) */

O_router.get("/:parentId", async (req, res) => {
  try {

    const orders = await OrderModel
      .find({ parentId: req.params.parentId })
      .populate("items.uniformId", "name image description")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    res.status(500).json(err.message);
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

/* ================= GET SINGLE ORDER BY ID (For Admin/User Details) ================= */
O_router.get("/single/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate({
        path: "items.uniformId", // Schema ke hisaab se uniformId ko populate karein
        select: "image description gender season price", // Jo fields chahiye
      })
      .populate("parentId", "name email mobile"); // Parent ki extra details agar chahiye

    if (!order) {
      return res.status(404).json({ success: false, message: "Order nahi mila" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= UPDATE ORDER STATUS ================= */
// Status change karne ke liye (Pending -> Delivered etc.)
O_router.put("/update-status/:id", async (req, res) => {
  try {

    const { status } = req.body;

    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    /* ⭐ Agar status SHIPPED ho raha hai to Dropon API call */
    if (status === "Shipped" && !order.droponOrderId) {
  try {
    const response = await axios.post(
      `${DROPON_BASE_URL}v1/order/create`,  // Already env se aa raha hai
      {
        customerName: order.address.name,
        phone: order.address.phone,
        address: order.address.addressLine,
        city: order.address.city,
        pincode: order.address.pincode,
        amount: order.totalAmount
      },
      {
        headers: {
          Authorization: `Bearer ${DROPON_TOKEN}`  // env se aa raha hai
        }
      }
    );

    order.droponOrderId = response.data.orderId;

  } catch (err) {
    console.log("Dropon API Error:", err.message);
  }
}

    order.status = status;

    await order.save();

    res.json({
      success: true,
      order
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

O_router.get("/track/:orderId", async (req, res) => {
  try {

    const order = await OrderModel.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);   // 👈 पूरा order भेजना है

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// Delete Order
O_router.delete("/delete/:id", async (req, res) => {
  try {
    await OrderModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

O_router.put("/cancel/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Logic: Order sirf tab cancel ho sakta hai jab wo "Pending" ho
    if (order.status !== "Pending") {
      return res.status(400).json({ message: "Order cannot be cancelled after processing/delivery." });
    }

    order.status = "Cancelled";
    await order.save();
    res.json({ success: true, message: "Order cancelled successfully", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 2. RETURN REQUEST (User Side) ================= */
O_router.put("/return/:id", async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await OrderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Logic: Return sirf "Delivered" orders ke liye apply hoga
    if (order.status !== "Delivered") {
      return res.status(400).json({ message: "Return can only be requested after delivery." });
    }

    order.status = "Return Requested";
    order.returnReason = reason;
    await order.save();
    res.json({ success: true, message: "Return request submitted", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= 3. GET INVOICE DATA ================= */
// Ye route order ki puri detail dega invoice print karne ke liye
O_router.get("/invoice/:id", async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate("parentId") // Parent ki contact detail ke liye
      .populate("items.uniformId"); // Uniform ki image/description ke liye

    if (!order) return res.status(404).json({ message: "Invoice not found" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET ORDERS BY SCHOOL NAME ================= */
O_router.get("/school-orders/:schoolName", async (req, res) => {
  try {
    const schoolName = req.params.schoolName;

    // 1. OrderModel use karein (Aapne Order likha tha)
    // 2. Direct orders array return karein jaisa aapka frontend expect kar raha hai
    const orders = await OrderModel.find({
      schoolName: { $regex: new RegExp(`^${schoolName}$`, "i") },
    }).sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json([]); // Khali array bhejein agar order na mile
    }

    res.json(orders); // Direct array bhejein
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = O_router;
