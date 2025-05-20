interface ContextInput {
  userMessage: string;
  neo4jData?: string;
  financials?: string;
  externalData?: string;
}

export const buildModelContext = (input: ContextInput): string => {
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
