const { createApp } = require("./app");
const { getConfig } = require("./config");

module.exports = createApp({ config: getConfig() });
