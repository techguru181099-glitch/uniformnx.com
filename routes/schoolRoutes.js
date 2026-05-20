const express = require("express");
const School = require("../model/school");

const router = express.Router();

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findDuplicateSchool = async ({ name, email, excludeId }) => {
  const duplicateChecks = [];

  if (name) {
    duplicateChecks.push({
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });
  }

  if (email) {
    duplicateChecks.push({
      email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
    });
  }

  if (duplicateChecks.length === 0) return null;

  const query = { $or: duplicateChecks };
  if (excludeId) query._id = { $ne: excludeId };

  return School.findOne(query);
};

const generateSchoolCode = async (name) => {
  const prefix = name.substring(0, 3).toUpperCase();
  let schoolCode;
  let exists = true;

  while (exists) {
    const randomNumber = Math.floor(100 + Math.random() * 900);
    schoolCode = prefix + randomNumber;
    exists = await School.exists({ schoolCode });
  }

  return schoolCode;
};

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
    const { address, phone, city, state } = req.body;
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name) {
      return res.status(400).json({ message: "School name is required" });
    }

    const duplicate = await findDuplicateSchool({ name, email });
    if (duplicate) {
      const duplicateField =
        duplicate.name?.toLowerCase() === name.toLowerCase()
          ? "name"
          : "email";

      return res.status(409).json({
        message:
          duplicateField === "name"
            ? "A school with this name already exists"
            : "A school with this email already exists",
      });
    }

    const schoolCode = await generateSchoolCode(name);

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
    const updateData = { ...req.body };
    if (updateData.name !== undefined) updateData.name = String(updateData.name).trim();
    if (updateData.email !== undefined) updateData.email = String(updateData.email).trim().toLowerCase();

    const duplicate = await findDuplicateSchool({
      name: updateData.name,
      email: updateData.email,
      excludeId: req.params.id,
    });

    if (duplicate) {
      const duplicateField =
        updateData.name && duplicate.name?.toLowerCase() === updateData.name.toLowerCase()
          ? "name"
          : "email";

      return res.status(409).json({
        message:
          duplicateField === "name"
            ? "A school with this name already exists"
            : "A school with this email already exists",
      });
    }

    const updated = await School.findByIdAndUpdate(
      req.params.id,
      updateData,
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
