const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Parent = require("../model/parent");
const School = require("../model/school");
const history = require("../model/history");
const CartModel = require("../model/CartModel"); // Ensure this is imported

const P_router = express.Router();

/* ================= MAIL ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Port 465 ke liye true zaroori hai
  auth: {
    user: "tejalpurabiya08@gmail.com",
    pass: "alspqiopryzoybhe", // ⭐ Ye 16 digit ka App Password hona chahiye
  },
  tls: {
    rejectUnauthorized: false // Localhost par certificate errors ko rokne ke liye
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

    const existing = await Parent.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const school = await School.findOne({ schoolCode });
    const hash = await bcrypt.hash(password, 10);

    const parent = new Parent({
      name,
      childName,
      email,
      password: hash,
      mobile,
      schoolId: school ? school._id : null,
      active: true, // Default active on registration
    });

    await parent.save();
    res.json({ success: true, message: "Registered Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Registration Failed" });
  }
});

/* ================= LOGIN (Updated with Active Check) ================= */
P_router.post("/login", async (req, res) => {
  try {
    const { email, password, schoolCode } = req.body;

    const parent = await Parent.findOne({ email }).populate("schoolId");

    if (!parent) {
      return res.status(400).json({ success: false, message: "Invalid Email" });
    }

    // ⭐ YE WALA CHECK ADD KAREIN 👇
    if (parent.active === false) {
      return res.status(403).json({ 
        success: false, 
        message: "Your account is deactivated. Please contact admin." 
      });
    }

    // ⭐ STEP 2: Password check
    const match = await bcrypt.compare(password, parent.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Incorrect Password" });
    }

    // ⭐ STEP 3: School Code check
    if (parent.schoolId?.schoolCode !== schoolCode) {
      return res.status(400).json({ success: false, message: "School Code Not Valid" });
    }

    res.json({
      success: true,
      parentId: parent._id,
      parentName: parent.name,
      schoolId: parent.schoolId?._id,
      schoolName: parent.schoolId?.name,
      schoolCode: parent.schoolId?.schoolCode,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login Failed" });
  }
});

/* ================= FORGOT PASSWORD (FIXED) ================= */
P_router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const parent = await Parent.findOne({ email });

    if (!parent) {
      return res.status(400).json({ success: false, message: "Email not found" });
    }

    const otp = generateOTP();
    
    // ⭐ .save() ki jagah findByIdAndUpdate use karein (Validation skip karne ke liye)
    await Parent.findByIdAndUpdate(
      parent._id, 
      { 
        loginOtp: otp, 
        loginOtpExpires: new Date(Date.now() + 5 * 60 * 1000) 
      },
      { runValidators: false } 
    );

    await transporter.sendMail({
      from: '"EduSupply" <tejalpurabiya08@gmail.com>',
      to: email,
      subject: "Forgot Password OTP",
      text: `Your OTP is: ${otp}`,
    });

    res.json({ success: true, message: "OTP sent successfully ✅" });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

/* ================= VERIFY OTP (FIXED) ================= */
P_router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const parent = await Parent.findOne({ email });

    if (!parent || parent.loginOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (parent.loginOtpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "OTP Expired" });
    }

    // ⭐ OTP reset karte waqt bhi validation skip karein
    await Parent.findByIdAndUpdate(
      parent._id,
      { loginOtp: null, loginOtpExpires: null },
      { runValidators: false }
    );

    res.json({ success: true, message: "OTP Verified Successfully", parentId: parent._id });
  } catch (err) {
    res.status(500).json({ success: false, message: "OTP Verification Failed" });
  }
});

/* ================= GET ALL PARENTS ================= */
P_router.get("/parents", async (req, res) => {
  try {
    const parents = await Parent.find().populate("schoolId", "name schoolCode");
    res.json(parents);
  } catch (err) {
    res.status(500).json({ success: false, message: "Fetch Failed" });
  }
});

/* ================= DELETE PARENT ================= */
P_router.delete("/:id", async (req, res) => {
  try {
    await Parent.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Parent Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete Failed" });
  }
});

/* ================= CHANGE SCHOOL (BACKEND) ================= */
P_router.put("/change-school/:id", async (req, res) => {
  try {

    const { schoolCode } = req.body;

    const parent = await Parent.findById(req.params.id).populate("schoolId");

    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    const newSchool = await School.findOne({ schoolCode });

    if (!newSchool) {
      return res.status(400).json({ success: false, message: "Invalid School Code" });
    }

    // ⭐ SAVE OLD SCHOOL IN HISTORY
    if (parent.schoolId) {
      await history.create({
        parentId: parent._id,
        oldSchool: parent.schoolId._id
      });
    }

    // ⭐ UPDATE NEW SCHOOL
    parent.schoolId = newSchool._id;
    await parent.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: "School Changed Successfully",
      schoolId: newSchool._id,
      schoolName: newSchool.name,
      schoolCode: newSchool.schoolCode
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Change Failed" });
  }
});

/* ================= HISTORY ================= */
P_router.get("/history", async (req, res) => {
  const data = await history.find().populate("parentId").populate("oldSchool");
  res.json(data);
});

/* ================= DELETE ACCOUNT ================= */
P_router.delete("/delete-account/:id", async (req, res) => {
  try {
    await Parent.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Account Deleted Permanently" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete Failed" });
  }
});

/* ================= PARENTS WITH ORDERS ================= */
P_router.get("/parents-with-orders", async (req, res) => {
  try {
    const parents = await Parent.find().sort({ createdAt: -1 }).populate("schoolId");
    const parentsWithOrders = await Promise.all(
      parents.map(async (parent) => {
        const cartCount = await CartModel.countDocuments({ parentId: parent._id });
        return { ...parent._doc, orderCount: cartCount };
      })
    );
    res.json(parentsWithOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= GET SINGLE PARENT ================= */
P_router.get("/parent/:id", async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id).populate("schoolId");
    if (!parent) return res.status(404).json({ message: "Not found" });
    res.json(parent);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= UPDATE STATUS (Active/Inactive) - FIXED ⭐ ================= */
// parentRoutes.js
P_router.put("/status/:id", async (req, res) => {
  try {
    const { active } = req.body;
    
    // findByIdAndUpdate return karta hai updated document agar { new: true } ho
    const updatedParent = await Parent.findByIdAndUpdate(
      req.params.id, 
      { active: active }, 
      { new: true } 
    );

    if (!updatedParent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    res.json({ 
      success: true, 
      message: `Account ${active ? 'Activated' : 'Deactivated'} successfully`,
      data: updatedParent 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================= UPDATE SELECTIONS (CLASS/GENDER) ================= */
P_router.put("/update-selections/:id", async (req, res) => {
  try {
    const { className, gender, house, season } = req.body;
    
    const updatedParent = await Parent.findByIdAndUpdate(
      req.params.id,
      { className, gender, house, season },
      { new: true }
    );

    if (!updatedParent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    res.json({ 
      success: true, 
      message: "Selection Saved Successfully", 
      data: updatedParent 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database Update Failed" });
  }
});

// ⭐ Naya Password Save karne ke liye (Reset Password)
/* ================= RESET PASSWORD FINAL ================= */
P_router.post("/reset-password-final", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Naye password ko hash (encrypt) karein
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Password update karein aur validation skip karein (taaki mobile wala error na aaye)
    const updated = await Parent.findOneAndUpdate(
      { email },
      { password: hash },
      { new: true, runValidators: false }
    );

    if (updated) {
      res.json({ success: true, message: "Password updated successfully ✅" });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Reset failed" });
  }
});

module.exports = P_router;