import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config(); // Load from .env

// Load from environment variables
const uri = process.env.NEO4J_URI || "";
const user = process.env.NEO4J_USER || "";
const password = process.env.NEO4J_PASSWORD || "";

// Debug logs (only in dev)
console.log("🛠 Connecting to Neo4j...");
console.log("URI:", uri);
console.log("User:", user);

// Create the Neo4j driver
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

/**
 * Run a Cypher query and return results as JS objects
 */
export const runCypherQuery = async (query: string, params: Record<string, any>): Promise<any[]> => {
  const session = driver.session();
  try {
    const result = await session.run(query);
    return result.records.map(record => record.toObject());
  } catch (error) {
    console.error("❌ Cypher query error:", error);
    throw error;
  } finally {
    await session.close();
  }
};

export default driver;
