import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/:ticker", async (req, res) => {
  const ticker = req.params.ticker;
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d`);
    const price = response.data.chart.result[0].meta.regularMarketPrice;
    res.json({ ticker, price });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch price", details: err.message });
  }
});

export default router;
