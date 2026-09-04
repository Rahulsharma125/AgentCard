require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const {
  searchProducts,
  addToCart,
  calculateTotal,
  requestCheckout,
  searchProductsTool,
  addToCartTool,
  calculateTotalTool,
  requestCheckoutTool,
} = require("./tools");

// ======================================================
// GEMINI CONFIGURATION
// ======================================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ======================================================
// SESSION CONTEXT
// ======================================================

// Stores the last searched products and the last
// product recommended to each user/session.
const sessionContext = new Map();

// ======================================================
// HELPER: CHECK EXPLICIT ADD-TO-CART REQUEST
// ======================================================

const isAddToCartRequest = (message) => {
  const text = message.toLowerCase().trim();

  return (
    text.includes("add") &&
    (text.includes("cart") ||
      text.includes("to my cart") ||
      text.includes("to the cart"))
  );
};

// ======================================================
// HELPER: FIND PRODUCT FROM USER MESSAGE
// ======================================================

const findProductInMessage = (message, products) => {
  if (!products || products.length === 0) {
    return null;
  }

  const text = message.toLowerCase();

  // First try exact/full product-name match
  for (const product of products) {
    if (text.includes(product.name.toLowerCase())) {
      return product;
    }
  }

  // Then try matching important words from product name
  let bestProduct = null;
  let bestScore = 0;

  for (const product of products) {
    const words = product.name
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);

    let score = 0;

    for (const word of words) {
      if (text.includes(word)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestProduct = product;
    }
  }

  return bestProduct;
};

// ======================================================
// HELPER: FORMAT FINAL AI RESPONSE FOR INR
// ======================================================

const formatCurrencyResponse = (text) => {
  if (!text) {
    return "";
  }

  // AgentCart uses Indian Rupees only.
  // If Gemini accidentally writes $, convert it to ₹.
  return text.replace(/\$/g, "₹");
};

// ======================================================
// RUN AGENT
// ======================================================

