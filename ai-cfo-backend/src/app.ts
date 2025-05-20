import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
import chatRoutes from "./routes/chat";
import priceRoutes from "./routes/price";
import vendorRoutes from "./routes/vendor";
import taxRoutes from "./routes/tax";
import ledgerRoutes from "./routes/ledger";

// Register routes
app.use("/api/chat", chatRoutes);
app.use("/api/price", priceRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/ledger", ledgerRoutes);

// Root health check
app.get("/", (_, res) => {
  res.send("🚀 AI CFO Backend is running");
});

export default app;
