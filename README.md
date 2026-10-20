# cheatsheets

My personal cheatsheets, live at [cheatsheet.kumara.dev](https://cheatsheet.kumara.dev): kitty, shell (zsh, oh-my-zsh, wd, fzf, bat, eza), herdr, yazi, neovim, crontab and regex.

They're written for my own setup on macOS, so they mix each tool's defaults with my config. Keys and aliases in orange are mine, not the tool's.

Tokyo Night colors, Night in dark mode and Day in light mode. The tabs at the top filter by sheet, and the filter is in the URL (`/#kitty`), so one sheet can be bookmarked or kept open on a second screen.

## Edit

Everything is static: no build step, no dependencies.

- `sheets.js` holds the content. Each row is `[keys, description, mine?]`.
- `app.js` renders the sheets and handles the filter.
- `style.css` is the layout and colors.

Preview by opening `index.html` in a browser.

## Deploy

Vercel serves the folder as a static site and redeploys on every push to `main`.

## Credit

The kitty sheet started from [siekman.io's kitty cheatsheet](https://siekman.io/tools/cheatsheets/kitty). Every binding was checked against the installed tools and my configs.
