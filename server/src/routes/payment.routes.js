const express = require("express");

const {
  createOrder,
  verifyPayment,
} = require("../controllers/payment.controller");

const router = express.Router();

// Create Razorpay order
router.post("/create-order", createOrder);

// Verify Razorpay payment
router.post("/verify", verifyPayment);

module.exports = router;
