const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true }, // 👈 Ye add karna zaroori hai


  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  username: { 
    type: String, 
    required: true, 
    unique: true 
  },

  password: { 
    type: String, 
    required: true 
  },
  phone: String,
  city: String,
  state: String,

  phone: String,
  address: String,
  city: String,
  state: String,

  role: { 
    type: String, 
    enum: ["admin", "staff", "parent"], 
    default: "parent" 
  },
  status: {
  type: String,
  enum: ["active", "inactive"],
  default: "active"
},
  permissions: [String],

  permissions: [String],

  otp: String,
  otpExpire: Date
});

const User = mongoose.model("Users", userSchema);


module.exports = User;
