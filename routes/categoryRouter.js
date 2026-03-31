const express = require("express");
const Crouter = express.Router();
const Category = require("../model/categoryModel");

<<<<<<< HEAD

// GET all categories
=======
// GET all categories
// GET categories
>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
Crouter.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

<<<<<<< HEAD

// ADD new category
=======
// ADD category
>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
Crouter.post("/", async (req, res) => {
  try {

    const exist = await Category.findOne({
      name: req.body.name
    });

<<<<<<< HEAD
    // agar category already hai
    if (exist) {
      return res.json(exist);
    }

    // new category create
=======
    if (exist) return res.json(exist);

>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
    const newCat = new Category({
      name: req.body.name
    });

    await newCat.save();

    res.json(newCat);

  } catch (err) {
    res.status(500).json(err.message);
  }
});

<<<<<<< HEAD
=======
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
>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f

module.exports = Crouter;