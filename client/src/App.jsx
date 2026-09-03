import axios from "axios";
import "./index.css";

function App() {

    const handlePayment = async () => {
        try {

            // Load Razorpay Checkout
            const script = document.createElement("script");

            script.src =
                "https://checkout.razorpay.com/v1/checkout.js";

            script.onload = async () => {

                // Create order from backend
                const result = await axios.post(
                    "http://localhost:8000/api/payment/create-order",
                    {
                        amount: 4299
                    }
                );

                const order = result.data.order;

                // Razorpay checkout options
                const options = {

                    key: "YOUR_RAZORPAY_KEY_ID",

                    amount: order.amount,

                    currency: order.currency,

                    name: "AgentCart",

                    description:
                        "AI Commerce Test Payment",

                    order_id: order.id,

                    handler: async function (response) {

                        console.log(
                            "Razorpay response:",
                            response
                        );

                        // Verify payment on backend
                        const verification =
                            await axios.post(
                                "http://localhost:8000/api/payment/verify",
                                response
                            );

                        if (verification.data.success) {

                            alert(
                                "Payment successful and verified! 🎉"
                            );

                        } else {

                            alert(
                                "Payment verification failed."
                            );
                        }
                    },

                    theme: {
                        color: "#635bff"
                    }
                };

                const paymentObject =
                    new window.Razorpay(options);

                paymentObject.open();
            };

            script.onerror = () => {
                alert(
                    "Razorpay SDK failed to load."
                );
            };

            document.body.appendChild(script);

        } catch (error) {

            console.error(
                "Payment error:",
                error
            );

            alert(
                "Something went wrong while creating the payment."
            );
        }
    };


    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#0f1117",
                color: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }}
        >

            <div
                style={{
                    background: "#181b23",
                    padding: "40px",
                    borderRadius: "16px",
                    textAlign: "center",
                    width: "400px"
                }}
            >

                <h1>
                    AgentCart 🛒
                </h1>

                <p>
                    Razorpay Test Payment
                </p>

                <h2>
                    ₹4,299
                </h2>

                <button
                    onClick={handlePayment}
                    style={{
                        padding: "14px 25px",
                        border: "none",
                        borderRadius: "10px",
                        background: "#635bff",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "16px",
                        cursor: "pointer"
                    }}
                >
                    Pay ₹4,299
                </button>

            </div>

        </div>
    );
}

export default App;