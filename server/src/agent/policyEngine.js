const Product = require("../models/Product");

const POLICY = {
  MAX_TRANSACTION_AMOUNT: 5000,
  MAX_ITEMS: 10,
};

const checkCartPolicy = async (cartData) => {
  try {
    if (!cartData || !cartData.items) {
      return {
        allowed: false,
        reason: "Cart does not exist",
      };
    }

    if (cartData.items.length === 0) {
      return {
        allowed: false,
        reason: "Cart is empty",
      };
    }

    // -----------------------------------
    // 1. Maximum quantity check
    // -----------------------------------

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

    // -----------------------------------
    // 2. Maximum transaction amount check
    // -----------------------------------

    if (cartData.total > POLICY.MAX_TRANSACTION_AMOUNT) {
      return {
        allowed: false,
        reason: `Transaction amount ₹${cartData.total} exceeds the maximum allowed amount of ₹${POLICY.MAX_TRANSACTION_AMOUNT}.`,
      };
    }

    // -----------------------------------
    // 3. Product validation
    // -----------------------------------

    for (const item of cartData.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return {
          allowed: false,
          reason: "A product in the cart no longer exists.",
        };
      }

      // -----------------------------------
      // 4. Stock validation
      // -----------------------------------

      if (product.stock < item.quantity) {
        return {
          allowed: false,
          reason: `${product.name} does not have enough stock.`,
        };
      }

      // -----------------------------------
      // 5. Price change validation
      // -----------------------------------

      if (
        item.priceSnapshot !== undefined &&
        item.priceSnapshot !== product.price
      ) {
        return {
          allowed: false,

          priceChanged: true,

          reason:
            `The price of ${product.name} has changed from ` +
            `₹${item.priceSnapshot} to ₹${product.price}. ` +
            `Please review the new total before payment.`,

          productId: product._id.toString(),

          oldPrice: item.priceSnapshot,

          newPrice: product.price,
        };
      }
    }

    // -----------------------------------
    // All policies passed
    // -----------------------------------

    return {
      allowed: true,

      reason: "Cart passed all safety checks.",

      maxTransactionAmount: POLICY.MAX_TRANSACTION_AMOUNT,
    };
  } catch (error) {
    console.error("Policy engine error:", error.message);

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
