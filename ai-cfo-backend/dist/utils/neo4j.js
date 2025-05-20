"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchema = exports.runCypherQuery = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load .env variables
// Grab values from environment
const uri = process.env.NEO4J_URI || '';
const user = process.env.NEO4J_USER || '';
const password = process.env.NEO4J_PASSWORD || '';
// Debug log to confirm values
console.log("🔗 Connecting to Neo4j:");
console.log("URI:", uri);
console.log("User:", user);
// Initialize Neo4j driver
const driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password));
/**
 * Run any Cypher query and return the raw results
 */
const runCypherQuery = async (query) => {
    const session = driver.session();
    try {
        const result = await session.run(query);
        return result.records.map(record => record.toObject());
    }
    catch (err) {
        console.error("❌ Error running Cypher query:", err);
        throw err;
    }
    finally {
        await session.close();
    }
};
exports.runCypherQuery = runCypherQuery;
/**
 * Returns the database schema visualization from Neo4j
 */
const getSchema = async () => {
    const query = "CALL db.schema.visualization()";
    return await (0, exports.runCypherQuery)(query);
};
exports.getSchema = getSchema;
