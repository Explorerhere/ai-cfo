import express, { Request, Response, NextFunction } from "express";
import axios, { AxiosError } from "axios";
import { fetchNeo4jContext } from "../context/fetchNeo4jContext";

const router = express.Router();

// === Interfaces ===
interface ChatRequestBody {
  message: string;
}

interface ChatApiResponse {
  choices?: Array<{
    message?: { content: string };
  }>;
}

// === Async Handler Utility ===
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// === Chat Controller ===
const chatController = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as ChatRequestBody;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  try {
    // --- Step 1: Fetch Neo4j Context ---
    const neo4jContext = await fetchNeo4jContext(message);
    console.log("Neo4j Context:", neo4jContext);

    // --- Step 2: Build Prompt ---
    const craftedPrompt = `
      User asked: "${message}"
      Relevant financial context: ${neo4jContext}
      Please provide a clear, helpful, and relevant response.
    `;

    // --- Step 3: Call OpenRouter LLM ---
    const API_KEY ="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"; // Your OpenRouter key

    const response = await axios.post<ChatApiResponse>(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.3-8b-instruct:free",
        messages: [{ role: "user", content: craftedPrompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.choices?.[0]?.message?.content || "No response from AI.";
    res.json({ response: content });

  } catch (error) {
    console.error("Chat controller error:", error);
    res.status(500).json({ error: "Chat assistant failed" });
  }
};

// === Error Handler ===
const errorHandler = (
  err: Error | AxiosError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Chat error", err);
  if (err instanceof AxiosError) {
    res.status(500).json({ error: "External API call failed" });
  } else {
    res.status(500).json({ error: "Chat assistant server error" });
  }
};

// === Routes ===
router.post("/", asyncHandler(chatController));
router.use(errorHandler);

export default router;
