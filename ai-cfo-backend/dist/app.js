"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
const chat_1 = __importDefault(require("./routes/chat"));
const price_1 = __importDefault(require("./routes/price"));
const vendor_1 = __importDefault(require("./routes/vendor"));
const tax_1 = __importDefault(require("./routes/tax"));
const ledger_1 = __importDefault(require("./routes/ledger"));
// Register routes
app.use("/api/chat", chat_1.default);
app.use("/api/price", price_1.default);
app.use("/api/vendor", vendor_1.default);
app.use("/api/tax", tax_1.default);
app.use("/api/ledger", ledger_1.default);
// Root health check
app.get("/", (_, res) => {
    res.send("🚀 AI CFO Backend is running");
});
exports.default = app;
