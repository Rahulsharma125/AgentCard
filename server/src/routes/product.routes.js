const express = require("express");

const {
  getProducts,
  searchProducts,
} = require("../controllers/product.controller");

const router = express.Router();

router.get("/", getProducts);

router.get("/search", searchProducts);

module.exports = router;
