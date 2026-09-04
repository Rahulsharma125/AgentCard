const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Price of the product when it was added to the cart
    priceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    items: [cartItemSchema],
  },
  { timestamps: true },
);

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
