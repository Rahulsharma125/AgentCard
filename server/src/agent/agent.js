const { GoogleGenAI } = require("@google/genai");

const {
  searchProducts,
  addToCart,
  calculateTotal,
  clearCart,
  requestCheckout,
  searchProductsTool,
  addToCartTool,
  calculateTotalTool,
  requestCheckoutTool,
} = require("./tools");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const sessionContext = new Map();

const createContext = () => ({
  history: [],
  lastSearchProducts: [],
  lastRecommendedProduct: null,
  checkoutReady: false,
});

const getContext = (sessionId) => {
  let context = sessionContext.get(sessionId);

  if (!context) {
    context = createContext();
    sessionContext.set(sessionId, context);
  }

  return context;
};

const saveHistory = (context, userMessage, assistantMessage) => {
  context.history.push({
    role: "user",
    text: userMessage,
  });

  context.history.push({
    role: "assistant",
    text: assistantMessage,
  });

  if (context.history.length > 20) {
    context.history = context.history.slice(-20);
  }
};

/* =====================================================
   DIRECT COMMAND DETECTION
===================================================== */

const isCartTotalRequest = (message) => {
  const text = message.toLowerCase().trim();

  const keywords = [
    "cart total",
    "total of my cart",
    "total in my cart",
    "how much is my cart",
    "how much do i have to pay",
    "how much do i pay",
    "what is my total",
    "what's my total",
    "show cart total",
  ];

  return keywords.some((keyword) => text.includes(keyword));
};

const isClearCartRequest = (message) => {
  const text = message.toLowerCase().trim();

  const commands = [
    "clear cart",
    "clear the cart",
    "empty cart",
    "empty the cart",
    "remove everything from cart",
    "remove all from cart",
    "delete cart",
  ];

  return commands.includes(text);
};

const isCheckoutRequest = (message) => {
  const text = message.toLowerCase().trim();

  const keywords = [
    "checkout",
    "check out",
    "proceed to checkout",
    "go to checkout",
    "buy now",
    "place my order",
  ];

  return keywords.some((keyword) => text.includes(keyword));
};

const isPaymentConfirmation = (message) => {
  const text = message.toLowerCase().trim();

  const confirmations = [
    "confirm",
    "confirm payment",
    "yes pay",
    "yes, pay",
    "pay now",
    "make payment",
    "proceed with payment",
    "proceed to payment",
    "yes proceed",
    "yes, proceed",
    "yes confirm",
    "yes, confirm",
  ];

  return confirmations.includes(text);
};

const isAddConfirmation = (message) => {
  const text = message.toLowerCase().trim();

  const confirmations = [
    "yes",
    "yes please",
    "yes add it",
    "yes, add it",
    "add it",
    "add that",
    "add this",
    "okay add it",
    "ok add it",
    "add it to cart",
    "add that to cart",
    "add this to cart",
  ];

  return confirmations.includes(text);
};

/* =====================================================
   PRODUCT SEARCH FALLBACK
===================================================== */

