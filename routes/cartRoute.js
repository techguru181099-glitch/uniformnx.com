const express = require("express");
const Cart = require("../model/CartModel");

const C_router = express.Router();

/* ================= ADD TO CART ================= */

C_router.post("/add", async (req, res) => {

  try {

    const { parentId, childId, uniformId, size, quantity } = req.body;

    console.log("Cart Request:", req.body);

    const exists = await Cart.findOne({
      parentId,
      childId,
      uniformId,
      size
    });

    if (exists) {

      exists.quantity += Number(quantity);

      await exists.save();

      return res.json({
        success: true,
        message: "Quantity Updated",
        cart: exists
      });

    }

    const cart = new Cart({
      parentId,
      childId,
      uniformId,
      size,
      quantity: Number(quantity)
    });

    await cart.save();

    res.json({
      success: true,
      message: "Item Added To Cart",
      cart
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: "Cart Error"
    });

  }

});


/* ================= GET CART ================= */

C_router.get("/:parentId", async (req,res)=>{

 try {

  const cart = await Cart.find({
<<<<<<< HEAD
 parentId: req.params.parentId,
 status: "active"   // ⭐ IMPORTANT
})
.populate("uniformId");
=======
    parentId:req.params.parentId
  })
  .populate("uniformId");
>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f

  res.json(cart);

 } catch(err){

  res.status(500).json(err.message);

 }

});


/* ================= INCREASE QUANTITY ================= */

C_router.put("/increase/:id", async (req, res) => {

 try{

  const cart = await Cart.findById(req.params.id);

  if(!cart){
    return res.status(404).json({message:"Cart item not found"});
  }

  cart.quantity += 1;

  await cart.save();

  res.json(cart);

 }catch(err){

  res.status(500).json(err.message);

 }

});


/* ================= DECREASE QUANTITY ================= */

C_router.put("/decrease/:id", async (req, res) => {

 try{

  const cart = await Cart.findById(req.params.id);

  if(!cart){
    return res.status(404).json({message:"Cart item not found"});
  }

  if (cart.quantity > 1) {
    cart.quantity -= 1;
  }

  await cart.save();

  res.json(cart);

 }catch(err){

  res.status(500).json(err.message);

 }

});


/* ================= DELETE ITEM ================= */

C_router.delete("/:id", async (req, res) => {

 try{

  await Cart.findByIdAndDelete(req.params.id);

  res.json({
    success:true,
    message:"Item Removed"
  });

 }catch(err){

  res.status(500).json(err.message);

 }

});


/* ================= CLEAR CART ================= */

C_router.delete("/clear/:parentId", async (req, res) => {

 try{

  await Cart.deleteMany({
    parentId: req.params.parentId
  });

  res.json({
    success:true,
    message:"Cart Cleared"
  });

 }catch(err){

  res.status(500).json(err.message);

 }

<<<<<<< HEAD
});

C_router.put("/afterOrder/:parentId", async (req,res)=>{
 try{

  await Cart.updateMany(
    { parentId:req.params.parentId, status:"active" },
    { $set:{ status:"ordered" } }
  );

  res.json({ success:true });

 }catch(err){
  res.status(500).json(err.message);
 }
=======
>>>>>>> 2a9f68f7b7e58a9db4f308f77c6be69524254f6f
});

module.exports = C_router;