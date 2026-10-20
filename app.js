// Renders window.SHEETS and handles the tab filter. The selected sheet lives
// in the URL hash (#kitty), so a filtered view can be bookmarked.

const nav = document.querySelector("nav");
const main = document.querySelector("main");

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const keys = (list) =>
  list.map((k) => (k === "›" ? '<span class="then">›</span>' : `<kbd>${esc(k)}</kbd>`)).join("");

const row = ([list, desc, mine]) =>
  `<dt${mine ? ' class="mine"' : ""}>${keys(list)}</dt><dd>${esc(desc)}</dd>`;

// Sections with long commands put each description under its keys, so the
// description column isn't squeezed to a word per line.
const isLong = (rows) => rows.some(([list]) => list.join(" ").length > 17);

const section = (s) => `
  <section>
    <h3>${esc(s.title)}</h3>
    ${s.pre ? `<pre>${esc(s.pre)}</pre>` : ""}
    ${s.rows ? `<dl${isLong(s.rows) ? ' class="stack"' : ""}>${s.rows.map(row).join("")}</dl>` : ""}
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}
  </section>`;

main.innerHTML = SHEETS.map(
  (sheet) => `
  <article data-id="${sheet.id}" style="--accent: var(--${sheet.accent})">
    <h2>${esc(sheet.name)}</h2>
    <div class="sections">${sheet.sections.map(section).join("")}</div>
  </article>`
).join("");

nav.innerHTML = [{ id: "all", name: "all", accent: "fg" }, ...SHEETS]
  .map((s) => `<a href="#${s.id === "all" ? "" : s.id}" data-id="${s.id}" style="--accent: var(--${s.accent})">${esc(s.name)}</a>`)
  .join("");

// Give every section in a sheet the same key column: the width of the sheet's
// widest key, leaving out stacked sections. A hidden sheet has no layout, so
// each one is measured the first time it's shown.
const aligned = new WeakSet();
function align() {
  for (const article of main.children) {
    if (article.hidden || aligned.has(article)) continue;
    let widest = 0;
    for (const dt of article.querySelectorAll("dl:not(.stack) dt")) {
      const keys = [...dt.children];
      const width = keys.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) + 4 * (keys.length - 1);
      widest = Math.max(widest, width);
    }
    article.style.setProperty("--key-w", `min(${Math.ceil(widest)}px, 58%)`);
    aligned.add(article);
  }
}

function show() {
  const wanted = location.hash.slice(1);
  const id = SHEETS.some((s) => s.id === wanted) ? wanted : "all";
  document.body.dataset.view = id;
  for (const article of main.children) article.hidden = id !== "all" && article.dataset.id !== id;
  for (const link of nav.children) link.setAttribute("aria-current", link.dataset.id === id ? "page" : "false");
  document.title = id === "all" ? "cheatsheets" : `${SHEETS.find((s) => s.id === id).name} · cheatsheets`;
  align();
}

// Articles carry data-id rather than id, so the hash never scrolls the page;
// a new filter starts at the top.
addEventListener("hashchange", () => {
  show();
  scrollTo(0, 0);
});
show();
