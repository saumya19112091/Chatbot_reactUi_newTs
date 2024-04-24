import { useState, useEffect, useRef, FormEvent } from "react";

interface ChatMessage {
  sender: "You" | "ExtricaBot";
  content: string;
  loading?: boolean; // Add this flag for loading messages
}

const Loader = () => (
  <div className="loader">
    <div className="dot"></div>
    <div className="dot"></div>
    <div className="dot"></div>
  </div>
);

export const ChatUI = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() === "") return;

    // Add user's message
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "You", content: input },
    ]);

    // Add ExtricaBot loader message and then immediately scroll to bottom
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "ExtricaBot", content: "", loading: true },
    ]);

    setTimeout(scrollToBottom, 0);

    setInput(""); // Clear input field after sending
    setIsStreaming(true);

    const response = await fetch(
      "https://chatbot-fastapi-server-tvns.vercel.app/openaiApi",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_input: input,
          unique_session_id: "Saumya",
        }),
      }
    );
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let aiResponse = ""; // Initialize outside the fetch call, but ensure it's reset appropriately for each new message

      const processText = async ({
        done,
        value,
      }: ReadableStreamReadResult<Uint8Array>) => {
        if (done) {
          console.log("Stream finished.");
          setIsStreaming(false);
          aiResponse = ""; // Reset for the next message
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk; // Accumulate chunks

        // Update the ongoing AI response in the chat
        updateOngoingAIResponse(aiResponse);
        setTimeout(scrollToBottom, 0);

        reader.read().then(processText);
      };

      reader.read().then(processText);
    }
  };

  const updateOngoingAIResponse = (cumulativeResponse: string) => {
    setMessages((prevMessages) => {
      // Find the last ExtricaBot message that was marked as loading
      const lastMessageIndex = prevMessages.findIndex(
        (message, index) =>
          message.sender === "ExtricaBot" && index === prevMessages.length - 1
      );

      if (lastMessageIndex !== -1) {
        // Clone the last message to update its content
        const updatedMessage: ChatMessage = {
          ...prevMessages[lastMessageIndex],
          content: cumulativeResponse,
          loading: false, // Immediately set to false on first chunk arrival
        };

        // Create a new array with the updated message
        const updatedMessages = [
          ...prevMessages.slice(0, lastMessageIndex),
          updatedMessage,
        ];

        return updatedMessages;
      } else {
        // If no appropriate message is found, it likely means there's a logic flaw elsewhere
        console.warn(
          "Expected to find a loading message for the AI response but did not."
        );
        return prevMessages;
      }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="overflow-auto">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white p-6 z-10">
          <h1 className="text-3xl font-bold text-center">
            <span className="text-orange-500">AI </span>
            <span className="text-blue-500">TESTING</span>
          </h1>
        </div>

        {/* Chat container with padding */}
        <div className="px-10 py-2 mx-36">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-2 text-sm ${
                message.sender === "You" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block max-w-xs sm:max-w-40 md:max-w-md lg:max-w-lg break-words ${
                  message.sender === "You"
                    ? "bg-blue-100 text-gray-800 p-2 rounded"
                    : "bg-orange-100 text-gray-800 p-2 rounded"
                }`}
              >
                {message.loading ? <Loader /> : <p>{message.content}</p>}
                <div ref={messagesEndRef} hidden={true}>
                  Hidden Div
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSendMessage}
        className="mt-auto p-4 bg-white border-t border-gray-300"
      >
        <div className="mx-28 flex space-x-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message"
            className={`flex-1 p-2 rounded ${
              isStreaming ? "bg-gray-200" : "bg-white"
            }`}
            disabled={isStreaming}
          />
          <button
            type="submit"
            className={`bg-blue-500 text-white px-4 py-2 rounded ${
              isStreaming ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isStreaming || input.trim() === ""}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
