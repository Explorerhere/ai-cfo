"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const API_KEY = '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'; // Replace for production
const MODEL = 'meta-llama/llama-4-maverick:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
router.post('/', async (req, res) => {
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
        const response = await axios_1.default.post(OPENROUTER_URL, {
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
        }, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        const content = response.data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[.*\]/s);
        if (!jsonMatch) {
            res.status(500).json({ error: 'AI response did not contain valid vendor JSON.' });
            return;
        }
        const vendors = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
        res.json({ material, vendors });
    }
    catch (err) {
        console.error('Vendor API Error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve vendor data', details: err.message });
    }
});
exports.default = router;
