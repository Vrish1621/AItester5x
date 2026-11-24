import React, { useEffect, useState } from "react";
import { getSettings, saveSettings, testAiConnection, testJiraConnection } from "./api.js";
import { DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_URL } from "./envFile.js";

const emptySettings = {
  jiraUrl: "",
  jiraEmail: "",
  jiraToken: "",
  jiraConfigured: false,
  aiProvider: "",
  groqKey: "",
  groqConfigured: false,
  groqModel: "",
  ollamaUrl: DEFAULT_OLLAMA_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL
};

function isHttpUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

function withDefaults(data) {
  return {
    ...emptySettings,
    ...data,
    ollamaUrl: data.ollamaUrl || DEFAULT_OLLAMA_URL,
    ollamaModel: data.ollamaModel || DEFAULT_OLLAMA_MODEL
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(emptySettings);
  const [form, setForm] = useState(emptySettings);
  const [errors, setErrors] = useState({});
  const [jiraStatus, setJiraStatus] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState("");
  const [groqStatus, setGroqStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState("");
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    getSettings().then((data) => {
      const currentSettings = withDefaults(data);
      setSettings(currentSettings);
      setForm((current) => ({ ...current, ...currentSettings }));
    }).catch((error) => setPageError(error.message));
  }, []);

  const change = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    if (field.startsWith("jira")) setJiraStatus("");
    if (field === "ollamaUrl" || field === "ollamaModel") setOllamaStatus("");
    if (field === "groqKey" || field === "groqModel") setGroqStatus("");
    setSaved("");
  };

  const validateJira = (requireCredentials) => {
    const next = {};
    if (!form.jiraUrl.trim()) {
      if (requireCredentials) next.jiraUrl = "Enter the Jira URL.";
    } else if (!isHttpUrl(form.jiraUrl.trim())) {
      next.jiraUrl = "Enter a valid HTTP or HTTPS URL.";
    }
    if (!form.jiraEmail.trim()) {
      if (requireCredentials) next.jiraEmail = "Enter the Jira account email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.jiraEmail.trim())) {
      next.jiraEmail = "Enter a valid email address.";
    }
    if (requireCredentials && !settings.jiraConfigured && !form.jiraToken.trim()) {
      next.jiraToken = "Enter the Jira API token.";
    }
    return next;
  };

  const validateProvider = (provider) => {
    const next = {};
    if (provider === "ollama") {
      if (!isHttpUrl(form.ollamaUrl.trim())) next.ollamaUrl = "Enter a valid HTTP or HTTPS URL.";
      if (!form.ollamaModel.trim()) next.ollamaModel = "Enter an Ollama model.";
    } else if (provider === "groq") {
      if (!settings.groqConfigured && !form.groqKey.trim()) next.groqKey = "Enter the Groq API key.";
      if (!form.groqModel.trim()) next.groqModel = "Enter a Groq model.";
    } else {
      next.aiProvider = "Choose Groq or Ollama.";
    }
    return next;
  };

  const validateForm = () => ({ ...validateJira(false), ...validateProvider(form.aiProvider) });

  const refreshSettings = async () => {
    const data = withDefaults(await getSettings());
    setSettings(data);
    setForm((current) => ({ ...current, jiraToken: "", groqKey: "", ...data }));
  };

  const save = async (event) => {
    event.preventDefault();
    const next = validateForm();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setLoading(true);
    setSaved("");
    try {
      await saveSettings(form);
      await refreshSettings();
      setSaved("Settings saved in this browser.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testJira = async () => {
    const next = validateJira(true);
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      setJiraStatus(`Connection failed: ${Object.values(next).find(Boolean)}`);
      return;
    }
    setLoading(true);
    setJiraStatus("");
    try {
      const result = await testJiraConnection(form);
      await refreshSettings();
      setJiraStatus(result.message || "Connection successful.");
    } catch (error) {
      setJiraStatus(`Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testProvider = async (provider) => {
    const next = validateProvider(provider);
    setErrors((current) => ({ ...current, ...next }));
    const setStatus = provider === "groq" ? setGroqStatus : setOllamaStatus;
    if (Object.values(next).some(Boolean)) {
      setStatus(`Connection failed: ${Object.values(next).find(Boolean)}`);
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const result = await testAiConnection(provider, form);
      await refreshSettings();
      setStatus(result.message || "Connection successful.");
    } catch (error) {
      setStatus(`Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const status = (value) => value && (
    <p className={value.startsWith("Connection failed:") ? "connection-status failure" : "connection-status success"}
      role={value.startsWith("Connection failed:") ? "alert" : "status"}>{value}</p>
  );

  return (
    <main className="page settings-page">
      <h1>Settings</h1>
      <form className="settings-form" onSubmit={save} noValidate>
        <p className="environment-help">
          Enter your connection details here. They are saved in this browser and sent to the service only when you test a connection or generate a plan.
        </p>
        {pageError && <p className="field-error" role="alert">{pageError}</p>}

        <section className="settings-card jira-card">
          <h2>JIRA Connection</h2>
          <label className="field" htmlFor="jira-token">Token</label>
          <input
            id="jira-token"
            className={errors.jiraToken ? "field-input has-error" : "field-input"}
            type="password"
            autoComplete="new-password"
            placeholder={settings.jiraConfigured ? "•••••••• configured (leave blank to keep)" : "Jira API token"}
            value={form.jiraToken}
            onChange={change("jiraToken")}
            aria-invalid={Boolean(errors.jiraToken)}
          />
          {errors.jiraToken && <p className="field-error" role="alert">{errors.jiraToken}</p>}

          <label className="field" htmlFor="jira-email">Email</label>
          <input id="jira-email" className={errors.jiraEmail ? "field-input has-error" : "field-input"}
            inputMode="email" value={form.jiraEmail} onChange={change("jiraEmail")} aria-invalid={Boolean(errors.jiraEmail)} />
          {errors.jiraEmail && <p className="field-error" role="alert">{errors.jiraEmail}</p>}

          <label className="field" htmlFor="jira-url">URL</label>
          <input id="jira-url" className={errors.jiraUrl ? "field-input has-error" : "field-input"}
            inputMode="url" value={form.jiraUrl} onChange={change("jiraUrl")} aria-invalid={Boolean(errors.jiraUrl)} />
          {errors.jiraUrl && <p className="field-error" role="alert">{errors.jiraUrl}</p>}
          {status(jiraStatus)}
          <button type="button" className="secondary-button centered" disabled={loading} onClick={testJira}>Test Connection</button>
        </section>

        <section className="settings-card llm-card">
          <h2>LLM Configuration</h2>
          <label className="provider-option">
            <span>1.</span>
            <input type="radio" name="aiProvider" value="ollama" checked={form.aiProvider === "ollama"} onChange={change("aiProvider")} />
            <span>Ollama Connection</span>
          </label>
          <label className="field" htmlFor="ollama-url">Ollama URL</label>
          <input id="ollama-url" className={errors.ollamaUrl ? "field-input has-error" : "field-input"}
            value={form.ollamaUrl} onChange={change("ollamaUrl")} aria-invalid={Boolean(errors.ollamaUrl)} />
          {errors.ollamaUrl && <p className="field-error" role="alert">{errors.ollamaUrl}</p>}
          <label className="field" htmlFor="ollama-model">Ollama model</label>
          <input id="ollama-model" className={errors.ollamaModel ? "field-input has-error" : "field-input"}
            value={form.ollamaModel} onChange={change("ollamaModel")} aria-invalid={Boolean(errors.ollamaModel)} />
          {errors.ollamaModel && <p className="field-error" role="alert">{errors.ollamaModel}</p>}
          <p className="model-info">On Vercel, Ollama must be reachable over the internet; 127.0.0.1 refers to Vercel, not your computer.</p>
          {status(ollamaStatus)}
          <button type="button" className="secondary-button" disabled={loading} onClick={() => testProvider("ollama")}>Test Ollama</button>

          <label className="provider-option">
            <span>2.</span>
            <input type="radio" name="aiProvider" value="groq" checked={form.aiProvider === "groq"} onChange={change("aiProvider")} />
            <a href="https://groq.com" target="_blank" rel="noreferrer">↗ Groq.com</a>
            <span>(API key)</span>
          </label>
          <label className="field" htmlFor="groq-key">Groq API key</label>
          <input id="groq-key" className={errors.groqKey ? "field-input has-error" : "field-input"}
            type="password" autoComplete="new-password"
            placeholder={settings.groqConfigured ? "•••••••• configured (leave blank to keep)" : "Groq API key"}
            value={form.groqKey} onChange={change("groqKey")} aria-invalid={Boolean(errors.groqKey)} />
          {errors.groqKey && <p className="field-error" role="alert">{errors.groqKey}</p>}
          <label className="field" htmlFor="groq-model">Groq model</label>
          <input id="groq-model" className={errors.groqModel ? "field-input has-error" : "field-input"}
            value={form.groqModel} onChange={change("groqModel")} aria-invalid={Boolean(errors.groqModel)} />
          {errors.groqModel && <p className="field-error" role="alert">{errors.groqModel}</p>}
          {status(groqStatus)}
          {errors.aiProvider && <p className="field-error" role="alert">{errors.aiProvider}</p>}
          <button type="button" className="secondary-button" disabled={loading} onClick={() => testProvider("groq")}>Test Groq</button>
        </section>

        <div className="save-row">
          <button className="primary-button" disabled={loading}>{loading ? "Saving…" : "Save Settings"}</button>
          {saved && <p className="inline-success" role="status">{saved}</p>}
        </div>
      </form>
    </main>
  );
}
