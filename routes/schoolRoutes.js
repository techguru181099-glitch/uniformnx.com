const express = require("express");
const School = require("../model/school");

const router = express.Router();

router.get("/current", async (req, res) => {
  try {
    const school = await School.findOne(); // first school
    res.json(school);
  } catch (err) {
    res.status(500).json({ message: "Error fetching school" });
  }
});

/* =========================
   CREATE SCHOOL + AUTO CODE
========================= */
router.post("/", async (req, res) => {
  try {
    // 1. Yahan 'email' add kiya (Jo pehle missing tha)
    const { name, address, email, phone, city, state } = req.body;

    // 2. Name validation (Agar name nahi aaya toh prefix error dega)
    if (!name) {
      return res.status(400).json({ message: "School name is required" });
    }

    // 🔥 Generate unique code
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNumber = Math.floor(100 + Math.random() * 900);
    const schoolCode = prefix + randomNumber;

    const newSchool = new School({
      name,
      address,
      email, // Ab ye error nahi dega
      phone,
      city,
      state,
      schoolCode
    });

    const saved = await newSchool.save();
    res.status(201).json(saved);

  } catch (err) {
    // Error console mein dikhega toh debugging aasan hogi
    console.error("Create School Error:", err);
    res.status(500).json({ message: err.message });
  }
});


/* =========================
   UPDATE SCHOOL
========================= */
router.put("/:id", async (req, res) => {
  try {
    const updated = await School.findByIdAndUpdate(
      req.params.id, // 1. ID search karne ke liye
      req.body,      // 2. Data jo update karna hai (name, address, etc.)
      { new: true, runValidators: true } // 3. Updated data return karega aur validation check karega
    );

    if (!updated) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

router.put("/:id/active", async (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = await School.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "School not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

/* =========================
   DELETE
========================= */
router.delete("/:id", async (req, res) => {
  try {
<<<<<<< HEAD
    await School.findByIdAndDelete(req.params.id); // Database se hata dega
    res.json({ message: "School deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err });
=======
    const updated = await School.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.json({ message: "School deactivated successfully", school: updated });
  } catch (err) {
    res.status(500).json(err);
>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
  }
});


/* =========================
   GET ALL SCHOOLS
========================= */
router.get("/", async (req, res) => {
  try {
    const schools = await School.find().sort({ createdAt: -1 });
    res.json(schools);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;