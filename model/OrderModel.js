const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
    },

    parentName: String,
    schoolName: String,

    items: [
      {
        uniformId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Uniform",
        },
        name: String,
        price: Number,
        quantity: Number,
      },
    ],

    totalAmount: Number,
    deliveryType: String,

    address: {
      name: String,
      phone: String,
      addressLine: String,
      city: String,
      pincode: String,
    },

    paymentMethod: String,

    paymentStatus: {
      type: String,
      default: "Pending",
    },

    // ⭐ Status mein Enum add kiya taaki fix values hi save ho sakein
    status: {
      type: String,
      default: "Pending",
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Return Requested",
        "Returned",
      ],
    },

    // ⭐ Return ka reason store karne ke liye naya field
    returnReason: {
      type: String,
      default: "",
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },
    droponOrderId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
