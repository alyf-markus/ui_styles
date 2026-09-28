# UI Styles - agent brief

Read this before changing **UI Styles**. Module-specific briefs live next to each feature (e.g. `doc_table/AGENTS.md`).

## What it is

Frappe app that ships independent Desk UI / style features. Each feature is a **self-contained module**. Modules must not share CSS, JS state, or Python helpers in a way that couples them.

## Hard constraints

1. **Opt-in only - never force UI on end users.** Installing the app must not change Desk appearance or behaviour for ordinary users. Features stay **passive in the background** until a System Manager (or the installer) explicitly enables them. Default every enable switch to off / inactive.
2. **Display-only - never modify or save data.** UI Styles features are pure presentation options: they may change how Desk looks or how related data is shown, but they must not create, update, or delete business records, child rows, or parent field values at runtime. Install/migrate configuration (Property Setters, settings DocTypes, field Options) is allowed; user-facing behaviour must stay read-only.
3. **Modules do not interact.** A style or UI change stays inside its own module. No cross-imports between feature modules, no shared CSS selectors that another module depends on, no shared JS namespaces beyond `ui_styles.<module>`.
4. **Self-sufficient modules.** Each module owns its Python package, Desk assets, install/uninstall hooks, patches, docs, and tests. Removing a module (and its marked lines in shared app files) must leave the rest of the app working.
5. **Do not edit Frappe core** for features in this app.
6. ASCII hyphens only in Python strings/docs (`-`, not en/em dash).
7. **Match Frappe/ERPNext translations.** PO `msgstr` values and translated docs (`docs/{lang}/`) must reuse the official Frappe or ERPNext wording for the same English string when one exists. Only invent translations for new app-specific strings; keep docs and PO aligned. Use `ignore_translatable_strings_from` so core strings are not re-exported into this app's POT.
8. **No raw SQL.** Do not use `frappe.db.sql`, f-strings, or `.format()` for database queries. Prefer Frappe Query Builder (`frappe.qb`). For permission-aware reads, `frappe.get_list` / ORM helpers are fine.

### Opt-in details

- **Global Desk CSS/JS** that alters layout, colours, density, or interaction for all users must be gated by a settings flag (default off). Do not put always-on `app_include_*` for visual overrides.
- **Passive until used** is allowed without a toggle when the feature does nothing until configured (e.g. a custom fieldtype that only appears after someone adds a field). Still avoid loading heavy assets on every Desk page if they are only needed when the feature is active.
- Prefer a **Single** settings DocType (or clear fields on a shared settings DocType owned by that module) so installers can enable/disable without code changes.
- Never enable a feature by default in `after_install` / patches.

## Common workspace (System Manager)

All module **settings** pages belong on one public Desk **Workspace**: **UI Styles** (`ui_styles/ui_styles/workspace/ui_styles/`).

- Visible to **System Manager** only (`roles` on the Workspace).
- Module: **UI Styles**.
- When a module adds a settings DocType (or Page), add a Link under the **Settings** card on this Workspace (and mark the `links` / `content` change with `# <module>:` in any shared export notes / install helpers).
- Do not create separate top-level workspaces per style module for settings; keep one hub so installers find every toggle in one place.
- Feature workspaces for day-to-day operator tools are allowed only if they stay empty of behaviour until the feature is enabled.

Path: `ui_styles/ui_styles/workspace/ui_styles/ui_styles.json`

## Module layout

Use a stable module id (snake_case), e.g. `doc_table`.

```text
ui_styles/
  ui_styles/                 # Desk module folder for **UI Styles** (scrub of module name)
    workspace/ui_styles/     # Shared System Manager settings hub (all modules)
  <module>/                 # Python package (api, install, tests, AGENTS.md, README)
  public/<module>/          # Desk JS/CSS only for this module (nested folder required)
  patches/<module>/         # Optional migrate patches owned by this module
  docs/{en|de}/ui-styles/<module-kebab>/   # Compendium operator docs
```

Rules:

- **`ui_styles/` module folder** - required because Desk module **UI Styles** scrubs to `ui_styles` under the app package. Do not place the settings Workspace at package-root `workspace/` (outside the module path); ORM export writes under this folder.
- **`public/`** - always nest under `public/<module>/...`. Never put feature assets in a flat `public/js` or `public/css` shared bucket; nested folders keep modules distinguishable next to `patches/`, Python packages, and docs.
- **`patches/`** - prefer `patches/<module>/...` (or an `execute:` line that clearly names the module). Do not dump unrelated patches into a shared anonymous list without a module marker.
- **`modules.txt`** - one Desk module name per feature when the feature owns DocTypes / Module Def entries. Plain names only; no `# <module>:` comments.

Asset URLs follow the nested path, e.g. `/assets/ui_styles/<module>/<file>.css`.

## Shared app files (mark every line by module)

Files like `hooks.py`, `install.py`, `uninstall.py`, and `patches.txt` are **aggregation points**. Every contribution from a feature must be labeled with that module so agents can add/remove a feature without guessing. `modules.txt` lists Desk module names only (no markers).

Patterns:

- **`hooks.py`** - comment `# <module>:` immediately above each include path, `doc_events` entry, import, or other hook line that belongs to a feature.
- **`install.py` / `uninstall.py`** - call into `ui_styles.<module>.install` / `uninstall` only; keep a `# <module>` comment on each call.
- **`patches.txt`** - comment `# <module>:` immediately above each execute/patch line, and end that line with a module tag in the trailing comment (e.g. `#2026-09-01-doc-table`).
- **`modules.txt`** - one Desk module name per feature when the feature owns DocTypes / Module Def entries. Plain names only (no `# <module>:` comments needed; the name is the ownership signal).
- **Workspace `ui_styles.json`** - when adding a settings link, keep the change attributable to one module (comment in commit / module README; do not dump unrelated links).

Do not introduce a shared "utils for all styles" package unless a second module truly needs the same contract; prefer duplication over coupling.

## Adding a module (checklist)

1. Create `ui_styles/<module>/` with its own install/uninstall (if needed), tests, `README.md`, and `AGENTS.md`.
2. Put Desk assets under `public/<module>/`.
3. Wire `hooks.py` / `install.py` / `uninstall.py` / `patches.txt` with `# <module>:` markers; add the Desk module name to `modules.txt` when needed.
4. If the module can change Desk UI for users: ship a settings DocType (default **disabled**), gate assets/behaviour on that flag, and link the DocType on the **UI Styles** Workspace **Settings** card.
5. Add Compendium pages under `docs/en/ui-styles/...` (and `de/` when translating).
6. Keep CSS scoped to module-specific classes; avoid changing global Desk styles other modules rely on.

## Deploy notes

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build for JS/CSS.

## Current modules

| Module id | Desk / docs | Brief |
|-----------|-------------|--------|
| `doc_table` | **Doc Table** / `docs/.../doc-table/` | `doc_table/AGENTS.md` |
| `desk_background` | **Desk Background** / `docs/.../desk-background/` | `desk_background/AGENTS.md` |
| `list_scroll` | **List Scroll** / `docs/.../list-scroll/` | `list_scroll/AGENTS.md` |
| `remix` | **Remix** / `docs/.../remix/` | `remix/AGENTS.md` |
