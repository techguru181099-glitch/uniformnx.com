const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../model/login");

const U_router = express.Router();
<<<<<<< HEAD
const SECRET_KEY = process.env.SECRET_KEY || "default_secret_key";

// ================= Nodemailer Config =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hitashagurkha@gmail.com",
    pass: "uynzbazbinvxvkjx",
  },
});

// ================= ADMIN LOGIN =================
=======

const SECRET_KEY = process.env.SECRET_KEY;


// ================= ADMIN LOGIN =================

>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
U_router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;


    if (!username || !password) {
      return res.status(400).json({ message: "Username and Password required!" });
    }

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password!" });
    }

    // Token
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
=======
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


  } catch (err) {
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
=======
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


    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ================= ADD STAFF MEMBER =================
U_router.post("/add-team", async (req, res) => {
  try {
    const { fullName, email, username, password, permissions } = req.body;
    const existUser = await User.findOne({ username });

    if (existUser) return res.status(400).json({ message: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = new User({
=======

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

      role: "staff",
      permissions,
    });

    await staff.save();
    res.json({ message: "Staff added successfully", staff });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= TEAM LIST (shared) =================
U_router.get("/team-list", async (req, res) => {
  try {
    // ✅ Shared data: sabko same list dikhega
    const staff = await User.find({ role: "staff" }).select("-password");
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= UPDATE STAFF STATUS (Active/Inactive) =================
U_router.put("/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check karein ki status bhej gaya hai ya nahi
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const updatedStaff = await User.findByIdAndUpdate(
      id,
      { status: status },
      { new: true } // updated data return karne ke liye
    );

    if (!updatedStaff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.status(200).json({ 
      message: `Status updated to ${status} successfully`, 
      staff: updatedStaff 
    });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ================= UPDATE SHARED PROFILE =================
U_router.put("/update-profile", async (req, res) => {
  try {
    const { fullName, email, phone, city } = req.body;

    // ✅ Shared update: sab users ke liye same data update hoga
    const updated = await User.updateMany({}, { $set: { fullName, email, phone, city } });

    res.status(200).json({ message: "Shared profile updated for all users", updated });
  } catch (err) {
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

// ================= SEND OTP =================
U_router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found with this email!" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpire = Date.now() + 600000; // 10 min
    await user.save();

    const mailOptions = {
      from: "hitashagurkha@gmail.com",
      to: email,
      subject: "Password Reset OTP - UniformNX",
      html: `<div style="font-family: Arial; padding: 20px;">
               <h2 style="color:#28a745;">UniformNX Admin</h2>
               <p>Your OTP:</p>
               <h1 style="letter-spacing:5px;">${otp}</h1>
               <p>Valid for 10 minutes.</p>
             </div>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP has been sent to your email!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send email." });
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
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
});
// ================= UPDATE STAFF DETAILS & PERMISSIONS =================
U_router.put("/update-staff/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, username, email, permissions } = req.body;

    const updatedStaff = await User.findByIdAndUpdate(
      id,
      { 
        $set: { 
          fullName, 
          username, 
          email, 
          permissions 
        } 
      },
      { new: true }
    ).select("-password");

    if (!updatedStaff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.status(200).json({ 
      message: "Staff updated successfully", 
      staff: updatedStaff 
    });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ================= DELETE STAFF MEMBER =================
U_router.delete("/delete-staff/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStaff = await User.findByIdAndDelete(id);

    if (!deletedStaff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.status(200).json({ message: "Staff member deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
=======
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

>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
});


module.exports = U_router;
