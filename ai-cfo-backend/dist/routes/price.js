"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
router.get("/:ticker", async (req, res) => {
    const ticker = req.params.ticker;
    try {
        const response = await axios_1.default.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d`);
        const price = response.data.chart.result[0].meta.regularMarketPrice;
        res.json({ ticker, price });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch price", details: err.message });
    }
});
exports.default = router;
