const express = require("express");

const {
  addToCart,
  getCart,
  clearCart,
} = require("../controllers/cart.controller");

const router = express.Router();

router.post("/add", addToCart);

router.get("/:sessionId", getCart);

router.delete("/:sessionId", clearCart);

module.exports = router;
