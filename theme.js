// Day/night switch. The page follows the system until the button is used; the
// button flips whichever theme is showing, and flipping back to the system's
// own theme returns to following it. Loaded in <head> so a stored choice
// applies before the first paint.
(() => {
  const root = document.documentElement;
  const system = matchMedia("(prefers-color-scheme: dark)");
  const BG = { light: "#e1e2e7", dark: "#1a1b26" };
  const ICON = {
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  };

  let chosen = null;
  try { chosen = localStorage.getItem("theme"); } catch {}
  const shown = () => chosen ?? (system.matches ? "dark" : "light");

  function apply() {
    if (chosen) root.dataset.theme = chosen;
    else delete root.dataset.theme;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.dataset.auto ??= meta.content;
      meta.content = chosen ? BG[chosen] : meta.dataset.auto;
    }
    const button = document.getElementById("theme");
    if (!button) return;
    const next = shown() === "dark" ? "light" : "dark";
    button.innerHTML = ICON[next];
    button.title = button.ariaLabel = `Switch to ${next} mode`;
  }

  apply();
  system.addEventListener("change", apply);
  addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("theme").addEventListener("click", () => {
      const next = shown() === "dark" ? "light" : "dark";
      chosen = next === (system.matches ? "dark" : "light") ? null : next;
      try { chosen ? localStorage.setItem("theme", chosen) : localStorage.removeItem("theme"); } catch {}
      apply();
    });
  });
})();
