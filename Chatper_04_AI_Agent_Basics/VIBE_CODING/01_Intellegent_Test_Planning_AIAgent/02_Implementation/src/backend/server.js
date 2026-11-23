const path = require("node:path");
const dotenv = require("dotenv");
const { createApp } = require("./app");

const workspace = path.resolve(__dirname, "../../../../../../");
dotenv.config({ path: path.join(workspace, ".env") });

const { getConfig } = require("./config");
const app = createApp({ config: getConfig() });
const port = Number(process.env.PORT) || 3000;
app.listen(port, "127.0.0.1", () => console.log(`Jira Test Plan running at http://localhost:${port}`));
