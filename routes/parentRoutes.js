const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Parent = require("../model/parent");
const School = require("../model/school");
const history = require("../model/history");
const CartModel = require("../model/CartModel");
const OrderModel = require("../model/OrderModel");

const P_router = express.Router();
const emailPattern = /^[a-z0-9._%+-]+@gmail\.com$/i;
const gmailEmailMessage = "Please enter a valid Gmail address";
const passwordLetterMessage = "Password must contain at least 6 letters";
const hasSixPasswordLetters = (value) => (String(value).match(/[A-Za-z]/g) || []).length >= 6;

/* ================= MAIL ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER || "tejalpurabiya08@gmail.com",
    pass: process.env.EMAIL_PASS || "alspqiopryzoybhe", 
  },
  tls: {
    rejectUnauthorized: false 
  }
});

/* ================= GENERATE OTP ================= */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ================= REGISTER ================= */
P_router.post("/register", async (req, res) => {
  try {
    const { name, childName, email, password, schoolCode, mobile } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedSchoolCode = String(schoolCode || "").trim().toUpperCase();
    const normalizedPassword = String(password || "");

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: gmailEmailMessage });
    }

    if (!hasSixPasswordLetters(normalizedPassword)) {
      return res.status(400).json({ success: false, message: passwordLetterMessage });
    }

    const existing = await Parent.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const school = await School.findOne({ schoolCode: normalizedSchoolCode });
    if (!school) {
      return res.status(400).json({ success: false, message: "Invalid School Code" });
    }

    if (school.isActive === false) {
      return res.status(403).json({ success: false, message: "This school is not active" });
    }

    const hash = await bcrypt.hash(normalizedPassword, 10);
    const parent = new Parent({
      name,
      childName,
      email: normalizedEmail,
      password: hash,
      mobile,
      schoolId: school._id,
      active: true,
    });
    await parent.save();
    res.json({ success: true, message: "Registered Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Registration Failed" });
  }
});

