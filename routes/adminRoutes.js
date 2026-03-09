const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../model/login");

const U_router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;


// ================= ADMIN LOGIN =================

U_router.post("/login", async (req, res) => {

  try {

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, Email and Password required"
      });
    }

    // username + email + role check
    let admin = await User.findOne({
      username: username,
      email: email,
      role: "admin"
    });

    // ================= FIRST TIME ADMIN CREATE =================

    if (!admin) {

      const hashedPassword = await bcrypt.hash(password, 10);

      admin = new User({
        username,
        email,
        password: hashedPassword,
        role: "admin",

        permissions: [
          "view_parents",
          "view_schools",
          "view_products",
          "view_orders",
          "view_revenue",
          "manage_team"
        ]
      });

      await admin.save();

      console.log("✅ Admin Auto Created");
    }

    // ================= PASSWORD CHECK =================

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect password"
      });
    }

    // ================= TOKEN =================

    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
        username: admin.username,
        email: admin.email
      },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});


// ================= SEND OTP =================

U_router.post("/send-otp", async (req, res) => {

  try {

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Email not found"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"School App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}`
    });

    res.json({
      message: "OTP sent successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});


// ================= VERIFY OTP =================

U_router.post("/verify-otp", async (req, res) => {

  try {

    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Email not found"
      });
    }

    if (user.otp !== otp || user.otpExpire < new Date()) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }

    user.otp = null;
    user.otpExpire = null;
    user.isOtpVerified = true;   // ⭐ IMPORTANT

    await user.save();

    res.json({
      message: "OTP verified"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});


// ================= RESET PASSWORD =================

U_router.post("/reset-password", async (req, res) => {

  try {

    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Email not found"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    res.json({
      message: "Password reset successful"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});


// ================= ADD STAFF =================

U_router.post("/add-staff", async (req, res) => {

  try {

    const {
      fullName,
      email,
      username,
      password,
      phone,
      address,
      city,
      state,
      permissions
    } = req.body;

    const exist = await User.findOne({ username });

    if (exist) {
      return res.status(400).json({
        message: "Username already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = new User({
      fullName,
      email,
      username,
      password: hashedPassword,
      phone,
      address,
      city,
      state,
      role: "staff",
      permissions: permissions || []
    });

    await newStaff.save();

    res.json({
      message: "Staff added successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});


// ================= GET PROFILE =================

U_router.get("/profile/:username", async (req, res) => {

  try {

    const user = await User.findOne({
      username: req.params.username
    }).select("-password -otp -otpExpire");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(user);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});


module.exports = U_router;