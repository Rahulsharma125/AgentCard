const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/db");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const agentRoutes = require("./routes/agent.routes");
const paymentRoutes = require("./routes/payment.routes");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.json({
    message: "AgentCart API is running 🚀",
  });
});

app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/payment", paymentRoutes);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
