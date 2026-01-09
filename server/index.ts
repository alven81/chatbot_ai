import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Validate API keys on startup
if (!process.env.OPENAI_API_KEY && process.env.USE_GOOGLE_LLM !== "true") {
  console.error(
    "❌ ERROR: OPENAI_API_KEY is not set in .env file. Cannot use OpenAI."
  );
  console.error(
    "   Set USE_GOOGLE_LLM=true to use Google Gemini, or add OPENAI_API_KEY"
  );
}

if (process.env.USE_GOOGLE_LLM === "true" && !process.env.GOOGLE_API_KEY) {
  console.error(
    "❌ ERROR: GOOGLE_API_KEY is not set in .env file. Cannot use Google Gemini."
  );
}

// Store chat history per session (in-memory, for demo purposes)
const chatHistories: Map<string, BaseMessage[]> = new Map();

// Initialize LLM - using OpenAI gpt-4o-mini by default (requires paid account)
// To use Google Gemini (limited free tier), set USE_GOOGLE_LLM=true in .env
// To use local Ollama (completely free), set USE_OLLAMA=true in .env
const useLLM =
  process.env.USE_OLLAMA === "true"
    ? new ChatOpenAI({
        model: "llama2",
        apiKey: "ollama",
        configuration: {
          baseURL: "http://localhost:11434/v1",
        },
      })
    : process.env.USE_GOOGLE_LLM === "true"
      ? new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash" })
      : new ChatOpenAI({ model: "gpt-4o-mini" });

const outputParser = new StringOutputParser();

// Error handler for rate limits
const handleRateLimitError = (error: any) => {
  if (error.status === 429 || error.statusText === "Too Many Requests") {
    return {
      status: 429,
      message:
        "Rate limit exceeded. Please wait a moment and try again. (Free tier quota limits apply)",
    };
  }
  return null;
};

// Simple chat endpoint (no history)
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await useLLM.invoke(message);
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    res.json({ response: content });
  } catch (error: any) {
    const rateLimitError = handleRateLimitError(error);
    if (rateLimitError) {
      return res
        .status(rateLimitError.status)
        .json({ error: rateLimitError.message });
    }
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to get response from AI. Check server logs for details.",
    });
  }
});

// Chat with history endpoint
app.post("/api/chat/history", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get or create chat history for this session
    if (!chatHistories.has(sessionId)) {
      chatHistories.set(sessionId, []);
    }
    const chatHistory = chatHistories.get(sessionId)!;

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a helpful AI assistant. Be concise and helpful in your responses.",
      ],
      new MessagesPlaceholder("chat_history"),
      ["human", "{question}"],
    ]);

    const chain = prompt.pipe(useLLM).pipe(outputParser);

    const response = await chain.invoke({
      question: message,
      chat_history: chatHistory,
    });

    // Update chat history
    chatHistory.push(new HumanMessage(message));
    chatHistory.push(new AIMessage(response));

    res.json({ response, sessionId });
  } catch (error: any) {
    const rateLimitError = handleRateLimitError(error);
    if (rateLimitError) {
      return res
        .status(rateLimitError.status)
        .json({ error: rateLimitError.message });
    }
    console.error("Chat history error:", error);
    res.status(500).json({
      error: "Failed to get response from AI. Check server logs for details.",
    });
  }
});

// Clear chat history endpoint
app.post("/api/chat/clear", (req, res) => {
  const { sessionId = "default" } = req.body;
  chatHistories.delete(sessionId);
  res.json({ success: true, message: "Chat history cleared" });
});

// Streaming chat endpoint
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Get or create chat history
    if (!chatHistories.has(sessionId)) {
      chatHistories.set(sessionId, []);
    }
    const chatHistory = chatHistories.get(sessionId)!;

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a helpful AI assistant. Be concise and helpful in your responses.",
      ],
      new MessagesPlaceholder("chat_history"),
      ["human", "{question}"],
    ]);

    const chain = prompt.pipe(useLLM).pipe(outputParser);

    const stream = await chain.stream({
      question: message,
      chat_history: chatHistory,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // Update chat history after streaming completes
    chatHistory.push(new HumanMessage(message));
    chatHistory.push(new AIMessage(fullResponse));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    const rateLimitError = handleRateLimitError(error);
    if (rateLimitError) {
      res.status(rateLimitError.status);
      res.write(
        `data: ${JSON.stringify({ error: rateLimitError.message })}\n\n`
      );
      res.end();
      return;
    }
    console.error("Stream error:", error);
    res.status(500);
    res.write(
      `data: ${JSON.stringify({ error: "Failed to stream response" })}\n\n`
    );
    res.end();
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    llm:
      process.env.USE_OLLAMA === "true"
        ? "Ollama (Local - llama2)"
        : process.env.USE_GOOGLE_LLM === "true"
          ? "Google Gemini (gemini-2.5-flash - free tier ⭐)"
          : "OpenAI (gpt-4o-mini - paid)",
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
        ? `✅ Loaded (paid account)`
        : "❌ Not set",
      google: process.env.GOOGLE_API_KEY
        ? `✅ Loaded (free tier)`
        : "❌ Not set",
      ollama: process.env.USE_OLLAMA === "true" ? "✅ Local" : "Not enabled",
    },
    activeProvider:
      process.env.USE_OLLAMA === "true"
        ? "Ollama"
        : process.env.USE_GOOGLE_LLM === "true"
          ? "Google Gemini (free)"
          : "OpenAI",
    note: "OpenAI gpt-4o-mini requires a paid account. Use USE_GOOGLE_LLM=true for free Gemini (limited quota) or USE_OLLAMA=true for local unlimited.",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  const isUsingOllama = process.env.USE_OLLAMA === "true";
  const isUsingGemini = process.env.USE_GOOGLE_LLM === "true";
  const llmName = isUsingOllama
    ? "Ollama (Local - llama2)"
    : isUsingGemini
      ? "Google Gemini (gemini-2.5-flash - free tier ⭐)"
      : "OpenAI (gpt-4o-mini - requires paid account)";
  console.log(`📡 Using LLM: ${llmName}`);

  // Show API key status
  if (isUsingOllama) {
    console.log(`🔑 Ollama: Running locally at http://localhost:11434`);
  } else if (isUsingGemini) {
    const hasKey = !!process.env.GOOGLE_API_KEY;
    console.log(`🔑 Google API Key: ${hasKey ? "✅ Loaded" : "❌ NOT FOUND"}`);
  } else {
    const hasKey = !!process.env.OPENAI_API_KEY;
    console.log(
      `🔑 OpenAI API Key: ${hasKey ? "✅ Loaded (paid account)" : "❌ NOT FOUND"}`
    );
  }

  console.log(
    `⚠️  Free tier note: OpenAI requires paid account, Gemini has daily quota limits`
  );
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
