# Remix - agent brief

Read the app brief [`../../AGENTS.md`](../../AGENTS.md) for module isolation and shared-file markers. Read this before changing **Remix**. Operator docs: `docs/en|de/ui-styles/remix/`. Human README: `remix/README.md`.

## What it is

Opt-in Desk shell at `/remix` (standard `/desk` is unchanged). Site switches on **Remix Settings**: master *Enable Remix*, then *History* and *Favorites* (regular Frappe navbar), *Alternative Navigation* (optional *Search* above the app switcher), and *Colors* (Desk Colour themes, optional *Manual Colours*). At least one of History, Favorites, or Alternative Navigation is required when Remix is enabled.

- Package: `ui_styles.remix`
- Settings: **Remix Settings** (Single; all checks default **off**)
- App: `ui_styles`

## Hard constraints

1. **Opt-in only.** `enabled` defaults to off. Installing the app must not change Desk. `/remix` redirects to `/desk` until a System Manager enables Remix.
2. **Display-only.** Never create, update, or delete business records. Favorites and Colors may write user **DefaultValue** presentation prefs (keys `erpnext_remix_*` for compatibility). Settings Single saves are allowed.
3. **No Frappe core edits.** All behaviour stays in this module.
4. ASCII hyphens only in Python strings/docs.
5. **No raw SQL.** Prefer ORM / Query Builder. User prefs use `DefaultValue` via `frappe.db.get_value` / `frappe.defaults.set_user_default`.

## Code map

| Path | Role |
|------|------|
| `remix/boot.py` | `extend_bootinfo` - `frappe.boot.remix` flags plus favorites / colours |
| `remix/doctype/remix_settings/` | Settings Single |
| `remix/app_favorites.py` | App favorite whitelist (stars in the sidebar switcher) |
| `remix/bookmarks.py` | Page bookmarks whitelist (star in the navbar, any Desk route) |
| `remix/appearance.py` | User Remix colours (preset or Custom `background` / `sidebar` hex; presets copied from Desk Background tokens) |
| `remix/history.py` | Route History (last 10 distinct) |
| `www/remix.html` / `www/remix.py` | `/remix` Desk shell (redirects when disabled) |
| `public/remix/remix.bundle.js` | Entry: imports `router.js` then `shell.js` |
| `public/remix/router.js` | `/remix` as a Desk prefix |
| `public/remix/shell.js` | Chrome, feature-gated |
| `public/remix/remix.bundle.css` | Styles scoped to `body.remix-desk` |

Assets are esbuild bundles (hashed file names via `assets.json`), because plain `/assets/...` files are served with a 12h `Cache-Control` and browsers kept stale Remix CSS. Run `bench build --app ui_styles` after editing them.
| `docs/en\|de/ui-styles/remix/` | Compendium |

When *Enable Remix* is on, `/desk` and `/remix` show a sidebar link to switch. There is no Remix top bar: History and Favorites sit in the regular Frappe navbar. Chrome defaults to system Desk colours until the user picks a Colors theme. A chosen theme (or Custom *Background* / *Sidebar* hex) sets the same Desk CSS variables as Desk Background (`<style id="remix-color-tokens">`, appended after the Desk Background style so it wins) plus the Remix sidebar variables.

JS namespace: `ui_styles.remix`. Body classes: `remix-desk`, `remix-has-sidebar`.

## Client contract

- Boot: `frappe.boot.remix.enabled` (load gate) plus `history` / `favorites` / `search` / `alternative_navigation` / `colors`
- Search is 0 when Alternative Navigation is off
- Sidebar search: Frappe AwesomeBar bound to the sidebar input; the "Search in documents" checkbox (localStorage `erpnext_remix:content_search`) swaps the list for `frappe.utils.global_search.search` hits (limit 200, because Frappe caps at 20 before sorting and returns DocTypes in arbitrary order); client orders exact name, then masters (`CONTENT_SEARCH_MASTERS`), then the rest
- Favorites/Colors APIs throw if that widget is off
- Alternative Navigation off: keep Frappe sidebar. History/Favorites still use the Frappe navbar.

## Deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build.
