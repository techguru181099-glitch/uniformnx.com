const mongoose = require("mongoose");

const uniformSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, 
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  gender: { type: String, required: true, enum: ["Male", "Female"] },
  house: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true }, // Main Image
  sizeGuide: { type: String }, // Size Guide Image (Added this)
  description: { type: String, required: true },
sizeCategory: {
  type: String,
  required: true,
  trim: true
},
  status: { type: String, default: "active" },
  stock: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Uniform", uniformSchema);