const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { createApp } = require("./app");

async function withServer(config, run, options = {}) {
  const server = createServer(createApp({ config, template: "# Test template", ...options }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("settings never return Jira or Groq credentials", async () => {
  await withServer({
    jiraUrl: "https://jira.invalid",
    jiraEmail: "qa@example.invalid",
    jiraToken: "jira-secret",
    aiProvider: "groq",
    groqKey: "groq-secret",
    groqModel: "configured-model"
  }, async (base) => {
    const response = await fetch(`${base}/api/settings`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.jiraConfigured, true);
    assert.equal(body.groqConfigured, true);
    assert.equal(body.jiraUrl, "https://jira.invalid");
    assert.equal(body.jiraEmail, "qa@example.invalid");
    assert.equal(body.aiProvider, "groq");
    assert.equal(JSON.stringify(body).includes("jira-secret"), false);
    assert.equal(JSON.stringify(body).includes("groq-secret"), false);
  });
});

test("invalid issue keys are rejected before any Jira request", async () => {
  await withServer({ jiraUrl: "", jiraEmail: "", jiraToken: "", aiProvider: "" }, async (base) => {
    const response = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueKey: "not-an-issue" })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Jira issue key/);
  });
});

test("missing Jira credentials in the request return an actionable error", async () => {
  await withServer({ jiraUrl: "", jiraEmail: "", jiraToken: "", aiProvider: "groq", groqKey: "key", groqModel: "model" }, async (base) => {
    const response = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueKey: "QA-123" })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Enter the Jira URL, email, and token/);
  });
});

test("user-entered connection settings are request-scoped and never returned by settings API", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: new URL(url), options });
    return new Response(JSON.stringify({ displayName: "QA User" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  await withServer({
    jiraUrl: "",
    jiraEmail: "",
    jiraToken: "",
    aiProvider: "",
    groqKey: "",
    groqModel: "",
    ollamaUrl: "http://127.0.0.1:11434",
    ollamaModel: ""
  }, async (base) => {
    const response = await fetch(`${base}/api/test/jira`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jiraUrl: "https://jira.example.invalid",
        jiraEmail: "qa@example.invalid",
        jiraToken: "visitor-token"
      })
    });
    assert.equal(response.status, 200);
    assert.equal(requests[0].url.hostname, "jira.example.invalid");
    assert.equal(requests[0].options.headers.Authorization, `Basic ${Buffer.from("qa@example.invalid:visitor-token").toString("base64")}`);

    const isolated = await fetch(`${base}/api/test/jira`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(isolated.status, 400);

    const settings = await (await fetch(`${base}/api/settings`)).json();
    assert.equal(settings.jiraConfigured, false);
    assert.equal(JSON.stringify(settings).includes("visitor-token"), false);

    const update = await fetch(`${base}/api/settings`, { method: "POST" });
    assert.equal(update.status, 404);
  }, { fetchImpl });
});

test("mocked Jira-to-Groq flow uses issue facts and the supplied template", async () => {
  const requests = [];
  const config = {
    jiraUrl: "",
    jiraEmail: "",
    jiraToken: "",
    aiProvider: "",
    groqKey: "",
    groqModel: ""
  };
  const fetchImpl = async (input, options) => {
    const url = new URL(input);
    requests.push({ url, options });
    if (url.hostname === "jira.example.invalid") {
      return new Response(JSON.stringify({
        key: "QA-123",
        names: { customfield_1: "Acceptance Criteria" },
        fields: {
          summary: "Documented sign-in requirement",
          description: { content: [{ type: "paragraph", content: [{ text: "Sign in with the supplied account." }] }] },
          customfield_1: "A successful sign-in displays the account name."
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: "# Test Plan — QA-123: Documented sign-in requirement" } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  await withServer(config, async (base) => {
    const response = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueKey: "QA-123",
        jiraUrl: "https://jira.example.invalid",
        jiraEmail: "qa@example.invalid",
        jiraToken: "jira-secret",
        aiProvider: "groq",
        groqKey: "groq-secret",
        groqModel: "example-model"
      })
    });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.match(result.plan, /QA-123/);
    assert.equal(result.issueUrl, "https://jira.example.invalid/browse/QA-123");
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url.hostname, "jira.example.invalid");
    assert.match(requests[0].url.search, /expand=names/);
    assert.match(requests[1].options.body, /## 1\. Scope & Objectives/);
    assert.match(requests[1].options.body, /## HUMAN REVIEW GATE/);
    assert.match(requests[1].options.body, /A successful sign-in displays the account name/);
    assert.match(requests[1].options.headers.Authorization, /Bearer groq-secret/);
  }, { fetchImpl, template: null });
});
