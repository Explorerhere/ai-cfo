"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askOpenRouter = void 0;
const axios_1 = __importDefault(require("axios"));
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-4-maverick:free";
const askOpenRouter = async (prompt) => {
    const response = await axios_1.default.post(API_URL, {
        model: MODEL,
        messages: [{ role: "user", content: prompt }]
    }, {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
    });
    return response.data.choices?.[0]?.message?.content || '';
};
exports.askOpenRouter = askOpenRouter;
