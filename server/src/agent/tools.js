const Product = require("../models/Product");

// AI Agent Tool: Search products
const searchProducts = async (query) => {
  try {
    const products = await Product.find({
      $or: [
        {
          name: {
            $regex: query,
            $options: "i",
          },
        },
        {
          description: {
            $regex: query,
            $options: "i",
          },
        },
        {
          category: {
            $regex: query,
            $options: "i",
          },
        },
      ],
    });

    return products;
  } catch (error) {
    console.error("Agent search error:", error.message);
    return [];
  }
};

module.exports = {
  searchProducts,
};
