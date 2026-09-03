const dotenv = require("dotenv");
const connectDB = require("../config/db");
const { runAgent } = require("./agent");

dotenv.config();

const testAI = async () => {
  try {
    await connectDB();

const result = await runAgent("I need running shoes under 4000 rupees");    console.log("\nAI RESPONSE:\n");
    console.log(result);

    process.exit(0);
  } catch (error) {
    console.error("AI test failed:", error.message);
    process.exit(1);
  }
};

testAI();
