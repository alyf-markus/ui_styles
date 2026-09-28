# List Scroll - agent brief

Read the app brief [`../../AGENTS.md`](../../AGENTS.md) for module isolation and shared-file markers. Read this before changing **List Scroll**. Operator docs: `docs/en|de/ui-styles/list-scroll/`. Human README: `list_scroll/README.md`.

## What it is

Opt-in dense Desk list layout: content-sized columns and one shared horizontal scrollbar in the list header that pans all row column tracks. Optional sticky column header, floating paging bar, and sticky front columns. Site defaults plus per-DocType overrides.

- Package: `ui_styles.list_scroll`
- Settings: **List Scroll Settings** (Single; all checks / sticky columns default **off** / `0`)
- Child: **List Scroll DocType Setting** (table on settings)
- App: `ui_styles`

## Hard constraints

1. **Opt-in only.** *Dense List Layout* defaults to off. Installing the app must not change list layout until a System Manager enables it (defaults or an override row).
2. **Display-only.** Never create, update, or delete business data at runtime except settings Single saves. Client JS may rearrange DOM for presentation only.
3. **No Frappe core edits.** All behaviour stays in this module.
4. ASCII hyphens only in Python strings/docs.
5. **No raw SQL.** Prefer ORM / Query Builder if querying.

## Code map

| Path | Role |
|------|------|
| `list_scroll/boot.py` | `extend_bootinfo` - `frappe.boot.list_scroll` (`defaults`, `by_doctype`, `any_dense`) |
| `list_scroll/doctype/list_scroll_settings/` | Settings Single |
| `list_scroll/doctype/list_scroll_doctype_setting/` | Per-DocType override child |
| `public/list_scroll/list_layout.css` | Styles gated by `.frappe-list.list-layout-dense` (+ sticky / floating / sticky-section) |
| `public/list_scroll/list_scroll_sync.js` | Load gate, per-list resolve / classes, measure / pan / sticky columns; orchestrates sticky / floating via `ui_styles.list_scroll` |
| `public/list_scroll/sticky_header.js` | Sticky column header for `.frappe-list.list-sticky-header` |
| `public/list_scroll/floating_paging.js` | Floating paging for `.frappe-list.list-floating-paging` |
| `docs/en|de/ui-styles/list-scroll/` | Compendium |

Whitelist: none. Bootinfo drives client behaviour. Dependent flags are forced to 0 when dense is off (defaults and override rows).

Load order in `ui_styles.bundle.js`: `list_scroll_sync.js` → `sticky_header.js` → `floating_paging.js`.

## Client contract

- Boot: `frappe.boot.list_scroll.any_dense` (load gate); `.defaults` and `.by_doctype[DocType]` each with `dense_list_layout` / `sticky_list_header` / `floating_list_paging` / `sticky_columns`
- Override row present for a DocType **fully replaces** defaults for that list
- Resolve DocType: `cur_list.doctype` when that list is in scope, else List route
- DOM gate classes on `.frappe-list`: `list-layout-dense`, `list-sticky-header`, `list-floating-paging`
- Sticky section helper on `.layout-main-section`: `list-scroll-sticky-section`
- Sticky columns: `.list-hscroll-sticky` + `.list-hscroll-scroll` > `.list-hscroll-track` (N leading visible cols stay fixed)
- JS namespace: `ui_styles.list_scroll` (`resolve_settings`, `with_dom_mutation`, `queue_measure`, optional sticky/floating methods)

## Deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build.
