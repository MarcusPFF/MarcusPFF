// Builds the animated intro at the top of the profile README.
// The workflow reruns it on a schedule so the time and status follow Danish time.
import { mkdirSync, writeFileSync } from "node:fs";

const outDir = process.argv[2] ?? "dist";

const THEMES = {
  light: { file: "intro.svg", bg: "#f6f8fa", text: "#1f2328", keyword: "#cf222e", name: "#0550ae", string: "#0a3069", comment: "#59636e", cursor: "#9333ea" },
  dark: { file: "intro-dark.svg", bg: "#151b23", text: "#f0f6fc", keyword: "#ff7b72", name: "#79c0ff", string: "#a5d6ff", comment: "#9198a1", cursor: "#a855f7" },
};

// [from hour, status], Danish time
const STATUSES = [
  [0, "probably asleep"],
  [7, "waking up"],
  [9, "writing code"],
  [17, "eating dinner"],
  [19, "probably still coding"],
  [23, "probably asleep"],
];

const WIDTH = 880;
const PAD = 16;
const LINE = 21;
const CHAR = 8.4;
const TYPE_MS = 45;
const LINE_PAUSE_MS = 250;
const START_MS = 700;

const now = Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date())
    .map(({ type, value }) => [type, value]),
);
const zone = now.timeZoneName === "GMT+2" ? "CEST" : "CET";
const status = STATUSES.findLast(([hour]) => Number(now.hour) >= hour)[1];

const lines = [
  [["const", "keyword"], [" "], ["marcus", "name"], [" "], ["=", "keyword"], [" {"]],
  [["  location: "], ['"Denmark"', "string"], [","]],
  [["  localTime: "], [`"${now.hour}:${now.minute} ${zone}"`, "string"], [","]],
  [["  status: "], [`"${status}"`, "string"], [","]],
  [["}"]],
];

// Only people browsing GitHub in light mode see this
const easterEgg = [[], [["// light mode? bold choice", "comment"]]];

const steps = (n, unit, offset = 0) =>
  Array.from({ length: n + 1 }, (_, i) => +(offset + i * unit).toFixed(1)).join(";");

const render = (theme, rows) => {
  const height = PAD * 2 + rows.length * LINE;
  const texts = rows.map((tokens) => tokens.map(([s]) => s).join(""));
  const lastTyped = texts.findLastIndex((s) => s.length > 0);
  let t = START_MS;
  const body = [];

  rows.forEach((tokens, i) => {
    if (!texts[i]) {
      t += LINE_PAUSE_MS;
      return;
    }
    // SVG drops leading spaces, so indentation becomes an x offset
    const n = texts[i].trimStart().length;
    const x = PAD + (texts[i].length - n) * CHAR;
    const top = PAD + i * LINE;
    const begin = `${t}ms`;
    const dur = `${n * TYPE_MS}ms`;
    t += n * TYPE_MS;
    const end = `${t}ms`;
    t += LINE_PAUSE_MS;
    const next = `${t}ms`;

    const spans = tokens
      .map(([s, kind = "text"], j) => `<tspan class="${kind}">${j === 0 ? s.trimStart() : s}</tspan>`)
      .join("");
    body.push(
      `<clipPath id="l${i}"><rect x="${x}" y="${top}" width="0" height="${LINE}">` +
        `<animate attributeName="width" values="${steps(n, CHAR)}" calcMode="discrete" begin="${begin}" dur="${dur}" fill="freeze"/></rect></clipPath>`,
      `<text x="${x}" y="${top + 15}" textLength="${(n * CHAR).toFixed(1)}" lengthAdjust="spacing" clip-path="url(#l${i})">${spans}</text>`,
    );

    // One cursor per line: visible while the line types, then the last one keeps blinking
    const isFirst = i === 0;
    const isLast = i === lastTyped;
    const blink = (timing) => `<animate attributeName="opacity" values="1;0" calcMode="discrete" dur="1s" repeatCount="indefinite" ${timing}/>`;
    body.push(
      `<rect class="cursor" x="${x}" y="${top + 2}" width="2" height="17" opacity="${isFirst ? 1 : 0}">` +
        `<animate attributeName="x" values="${steps(n, CHAR, x)}" calcMode="discrete" begin="${begin}" dur="${dur}" fill="freeze"/>` +
        (isFirst ? blink(`end="${begin}"`) : "") +
        (isFirst && !isLast ? `<set attributeName="opacity" to="0" begin="${next}"/>` : "") +
        (!isFirst ? `<set attributeName="opacity" to="1" begin="${begin}"${isLast ? "" : ` end="${next}"`}/>` : "") +
        (isLast ? blink(`begin="${end}"`) : "") +
        `</rect>`,
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xml:space="preserve" role="img" aria-label="const marcus = { location: Denmark, localTime: ${now.hour}:${now.minute} ${zone}, status: ${status} }">
<style>
text { font: 14px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
.text { fill: ${theme.text}; } .keyword { fill: ${theme.keyword}; } .name { fill: ${theme.name}; }
.string { fill: ${theme.string}; } .comment { fill: ${theme.comment}; } .cursor { fill: ${theme.cursor}; }
</style>
<rect width="${WIDTH}" height="${height}" rx="6" fill="${theme.bg}"/>
${body.join("\n")}
</svg>
`;
};

mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/${THEMES.light.file}`, render(THEMES.light, [...lines, ...easterEgg]));
writeFileSync(`${outDir}/${THEMES.dark.file}`, render(THEMES.dark, lines));
