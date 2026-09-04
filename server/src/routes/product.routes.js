const express = require("express");

const {
  getProducts,
  searchProducts,
} = require("../controllers/product.controller");

const Product = require("../models/Product");

const router = express.Router();

router.get("/", getProducts);

router.get("/search", searchProducts);

// TEMPORARY: Change product price for testing price-change protection
router.patch("/test-price/:productId", async (req, res) => {
  try {
    const { price } = req.body;

    if (price === undefined || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { price },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product price updated successfully",
      product,
    });
  } catch (error) {
    console.error("Test price update error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update product price",
    });
  }
});

module.exports = router;
