require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { searchProducts } = require("./tools");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const runAgent = async (userMessage) => {
  try {
    const products = await searchProducts(userMessage);

    const productData = products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
    }));

    const prompt = `
You are AgentCart, an AI shopping assistant.

Help the user find the best product from the available products.

Rules:
1. Only recommend products from the provided product list.
2. Never invent products.
3. Never invent prices.
4. Only recommend products that are in stock.
5. Consider the user's budget if mentioned.
6. Explain briefly why your recommendation matches.
7. You cannot make payments.
8. You cannot claim an order has been completed.
9. If nothing matches, clearly tell the user.

User request:
${userMessage}

Available products:
${JSON.stringify(productData)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("AI Agent error:", error.message);
    return "Sorry, I could not process your request.";
  }
};

module.exports = {
  runAgent,
};
