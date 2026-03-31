const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: String,
<<<<<<< HEAD
  email: { type: String, unique: true }, // 👈 Ye add karna zaroori hai
=======

  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
<<<<<<< HEAD
=======

>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
  password: { 
    type: String, 
    required: true 
  },
<<<<<<< HEAD
  phone: String,
  city: String,
  state: String,
=======

  phone: String,
  address: String,
  city: String,
  state: String,

>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
  role: { 
    type: String, 
    enum: ["admin", "staff", "parent"], 
    default: "parent" 
  },
<<<<<<< HEAD
  status: {
  type: String,
  enum: ["active", "inactive"],
  default: "active"
},
  permissions: [String],
=======

  permissions: [String],

>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
  otp: String,
  otpExpire: Date
});

const User = mongoose.model("Users", userSchema);
<<<<<<< HEAD
=======

>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
module.exports = User;