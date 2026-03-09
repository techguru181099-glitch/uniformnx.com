const express = require("express");
const multer = require("multer");
const path = require("path");
const uniformModel = require("../model/uniformModel");
const categoryModel = require("../model/categoryModel");

const UF_router = express.Router();

/* ================= MULTER CONFIGURATION ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* ================= ADD UNIFORM (Product + Size Guide) ================= */
UF_router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "sizeGuide", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files["image"]) {
        return res
          .status(400)
          .json({ message: "Main Product Image is required" });
      }

      // CATEGORY CHECK
      let category = await categoryModel.findOne({
        name: req.body.sizeCategory,
      });

      if (!category) {
        category = new categoryModel({
          name: req.body.sizeCategory,
        });
        await category.save();
      }

      const uniform = new uniformModel({
        name: req.body.name,
        schoolId: req.body.schoolId,
        gender: req.body.gender,
        house: req.body.house,
        price: req.body.price,
        description: req.body.description,
        sizeCategory: category.name,
        stock: req.body.stock || 0,
        isAvailable:
          req.body.isAvailable !== undefined ? req.body.isAvailable : true,
        status: "active",
        image: req.files["image"][0].filename,
        sizeGuide: req.files["sizeGuide"]
          ? req.files["sizeGuide"][0].filename
          : null,
      });

      const saved = await uniform.save();

      res.status(201).json(saved);
    } catch (err) {
      console.error("Save Error:", err.message);
      res.status(500).json({ message: err.message });
    }
  },
);

/* ================= UPDATE UNIFORM ================= */
UF_router.put(
  "/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "sizeGuide", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("BODY DATA:", req.body);
      const updateData = { ...req.body };

      if (updateData.stock !== undefined) {
        updateData.isAvailable = updateData.stock > 0;
      }

      // Update main image if new one uploaded
      if (req.files && req.files["image"]) {
        updateData.image = req.files["image"][0].filename;
      }

      // Update size guide if new one uploaded
      if (req.files && req.files["sizeGuide"]) {
        updateData.sizeGuide = req.files["sizeGuide"][0].filename;
      }

      const updatedUniform = await uniformModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true },
      );

      if (!updatedUniform) {
        return res.status(404).json({ message: "Uniform not found" });
      }

      res.json(updatedUniform);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

/* ================= FILTER UNIFORMS (For Frontend Search) ================= */
UF_router.post("/filter", async (req, res) => {
  try {
    let query = {};
    if (req.body.schoolId) query.schoolId = req.body.schoolId;
    if (req.body.gender) query.gender = req.body.gender;
    if (req.body.house && req.body.house !== "Any")
      query.house = req.body.house;
    if (req.body.season && req.body.season !== "Any")
      query.season = req.body.season;
    if (req.body.sizeCategory) query.sizeCategory = req.body.sizeCategory;

    query.status = "active";
    query.isAvailable = true;

    const data = await uniformModel.find(query).populate("schoolId", "name");
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET BY SCHOOL ================= */
UF_router.get("/by-school/:schoolId", async (req, res) => {
  try {
    const data = await uniformModel.find({ schoolId: req.params.schoolId });
    res.json(data);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

/* ================= GET SINGLE ITEM ================= */
UF_router.get("/single/:id", async (req, res) => {
  try {
    const uniform = await uniformModel.findById(req.params.id);
    if (!uniform) return res.status(404).json({ message: "Not found" });
    res.json(uniform);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

/* ================= STATUS TOGGLE ================= */
UF_router.put("/status/:id", async (req, res) => {
  try {
    await uniformModel.findByIdAndUpdate(req.params.id, {
      status: req.body.status,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err.message);
  }
});

/* ================= DELETE UNIFORM ================= */
UF_router.delete("/:id", async (req, res) => {
  try {
    await uniformModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err.message);
  }
});

/* ================= GET UNIQUE CLASSES ================= */
// UF_router.get("/classes/:schoolId", async (req, res) => {
//   try {
//     const classes = await uniformModel
//       .find({ schoolId: req.params.schoolId })
//       .distinct("className");

//     const sortedClasses = classes.sort((a, b) =>
//       a.localeCompare(b, undefined, { numeric: true })
//     );
//     res.json(sortedClasses);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// UF_router.get("/school/:schoolId", async (req, res) => {
//   try {
//     // Ye line database mein 'school' field check karegi jo School ki ObjectId store karta hai
//     const uniforms = await Uniform.find({ school: req.params.schoolId });
//     res.json(uniforms);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching uniforms", error: err.message });
//   }
// });

/* ================= GET ALL UNIFORMS (For Admin) ================= */
UF_router.get("/all", async (req, res) => {
  try {
    // .populate("schoolId") taaki school ka naam mile
    const data = await uniformModel.find().populate("schoolId", "name");
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

UF_router.put("/availability/:id", async (req, res) => {
  try {
    const uniform = await uniformModel.findById(req.params.id);

    if (!uniform) return res.status(404).json({ message: "Uniform not found" });

    uniform.isAvailable = !uniform.isAvailable; // toggle
    await uniform.save();

    res.json({ success: true, isAvailable: uniform.isAvailable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



module.exports = UF_router;
