const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const root = __dirname;
const output = path.join(root, "dist");
const publicOutput = path.join(root, "public");

async function build() {
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(publicOutput, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(root, "src/frontend/main.jsx")],
    outfile: path.join(output, "app.js"),
    bundle: true,
    minify: true,
    platform: "browser",
    target: "es2020"
  });
  const html = fs.readFileSync(path.join(root, "src/frontend/index.html"), "utf8")
    .replace('href="./styles.css"', 'href="/app.css"')
    .replace('<script type="module" src="./main.jsx"></script>', '<script src="/app.js" defer></script>');
  fs.writeFileSync(path.join(output, "index.html"), html);
  fs.copyFileSync(path.join(root, "src/frontend/styles.css"), path.join(output, "app.css"));
  fs.copyFileSync(path.join(root, "Testplan_Template.md"), path.join(output, "Testplan_Template.md"));
  for (const file of ["index.html", "app.js", "app.css"]) {
    fs.copyFileSync(path.join(output, file), path.join(publicOutput, file));
  }
  console.log("Frontend built in dist/.");
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
