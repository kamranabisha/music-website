const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "script.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");

const ids = [...js.matchAll(/\$\("#([\w-]+)"\)/g)].map((m) => m[1]);
const uniq = [...new Set(ids)];
const missing = uniq.filter((id) => !html.includes('id="' + id + '"'));
console.log("ids referenced:", uniq.length);
console.log(missing.length ? "MISSING: " + missing.join(", ") : "all ids present");

const actions = [...new Set([...js.matchAll(/dataset\.action = "([\w-]+)"/g)].map((m) => m[1]))];
const handled = new Set([...js.matchAll(/case "([\w-]+)":/g)].map((m) => m[1]));
const htmlActions = [...new Set([...html.matchAll(/data-action="([\w-]+)"/g)].map((m) => m[1]))];
const allActions = [...new Set([...actions, ...htmlActions])];
const unhandled = allActions.filter((a) => !handled.has(a));
console.log("actions:", allActions.join(", "));
console.log(unhandled.length ? "UNHANDLED: " + unhandled.join(", ") : "all actions handled");

const cssClasses = ["row__info", "row__eq", "row__play", "row__index", "is-playing", "is-active", "art__badge", "minibar"];
cssClasses.forEach((c) => {
  if (!css.includes("." + c)) console.log("CSS missing class:", c);
});

const assetRefs = [
  ...[...html.matchAll(/(?:src|href)="((?:art|audio)\/[^"]+)"/g)].map((m) => m[1]),
  ...[...js.matchAll(/(?:src|art): "((?:art|audio)\/[^"]+)"/g)].map((m) => m[1])
];
assetRefs.forEach((p) => {
  if (!fs.existsSync(path.join(root, p))) console.log("missing asset:", p);
});
console.log("checks done");
