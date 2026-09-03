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
// RUN AGENT
// ======================================================

const runAgent = async (userMessage, sessionId = "demo-user-1") => {
  try {
    // ==================================================
    // 1. ASK GEMINI
    // ==================================================

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",

      contents: userMessage,

      config: {
        // Give Gemini access to all AgentCart tools
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

Before using add_to_cart, make sure you know the exact
productId returned by search_products.

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

DO NOT simply say that you cannot process checkout.

request_checkout does NOT make a payment.

It only:

1. Gets the current cart
2. Calculates the current total
3. Checks the safety policies
4. Prepares a checkout summary


PAYMENT SAFETY
--------------

You cannot directly make payments.

You cannot directly charge the user.

You cannot claim that payment was completed.

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
- total
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
`,
      },
    });

    // ==================================================
    // 2. CHECK IF GEMINI CALLED A TOOL
    // ==================================================

    const functionCalls = response.functionCalls;

    // No tool call
    if (!functionCalls || functionCalls.length === 0) {
      return response.text;
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

      // IMPORTANT:
      // Preserve Gemini's COMPLETE response.
      //
      // This is important for Gemini 3 function
      // calling because thought signatures must
      // be preserved.
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

RULES:

1. Never invent products.

2. Never invent prices.

3. Never invent stock information.

4. Respect the user's budget.

5. If add_to_cart returned success: true,
   tell the user the product was added.

6. If add_to_cart returned success: false,
   clearly explain why it failed.

7. If calculate_total returned success: true,
   show the current cart total.

8. If calculate_total says the cart is empty,
   tell the user the cart is empty.

9. If request_checkout returned allowed: true,
   show the checkout summary and tell the user
   that confirmation is required before payment.

10. If request_checkout returned allowed: false,
    explain why checkout was blocked.

11. Never claim that payment was completed.

12. Never claim that an order was completed.

13. request_checkout does NOT make a payment.

14. Keep the response concise and friendly.
`,
      },
    });

    // ==================================================
    // 6. RETURN FINAL AI RESPONSE
    // ==================================================

    return finalResponse.text;
  } catch (error) {
    console.error("\nAI Agent error:", error.message);

    return "Sorry, I could not process your request.";
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  runAgent,
};
