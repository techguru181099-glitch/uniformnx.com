const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../model/payment");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const options = {
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      razorpay_order_id: order.id,
      amount: Number(amount),
      currency: order.currency,
      receipt: order.receipt,
      status: "created",
    });

    return res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Order creation failed",
      error: error.message,
    });
  }
});

// Verify Payment
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpay_order_id },
        {
          razorpay_payment_id,
          razorpay_signature,
          status: "failed",
        }
      );

      return res.status(400).json({
        success: false,
        message: "Invalid signature, payment verification failed",
      });
    }

    await Payment.findOneAndUpdate(
      { razorpay_order_id },
      {
        razorpay_payment_id,
        razorpay_signature,
        status: "paid",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
});

module.exports = router;