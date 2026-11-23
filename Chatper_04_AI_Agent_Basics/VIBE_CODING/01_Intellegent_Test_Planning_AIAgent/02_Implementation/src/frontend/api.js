import { API_BASE_URL } from "./envFile.js";

const SETTINGS_STORAGE_KEY = "jira-test-plan-settings";
const settingFields = ["jiraUrl", "jiraEmail", "jiraToken", "aiProvider", "groqKey", "groqModel", "ollamaUrl", "ollamaModel"];

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error("Cannot reach the service. Check your connection and try again.");
  }
  let result = {};
  try {
    result = await response.json();
  } catch {
    if (!response.ok) throw new Error(`Request failed (${response.status} ${response.statusText}).`);
    throw new Error("The server returned an invalid response. Check that the Vercel API function is deployed.");
  }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status} ${response.statusText}).`);
  return result;
}

function readStoredSettings() {
  const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) return {};
  try {
    const settings = JSON.parse(stored);
    return settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  } catch {
    throw new Error("Saved settings could not be read. Clear this site's saved data and try again.");
  }
}

const post = (body = {}) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

export async function getSettings() {
  const defaults = await request("/api/settings");
  const stored = readStoredSettings();
  const { jiraToken, groqKey, ...publicStored } = stored;
  return {
    ...defaults,
    ...publicStored,
    jiraToken: "",
    groqKey: "",
    jiraConfigured: Boolean(jiraToken) || defaults.jiraConfigured,
    groqConfigured: Boolean(groqKey) || defaults.groqConfigured
  };
}

export async function saveSettings(settings) {
  const current = readStoredSettings();
  const merged = { ...current, ...settings };
  for (const secret of ["jiraToken", "groqKey"]) {
    if (!settings[secret] && current[secret]) merged[secret] = current[secret];
  }
  const stored = Object.fromEntries(settingFields.map((field) => [field, merged[field] || ""]));
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export async function testJiraConnection(settings) {
  const saved = await saveSettings(settings);
  return request("/api/test/jira", post(saved));
}

export async function testAiConnection(provider, settings) {
  const saved = await saveSettings(settings);
  return request(`/api/test/${provider}`, post({ ...saved, aiProvider: provider }));
}

export const generateTestPlan = (issueKey) => request("/api/generate", post({
  ...readStoredSettings(),
  issueKey
}));
