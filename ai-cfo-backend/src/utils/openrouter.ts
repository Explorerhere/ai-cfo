import axios from 'axios';

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-4-maverick:free";

export const askOpenRouter = async (prompt: string) => {
  const response = await axios.post(API_URL, {
    model: MODEL,
    messages: [{ role: "user", content: prompt }]
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
  });

  return response.data.choices?.[0]?.message?.content || '';
};
