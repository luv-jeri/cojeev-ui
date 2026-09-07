import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { execFileSync } from "node:child_process";

const cssIssues=[];
function checkCSS(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) checkCSS(file);
    else if (file.endsWith(".css")) postcss.parse(fs.readFileSync(file, "utf8"), { from: file }).walkDecls(declaration => {
      if (declaration.important) cssIssues.push(`Production CSS must not use !important: ${file}:${declaration.source.start.line}`);
    });
  }
}
checkCSS("registry/sahajiv");
if(cssIssues.length)throw new Error(cssIssues.join("\n"));
execFileSync(process.execPath, ["node_modules/eslint/bin/eslint.js", "app", "components", "lib", "registry/sahajiv", "apps", "scripts", "tests", "--max-warnings=0"], { stdio: "inherit" });
