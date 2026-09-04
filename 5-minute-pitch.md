# AgentCart — 5-Minute Buildathon Pitch

## 0:00–0:30 — Opening

"Today, people shop by clicking.

But AI buyers don't want to click through ten pages.

They want to say:

**'Find me running shoes under ₹4000, add the best option, and let me check out.'**

The problem is that giving an AI direct access to payments is dangerous.

So I built **AgentCart** — an AI-native commerce layer designed to make merchants transactable by AI buyers while keeping every money action explainable, bounded, and gated."

---

## 0:30–1:15 — The Problem

"An AI shopping agent needs more than product search.

It needs to understand:

- what products exist,
- what is in stock,
- what the current price is,
- what it can add to a cart,
- how much the transaction is,
- and most importantly, when it is actually allowed to pay.

If we simply give an LLM a payment API, the model becomes part of the money-moving path with too much freedom.

AgentCart separates those responsibilities."

---

## 1:15–2:15 — Live Demo: Discovery → Cart

Open AgentCart.

Say:

> **'Find running shoes under ₹4000.'**

"AgentCart searches the merchant catalog and finds the Nike Air Max Running Shoes for ₹3799.

Notice that the interaction is natural language — there is no need to manually navigate a product page."

Then type:

> **'yes'**

"The controlled cart tool adds the product."

Then:

> **'checkout'**

"Before payment, the backend calculates the transaction and runs the safety policy."

---

## 2:15–3:15 — Safety Gate

"Here is the most important part of the architecture.

The AI does not have a direct charge-customer function.

Instead:

**LLM → Controlled Tool → Policy Engine → User Confirmation → Razorpay**

For this prototype, one policy is a maximum transaction amount of ₹5000."

Demonstrate or explain:

"If the cart becomes ₹7598, checkout is blocked:

**Transaction amount ₹7598 exceeds the maximum allowed amount of ₹5000.**

The agent cannot simply decide to ignore that rule."

Then return to the valid ₹3799 cart.

---

## 3:15–4:00 — Explicit Payment Approval

Say:

> **'confirm payment'**

"Only after explicit user approval does AgentCart create a Razorpay Test Mode order and open checkout."

Show the Razorpay Test Checkout.

Complete the test payment.

"The payment response is then sent back to the backend for verification.

So the AI handles intent and recommendations, while deterministic backend code controls money."

---

## 4:00–4:30 — Architecture

"Under the hood, the frontend is React and Vite.

The backend is Node and Express.

MongoDB stores the commerce data.

Google Gemini powers the natural-language agent.

The agent uses controlled tools for search, cart operations, totals, and checkout requests.

The policy engine sits between checkout intent and payment.

And Razorpay handles the payment layer in Test Mode."

---

## 4:30–5:00 — Why This Matters

"The bigger idea behind AgentCart is not just an AI shopping chatbot.

It is a commerce control layer for the emerging world of AI buyers.

Merchants need to become machine-readable and transactable:

**structured catalog + controlled actions + policy enforcement + explicit authorization + payment verification.**

My goal isn't to give an AI access to payments.

**It's to make AI commerce possible while keeping every money action explainable, bounded, and gated.**

That's AgentCart."

---

# Backup Q&A

## Why not let Gemini directly call Razorpay?

"Because an LLM should not have unrestricted authority over money.

Gemini can decide what the user is trying to accomplish, but deterministic backend code decides whether a transaction is valid and whether payment can proceed."

## What happens if the cart exceeds the limit?

"The policy engine blocks checkout before the Razorpay order is created."

## Why Razorpay Test Mode?

"The buildathon requires Razorpay test-mode APIs, so the prototype demonstrates the complete payment lifecycle without using real customer money."

## What happens if payment fails?

"The frontend listens for the payment failure event and the user can retry. Payment verification is also handled on the backend."

## What would you build next?

"I would add persistent audit events, merchant analytics, AI upsell/cross-sell, inventory reservation, and stronger idempotency around payment creation."

## What is the most important engineering decision?

"Separating AI decision-making from money authorization. The model can recommend and request actions, but policy and backend controls decide whether money can move."
