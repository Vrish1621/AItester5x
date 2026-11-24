# Jira Test Plan

## Run

Requires Node.js 18 or newer. From this folder:

```sh
npm install
npm start
```

Open http://localhost:3000. The backend listens on localhost only. Run `npm test` for local checks.

## Frontend

The React UI is in `src/frontend`: `App.jsx` manages the tabs, `MainPage.jsx` and `SettingsPage.jsx` contain each view, `api.js` handles backend calls, and `envFile.js` holds public frontend constants. `main.jsx` renders the app and imports `styles.css`; `index.html` is the frontend entry.

## Configuration

Users enter Jira, provider, and model settings in the app after it loads. Settings are saved in that browser and sent with connection-test and generation requests; the server does not save visitor settings or write a `.env` file. Use a trusted browser/device when entering API tokens. Ollama must be reachable by the server; `127.0.0.1` on Vercel refers to Vercel itself, not the user's computer.

Optional shared defaults can be set in the workspace-parent `.env` for local development or as Vercel environment variables:

| Variable | Purpose |
|---|---|
| `JIRA_BASE_URL` | Jira site URL |
| `JIRA_EMAIL` | Jira account email |
| `JIRA_API_TOKEN` | Jira API token |
| `AI_PROVIDER` | `groq` or `ollama` |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | Groq model ID |
| `OLLAMA_BASE_URL` or `DEFAULT_OLLAMA_URL` | Ollama server URL (`OLLAMA_BASE_URL` takes precedence) |
| `OLLAMA_MODEL` or `DEFAULT_OLLAMA_MODEL` | Installed Ollama model name (`OLLAMA_MODEL` takes precedence) |

## Deploy to Vercel

From this folder, run `vercel` and follow the prompts, or use `vercel --prod` for a production deployment. The `api/` files expose each Express API endpoint as a Vercel Function. The build command publishes the frontend assets and copies the test-plan template. `Testplan_Template.md` is the template copy included in this deployable project.

## Use and verification

Enter a Jira issue key and select Generate. The app reads the Jira issue, uses the supplied `01_Plan/Testplan_Template.md`, and displays a draft with a Jira source link. Settings can test Jira, Groq, or Ollama connections. No Jira issues are modified.

`npm test` checks invalid issue handling, secret omission, and a mocked Jira-to-Groq flow. `npm run build` checks the React frontend. Live Jira/AI connectivity was not tested; it depends on the configured services being reachable.
