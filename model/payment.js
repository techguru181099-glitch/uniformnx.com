const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    razorpay_order_id: {
      type: String,
      required: true,
      unique: true,
    },
    razorpay_payment_id: {
      type: String,
      default: null,
    },
    razorpay_signature: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    receipt: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);