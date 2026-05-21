const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../model/login");

const U_router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "default_secret_key";
const passwordLetterMessage = "Password must contain at least 6 letters";
const hasSixPasswordLetters = (value) => (String(value).match(/[A-Za-z]/g) || []).length >= 6;

// ================= Nodemailer Config =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "hitashagurkha@gmail.com",
    pass: process.env.EMAIL_PASS || "uynzbazbinvxvkjx",
  },
});

// ================= ADMIN LOGIN & AUTO-CREATE =================
U_router.post("/login", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const loginId = String(username || "").trim();
    const emailId = String(email || "").trim();

    if (!loginId || !password) {
      return res.status(400).json({ message: "Username and Password required!" });
    }

    // Find user by username or email. Login form sends email in username field.
    const loginQuery = [{ username: loginId }, { email: loginId }];
    if (emailId) loginQuery.push({ username: emailId }, { email: emailId });
    let user = await User.findOne({ $or: loginQuery });

    // Auto-create Admin if not exists (for first time setup)
    if (!user && email && role === "admin") {
      if (!hasSixPasswordLetters(password)) {
        return res.status(400).json({ message: passwordLetterMessage });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        username: loginId,
        email: emailId,
        password: hashedPassword,
        role: "admin",
        permissions: ["view_parents", "view_schools", "view_products", "view_orders", "view_revenue", "manage_team"]
      });
      await user.save();
      console.log("✅ Admin Auto Created");
    }

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password!" });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      token,
      username: user.username,
      role: user.role,
      permissions: user.permissions || [],
      message: "Login successful",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ================= LOGOUT =================
U_router.post("/logout", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Username required!" });

    await User.findOneAndUpdate(
      { username, role: "admin" },
      { isLoggedIn: false, currentSession: null, lastLogout: new Date() }
    );
    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ================= SEND OTP =================
U_router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpire = Date.now() + 600000; // 10 min
    await user.save();

    const mailOptions = {
      from: `"UniformNX Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP",
      html: `<h1>Your OTP is ${otp}</h1><p>Valid for 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send email" });
  }
});

// ================= VERIFY OTP =================
U_router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (!user || user.otpExpire < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP!" });
    }
    res.status(200).json({ message: "OTP verified!" });
  } catch (err) {
    res.status(500).json({ message: "Verification error" });
  }
});

// ================= RESET PASSWORD =================
U_router.post("/reset-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedPassword = String(password || "");
    if (!hasSixPasswordLetters(normalizedPassword)) {
      return res.status(400).json({ message: passwordLetterMessage });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    user.password = await bcrypt.hash(normalizedPassword, 10);
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
});

// ================= ADD STAFF =================
U_router.post("/add-staff", async (req, res) => {
  try {
    const { fullName, email, username, password, permissions } = req.body;
    const exist = await User.findOne({ username });
    if (exist) return res.status(400).json({ message: "Username already exists" });
    if (!hasSixPasswordLetters(password)) {
      return res.status(400).json({ message: passwordLetterMessage });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStaff = new User({
      fullName,
      email,
      username,
      password: hashedPassword,
      role: "staff",
      permissions: permissions || [],
    });

    await newStaff.save();
    res.json({ message: "Staff added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Dashboard UI still posts to /add-team, so keep it as an alias.
U_router.post("/add-team", async (req, res) => {
  try {
    const { fullName, email, username, password, permissions } = req.body;
    const exist = await User.findOne({ $or: [{ username }, { email }] });
    if (exist) return res.status(400).json({ message: "Staff already exists" });
    if (!hasSixPasswordLetters(password)) {
      return res.status(400).json({ message: passwordLetterMessage });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStaff = new User({
      fullName,
      email,
      username,
      password: hashedPassword,
      role: "staff",
      status: "active",
      permissions: permissions || [],
    });

    await newStaff.save();
    res.json({ message: "Staff added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= TEAM LIST =================
U_router.get("/team-list", async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" }).select("-password");
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= PROFILE =================
U_router.get("/profile/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

U_router.put("/update-profile", async (req, res) => {
  try {
    const { username, ...updates } = req.body;
    if (!username) return res.status(400).json({ message: "Username required" });

    const user = await User.findOneAndUpdate(
      { username },
      updates,
      { new: true, runValidators: false }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

U_router.put("/update-profile/:username", async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      req.body,
      { new: true, runValidators: false }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ================= UPDATE STAFF =================
U_router.put("/update-status/:id", async (req, res) => {
  try {
    const status = String(req.body.status || "").toLowerCase() === "inactive" ? "inactive" : "active";
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: false }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "Staff not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const updateStaff = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      if (!hasSixPasswordLetters(updates.password)) {
        return res.status(400).json({ message: passwordLetterMessage });
      }

      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: false }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "Staff not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

U_router.put("/update-staff/:id", updateStaff);
U_router.put("/staff/:id", updateStaff);

// ================= DELETE STAFF =================
U_router.delete("/delete-staff/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Staff member deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

U_router.delete("/staff/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Staff member deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = U_router;
