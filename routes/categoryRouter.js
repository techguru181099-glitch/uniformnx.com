const express = require("express");
const Crouter = express.Router();
const Category = require("../model/categoryModel");

// GET all categories
// GET categories
Crouter.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// ADD category
Crouter.post("/", async (req, res) => {
  try {

    const exist = await Category.findOne({
      name: req.body.name
    });

    if (exist) return res.json(exist);

    const newCat = new Category({
      name: req.body.name
    });

    await newCat.save();

    res.json(newCat);

  } catch (err) {
    res.status(500).json(err.message);
  }
});

// ADD new category
Crouter.post("/", async (req, res) => {
  try {
    const exist = await Category.findOne({ name: req.body.name });

    if (exist) {
      return res.json(exist);
    }

    const newCat = new Category({
      name: req.body.name
    });

    await newCat.save();

    res.json(newCat);

  } catch (err) {
    res.status(500).json(err.message);
  }
});

module.exports = Crouter;