/* ================= LOGIN ================= */
P_router.post("/login", async (req, res) => {
  try {
    const { email, password, schoolCode } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedSchoolCode = String(schoolCode || "").trim().toUpperCase();
    const parent = await Parent.findOne({ email: normalizedEmail }).populate("schoolId");

    if (!parent) return res.status(400).json({ success: false, message: "Invalid Email" });
    if (parent.active === false) {
      return res.status(403).json({ success: false, message: "Account deactivated. Contact admin." });
    }

    const match = await bcrypt.compare(password, parent.password);
    if (!match) return res.status(400).json({ success: false, message: "Incorrect Password" });

    const requestedSchool = await School.findOne({ schoolCode: normalizedSchoolCode });
    if (!requestedSchool) {
      return res.status(400).json({ success: false, message: "Invalid School Code" });
    }

    if (requestedSchool.isActive === false) {
      return res.status(403).json({ success: false, message: "This school is not active" });
    }

    if (parent.schoolId?.schoolCode !== normalizedSchoolCode) {
      return res.status(400).json({ success: false, message: "School Code Not Valid" });
    }

    if (parent.schoolId?.isActive === false) {
      return res.status(403).json({ success: false, message: "This school is not active" });
    }

    res.json({
      success: true,
      parentId: parent._id,
      parentName: parent.name,
      childName: parent.childName,
      schoolId: parent.schoolId?._id,
      schoolName: parent.schoolId?.name,
      schoolCode: parent.schoolId?.schoolCode,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login Failed" });
  }
});

/* ================= FORGOT PASSWORD ================= */
P_router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const parent = await Parent.findOne({ email });
    if (!parent) return res.status(400).json({ success: false, message: "Email not found" });

    const otp = generateOTP();
    await Parent.findByIdAndUpdate(parent._id, { 
      loginOtp: otp, 
      loginOtpExpires: new Date(Date.now() + 5 * 60 * 1000) 
    }, { runValidators: false });

    await transporter.sendMail({
      from: '"EduSupply" <tejalpurabiya08@gmail.com>',
      to: email,
      subject: "Forgot Password OTP",
      text: `Your OTP is: ${otp}`,
    });
    res.json({ success: true, message: "OTP sent successfully ✅" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

/* ================= VERIFY OTP ================= */
P_router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const parent = await Parent.findOne({ email });
    if (!parent || parent.loginOtp !== otp || parent.loginOtpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or Expired OTP" });
    }
    await Parent.findByIdAndUpdate(parent._id, { loginOtp: null, loginOtpExpires: null }, { runValidators: false });
    res.json({ success: true, message: "OTP Verified Successfully", parentId: parent._id });
  } catch (err) {
    res.status(500).json({ success: false, message: "OTP Verification Failed" });
  }
});

/* ================= UPDATE STATUS (FIXED) ================= */
P_router.put("/status/:id", async (req, res) => {
  try {
    const { active } = req.body;
    const updatedParent = await Parent.findByIdAndUpdate(
      req.params.id, 
      { active: active }, 
      { new: true, runValidators: false }
    );
    if (!updatedParent) return res.status(404).json({ success: false, message: "Parent not found" });
    res.json({ success: true, message: `Account ${active ? 'Activated' : 'Deactivated'}`, data: updatedParent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================= GET ALL PARENTS ================= */
P_router.get("/parents", async (req, res) => {
  try {
    const parents = await Parent.find().populate("schoolId", "name schoolCode");
    res.json(parents);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ================= GET SINGLE PARENT ================= */
P_router.get("/parent/:id", async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id).populate("schoolId", "name schoolCode");
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });
    res.json(parent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET SCHOOL CHANGE HISTORY ================= */
P_router.get("/history", async (req, res) => {
  try {
    const records = await history.find()
      .populate("parentId", "name email mobile")
      .populate("oldSchool", "name schoolCode")
      .populate("newSchool", "name schoolCode")
      .sort({ createdAt: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= CHANGE SCHOOL ================= */
P_router.put("/change-school/:id", async (req, res) => {
  try {
    const { schoolCode } = req.body;
    const normalizedSchoolCode = String(schoolCode || "").trim().toUpperCase();
    const parent = await Parent.findById(req.params.id).populate("schoolId");
    const newSchool = await School.findOne({ schoolCode: normalizedSchoolCode });
    if (!newSchool) return res.status(400).json({ success: false, message: "Invalid School Code" });
    if (newSchool.isActive === false) {
      return res.status(403).json({ success: false, message: "This school is not active" });
    }

    if (parent.schoolId) {
      await history.create({ parentId: parent._id, oldSchool: parent.schoolId._id, newSchool: newSchool._id });
    }
    parent.schoolId = newSchool._id;
    await parent.save({ validateBeforeSave: false });
    res.json({
      success: true,
      message: "School Changed",
      schoolId: newSchool._id,
      schoolName: newSchool.name,
      schoolCode: newSchool.schoolCode,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ================= RESET PASSWORD FINAL ================= */
P_router.post("/reset-password-final", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const normalizedNewPassword = String(newPassword || "");
    if (!hasSixPasswordLetters(normalizedNewPassword)) {
      return res.status(400).json({ success: false, message: passwordLetterMessage });
    }

    const hash = await bcrypt.hash(normalizedNewPassword, 10);
    const updated = await Parent.findOneAndUpdate({ email }, { password: hash }, { new: true, runValidators: false });
    if (updated) res.json({ success: true, message: "Password updated ✅" });
    else res.status(404).json({ success: false });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ================= DELETE PARENT ================= */
P_router.delete("/delete-account/:id", async (req, res) => {
  try {
    const deleted = await Parent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Parent not found" });

    await Promise.all([
      CartModel.deleteMany({ parentId: req.params.id }),
      OrderModel.deleteMany({ parentId: req.params.id }),
      history.deleteMany({ parentId: req.params.id }),
    ]);

    res.json({ success: true, message: "Parent account deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

P_router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Parent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Parent not found" });

    await Promise.all([
      CartModel.deleteMany({ parentId: req.params.id }),
      OrderModel.deleteMany({ parentId: req.params.id }),
      history.deleteMany({ parentId: req.params.id }),
    ]);

    res.json({ success: true, message: "Parent deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = P_router;
