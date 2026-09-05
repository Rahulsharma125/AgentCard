import { useState } from "react";
import axios from "axios";
import "./index.css";

function App() {
    const [message, setMessage] = useState("");

    const [messages, setMessages] = useState([
        {
            role: "ai",
            text: "Hi! 👋 I'm AgentCart AI. What are you looking for today?"
        }
    ]);

    const [loading, setLoading] = useState(false);

    // Razorpay public TEST key
    const RAZORPAY_KEY_ID =
        import.meta.env.VITE_RAZORPAY_KEY_ID;

    // Load Razorpay Checkout script
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const existingScript = document.querySelector(
                'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
            );

            if (existingScript) {
                resolve(true);
                return;
            }

            const script = document.createElement("script");

            script.src =
                "https://checkout.razorpay.com/v1/checkout.js";

            script.onload = () => {
                resolve(true);
            };

            script.onerror = () => {
                resolve(false);
            };

            document.body.appendChild(script);
        });
    };

    // Open Razorpay Checkout
    const openRazorpayCheckout = async (sessionId) => {
        try {
            setLoading(true);

            // Check Razorpay key
            if (!RAZORPAY_KEY_ID) {
                console.error(
                    "Razorpay key is missing."
                );

                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text:
                            "Razorpay configuration error: Test Key ID is missing. Please check client/.env"
                    }
                ]);

                return;
            }

            console.log(
                "Razorpay Test Key loaded:",
                RAZORPAY_KEY_ID
            );

            // Load Razorpay SDK
            const scriptLoaded =
                await loadRazorpayScript();

            if (!scriptLoaded) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text:
                            "Unable to load Razorpay Checkout."
                    }
                ]);

                return;
            }

            // Check Razorpay SDK
            if (!window.Razorpay) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text:
                            "Razorpay Checkout SDK was not initialized correctly."
                    }
                ]);

                return;
            }

            // Create order through backend
            const orderResponse =
                await axios.post(
                    "https://agentcard-1.onrender.com/api/payment/create-order",
                    {
                        sessionId: sessionId
                    }
                );

            if (
                !orderResponse.data ||
                !orderResponse.data.success
            ) {
                const errorMessage =
                    orderResponse.data?.message ||
                    "Unable to create Razorpay order.";

                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text: errorMessage
                    }
                ]);

                return;
            }

            // Razorpay order
            const razorpayOrder =
                orderResponse.data.order;

            if (!razorpayOrder) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text:
                            "Razorpay order was not created correctly."
                    }
                ]);

                return;
            }

            console.log(
                "Razorpay order:",
                razorpayOrder
            );

            // Razorpay configuration
            const options = {
                key: RAZORPAY_KEY_ID,

                amount:
                    razorpayOrder.amount,

                currency:
                    razorpayOrder.currency || "INR",

                name:
                    "AgentCart",

                description:
                    "AgentCart AI Commerce Purchase",

                order_id:
                    razorpayOrder.id,

                handler: async function (
                    paymentResponse
                ) {
                    try {
                        setLoading(true);

                        console.log(
                            "Payment response:",
                            paymentResponse
                        );

                        // Verify payment
                        const verifyResponse =
                            await axios.post(
                                "https://agentcard-1.onrender.com/api/payment/verify",
                                {
                                    sessionId:
                                        sessionId,

                                    razorpay_order_id:
                                        paymentResponse.razorpay_order_id,

                                    razorpay_payment_id:
                                        paymentResponse.razorpay_payment_id,

                                    razorpay_signature:
                                        paymentResponse.razorpay_signature
                                }
                            );

                        if (
                            verifyResponse.data?.success
                        ) {
                            setMessages((prev) => [
                                ...prev,
                                {
                                    role: "ai",
                                    text:
                                        "🎉 Payment successful! Your AgentCart order has been confirmed."
                                }
                            ]);
                        } else {
                            setMessages((prev) => [
                                ...prev,
                                {
                                    role: "ai",
                                    text:
                                        verifyResponse.data?.message ||
                                        "Payment verification failed."
                                }
                            ]);
                        }

                    } catch (error) {
                        console.error(
                            "Payment verification error:",
                            error
                        );

                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "ai",
                                text:
                                    "Payment was completed, but verification failed."
                            }
                        ]);

                    } finally {
                        setLoading(false);
                    }
                },

                modal: {
                    ondismiss: function () {
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "ai",
                                text:
                                    "Payment was cancelled. No payment was completed."
                            }
                        ]);

                        setLoading(false);
                    }
                }
            };

            // Create Razorpay instance
            const razorpay =
                new window.Razorpay(options);

            // Payment failed event
            razorpay.on(
                "payment.failed",
                function (response) {
                    console.error(
                        "Razorpay payment failed:",
                        response
                    );

                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "ai",
                            text:
                                "Payment failed. No successful payment was completed. You can try again."
                        }
                    ]);

                    setLoading(false);
                }
            );

            // Open Razorpay
            razorpay.open();

        } catch (error) {
            console.error(
                "Razorpay checkout error:",
                error
            );

            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text:
                        error.response?.data?.message ||
                        "Unable to start Razorpay checkout."
                }
            ]);

            setLoading(false);
        }
    };

    // Send message to AI
    const sendMessage = async () => {
        if (
            !message.trim() ||
            loading
        ) {
            return;
        }

        const userMessage =
            message.trim();

        // Add user message
        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                text: userMessage
            }
        ]);

        setMessage("");
        setLoading(true);

        try {
            const response =
                await axios.post(
                    "https://agentcard-1.onrender.com/api/agent/chat",
                    {
                        message:
                            userMessage,

                        sessionId:
                            "demo-user-1"
                    }
                );

            const agentResponse =
                response.data.response;

            // Normal text response
            if (
                typeof agentResponse ===
                "string"
            ) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text:
                            agentResponse
                    }
                ]);

                return;
            }

            // Object response
            if (
                agentResponse &&
                typeof agentResponse ===
                "object"
            ) {

                // Payment confirmation
                if (
                    agentResponse.type ===
                    "payment_confirmation"
                ) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "ai",
                            text:
                                "Payment approved. Opening Razorpay Test Checkout..."
                        }
                    ]);

                    await openRazorpayCheckout(
                        agentResponse.sessionId ||
                        "demo-user-1"
                    );

                    return;
                }

                // Other object response
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "ai",
                        text:
                            agentResponse.message ||
                            "Request completed successfully."
                    }
                ]);

                return;
            }

            // Unexpected response
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text:
                        "Sorry, I received an unexpected response."
                }
            ]);

        } catch (error) {
            console.error(
                "Agent error:",
                error
            );

            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text:
                        error.response?.data?.message ||
                        "Sorry, something went wrong. Please try again."
                }
            ]);

        } finally {
            setLoading(false);
        }
    };

    // Enter key
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    };

    return (
        <div className="app">

            <header className="header">

                <h1>
                    AgentCart 🛒
                </h1>

                <p>
                    AI-powered commerce with safe payments
                </p>

            </header>

            <main className="container">

                <div className="agent-card">

                    <h2>
                        AI Shopping Assistant
                    </h2>

                    <div className="chat-box">

                        {messages.map(
                            (msg, index) => (
                                <div
                                    key={index}
                                    className={
                                        msg.role === "user"
                                            ? "user-message"
                                            : "ai-message"
                                    }
                                >
                                    {msg.text}
                                </div>
                            )
                        )}

                        {loading && (
                            <div className="ai-message">
                                Thinking...
                            </div>
                        )}

                    </div>

                    <div className="input-area">

                        <input
                            type="text"
                            placeholder="Try: Find running shoes under ₹4000"
                            value={message}
                            onChange={(e) =>
                                setMessage(
                                    e.target.value
                                )
                            }
                            onKeyDown={
                                handleKeyDown
                            }
                        />

                        <button
                            onClick={sendMessage}
                            disabled={loading}
                        >
                            Send
                        </button>

                    </div>

                    <div className="suggestions">

                        <button
                            className="suggestion"
                            onClick={() =>
                                setMessage(
                                    "Find running shoes under ₹4000"
                                )
                            }
                        >
                            Running shoes
                        </button>

                        <button
                            className="suggestion"
                            onClick={() =>
                                setMessage(
                                    "Find headphones under ₹2500"
                                )
                            }
                        >
                            Headphones
                        </button>

                        <button
                            className="suggestion"
                            onClick={() =>
                                setMessage(
                                    "Show me fitness products"
                                )
                            }
                        >
                            Fitness
                        </button>

                    </div>

                </div>

            </main>

        </div>
    );
}

export default App;