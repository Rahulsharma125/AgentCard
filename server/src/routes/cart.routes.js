const express = require("express");

const { addToCart, getCart } = require("../controllers/cart.controller");

const router = express.Router();

router.post("/add", addToCart);

router.get("/:sessionId", getCart);

module.exports = router;
