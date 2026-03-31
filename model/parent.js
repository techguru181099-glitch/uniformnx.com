const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  childName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  
  // ✨ Nayi Fields Jo Save Hongi
  className: { type: String, default: "" }, 
  gender: { type: String, default: "" },
  house: { type: String, default: "Any" },
  season: { type: String, default: "Any" },

  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
  },
  loginOtp: String,
  loginOtpExpires: Date,
  active: { type: Boolean, default: true },
  savedAddress: String,
  city: String,
  pincode: String,
  bankDetails: {
    accountName: String,
    bankName: String,
    accountNumber: String,
    ifsc: String
  }
}, { timestamps: true });

module.exports = mongoose.model("Parent", parentSchema);