AI-native commerce with safe, explainable, and bounded payments

AgentCart is an AI-powered commerce layer that lets a user discover products, build a cart, and reach a Razorpay Test Mode checkout through natural language.

The key idea is simple:

Don't give an AI direct access to payments. Give it controlled commerce tools, enforce policy checks, and require explicit user approval before money moves.

Built for the Razorpay AI Buildathon — Track 01: AI Growth & Agentic Commerce.

🎯 Problem

Traditional online stores are designed around human-driven clicks:

Search → Product page → Cart → Checkout → Payment

AI agents change this interaction model. A buyer can simply say:

"Find running shoes under ₹4000."

For this to become real commerce, the merchant needs more than a chatbot. The system needs:

structured product information

machine-readable commerce actions

controlled cart operations

transaction limits

inventory and price checks

explicit payment approval

reliable payment integration

graceful failure handling

AgentCart explores this complete AI-to-commerce flow.

💡 Solution

AgentCart acts as a controlled bridge between an AI shopping agent and a merchant's commerce system.

Example flow

User
  ↓
"Find running shoes under ₹4000"
  ↓
AI Shopping Agent
  ↓
Search Products
  ↓
Recommendation
  ↓
User approves adding product
  ↓
Cart
  ↓
Calculate total
  ↓
Policy Engine
  ↓
Checkout approval
  ↓
Explicit user confirmation
  ↓
Razorpay Test Checkout
  ↓
Payment verification
  ↓
Order confirmation

The AI cannot directly charge a customer.

✨ Key Features

1. Natural-language shopping

Users interact with the store through normal language.

Examples:

Find running shoes under ₹4000
Find headphones under ₹2500
Show me fitness products

2. AI product discovery

The agent searches the merchant catalog and returns relevant products while considering the user's request and budget.

3. Controlled cart tools

The agent can use controlled backend tools for:

product search

adding products to cart

calculating cart total

requesting checkout

clearing the cart

4. Safety policy gate

Before checkout, AgentCart verifies the transaction against bounded rules.

Current example:

Maximum transaction amount = ₹5000

For example, a cart worth ₹7598 is blocked instead of being sent to payment.

5. Explicit payment confirmation

The AI never silently completes payment.

The flow is:

Checkout requested
       ↓
Policy check
       ↓
User confirmation
       ↓
Razorpay checkout

6. Razorpay Test Mode integration

AgentCart creates a Razorpay order on the backend and opens Razorpay Test Checkout on the frontend.

Payment responses are sent back to the backend for verification.

7. Price snapshot protection

Cart items keep the price observed when they were added. Checkout re-checks the current product price before creating the payment order, helping prevent stale-price payments.

8. Graceful failure handling

The system handles cases such as:

transaction exceeding the safety limit

unavailable products

payment failure

cancelled checkout

missing payment configuration

invalid/missing checkout state

🛡️ Safety Architecture

AgentCart follows a gated payment architecture:

LLM
 ↓
Controlled Tool
 ↓
Policy Engine
 ↓
User Approval
 ↓
Payment API

There is deliberately no direct "charge customer" tool exposed to the AI.

Safety principles

Bounded: transaction amount is limited.

Gated: payment requires explicit user confirmation.

Explainable: the user can see what is being purchased and the amount.

Verified: the backend creates and verifies payment data.

Recoverable: failures are surfaced instead of silently continuing.

🏗️ Architecture

flowchart TD
    U[User] --> F[React / Vite Frontend]
    F --> A[AI Shopping Assistant]
    A --> B[Node.js / Express Backend]

    B --> T[Agent Tool Layer]
    T --> S[Search Products]
    T --> C[Cart Tools]
    T --> CT[Calculate Total]
    T --> CO[Request Checkout]

    S --> DB[(MongoDB)]
    C --> DB
    CT --> DB
    CO --> P[Policy Engine]

    P -->|Blocked| X[Explain Block / Ask User to Modify Cart]
    P -->|Allowed| G[Explicit User Confirmation]

    G --> R[Razorpay Test Mode]
    R --> V[Backend Payment Verification]
    V --> O[(Order Data / MongoDB)]

Main stack

Layer

Technology

Frontend

React + Vite

Backend

Node.js + Express

Database

MongoDB + Mongoose

AI

Google Gemini

Payments

Razorpay Test Mode

HTTP Client

Axios

Styling

CSS

Development

VS Code + Git + GitHub

📁 Project Structure