const extractBudget = (message) => {
  const text = message.toLowerCase();

  const patterns = [
    /under\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /below\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /less\s+than\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /within\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /upto\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /up\s*to\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i,
    /(?:₹|rs\.?|inr)\s*([\d,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      const budget = Number(match[1].replace(/,/g, ""));

      if (!Number.isNaN(budget)) {
        return budget;
      }
    }
  }

  return null;
};

const extractSearchQuery = (message) => {
  let query = message.toLowerCase();

  query = query.replace(/under\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, "");

  query = query.replace(/below\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, "");

  query = query.replace(/less\s+than\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, "");

  query = query.replace(/within\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, "");

  query = query.replace(/up\s*to\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, "");

  query = query.replace(/upto\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, "");

  query = query.replace(/(?:₹|rs\.?|inr)\s*[\d,]+/gi, "");

  const stopWords = [
    "find",
    "show",
    "me",
    "some",
    "please",
    "i",
    "want",
    "need",
    "looking",
    "for",
    "give",
    "get",
    "search",
    "searching",
    "products",
    "product",
    "under",
    "below",
    "less",
    "than",
    "within",
    "budget",
    "price",
    "priced",
    "around",
    "with",
  ];

  const words = query.split(/\s+/).filter(Boolean);

  const filteredWords = words.filter(
    (word) => !stopWords.includes(word.replace(/[^\w]/g, "")),
  );

  return filteredWords.join(" ").trim();
};

const rankProducts = (products, searchQuery) => {
  const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

  return [...products].sort((a, b) => {
    const aText = `${a.name} ${a.description} ${a.category}`.toLowerCase();

    const bText = `${b.name} ${b.description} ${b.category}`.toLowerCase();

    let aScore = 0;
    let bScore = 0;

    for (const word of queryWords) {
      if (a.name.toLowerCase().includes(word)) {
        aScore += 5;
      }

      if (a.category.toLowerCase().includes(word)) {
        aScore += 3;
      }

      if (a.description.toLowerCase().includes(word)) {
        aScore += 1;
      }

      if (b.name.toLowerCase().includes(word)) {
        bScore += 5;
      }

      if (b.category.toLowerCase().includes(word)) {
        bScore += 3;
      }

      if (b.description.toLowerCase().includes(word)) {
        bScore += 1;
      }
    }

    return bScore - aScore;
  });
};

const fallbackProductSearch = async (message, sessionId, context) => {
  console.log("Using backend product search fallback...");

  const budget = extractBudget(message);

  const searchQuery = extractSearchQuery(message);

  console.log(`Fallback search query: "${searchQuery}"`);

  console.log(`Fallback budget: ${budget ?? "none"}`);

  if (!searchQuery) {
    return null;
  }

  let products = await searchProducts(searchQuery);

  products = products.filter((product) => product.stock > 0);

  if (budget !== null) {
    products = products.filter((product) => product.price <= budget);
  }

  products = rankProducts(products, searchQuery);

  if (products.length === 0) {
    const finalResponse =
      budget !== null
        ? `I couldn't find any in-stock ${searchQuery} products under ₹${budget}.`
        : `I couldn't find any in-stock products matching "${searchQuery}".`;

    saveHistory(context, message, finalResponse);

    return finalResponse;
  }

  context.lastSearchProducts = products;

  context.lastRecommendedProduct = products[0];

  let finalResponse = "I found these products:\n\n";

  products.slice(0, 5).forEach((product, index) => {
    finalResponse += `${index + 1}. ${product.name} - ₹${product.price}\n`;
  });

  finalResponse += "\nWould you like me to add one to your cart?";

  saveHistory(context, message, finalResponse);

  return finalResponse;
};

/* =====================================================
   CART TOTAL
===================================================== */

const handleCartTotal = async (message, sessionId, context) => {
  console.log("Direct backend command: calculate_total");

  const result = await calculateTotal(sessionId);

  let finalResponse;

  if (!result.success) {
    finalResponse = result.message;
  } else {
    finalResponse = `Your cart total is ₹${result.total}.`;
  }

  saveHistory(context, message, finalResponse);

  return finalResponse;
};

/* =====================================================
   CLEAR CART
===================================================== */

const handleClearCart = async (message, sessionId, context) => {
  console.log("Direct backend command: clear_cart");

  const result = await clearCart(sessionId);

  const finalResponse = result.message || "Your cart has been cleared.";

  saveHistory(context, message, finalResponse);

  context.lastRecommendedProduct = null;

  context.lastSearchProducts = [];

  context.checkoutReady = false;

  return finalResponse;
};

/* =====================================================
   CHECKOUT
===================================================== */

const handleCheckout = async (message, sessionId, context) => {
  console.log("Direct backend command: request_checkout");

  const result = await requestCheckout(sessionId);

  if (result.success && result.allowed && result.requiresConfirmation) {
    context.checkoutReady = true;

    const finalResponse =
      `Your checkout is ready.\n\n` +
      `Total: ₹${result.total}\n\n` +
      `Payment has NOT been made yet.\n` +
      `Please confirm payment to proceed.`;

    saveHistory(context, message, finalResponse);

    return finalResponse;
  }

  context.checkoutReady = false;

  const finalResponse = result.message || "Checkout could not be prepared.";

  saveHistory(context, message, finalResponse);

  return finalResponse;
};

/* =====================================================
   PAYMENT CONFIRMATION
===================================================== */

const handlePaymentConfirmation = async (message, sessionId, context) => {
  console.log(`Payment confirmation received for session: ${sessionId}`);

  /*
   * IMPORTANT:
   *
   * Before allowing payment, verify the cart
   * again. This protects against:
   *
   * - price changes
   * - stock changes
   * - invalid cart
   * - transaction limit
   */

  const checkoutResult = await requestCheckout(sessionId);

  if (
    !checkoutResult.success ||
    !checkoutResult.allowed ||
    !checkoutResult.requiresConfirmation
  ) {
    context.checkoutReady = false;

    const finalResponse =
      checkoutResult.message ||
      "Payment cannot proceed because the cart failed safety checks.";

    saveHistory(context, message, finalResponse);

    return finalResponse;
  }

  /*
   * Payment approval has been recorded.
   *
   * IMPORTANT:
   * This function does NOT charge the user.
   *
   * The frontend will now open Razorpay Checkout.
   */

  context.checkoutReady = false;

  const finalResponse = {
    type: "payment_confirmation",

    message: "Payment confirmed. Please proceed to Razorpay checkout.",

    sessionId: sessionId,

    total: checkoutResult.total,
  };

  saveHistory(context, message, finalResponse.message);

  return finalResponse;
};

/* =====================================================
   ADD PRODUCT CONFIRMATION
===================================================== */

const handleAddConfirmation = async (message, sessionId, context) => {
  const product = context.lastRecommendedProduct;

  if (!product) {
    return null;
  }

  console.log(`Adding remembered product: ${product.name}`);

  const result = await addToCart(sessionId, product._id.toString(), 1);

  if (result.success) {
    saveHistory(context, message, result.message);

    context.lastRecommendedProduct = null;

    return result.message;
  }

  return result.message;
};

/* =====================================================
   MAIN AGENT
===================================================== */

const runAgent = async (message, sessionId = "demo-user-1") => {
  try {
    const context = getContext(sessionId);

    const normalizedMessage = message.trim().toLowerCase();

    /*
     * 1. PAYMENT CONFIRMATION
     *
     * IMPORTANT:
     * We check payment confirmation BEFORE
     * normal product searching.
     *
     * We also verify the cart again.
     */

    if (isPaymentConfirmation(normalizedMessage)) {
      /*
       * Only allow payment confirmation
       * if checkout was prepared.
       *
       * If context was lost because of a
       * server restart, reconstruct it by
       * checking the cart.
       */

      if (context.checkoutReady) {
        return await handlePaymentConfirmation(message, sessionId, context);
      }

      /*
       * Recover checkout state.
       *
       * This is useful after a frontend refresh
       * or backend context reset.
       */

      const checkoutResult = await requestCheckout(sessionId);

      if (
        checkoutResult.success &&
        checkoutResult.allowed &&
        checkoutResult.requiresConfirmation
      ) {
        context.checkoutReady = true;

        return await handlePaymentConfirmation(message, sessionId, context);
      }
    }

    /*
     * 2. CART TOTAL
     */

    if (isCartTotalRequest(normalizedMessage)) {
      return await handleCartTotal(message, sessionId, context);
    }

    /*
     * 3. CLEAR CART
     */

    if (isClearCartRequest(normalizedMessage)) {
      return await handleClearCart(message, sessionId, context);
    }

    /*
     * 4. CHECKOUT
     */

    if (isCheckoutRequest(normalizedMessage)) {
      return await handleCheckout(message, sessionId, context);
    }

    /*
     * 5. ADD PRODUCT CONFIRMATION
     */

    if (
      isAddConfirmation(normalizedMessage) &&
      context.lastRecommendedProduct
    ) {
      return await handleAddConfirmation(message, sessionId, context);
    }

    /* =================================================
           GEMINI
        ================================================= */

    console.log("Sending request to Gemini...");

    const systemInstruction = `
You are AgentCart AI, an AI shopping assistant.

Your job is to help users discover products and prepare
safe purchases.

RULES:

1. Use search_products when the user is looking for products.

2. Only recommend products that actually exist in the
AgentCart catalog.

3. Respect user requirements such as price limits,
categories and product type.

4. Use add_to_cart only when the user explicitly asks
to add a specific product.

5. Use calculate_total when the user asks about their
cart total.

6. Use request_checkout when the user wants to checkout.

7. request_checkout NEVER makes a payment.

8. Payment ALWAYS requires explicit user confirmation.

9. NEVER claim that a payment was completed unless the
backend confirms it.

10. Never invent product names, prices or stock.

11. Keep responses concise and natural.

12. If the user asks for products under a budget,
do not recommend products above that budget.

13. When recommending a product, clearly mention its
name and price.

14. When checkout is ready, tell the user the total and
that confirmation is required.

15. Never directly perform a payment.

16. Never create a fake product.

17. Never claim success for a backend operation unless the
backend tool actually returned success.
`;

    const userPrompt = `
User message:
${message}

Session ID:
${sessionId}

Previous conversation:
${context.history
  .slice(-10)
  .map((item) => `${item.role}: ${item.text}`)
  .join("\n")}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",

      contents: userPrompt,

      config: {
        systemInstruction,

        tools: [
          {
            functionDeclarations: [
              searchProductsTool,
              addToCartTool,
              calculateTotalTool,
              requestCheckoutTool,
            ],
          },
        ],
      },
    });

    const functionCalls = response.functionCalls || [];

    /*
     * NORMAL GEMINI RESPONSE
     */

    if (functionCalls.length === 0) {
      const finalResponse =
        response.text || "Sorry, I could not generate a response.";

      saveHistory(context, message, finalResponse);

      return finalResponse;
    }

    /*
     * GEMINI TOOL CALLS
     */

    for (const call of functionCalls) {
      console.log(`Gemini tool call: ${call.name}`);

      /*
       * SEARCH PRODUCTS
       */

      if (call.name === "search_products") {
        const result = await searchProducts(call.args.query);

        context.lastSearchProducts = result;

        if (result.length === 0) {
          const finalResponse =
            "I couldn't find any products matching your request.";

          saveHistory(context, message, finalResponse);

          return finalResponse;
        }

        context.lastRecommendedProduct = result[0];

        let finalResponse = "I found these products:\n\n";

        result.slice(0, 5).forEach((product, index) => {
          finalResponse += `${index + 1}. ${product.name} - ₹${product.price}\n`;
        });

        finalResponse += "\nWould you like me to add one to your cart?";

        saveHistory(context, message, finalResponse);

        return finalResponse;
      }

      /*
       * ADD TO CART
       */

      if (call.name === "add_to_cart") {
        const result = await addToCart(
          sessionId,
          call.args.productId,
          call.args.quantity || 1,
        );

        saveHistory(context, message, result.message);

        return result.message;
      }

      /*
       * CALCULATE TOTAL
       */

      if (call.name === "calculate_total") {
        const result = await calculateTotal(sessionId);

        let finalResponse;

        if (!result.success) {
          finalResponse = result.message;
        } else {
          finalResponse = `Your cart total is ₹${result.total}.`;
        }

        saveHistory(context, message, finalResponse);

        return finalResponse;
      }

      /*
       * REQUEST CHECKOUT
       */

      if (call.name === "request_checkout") {
        console.log("Processing checkout request...");

        const result = await requestCheckout(sessionId);

        if (result.success && result.allowed && result.requiresConfirmation) {
          context.checkoutReady = true;
        } else {
          context.checkoutReady = false;
        }

        let finalResponse;

        if (result.success && result.allowed) {
          finalResponse =
            `Your checkout is ready.\n\n` +
            `Total: ₹${result.total}\n\n` +
            `Payment has NOT been made yet. ` +
            `Please confirm payment to proceed.`;
        } else {
          finalResponse = result.message;
        }

        saveHistory(context, message, finalResponse);

        return finalResponse;
      }
    }

    return "I couldn't complete that request.";
  } catch (error) {
    console.error("Agent error:", error.message);

    /*
     * GEMINI 429 FALLBACK
     */

    if (
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("RESOURCE_EXHAUSTED") ||
      error.message?.includes("quota")
    ) {
      console.log("Gemini quota exceeded. Using backend fallback...");

      const context = getContext(sessionId);

      const fallbackResult = await fallbackProductSearch(
        message,
        sessionId,
        context,
      );

      if (fallbackResult) {
        return fallbackResult;
      }

      return (
        "The AI assistant is temporarily rate-limited. " +
        "Please try a product search such as " +
        '"Find running shoes under ₹4000".'
      );
    }

    return "Sorry, I could not process your request.";
  }
};

/* =====================================================
   CHECKOUT ROUTE FUNCTION
===================================================== */

const checkout = async (sessionId) => {
  try {
    const result = await requestCheckout(sessionId);

    const context = getContext(sessionId);

    if (result.success && result.allowed && result.requiresConfirmation) {
      context.checkoutReady = true;
    } else {
      context.checkoutReady = false;
    }

    sessionContext.set(sessionId, context);

    return result;
  } catch (error) {
    console.error("Checkout error:", error.message);

    return {
      success: false,

      allowed: false,

      message: "Checkout verification failed. Payment has been blocked.",
    };
  }
};

module.exports = {
  runAgent,
  requestCheckout: checkout,
};
