"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNeo4jContext = void 0;
const driver_1 = require("../neo4j/driver");
const fetchNeo4jContext = async (userMessage) => {
    const message = userMessage.toLowerCase();
    const keywordMap = {
        utility: "n.category",
        telecom: "n.category",
        infrastructure: "n.category",
        primary: "n.type",
        secondary: "n.type",
        tertiary: "n.type",
        pharma: "n.category",
        packaging: "n.category"
    };
    const filters = [];
    const params = {};
    let i = 0;
    for (const [keyword, field] of Object.entries(keywordMap)) {
        if (message.includes(keyword)) {
            const key = `param${i++}`;
            filters.push(`toLower(${field}) CONTAINS toLower($${key})`);
            params[key] = keyword;
        }
    }
    let query = `MATCH (n) WHERE any(label IN labels(n) WHERE label IN ["Utility", "Telecom", "Infrastructure", "Material"])`;
    if (filters.length > 0) {
        query += ` AND ` + filters.join(" AND ");
    }
    query += ` RETURN DISTINCT n.name AS name, n.type AS type, n.category AS category, labels(n)[0] AS label LIMIT 20`;
    try {
        const result = await (0, driver_1.runCypherQuery)(query, params);
        if (!result.length) {
            return "No context found in the Neo4j graph for your input.";
        }
        return result.map((row, i) => `${i + 1}. [${row.label}] ${row.name} — Type: ${row.type || "-"}, Category: ${row.category || "-"}`).join("\n");
    }
    catch (err) {
        console.error("Neo4j Context Error:", err);
        return "Error fetching context from Neo4j.";
    }
};
exports.fetchNeo4jContext = fetchNeo4jContext;
