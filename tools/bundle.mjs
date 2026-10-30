// Bundles a lesson or reference page into one self-contained HTML file for publishing
// as a claude.ai Artifact: inlines ../assets CSS/JS, strips the document skeleton
// (the publisher adds its own), and turns links to local pages into plain text.
//
// Usage: node tools/bundle.mjs <input.html> <output.html>
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node tools/bundle.mjs <input.html> <output.html>");
  process.exit(1);
}
const dir = dirname(resolve(input));
let html = readFileSync(input, "utf8");

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
  `<style>\n${readFileSync(resolve(dir, href), "utf8")}\n</style>`);
// Escape "</script" inside inlined code (e.g. in usage comments) so it can't end the element early.
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
  `<script>\n${readFileSync(resolve(dir, src), "utf8").replace(/<\/script/gi, "<\\/script")}\n</script>`);

html = html
  .replace(/<!doctype html>\s*/i, "")
  .replace(/<\/?html[^>]*>\s*/gi, "")
  .replace(/<\/?head>\s*/gi, "")
  .replace(/<\/?body>\s*/gi, "")
  .replace(/<meta charset="[^"]*">\s*/i, "")
  .replace(/<meta name="viewport"[^>]*>\s*/i, "");

if (!html.includes('name="claude:viewport-fit-sides"')) {
  html = html.replace(/(<title>[^<]*<\/title>)/, '$1\n<meta name="claude:viewport-fit-sides" content="cover">');
}

// Local pages don't exist on the published site, so keep only the link text.
html = html.replace(/<a href="(?!https?:)[^"]*\.html[^"]*">([\s\S]*?)<\/a>/g, "<span>$1</span>");

writeFileSync(output, html);
console.log(`Bundled ${input} -> ${output} (${(html.length / 1024).toFixed(1)} KB)`);
