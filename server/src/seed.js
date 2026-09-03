const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Product = require("./models/Product");

dotenv.config();

const products = [
  {
    name: "Nike Air Max Running Shoes",
    description: "Lightweight running shoes with comfortable cushioning.",
    price: 3799,
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    stock: 20,
  },
  {
    name: "Adidas Ultraboost Shoes",
    description: "Premium running shoes designed for daily workouts.",
    price: 4999,
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5",
    stock: 15,
  },
  {
    name: "Sports Running Socks",
    description: "Breathable sports socks suitable for running and training.",
    price: 499,
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82",
    stock: 50,
  },
  {
    name: "Smart Fitness Watch",
    description:
      "Fitness watch with activity tracking and heart-rate monitoring.",
    price: 2999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
    stock: 12,
  },
  {
    name: "Wireless Bluetooth Headphones",
    description: "Wireless headphones with clear audio and long battery life.",
    price: 1999,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
    stock: 25,
  },
  {
    name: "Cotton Casual T-Shirt",
    description: "Soft cotton t-shirt for comfortable everyday wear.",
    price: 799,
    category: "Clothing",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
    stock: 40,
  },
  {
    name: "Classic Denim Jeans",
    description: "Regular-fit denim jeans suitable for casual occasions.",
    price: 1799,
    category: "Clothing",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d",
    stock: 30,
  },
  {
    name: "Travel Backpack",
    description: "Durable backpack with multiple compartments for travel.",
    price: 1499,
    category: "Bags",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
    stock: 18,
  },
  {
    name: "Stainless Steel Water Bottle",
    description: "Reusable insulated water bottle for everyday use.",
    price: 699,
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8",
    stock: 35,
  },
  {
    name: "Yoga Mat",
    description: "Non-slip exercise mat suitable for yoga and home workouts.",
    price: 999,
    category: "Fitness",
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f",
    stock: 22,
  },
];

const seedProducts = async () => {
  try {
    await connectDB();

    await Product.deleteMany();

    await Product.insertMany(products);

    console.log("10 products added successfully 🚀");

    process.exit(0);
  } catch (error) {
    console.error("Error adding products:", error.message);
    process.exit(1);
  }
};

seedProducts();
