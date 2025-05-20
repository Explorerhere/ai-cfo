"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCypherQuery = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load from .env
// Load from environment variables
const uri = process.env.NEO4J_URI || "";
const user = process.env.NEO4J_USER || "";
const password = process.env.NEO4J_PASSWORD || "";
// Debug logs (only in dev)
console.log("🛠 Connecting to Neo4j...");
console.log("URI:", uri);
console.log("User:", user);
// Create the Neo4j driver
const driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password));
/**
 * Run a Cypher query and return results as JS objects
 */
const runCypherQuery = async (query, params) => {
    const session = driver.session();
    try {
        const result = await session.run(query);
        return result.records.map(record => record.toObject());
    }
    catch (error) {
        console.error("❌ Cypher query error:", error);
        throw error;
    }
    finally {
        await session.close();
    }
};
exports.runCypherQuery = runCypherQuery;
exports.default = driver;
