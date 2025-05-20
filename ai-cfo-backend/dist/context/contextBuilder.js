"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildModelContext = void 0;
const buildModelContext = (input) => {
    return `
You are a highly intelligent Virtual CFO assistant.

User Message:
"${input.userMessage}"

Neo4j Graph Data:
${input.neo4jData || "No graph data found."}

Historical Financial Records:
${input.financials || "No financial records available."}

External Intelligence (Market / Vendors / Price):
${input.externalData || "None"}

Instructions:
Provide an intelligent, structured answer with reasoning and financial insight.
`;
};
exports.buildModelContext = buildModelContext;
