const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const { checkCartPolicy } = require("../agent/policyEngine");

// ======================================================
// CREATE RAZORPAY ORDER
// ======================================================

const createOrder = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    // Get user's cart
    const cart = await Cart.findOne({
      sessionId,
    }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Build checkout items using CURRENT prices
    const items = cart.items.map((item) => {
      return {
        productId: item.product._id.toString(),

        name: item.product.name,

        price: item.product.price,

        priceSnapshot: item.priceSnapshot,

        quantity: item.quantity,

        itemTotal: item.product.price * item.quantity,
      };
    });

    // Calculate exact total
    const total = items.reduce((sum, item) => sum + item.itemTotal, 0);

    // ==================================================
    // SAFETY POLICY CHECK
    // ==================================================

    const policyResult = await checkCartPolicy({
      items,
      total,
    });

    if (!policyResult.allowed) {
      console.log("Payment blocked by policy:", policyResult.reason);

      return res.status(400).json({
        success: false,

        allowed: false,

        priceChanged: policyResult.priceChanged || false,

        message: policyResult.reason,

        total,

        items,
      });
    }

    // ==================================================
    // CREATE RAZORPAY ORDER
    // ==================================================

    const options = {
      amount: Math.round(total * 100),

      currency: "INR",

      receipt: `agentcart_${Date.now()}`,

      notes: {
        source: "AgentCart",

        type: "AI Commerce Test Payment",

        sessionId: sessionId,
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    console.log("Razorpay order created:", razorpayOrder.id);

    // ==================================================
    // SAVE INTERNAL ORDER
    // ==================================================

    const order = await Order.create({
      sessionId,

      items: items.map((item) => ({
        product: item.productId,

        name: item.name,

        quantity: item.quantity,

        price: item.price,

        itemTotal: item.itemTotal,
      })),

      totalAmount: total,

      status: "payment_pending",

      razorpayOrderId: razorpayOrder.id,
    });

    console.log("AgentCart order created:", order._id.toString());

    // ==================================================
    // RESPONSE
    // ==================================================

    /*
     * IMPORTANT:
     *
     * Frontend expects:
     *
     * response.data.order
     *
     * Therefore we return the Razorpay order
     * using the key "order".
     */

    return res.status(200).json({
      success: true,

      message: "Razorpay order created successfully",

      orderId: order._id,

      order: razorpayOrder,
    });
  } catch (error) {
    console.error("Razorpay order error:", error.message);

    return res.status(500).json({
      success: false,

      message: "Failed to create Razorpay order",
    });
  }
};

// ======================================================
// VERIFY RAZORPAY PAYMENT
// ======================================================

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Validate payment information
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,

        message: "Payment verification data is missing",
      });
    }

    // Find internal AgentCart order
    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,

        message: "AgentCart order not found",
      });
    }

    // ==================================================
    // DUPLICATE PAYMENT PROTECTION
    // ==================================================

    if (order.status === "paid") {
      return res.status(200).json({
        success: true,

        message: "Payment was already verified",

        paymentId: order.razorpayPaymentId,

        orderId: razorpay_order_id,
      });
    }

    // ==================================================
    // VERIFY RAZORPAY SIGNATURE
    // ==================================================

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      order.status = "failed";

      await order.save();

      return res.status(400).json({
        success: false,

        message: "Invalid payment signature",
      });
    }

    // ==================================================
    // PAYMENT VERIFIED
    // ==================================================

    order.status = "paid";

    order.razorpayPaymentId = razorpay_payment_id;

    await order.save();

    console.log("Payment verified:", razorpay_payment_id);

    return res.status(200).json({
      success: true,

      message: "Payment verified successfully",

      paymentId: razorpay_payment_id,

      orderId: razorpay_order_id,
    });
  } catch (error) {
    console.error("Payment verification error:", error.message);

    return res.status(500).json({
      success: false,

      message: "Payment verification failed",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
