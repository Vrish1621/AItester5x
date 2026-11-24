import React, { useState } from "react";
import { generateTestPlan } from "./api.js";
import { JIRA_ISSUE_KEY_PATTERN } from "./envFile.js";

export default function MainPage() {
  const [issueKey, setIssueKey] = useState("");
  const [plan, setPlan] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIssueUrl("");
    if (!JIRA_ISSUE_KEY_PATTERN.test(issueKey.trim())) {
      setError("Enter a Jira ticket key, for example QA-123.");
      return;
    }

    setLoading(true);
    try {
      const result = await generateTestPlan(issueKey.trim());
      setPlan(result.plan);
      setIssueUrl(result.issueUrl);
      setNotice("Draft generated. Review it before sign-off.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page main-page">
      <h1>Main page</h1>
      <section className="output" aria-live="polite" aria-label="Generated test plan">
        {loading && <p className="placeholder">Retrieving Jira issue and generating plan…</p>}
        {!loading && plan && (
          <>
            <div className="plan-heading">
              <strong>Draft test plan</strong>
              {issueUrl && <a href={issueUrl} target="_blank" rel="noreferrer">Source: {issueKey.toUpperCase()}</a>}
            </div>
            <pre>{plan}</pre>
          </>
        )}
        {!loading && !plan && <p className="placeholder">Reply with Test Plan will appear here. Enter a Jira ticket below.</p>}
      </section>
      <form className="generate-form" onSubmit={generate} noValidate>
        <div className="field issue-field">
          <label className="sr-only" htmlFor="jira-issue">Jira ticket</label>
          <input
            id="jira-issue"
            className={error ? "field-input has-error" : "field-input"}
            value={issueKey}
            onChange={(event) => { setIssueKey(event.target.value); setError(""); }}
            placeholder="Prompt (JIRA Ticket), e.g. QA-123"
            aria-describedby={error ? "jira-issue-error" : undefined}
            aria-invalid={Boolean(error)}
          />
          {error && <p className="field-error" id="jira-issue-error" role="alert">{error}</p>}
        </div>
        <button className="primary-button" disabled={loading}>{loading ? "Generating…" : "Generate"}</button>
      </form>
      {notice && <p className="inline-success" role="status">{notice}</p>}
    </main>
  );
}
