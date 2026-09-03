const express = require("express");

const { runAgent } = require("../agent/agent");

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId = "demo-user-1" } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const response = await runAgent(message, sessionId);

    res.status(200).json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("Agent API error:", error.message);

    res.status(500).json({
      success: false,
      message: "AI agent failed",
    });
  }
});

module.exports = router;
