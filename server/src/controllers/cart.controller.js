const Cart = require("../models/Cart");
const Product = require("../models/Product");

const addToCart = async (req, res) => {
  try {
    const { sessionId, productId, quantity = 1 } = req.body;

    if (!sessionId || !productId) {
      return res.status(400).json({
        success: false,
        message: "sessionId and productId are required",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units of ${product.name} are available`,
      });
    }

    let cart = await Cart.findOne({ sessionId });

    if (!cart) {
      cart = await Cart.create({
        sessionId,
        items: [
          {
            product: productId,
            quantity,
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
          return res.status(400).json({
            success: false,
            message: `Only ${product.stock} units of ${product.name} are available`,
          });
        }

        existingItem.quantity = newQuantity;

        // Keep the original price snapshot.
        // This allows us to detect a later price change.
      } else {
        cart.items.push({
          product: productId,
          quantity,
          priceSnapshot: product.price,
        });
      }

      await cart.save();
    }

    const updatedCart = await Cart.findOne({ sessionId }).populate(
      "items.product",
    );

    return res.status(200).json({
      success: true,
      message: `${product.name} added to cart successfully`,
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Add to cart error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
};

const getCart = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const cart = await Cart.findOne({ sessionId }).populate("items.product");

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: {
          sessionId,
          items: [],
        },
      });
    }

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Get cart error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const cart = await Cart.findOneAndDelete({ sessionId });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is already empty",
        cart: {
          sessionId,
          items: [],
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart: {
        sessionId,
        items: [],
      },
    });
  } catch (error) {
    console.error("Clear cart error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  clearCart,
};
