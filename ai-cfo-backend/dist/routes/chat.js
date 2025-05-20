"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importStar(require("axios"));
const fetchNeo4jContext_1 = require("../context/fetchNeo4jContext");
const router = express_1.default.Router();
// === Async Handler Utility ===
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
// === Chat Controller ===
const chatController = async (req, res) => {
    const { message } = req.body;
    if (!message) {
        res.status(400).json({ error: "Message is required" });
        return;
    }
    try {
        // --- Step 1: Fetch Neo4j Context ---
        const neo4jContext = await (0, fetchNeo4jContext_1.fetchNeo4jContext)(message);
        console.log("Neo4j Context:", neo4jContext);
        // --- Step 2: Build Prompt ---
        const craftedPrompt = `
      User asked: "${message}"
      Relevant financial context: ${neo4jContext}
      Please provide a clear, helpful, and relevant response.
    `;
        // --- Step 3: Call OpenRouter LLM ---
        const API_KEY = "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"; // Your OpenRouter key
        const response = await axios_1.default.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "meta-llama/llama-3.3-8b-instruct:free",
            messages: [{ role: "user", content: craftedPrompt }],
        }, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
        });
        const content = response.data.choices?.[0]?.message?.content || "No response from AI.";
        res.json({ response: content });
    }
    catch (error) {
        console.error("Chat controller error:", error);
        res.status(500).json({ error: "Chat assistant failed" });
    }
};
// === Error Handler ===
const errorHandler = (err, req, res, next) => {
    console.error("Chat error", err);
    if (err instanceof axios_1.AxiosError) {
        res.status(500).json({ error: "External API call failed" });
    }
    else {
        res.status(500).json({ error: "Chat assistant server error" });
    }
};
// === Routes ===
router.post("/", asyncHandler(chatController));
router.use(errorHandler);
exports.default = router;
