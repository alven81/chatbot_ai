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

// Store chat history per session (in-memory, for demo purposes)
const chatHistories: Map<string, BaseMessage[]> = new Map();

// Initialize LLM - using OpenAI by default
// To use Google Gemini, set USE_GOOGLE_LLM=true in .env
const useLLM =
  process.env.USE_GOOGLE_LLM === "true"
    ? new ChatGoogleGenerativeAI({ model: "gemini-2.0-flash" })
    : new ChatOpenAI({ model: "gpt-3.5-turbo" });

const outputParser = new StringOutputParser();

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
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get response from AI" });
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
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ error: "Failed to get response from AI" });
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
  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).json({ error: "Failed to stream response" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    llm: process.env.USE_GOOGLE_LLM === "true" ? "Google Gemini" : "OpenAI",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(
    `📡 Using LLM: ${process.env.USE_GOOGLE_LLM === "true" ? "Google Gemini" : "OpenAI"}`
  );
});
