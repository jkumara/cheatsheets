// Renders window.SHEETS, the tab filter and the search. The selected sheet
// lives in the URL hash (#kitty), so a filtered view can be bookmarked.

const nav = document.querySelector("nav");
const main = document.querySelector("main");
const search = document.getElementById("search");

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const keys = (list) =>
  list.map((k) => (k === "›" ? '<span class="then">›</span>' : `<kbd>${esc(k)}</kbd>`)).join("");

const row = ([list, desc, mine]) =>
  `<dt${mine ? ' class="mine"' : ""}>${keys(list)}</dt><dd>${esc(desc)}</dd>`;

const section = (s) => `
  <section>
    <h3>${esc(s.title)}</h3>
    ${s.pre ? `<pre>${esc(s.pre)}</pre>` : ""}
    ${s.rows ? `<dl>${s.rows.map(row).join("")}</dl>` : ""}
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}
  </section>`;

main.innerHTML =
  SHEETS.map(
    (sheet) => `
  <article data-id="${sheet.id}" style="--accent: var(--${sheet.accent})">
    <h2>${esc(sheet.name)}</h2>
    <div class="sections">${sheet.sections.map(section).join("")}</div>
  </article>`
  ).join("") + '<p class="empty" hidden></p>';

nav.innerHTML = [{ id: "all", name: "all", accent: "fg" }, ...SHEETS]
  .map((s) => `<a href="#${s.id === "all" ? "" : s.id}" data-id="${s.id}" style="--accent: var(--${s.accent})">${esc(s.name)}</a>`)
  .join("");

const articles = [...main.querySelectorAll("article")];
const empty = main.querySelector(".empty");

const GAP = 12; // between the key and description columns, as in style.css
const MIN_DESC = 110; // narrowest description column worth keeping beside the keys
const WIDTH_COST = 4; // one more key column width in a sheet is worth four wrapped lines

const keyWidth = (dt) => {
  const parts = [...dt.children];
  return parts.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) + 4 * (parts.length - 1);
};

// The font is monospace, so a description's unwrapped width is its length
// times one character's width.
function charWidth() {
  const probe = document.createElement("span");
  probe.textContent = "0".repeat(100);
  main.append(probe);
  const width = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return width;
}

// Lines descriptions up across a sheet. Sections share one key column width
// unless their keys are wider, and the shared width is picked to keep both
// wrapped descriptions and the number of different widths low. A section
// puts each description under its keys instead when its keys leave the
// descriptions too little room, or wrap them so much that two columns would
// be taller than stacking.
// Column width depends only on the window, so this reruns on resize. A hidden
// sheet has no layout, so its keys are measured the first time it's shown,
// before a search hides rows.
const measured = new WeakSet();
function layout() {
  for (const article of articles) {
    if (article.hidden) continue;
    const dls = [...article.querySelectorAll("dl")];
    if (!measured.has(article)) {
      const ch = charWidth();
      for (const dl of dls) {
        dl.keyW = Math.ceil(Math.max(...[...dl.querySelectorAll("dt")].map(keyWidth)));
        dl.descWs = [...dl.querySelectorAll("dd")].map((dd) => dd.textContent.length * ch);
      }
      measured.add(article);
    }
    const width = Math.max(...dls.map((dl) => dl.clientWidth));
    if (!width) continue;
    const wraps = (dl, key) => dl.descWs.reduce((n, d) => n + Math.max(0, Math.ceil((d - 1) / (width - key - GAP)) - 1), 0);
    const flat = dls.filter((dl) => width - dl.keyW - GAP >= MIN_DESC && wraps(dl, dl.keyW) <= dl.descWs.length);
    let best = null;
    for (const shared of [...new Set(flat.map((dl) => dl.keyW))].sort((a, b) => a - b)) {
      const keys = flat.map((dl) => Math.max(shared, dl.keyW));
      const cost = flat.reduce((n, dl, i) => n + wraps(dl, keys[i]), 0) + WIDTH_COST * (new Set(keys).size - 1);
      if (!best || cost < best.cost) best = { shared, cost };
    }
    for (const dl of dls) {
      const stack = !flat.includes(dl);
      dl.classList.toggle("stack", stack);
      if (!stack) dl.style.setProperty("--key-w", `${Math.max(best.shared, dl.keyW)}px`);
    }
  }
}
new ResizeObserver(() => layout()).observe(main);

