const dotenv = require("dotenv");
const connectDB = require("../config/db");
const { searchProducts } = require("./tools");

dotenv.config();

const testAgent = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Search products
    const query = "running";

    const products = await searchProducts(query);

    console.log("\nAI Agent Search Results:\n");

    products.forEach((product) => {
      console.log(
        `${product.name} - ₹${product.price} - Stock: ${product.stock}`,
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Agent test failed:", error.message);
    process.exit(1);
  }
};

testAgent();
