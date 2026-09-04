const Product = require("../models/Product");
const Cart = require("../models/Cart");
const { checkCartPolicy } = require("./policyEngine");

const searchProducts = async (query) => {
  try {
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    });

    return products;
  } catch (error) {
    console.error("Agent search error:", error.message);
    return [];
  }
};

const searchProductsTool = {
  name: "search_products",

  description:
    "Search the AgentCart product catalog using a product name, category, or keyword. Use this when the user is looking for products.",

  parameters: {
    type: "object",

    properties: {
      query: {
        type: "string",
        description: "The product or category the user is looking for.",
      },
    },

    required: ["query"],
  },
};

const addToCart = async (sessionId, productId, quantity = 1) => {
  try {
    const product = await Product.findById(productId);

    if (!product) {
      return {
        success: false,
        message: "Product not found",
      };
    }

    if (quantity < 1) {
      return {
        success: false,
        message: "Quantity must be at least 1",
      };
    }

    if (product.stock < quantity) {
      return {
        success: false,
        message: `Only ${product.stock} units of ${product.name} are available`,
      };
    }

    let cart = await Cart.findOne({ sessionId });

    if (!cart) {
      cart = await Cart.create({
        sessionId,

        items: [
          {
            product: productId,
            quantity: quantity,

            // Store the price when the AI adds the product
            priceSnapshot: product.price,
          },
        ],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId,
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;

        if (newQuantity > product.stock) {
          return {
            success: false,
            message: `Only ${product.stock} units of ${product.name} are available`,
          };
        }

        existingItem.quantity = newQuantity;

        // IMPORTANT:
        // Do NOT update priceSnapshot here.
        // We want to remember the original price.
      } else {
        cart.items.push({
          product: productId,
          quantity: quantity,

          // Store the current price for a new cart item
          priceSnapshot: product.price,
        });
      }

      await cart.save();
    }

    const updatedCart = await Cart.findOne({ sessionId }).populate(
      "items.product",
    );

    return {
      success: true,
      message: `${product.name} added to cart successfully`,
      cart: updatedCart,
    };
  } catch (error) {
    console.error("Agent add-to-cart error:", error.message);

    return {
      success: false,
      message: "Failed to add product to cart",
    };
  }
};

const addToCartTool = {
  name: "add_to_cart",

  description:
    "Add a product from the AgentCart catalog to the user's shopping cart. Use this only when the user explicitly asks to add a specific product to their cart.",

  parameters: {
    type: "object",

    properties: {
      productId: {
        type: "string",
        description:
          "The exact MongoDB product ID returned by search_products.",
      },

      quantity: {
        type: "integer",
        description: "The number of units to add to the cart.",
      },
    },

    required: ["productId", "quantity"],
  },
};

const calculateTotal = async (sessionId) => {
  try {
    const cart = await Cart.findOne({ sessionId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: "Cart is empty",
        total: 0,
        items: [],
      };
    }

    let total = 0;

    const items = cart.items.map((item) => {
      const itemTotal = item.product.price * item.quantity;

      total += itemTotal;

      return {
        productId: item.product._id.toString(),
        name: item.product.name,

        // Current merchant price
        price: item.product.price,

        // Price remembered when item was added
        priceSnapshot: item.priceSnapshot,

        quantity: item.quantity,
        itemTotal: itemTotal,
      };
    });

    return {
      success: true,
      items,
      total,
    };
  } catch (error) {
    console.error("Calculate total error:", error.message);

    return {
      success: false,
      message: "Failed to calculate cart total",
      total: 0,
      items: [],
    };
  }
};

const calculateTotalTool = {
  name: "calculate_total",

  description:
    "Calculate the exact current total of the user's shopping cart using current product prices and quantities.",

  parameters: {
    type: "object",

    properties: {},

    required: [],
  },
};

const requestCheckout = async (sessionId) => {
  try {
    const totalResult = await calculateTotal(sessionId);

    if (!totalResult.success) {
      return {
        success: false,
        allowed: false,
        message: totalResult.message,
        total: 0,
      };
    }

    const policyResult = await checkCartPolicy(totalResult);

    if (!policyResult.allowed) {
      return {
        success: false,
        allowed: false,

        message: policyResult.reason,

        priceChanged: policyResult.priceChanged || false,

        total: totalResult.total,

        items: totalResult.items,
      };
    }

    return {
      success: true,
      allowed: true,

      requiresConfirmation: true,

      message:
        "Checkout is ready. User confirmation is required before payment.",

      total: totalResult.total,

      items: totalResult.items,

      policy: policyResult,
    };
  } catch (error) {
    console.error("Checkout request error:", error.message);

    return {
      success: false,
      allowed: false,

      message: "Checkout verification failed. Payment has been blocked.",
    };
  }
};

const requestCheckoutTool = {
  name: "request_checkout",

  description:
    "Prepare the user's cart for checkout. This calculates the current total and runs all safety policies. It NEVER makes a payment. Explicit user confirmation is required before payment.",

  parameters: {
    type: "object",

    properties: {},

    required: [],
  },
};

module.exports = {
  searchProducts,
  addToCart,
  calculateTotal,
  requestCheckout,

  searchProductsTool,
  addToCartTool,
  calculateTotalTool,
  requestCheckoutTool,
};