// Key symbols also match their names, so "cmd" finds ⌘ and "shift" finds ⇧.
const SYMBOLS = {
  "⌘": ["cmd", "command"],
  "⌃": ["ctrl", "control"],
  "⇧": ["shift"],
  "⌥": ["alt", "opt", "option"],
  "⇥": ["tab"],
  "↩": ["enter", "return"],
  "↑": ["up", "arrow", "arrows"],
  "↓": ["down", "arrow", "arrows"],
  "←": ["left", "arrow", "arrows"],
  "→": ["right", "arrow", "arrows"],
};
const symbolsFor = (term) => Object.keys(SYMBOLS).filter((sym) => SYMBOLS[sym].includes(term));
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function clearSearch() {
  for (const mark of main.querySelectorAll("mark")) mark.replaceWith(mark.textContent);
  for (const el of main.querySelectorAll("section[hidden], dt[hidden], dd[hidden]")) el.hidden = false;
  main.normalize();
}

// Wraps every match in the visible text of root in <mark>.
function highlight(root, pattern) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.parentElement.closest("[hidden]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parts = node.data.split(pattern);
    if (parts.length === 1) continue;
    // split() with a capture group puts the matches at the odd indexes.
    node.replaceWith(...parts.map((part, i) => (i % 2 ? Object.assign(document.createElement("mark"), { textContent: part }) : part)));
  }
}

// Shows only the rows where every search word appears in the keys, the
// description or the section's title, pre or note.
function filter(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const alternatives = terms.flatMap((t) => [t, ...symbolsFor(t)]).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${alternatives.map(reEscape).join("|")})`, "gi");
  let found = false;
  for (const article of articles) {
    if (article.hidden) continue;
    let any = false;
    for (const sec of article.querySelectorAll("section")) {
      const context = [...sec.querySelectorAll("h3, pre, .note")].map((el) => el.textContent).join(" ").toLowerCase();
      const dts = [...sec.querySelectorAll("dt")];
      let shown = dts.length ? 0 : terms.every((t) => context.includes(t)) ? 1 : 0;
      for (const dt of dts) {
        const text = `${dt.textContent} ${dt.nextElementSibling.textContent}`.toLowerCase();
        const match = terms.every((t) => text.includes(t) || context.includes(t) || symbolsFor(t).some((sym) => text.includes(sym)));
        dt.hidden = dt.nextElementSibling.hidden = !match;
        if (match) shown++;
      }
      sec.hidden = !shown;
      if (shown) highlight(sec, pattern);
      any ||= Boolean(shown);
    }
    article.hidden = !any;
    found ||= any;
  }
  return found;
}

function update() {
  const wanted = location.hash.slice(1);
  const id = SHEETS.some((s) => s.id === wanted) ? wanted : "all";
  document.body.dataset.view = id;
  clearSearch();
  for (const article of articles) article.hidden = id !== "all" && article.dataset.id !== id;
  for (const link of nav.children) link.setAttribute("aria-current", link.dataset.id === id ? "page" : "false");
  document.title = id === "all" ? "cheatsheets" : `${SHEETS.find((s) => s.id === id).name} · cheatsheets`;
  layout();
  const query = search.value.trim();
  empty.hidden = filter(query);
  empty.innerHTML = `Nothing matches “${esc(query)}”${id === "all" ? "." : ` in ${esc(document.title.split(" ·")[0])}. <a href="#">Search all sheets</a>`}`;
}

// Articles carry data-id rather than id, so the hash never scrolls the page;
// a new filter starts at the top.
addEventListener("hashchange", () => {
  update();
  scrollTo(0, 0);
});
search.addEventListener("input", update);

// "/" jumps to the search, Escape clears it.
addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== search) {
    event.preventDefault();
    search.focus();
    search.select();
  } else if (event.key === "Escape" && document.activeElement === search) {
    search.value = "";
    search.blur();
    update();
  }
});

update();
