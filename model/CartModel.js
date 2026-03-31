const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({

 parentId: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "Parent"
 },

 childId: String,

 uniformId: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "Uniform"
 },

 size: String,

 quantity: {
   type: Number,
   default: 1
 },
   status: {
    type: String,
    enum: ["active","ordered","completed"],
    default: "active"
  }

}, { timestamps: true });

module.exports = mongoose.model("Cart", CartSchema);