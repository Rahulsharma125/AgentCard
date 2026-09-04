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

    const sendMessage = async () => {
        if (!message.trim() || loading) return;

        const userMessage = message.trim();

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
            const response = await axios.post(
                "http://localhost:8000/api/agent/chat",
                {
                    message: userMessage,
                    sessionId: "demo-user-1"
                }
            );

            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: response.data.response
                }
            ]);
        } catch (error) {
            console.error("Agent error:", error);

            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: "Sorry, something went wrong. Please try again."
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    };

    return (
        <div className="app">

            <header className="header">
                <h1>AgentCart 🛒</h1>
                <p>AI-powered commerce with safe payments</p>
            </header>

            <main className="container">

                <div className="agent-card">

                    <h2>AI Shopping Assistant</h2>

                    <div className="chat-box">

                        {messages.map((msg, index) => (
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
                        ))}

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
                                setMessage(e.target.value)
                            }
                            onKeyDown={handleKeyDown}
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