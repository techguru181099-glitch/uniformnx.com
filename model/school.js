const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: String,
    email: { type: String, trim: true, lowercase: true },
    phone: String,
    city: String,
    state: String,
    isActive: { type: Boolean, default: true }, // ✅ Active field
    createdAt: { type: Date, default: Date.now },
    schoolCode: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("School", schoolSchema);
