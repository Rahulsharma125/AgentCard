const express = require("express");

const { runAgent, requestCheckout } = require("../agent/agent");

const router = express.Router();

// AI chat
router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const result = await runAgent(message, sessionId || "demo-user-1");

    return res.status(200).json({
      success: true,
      response: result,
    });
  } catch (error) {
    console.error("Agent chat route error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Agent request failed",
    });
  }
});

// Checkout verification
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
