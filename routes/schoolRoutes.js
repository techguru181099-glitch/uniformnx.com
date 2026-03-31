const express = require("express");
const School = require("../model/school");

const router = express.Router();

/* =========================
   GET CURRENT SCHOOL
========================= */
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
    const { name, address, email, phone, city, state } = req.body;

    if (!name) {
      return res.status(400).json({ message: "School name is required" });
    }

    // Generate unique code
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNumber = Math.floor(100 + Math.random() * 900);
    const schoolCode = prefix + randomNumber;

    const newSchool = new School({
      name,
      address,
      email,
      phone,
      city,
      state,
      schoolCode
    });

    const saved = await newSchool.save();
    res.status(201).json(saved);

  } catch (err) {
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
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

/* =========================
   TOGGLE ACTIVE STATUS
========================= */
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
   DELETE SCHOOL
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await School.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "School not found" });
    }
    res.json({ message: "School deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
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