AgentCart/
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   └── ...
│   ├── .env
│   └── package.json
│
└── server/
    ├── src/
    │   ├── agent/
    │   │   ├── agent.js
    │   │   ├── tools.js
    │   │   └── policyEngine.js
    │   │
    │   ├── config/
    │   │   ├── db.js
    │   │   └── razorpay.js
    │   │
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   └── server.js
    │
    ├── .env
    └── package.json

🔌 API Flow

Products

GET /api/products
GET /api/products/search?query=running

Cart

POST /api/cart/add
GET /api/cart/:sessionId
DELETE /api/cart/:sessionId

AI Agent

POST /api/agent/chat

Example:

{
  "message": "Find running shoes under ₹4000",
  "sessionId": "demo-user-1"
}

Payments

POST /api/payment/create-order
POST /api/payment/verify

💳 Payment Safety Flow

A payment request does not immediately create a charge.

User asks to checkout
        ↓
Calculate current total
        ↓
Run policy checks
        ↓
Allowed?
   ↙           ↘
 No             Yes
 ↓               ↓
Block         Ask user to confirm
                  ↓
            Create Razorpay order
                  ↓
           Open Test Checkout
                  ↓
          Verify payment backend
                  ↓
            Confirm order

Example safety block

If the cart contains:

Nike Air Max Running Shoes × 2
₹3799 × 2 = ₹7598

and the maximum allowed transaction is ₹5000:

Transaction amount ₹7598 exceeds
the maximum allowed amount of ₹5000.

The payment is blocked.

This is intentional: the safety boundary wins over convenience.

🧪 Demo Script

A recommended 5-minute demo:

1. Discovery

Find running shoes under ₹4000

Agent recommends:

Nike Air Max Running Shoes — ₹3799

2. Cart

yes

Product is added to the cart.

3. Checkout safety

checkout

Agent checks the transaction against the policy engine.

4. Explicit approval

confirm payment

Only after confirmation does the frontend open Razorpay Test Checkout.

5. Payment

Complete the Razorpay Test Mode payment.

The backend verifies the payment response.

⚠️ Failure Demo

A strong safety demonstration is to deliberately exceed the transaction limit.

Example:

Cart total = ₹7598
Maximum allowed = ₹5000

Expected result:

Transaction amount ₹7598 exceeds the maximum allowed amount of ₹5000.

This demonstrates that the agent cannot bypass the payment boundary.

📊 Growth Opportunities

AgentCart can be extended into a merchant-side AI growth platform with:

AI upsell and cross-sell recommendations

recommendation acceptance rate

cart conversion rate

checkout conversion

average order value

revenue attribution

campaign orchestration

merchant analytics

action/audit history

These are natural extensions of the controlled commerce layer.

🔐 Environment Variables

Server

Create server/.env:

PORT=8000
MONGO_URI=YOUR_MONGODB_URI
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
RAZORPAY_KEY_ID=YOUR_RAZORPAY_TEST_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_TEST_KEY_SECRET

Client

Create client/.env:

VITE_RAZORPAY_KEY_ID=YOUR_RAZORPAY_TEST_KEY_ID

Never commit .env files or payment secrets to GitHub.

▶️ Run Locally

Backend

cd server
npm install
npm run dev

Backend:

http://localhost:8000

Frontend

Open another terminal:

cd client
npm install
npm run dev

Frontend:

http://localhost:5173

🧠 AI Judgment

AgentCart intentionally separates:

What the AI decides

what the user is looking for

which products are relevant

how to explain recommendations

when a controlled commerce tool is useful

What the backend decides

whether the product exists

whether it is in stock

the current price

the transaction total

whether the transaction satisfies policy

whether payment can proceed

payment verification

This separation is critical for safe agentic commerce.

🏁 Buildathon Positioning

AgentCart is not just a chatbot placed on top of an existing store.

It demonstrates the missing infrastructure between:

AI intent → merchant catalog → controlled commerce actions → payment authorization

The goal is:

Make merchants transactable by AI buyers without giving AI unrestricted control over money.

🔮 Future Roadmap

Agent-readable merchant policies

Merchant analytics dashboard

AI upsell/cross-sell engine

Persistent audit event timeline

Idempotency protection for payment creation

Inventory reservation during checkout

Multi-merchant support

Production Razorpay integration

👨‍💻 Built With

React • Vite • Node.js • Express • MongoDB • Mongoose • Google Gemini • Razorpay • Axios

📜 License

This project was created as a buildathon prototype for demonstration and experimentation.