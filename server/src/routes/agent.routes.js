const express = require("express");

const { requestCheckout } = require("../agent/tools");

const router = express.Router();

router.post("/checkout", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    const result = await requestCheckout(sessionId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Agent checkout route error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Checkout request failed",
    });
  }
});

module.exports = router;
