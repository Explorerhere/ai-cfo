import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

const API_KEY = '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'; // Replace with environment variable in production
const MODEL = 'meta-llama/llama-3.3-8b-instruct:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface VendorResponse {
  vendorName: string;
  country: string;
  price?: string;
  moq?: string;
  shippingTerms?: string;
  contact?: string;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { material } = req.body;

  if (!material) {
    res.status(400).json({ error: 'Material name is required' });
    return;
  }

  const prompt = `
List 5 verified vendors for "${material}" in the format below:
- Vendor Name
- Country
- Price (if available)
- MOQ
- Shipping terms
- Contact info (website/email)

Respond as JSON array:
[
  {
    "vendorName": "ABC Metals Ltd",
    "country": "India",
    "price": "$1200 per ton",
    "moq": "5 tons",
    "shippingTerms": "FOB Mumbai, 14 days",
    "contact": "www.abcmetals.com"
  },
  ...
]
`;

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[.*\]/s);

    if (!jsonMatch) {
      res.status(500).json({ error: 'AI response did not contain valid vendor JSON.' });
      return;
    }

    const vendors: VendorResponse[] = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
    res.json({ material, vendors });
  } catch (err: any) {
    console.error('Vendor API Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve vendor data', details: err.message });
  }
});

export default router;
