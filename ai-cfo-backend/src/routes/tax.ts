import express, { Request, Response } from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const router = express.Router();

// Use environment variable with fallback
const OPENROUTER_API_KEY = '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';

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  standardHeaders: true,
  message: { error: 'Too many requests, please try again later.' }
});

// Error handler for async routes
import { NextFunction } from 'express';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

async function askOpenRouter(prompt: string): Promise<string> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const headers = {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', // Needed for OpenRouter
    'X-Title': 'TaxPro Assistant'
  };

  const data = {
    model: 'deepseek/deepseek-prover-v2:free',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.7
  };

  try {
    const response = await axios.post(url, data, { 
      headers,
      timeout: 30000 // 30 second timeout
    });
    return response.data.choices[0]?.message?.content || 'No response from AI.';
  } catch (error: any) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    // Detailed error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    }
    throw new Error(`OpenRouter API Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Apply rate limiter to tax endpoints
router.use(limiter);

router.post('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { entity, state, issue, prompt } = req.body;
  
  if (!prompt && !(entity || state || issue)) {
    res.status(400).json({ error: 'Missing required input. Please provide either a prompt or structured data (entity, state, issue).' });
    return;
  }

  let finalPrompt = '';

  // If structured inputs given
  if (!prompt && (entity || state || issue)) {
    finalPrompt = `
You are a tax expert assistant.

Entity: ${entity || 'N/A'}
State: ${state || 'N/A'}
Issue: ${issue || 'N/A'}

Please generate a detailed tax explanation using the following format:
- Use ### headings for each main section.
- Bullet points and numbered lists for steps.
- Bold important keywords.
- Code blocks for formulas.
- Separate sections for Federal and State-specific rules if applicable.
- Always include a "Pro Tip" or "Next Steps" section at the end.

Explain everything clearly and professionally.

Now provide the complete detailed resolution.
    `;
  }

  // If raw prompt given by user
  if (prompt) {
    finalPrompt = `
You are a professional Tax Expert Assistant.

Please respond to the user's tax question with the following rules:
- Use ### headings for different topics.
- Use bullet points and numbered steps where helpful.
- Bold important words or phrases.
- If needed, include formulas inside \`\`\`code blocks\`\`\`.
- Explain any Federal vs State differences separately.
- Always add a "Pro Tip" or "Next Steps" advice at the end.

Here is the user's question: "${prompt}"
    `;
  }

  try {
    const resolution = await askOpenRouter(finalPrompt);
    res.json({ resolution, status: 'success' });
  } catch (err: any) {
    console.error('Tax resolution failed:', err.message);
    res.status(500).json({ 
      error: 'Tax resolution failed', 
      message: 'We encountered an issue while processing your tax question. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}));

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Tax API is running' });
});

export default router;
