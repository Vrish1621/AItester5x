function getConfig() {
  return {
    jiraUrl: process.env.JIRA_BASE_URL || "",
    jiraEmail: process.env.JIRA_EMAIL || "",
    jiraToken: process.env.JIRA_API_TOKEN || "",
    aiProvider: (process.env.AI_PROVIDER || "").toLowerCase(),
    groqKey: process.env.GROQ_API_KEY || "",
    groqModel: process.env.GROQ_MODEL || "",
    ollamaUrl: process.env.OLLAMA_BASE_URL || process.env.DEFAULT_OLLAMA_URL || "http://127.0.0.1:11434",
    ollamaModel: process.env.OLLAMA_MODEL || process.env.DEFAULT_OLLAMA_MODEL || ""
  };
}

module.exports = { getConfig };
