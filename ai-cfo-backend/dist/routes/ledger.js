"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const xlsx_1 = __importDefault(require("xlsx"));
const mammoth_1 = __importDefault(require("mammoth"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
let ledger = [];
let accountantQueue = [];
const API_KEY = 'sk-or-v1-6feff8a270df6e893524ae1519dfe01ee302e658bcc88d5a16e9';
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
const parseTextInput = async (text) => {
    const prompt = `
You are an AI CFO assistant. Parse the following text into one or more ledger entries with fields: date (YYYY-MM-DD), account, description, debit (number), credit (number), and optionally taxCategory (string) and confidenceScore (number between 0 and 1). Return the result as JSON, wrapped in \`\`\`json\n...\n\`\`\`. If multiple entries, return an array. Assign lower confidenceScore (e.g., 0.6) for ambiguous or complex transactions. Example:
\`\`\`json
[
  {
    "date": "2025-04-25",
    "account": "Office Expenses",
    "description": "Paid to Office Supplies Inc. for stationery",
    "debit": 500,
    "credit": 0,
    "taxCategory": "Expense",
    "confidenceScore": 0.9
  }
]
\`\`\`
Text: ${text}
  `;
    try {
        const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [{ role: 'user', content: prompt }],
        }, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        const content = response.data.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (!jsonMatch)
            throw new Error('AI response is not valid JSON');
        const parsed = JSON.parse(jsonMatch[1]);
        return Array.isArray(parsed) ? parsed : [parsed];
    }
    catch (err) {
        console.error('parseTextInput error:', err);
        throw new Error('Failed to parse text input');
    }
};
const classifyAccounts = async (accounts) => {
    const prompt = `
Classify the following accounts into tax categories (e.g., Revenue, Expense, Asset, Liability, Equity). Return the result as JSON, wrapped in \`\`\`json\n...\n\`\`\`. Example:
\`\`\`json
{
  "Office Expenses": "Expense",
  "Sales": "Revenue",
  "Cash": "Asset"
}
\`\`\`
Accounts: ${accounts.join(', ')}
  `;
    try {
        const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [{ role: 'user', content: prompt }],
        }, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        const content = response.data.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (!jsonMatch)
            throw new Error('AI response is not valid JSON');
        return JSON.parse(jsonMatch[1]);
    }
    catch (err) {
        console.error('classifyAccounts error:', err);
        throw new Error('Failed to classify accounts');
    }
};
const generateLedgerSummary = async (ledger) => {
    const summaryData = {
        totalDebit: ledger.reduce((sum, e) => sum + e.debit, 0),
        totalCredit: ledger.reduce((sum, e) => sum + e.credit, 0),
        accounts: Array.from(new Set(ledger.map((e) => e.account))),
        entries: ledger.map((e) => ({
            date: e.date,
            account: e.account,
            description: e.description,
            debit: e.debit,
            credit: e.credit,
            taxCategory: e.taxCategory || 'N/A',
        })),
    };
    const prompt = `
You are an AI CFO assistant. Generate a concise, human-readable summary of the ledger data provided below. Include insights such as total debits and credits, key accounts, and any notable trends or patterns (e.g., high expenses, revenue sources). Use clear, professional language suitable for a financial overview. Return the summary as plain text.
Ledger Data: ${JSON.stringify(summaryData, null, 2)}
  `;
    try {
        const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [{ role: 'user', content: prompt }],
        }, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data.choices?.[0]?.message?.content || 'No summary generated.';
    }
    catch (err) {
        console.error('generateLedgerSummary error:', err);
        throw new Error('Failed to generate ledger summary');
    }
};
const extractTextFromPDF = async (buffer) => {
    const data = await (0, pdf_parse_1.default)(buffer);
    return data.text;
};
const extractTextFromDocx = async (filePath) => {
    const result = await mammoth_1.default.extractRawText({ path: filePath });
    return result.value;
};
const parseExcelToEntries = async (filePath) => {
    const workbook = xlsx_1.default.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx_1.default.utils.sheet_to_json(sheet);
    return rows.map((row) => ({
        date: row.date,
        account: row.account,
        description: row.description,
        debit: parseFloat(row.debit) || 0,
        credit: parseFloat(row.credit) || 0,
        taxCategory: row.taxCategory || 'Other',
        confidenceScore: 0.9,
    }));
};
router.post('/', asyncHandler(async (req, res) => {
    const { date, account, description, debit, credit } = req.body;
    if (!date || !account || !description || debit == null || credit == null) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const entry = {
        id: (0, uuid_1.v4)(),
        date,
        account,
        description,
        debit: parseFloat(debit),
        credit: parseFloat(credit),
        auditLog: [{ action: 'created', timestamp: new Date().toISOString(), details: 'Manual entry' }],
    };
    ledger.push(entry);
    return res.status(201).json({ message: 'Entry added', entry });
}));
router.get('/', asyncHandler(async (_req, res) => {
    return res.json(ledger);
}));
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const index = ledger.findIndex((entry) => entry.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Entry not found' });
    }
    ledger.splice(index, 1);
    return res.json({ message: 'Entry deleted' });
}));
router.post('/classify', asyncHandler(async (_req, res) => {
    const accounts = Array.from(new Set(ledger.map((entry) => entry.account)));
    if (accounts.length === 0) {
        return res.status(400).json({ error: 'No accounts to classify' });
    }
    const classifications = await classifyAccounts(accounts);
    ledger.forEach((entry) => {
        if (classifications[entry.account]) {
            entry.taxCategory = classifications[entry.account];
            entry.confidenceScore = 0.95;
            entry.auditLog.push({
                action: 'classified',
                timestamp: new Date().toISOString(),
                details: `Assigned category: ${entry.taxCategory}`,
            });
        }
    });
    return res.json({ message: 'Accounts classified', classifications });
}));
router.get('/anomalies', asyncHandler(async (_req, res) => {
    if (ledger.length === 0) {
        return res.status(400).json({ error: 'No transactions to analyze' });
    }
    const values = ledger.map((e) => e.debit + e.credit);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    const threshold = mean + 2 * std;
    const anomalies = ledger.filter((e) => e.debit + e.credit > threshold);
    return res.json({ anomalies, mean, threshold });
}));
router.get('/month-end', asyncHandler(async (_req, res) => {
    if (ledger.length === 0) {
        return res.status(400).json({ error: 'No transactions for month-end summary' });
    }
    const summary = ledger.reduce((acc, e) => {
        acc.totalDebit += e.debit;
        acc.totalCredit += e.credit;
        return acc;
    }, { totalDebit: 0, totalCredit: 0 });
    return res.json({ monthEndSummary: summary });
}));
router.get('/statements', asyncHandler(async (_req, res) => {
    if (ledger.length === 0) {
        return res.status(400).json({ error: 'No transactions for financial statements' });
    }
    const incomeAccounts = ledger.filter((e) => e.account.toLowerCase().includes('revenue'));
    const expenseAccounts = ledger.filter((e) => e.account.toLowerCase().includes('expense'));
    const assetAccounts = ledger.filter((e) => e.account.toLowerCase().includes('asset'));
    const liabilityAccounts = ledger.filter((e) => e.account.toLowerCase().includes('liability'));
    const sumEntries = (entries) => entries.reduce((acc, e) => acc + (e.debit - e.credit), 0);
    const pnl = {
        income: sumEntries(incomeAccounts),
        expense: sumEntries(expenseAccounts),
        netIncome: sumEntries(incomeAccounts) - sumEntries(expenseAccounts),
    };
    const balanceSheet = {
        assets: sumEntries(assetAccounts),
        liabilities: sumEntries(liabilityAccounts),
        equity: sumEntries(assetAccounts) - sumEntries(liabilityAccounts),
    };
    return res.json({ pnl, balanceSheet });
}));
router.get('/summary', asyncHandler(async (_req, res) => {
    if (ledger.length === 0) {
        return res.status(400).json({ error: 'No transactions to summarize' });
    }
    const summary = await generateLedgerSummary(ledger);
    return res.json({ summary });
}));
// === Enhanced /ask-accountant route using OpenRouter LLM with better prompt ===
router.post('/ask-accountant', asyncHandler(async (req, res) => {
    const { entryId, question } = req.body;
    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }
    if (entryId && !ledger.find((e) => e.id === entryId)) {
        return res.status(404).json({ error: 'Entry not found' });
    }
    const accountantQuestion = {
        id: (0, uuid_1.v4)(),
        userId: 'user-placeholder', // Replace with auth system in production
        entryId,
        question,
        status: 'pending',
        timestamp: new Date().toISOString(),
    };
    accountantQueue.push(accountantQuestion);
    try {
        const entryContext = entryId ? `\n\nRelated Ledger Entry:\n${JSON.stringify(ledger.find((e) => e.id === entryId), null, 2)}` : '';
        const prompt = `You are an expert financial accountant AI assistant.\n\nA user asked: "${question}"\n${entryContext}\n\nIf the question includes embedded transaction details or ledger data, extract and analyze them.\nProvide actionable insights, corrections, or ask follow-up questions if needed.\nRespond clearly and professionally.`;
        const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'deepseek/deepseek-prover-v2:free',
            messages: [{ role: 'user', content: prompt }],
        }, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        const content = response.data.choices?.[0]?.message?.content || 'No response';
        const q = accountantQueue.find((q) => q.id === accountantQuestion.id);
        if (q) {
            q.status = 'answered';
            q.response = `Accountant response: ${content.trim()}`;
        }
    }
    catch (err) {
        console.error('Accountant AI error:', err);
        const q = accountantQueue.find((q) => q.id === accountantQuestion.id);
        if (q) {
            q.status = 'answered';
            q.response = 'Accountant response: Sorry, failed to generate a response. Please try again later.';
        }
    }
    return res.status(201).json({ message: 'Question submitted to accountant', question: accountantQuestion });
}));
router.get('/ask-accountant', asyncHandler(async (_req, res) => {
    return res.json(accountantQueue);
}));
// === Existing autopilot route remains the same ===
router.post('/autopilot', upload.single('file'), asyncHandler(async (req, res) => {
    try {
        const { text } = req.body;
        const file = req.file;
        let parsedEntries = [];
        if (text) {
            const parsed = await parseTextInput(text);
            parsedEntries = Array.isArray(parsed) ? parsed : [parsed];
        }
        else if (file) {
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            if (ext === '.pdf') {
                const pdfBuffer = fs_1.default.readFileSync(file.path);
                const pdfText = await extractTextFromPDF(pdfBuffer);
                const parsed = await parseTextInput(pdfText);
                parsedEntries = Array.isArray(parsed) ? parsed : [parsed];
            }
            else if (ext === '.docx') {
                const docxText = await extractTextFromDocx(file.path);
                const parsed = await parseTextInput(docxText);
                parsedEntries = Array.isArray(parsed) ? parsed : [parsed];
            }
            else if (ext === '.xls' || ext === '.xlsx') {
                parsedEntries = await parseExcelToEntries(file.path);
            }
            else {
                return res.status(400).json({ error: 'Unsupported file type' });
            }
            fs_1.default.unlinkSync(file.path);
        }
        else {
            return res.status(400).json({ error: 'No valid input provided' });
        }
        const accounts = Array.from(new Set(parsedEntries.map((e) => e.account)));
        const classifications = await classifyAccounts(accounts);
        const newEntries = parsedEntries.map((e) => ({
            id: (0, uuid_1.v4)(),
            ...e,
            taxCategory: classifications[e.account] || e.taxCategory || 'Other',
            confidenceScore: e.confidenceScore || 0.9,
            auditLog: [
                {
                    action: 'created',
                    timestamp: new Date().toISOString(),
                    details: file ? `Autopilot via ${file.originalname}` : 'Autopilot via text',
                },
            ],
        }));
        ledger.push(...newEntries);
        return res.status(201).json({ message: 'Autopilot entries added', entries: newEntries });
    }
    catch (err) {
        console.error('Autopilot error:', err);
        return res.status(500).json({ error: 'Failed to process input' });
    }
}));
exports.default = router;