const runAgent = async (userMessage, sessionId = "demo-user-1") => {
  try {
    // ==================================================
    // 0. GET SESSION CONTEXT
    // ==================================================

    let context = sessionContext.get(sessionId);

    if (!context) {
      context = {
        lastSearchProducts: [],
        lastRecommendedProduct: null,
      };

      sessionContext.set(sessionId, context);
    }

    // ==================================================
    // 0A. DIRECT ADD-TO-CART HANDLING
    // ==================================================

    // If the user explicitly names a product, we first
    // check whether we already know that product from
    // a previous search.
    //
    // This prevents Gemini from getting confused and
    // searching for "running shoes" instead of adding
    // the requested product.

    if (isAddToCartRequest(userMessage)) {
      const requestedProduct = findProductInMessage(
        userMessage,
        context.lastSearchProducts,
      );

      if (requestedProduct) {
        console.log(`\nDirect product match: ${requestedProduct.name}`);

        console.log(`Direct add-to-cart: ${requestedProduct.id}`);

        const result = await addToCart(sessionId, requestedProduct.id, 1);

        if (result.success) {
          return `Done! ${requestedProduct.name} has been added to your cart for ₹${requestedProduct.price}.`;
        }

        return result.message;
      }

      // If the exact product wasn't in previous search
      // results, allow Gemini to search for it.
    }

    // ==================================================
    // 0B. HANDLE "YES, ADD IT" STYLE REQUESTS
    // ==================================================

    const lowerMessage = userMessage.toLowerCase().trim();

    const isConfirmationAdd =
      lowerMessage === "yes" ||
      lowerMessage === "yeah" ||
      lowerMessage === "yep" ||
      lowerMessage === "sure" ||
      lowerMessage === "okay" ||
      lowerMessage === "ok" ||
      lowerMessage.includes("yes, add it") ||
      lowerMessage.includes("yes add it") ||
      lowerMessage.includes("add it") ||
      lowerMessage.includes("add that") ||
      lowerMessage.includes("add this");

    if (isConfirmationAdd && context.lastRecommendedProduct) {
      const product = context.lastRecommendedProduct;

      console.log(`\nUsing remembered product: ${product.name}`);

      const result = await addToCart(sessionId, product.id, 1);

      if (result.success) {
        return `Done! ${product.name} has been added to your cart for ₹${product.price}.`;
      }

      return result.message;
    }

    // ==================================================
    // 1. ASK GEMINI
    // ==================================================

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",

      contents: userMessage,

      config: {
        // ==================================================
        // TOOLS
        // ==================================================

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

        // ==================================================
        // AGENT INSTRUCTIONS
        // ==================================================

        systemInstruction: `
You are AgentCart, an AI shopping assistant.

Your job is to help users discover products, manage their cart,
calculate totals, and prepare checkout safely.

CURRENCY:
----------
AgentCart operates in India.

ALL product prices, cart totals, transaction amounts,
budgets, and payment amounts are in Indian Rupees (INR).

Always display Indian currency using the ₹ symbol.

NEVER use:
- $
- USD
- dollars
- US dollars

For example:
Correct: ₹3,799
Correct: ₹17,194
Wrong: $3,799
Wrong: $17,194
Wrong: USD 17,194

AVAILABLE TOOLS:

1. search_products
2. add_to_cart
3. calculate_total
4. request_checkout


IMPORTANT TOOL RULES:

PRODUCT SEARCH
--------------

If the user asks to:

- find a product
- search for a product
- show products
- recommend products
- find something under a budget

YOU MUST use search_products.


PRODUCT RECOMMENDATIONS
-----------------------

Only recommend products returned by search_products.

Never invent:

- products
- prices
- stock information


ADD TO CART
-----------

If the user explicitly asks to add a product to the cart,
use add_to_cart.

If you do not know the exact productId:

1. Use search_products first.
2. Find the requested product in the search results.
3. Use the exact productId returned by search_products.
4. Then call add_to_cart.

Never invent a productId.

Never claim that something was added unless add_to_cart
returns success: true.


CART TOTAL
----------

If the user asks:

- What is my cart total?
- How much is my cart?
- What is the total?
- How much do I need to pay?

use calculate_total.

Always use the tool for the current total.

Never calculate the current cart total from memory.

When reporting the result:

- Use ₹ for Indian Rupees.
- Do not use $.
- Do not use USD.
- Do not use dollars.

Example:

"The current cart total is ₹17,194."

CHECKOUT
--------

If the user says:

- checkout
- I want to checkout
- proceed to checkout
- ready to pay
- buy now
- proceed with my purchase
- take me to payment

YOU MUST call request_checkout.

request_checkout does NOT make a payment.

It only:

1. Gets the current cart
2. Calculates the current total
3. Checks safety policies
4. Prepares a checkout summary


PAYMENT SAFETY
--------------

You cannot directly make payments.

You cannot directly charge the user.

You cannot claim payment was completed.

Explicit user confirmation is required before payment.

Never bypass the Policy Engine.


CHECKOUT RESPONSE
-----------------

If request_checkout returns:

allowed: true

Tell the user:

- what they are buying
- quantity
- current price
- total in ₹
- that safety checks passed
- that confirmation is required before payment

If request_checkout returns:

allowed: false

Explain why checkout was blocked.

Do not tell the user that payment was successful.


PRICE CHANGES
-------------

If the Policy Engine reports a price change,
tell the user that the price changed and that
they need to review the new amount before payment.


STOCK
-----

Never recommend or purchase products that are out of stock.


BUDGET
------

If the user provides a budget, respect it.

Do not recommend products above the user's stated budget
unless clearly explaining that they exceed the budget.


GENERAL
-------

Be concise, friendly, and helpful.

Never invent information.

Never bypass safety checks.

Always use Indian Rupees (₹) for money values.
`,
      },
    });

    // ==================================================
    // 2. CHECK IF GEMINI CALLED A TOOL
    // ==================================================

    const functionCalls = response.functionCalls;

    // No tool call
    if (!functionCalls || functionCalls.length === 0) {
      return formatCurrencyResponse(response.text);
    }

    console.log(
      "\nGemini requested:",
      functionCalls.map((call) => call.name).join(", "),
    );

    // Store tool responses
    const functionResponses = [];

    // ==================================================
    // 3. EXECUTE TOOL CALLS
    // ==================================================

    for (const call of functionCalls) {
      // ==================================================
      // SEARCH PRODUCTS
      // ==================================================

      if (call.name === "search_products") {
        const query = call.args.query;

        console.log(`\nAI called search_products("${query}")`);

        const products = await searchProducts(query);

        const productData = products.map((product) => ({
          id: product._id.toString(),
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stock: product.stock,
        }));

        // ----------------------------------------------
        // SAVE SEARCH RESULTS IN SESSION
        // ----------------------------------------------

        context.lastSearchProducts = productData;

        // Clear old recommendation because we have
        // started a new search.
        context.lastRecommendedProduct = null;

        sessionContext.set(sessionId, context);

        functionResponses.push({
          name: call.name,

          response: {
            products: productData,
          },

          id: call.id,
        });
      }

      // ==================================================
      // ADD TO CART
      // ==================================================
      else if (call.name === "add_to_cart") {
        const productId = call.args.productId;

        const quantity = call.args.quantity || 1;

        console.log(`\nAI called add_to_cart("${productId}", ${quantity})`);

        const result = await addToCart(sessionId, productId, quantity);

        functionResponses.push({
          name: call.name,

          response: result,

          id: call.id,
        });
      }

      // ==================================================
      // CALCULATE TOTAL
      // ==================================================
      else if (call.name === "calculate_total") {
        console.log("\nAI called calculate_total()");

        const result = await calculateTotal(sessionId);

        functionResponses.push({
          name: call.name,

          response: result,

          id: call.id,
        });
      }

      // ==================================================
      // REQUEST CHECKOUT
      // ==================================================
      else if (call.name === "request_checkout") {
        console.log("\nAI called request_checkout()");

        const result = await requestCheckout(sessionId);

        functionResponses.push({
          name: call.name,

          response: result,

          id: call.id,
        });
      }

      // ==================================================
      // UNKNOWN TOOL
      // ==================================================
      else {
        console.log(`Unknown tool requested: ${call.name}`);

        functionResponses.push({
          name: call.name,

          response: {
            success: false,
            message: "Unknown tool",
          },

          id: call.id,
        });
      }
    }

    // ==================================================
    // 4. CONTINUE SAME GEMINI CONVERSATION
    // ==================================================

    const contents = [
      // Original user message
      {
        role: "user",

        parts: [
          {
            text: userMessage,
          },
        ],
      },

      // Preserve Gemini's COMPLETE response.
      //
      // Important for Gemini function calling because
      // thought signatures must be preserved.
      response.candidates[0].content,

      // Tool results
      {
        role: "user",

        parts: functionResponses.map((result) => ({
          functionResponse: result,
        })),
      },
    ];

    // ==================================================
    // 5. ASK GEMINI FOR FINAL RESPONSE
    // ==================================================

    const finalResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",

      contents,

      config: {
        systemInstruction: `
You are AgentCart, an AI shopping assistant.

Use the tool results to provide the final response.

CURRENCY RULE:
--------------

AgentCart uses Indian Rupees (INR).

Every monetary value MUST use the ₹ symbol.

NEVER write:
- $
- USD
- dollars
- US dollars

For example:

Correct:
₹3,799
₹999
₹17,194

Incorrect:
$3,799
$999
$17,194
USD 17,194

RULES:

1. Never invent products.

2. Never invent prices.

3. Never invent stock information.

4. Respect the user's budget.

5. If search_products returned products,
   recommend only those products.

6. If add_to_cart returned success: true,
   tell the user the product was added.

7. If add_to_cart returned success: false,
   clearly explain why it failed.

8. If calculate_total returned success: true,
   show the current cart total using ₹.

9. If calculate_total says the cart is empty,
   tell the user the cart is empty.

10. If request_checkout returned allowed: true,
    show the checkout summary and tell the user
    that confirmation is required before payment.

11. If request_checkout returned allowed: false,
    explain why checkout was blocked.

12. Never claim that payment was completed.

13. Never claim that an order was completed.

14. request_checkout does NOT make a payment.

15. Keep the response concise and friendly.

16. All prices and totals must be displayed in Indian Rupees (₹).
`,
      },
    });

    // ==================================================
    // 6. REMEMBER RECOMMENDED PRODUCT
    // ==================================================

    const finalText = finalResponse.text || "";

    const products = context.lastSearchProducts || [];

    let recommendedProduct = null;
    let earliestIndex = Infinity;

    // Find the first product name mentioned in the AI
    // response. This becomes the product associated
    // with "yes", "add it", etc.
    for (const product of products) {
      const index = finalText.toLowerCase().indexOf(product.name.toLowerCase());

      if (index !== -1 && index < earliestIndex) {
        earliestIndex = index;
        recommendedProduct = product;
      }
    }

    if (recommendedProduct) {
      context.lastRecommendedProduct = recommendedProduct;

      sessionContext.set(sessionId, context);

      console.log(
        `\nRemembering recommended product: ${recommendedProduct.name}`,
      );
    }

    // ==================================================
    // 7. RETURN FINAL AI RESPONSE
    // ==================================================

    return formatCurrencyResponse(finalText);
  } catch (error) {
    console.error("\nAI Agent error:", error);

    return "Sorry, I could not process your request.";
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  runAgent,
};
