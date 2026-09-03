const Product = require("../models/Product");

// ======================================================
// POLICY CONFIGURATION
// ======================================================

const POLICY = {
  MAX_TRANSACTION_AMOUNT: 5000,
  MAX_ITEMS: 10,
};

// ======================================================
// CHECK CART POLICY
// ======================================================

const checkCartPolicy = async (cartData) => {
  try {
    // --------------------------------------------------
    // 1. Check cart exists
    // --------------------------------------------------

    if (!cartData || !cartData.items) {
      return {
        allowed: false,
        reason: "Cart does not exist",
      };
    }

    // --------------------------------------------------
    // 2. Check empty cart
    // --------------------------------------------------

    if (cartData.items.length === 0) {
      return {
        allowed: false,
        reason: "Cart is empty",
      };
    }

    // --------------------------------------------------
    // 3. Check maximum number of items
    // --------------------------------------------------

    let totalQuantity = 0;

    for (const item of cartData.items) {
      totalQuantity += item.quantity;
    }

    if (totalQuantity > POLICY.MAX_ITEMS) {
      return {
        allowed: false,

        reason: `Cart contains ${totalQuantity} items. Maximum allowed is ${POLICY.MAX_ITEMS}.`,
      };
    }

    // --------------------------------------------------
    // 4. Check transaction amount
    // --------------------------------------------------

    if (cartData.total > POLICY.MAX_TRANSACTION_AMOUNT) {
      return {
        allowed: false,

        reason: `Transaction amount ₹${cartData.total} exceeds the maximum allowed amount of ₹${POLICY.MAX_TRANSACTION_AMOUNT}.`,
      };
    }

    // --------------------------------------------------
    // 5. Verify products and stock
    // --------------------------------------------------

    for (const item of cartData.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return {
          allowed: false,

          reason: "A product in the cart no longer exists.",
        };
      }

      // Check current stock
      if (product.stock < item.quantity) {
        return {
          allowed: false,

          reason: `${product.name} does not have enough stock.`,
        };
      }

      // --------------------------------------------------
      // Price verification
      // --------------------------------------------------

      if (product.price !== item.price) {
        return {
          allowed: false,

          priceChanged: true,

          reason: `The price of ${product.name} has changed from ₹${item.price} to ₹${product.price}. Please review the new total before payment.`,
        };
      }
    }

    // --------------------------------------------------
    // 6. Everything passed
    // --------------------------------------------------

    return {
      allowed: true,

      reason: "Cart passed all safety checks.",

      maxTransactionAmount: POLICY.MAX_TRANSACTION_AMOUNT,
    };
  } catch (error) {
    console.error("Policy engine error:", error.message);

    // IMPORTANT:
    // Fail closed.
    // If the policy engine itself fails,
    // payment must NOT continue.

    return {
      allowed: false,

      reason: "Unable to verify cart safety. Payment has been blocked.",
    };
  }
};

module.exports = {
  POLICY,
  checkCartPolicy,
};
