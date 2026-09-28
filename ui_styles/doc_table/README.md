# Doc Table

> **AI / agent brief:** [`AGENTS.md`](./AGENTS.md) - scope, decisions, file map, constraints. Read that before changing this module.

Generic Desk fieldtype that renders a read-only table of **real** (non-child, non-Single, non-virtual) documents related to the current form - similar to **Table**, but Options points at a normal DocType.

Python package: `ui_styles.doc_table`  
Desk module: **Doc Table**  
Fieldtype name: `Doc Table`  
Form control: `frappe.ui.form.ControlDocTable`

---

## Operator use

1. Open the parent **DocType** (developer mode) or **Customize Form** / **Custom Field**.
2. Add a field with *Field Type* "Doc Table".
3. Set *Options* with keyworded lines (any order):

```text
doctype: Sales Invoice
link: customer
columns: name, posting_date, grand_total, status
order_by: posting_date desc
page_size: 20
page_size_max: 100
visible_rows: 5
pagination: none
```

4. Save. On the parent form, the field shows matching rows (filtered by that Link), with Refresh / Open List / New.

When `link:` is omitted, the field uses the single **Link** on the target DocType whose *Options* is the parent DocType. If several such Links exist, set `link: fieldname` explicitly. Use `link: none` to skip parent linking and rely only on field *Filters*. When `columns:` is omitted, *In List View* fields are used. Use `order_by: field [asc|desc]` (Frappe `get_list` syntax); default is `modified desc`. Optional `page_size:` / `page_size_max:` control Load More batch size; `visible_rows:` is the viewport and, with `pagination: pages`, the prev/next step. `pagination: none` (default) keeps Load More + scroll; `pagination: pages` uses prev/next icons.

---

## Hooks (`ui_styles/hooks.py`)

| Hook | Value |
|------|--------|
| `app_include_css` | `ui_styles.bundle.css` (imports `doc_table.css`) |
| `app_include_js` | `ui_styles.bundle.js` (imports `doc_table.js`, `form_builder_preview.js`) |
| `doc_events` | **DocType** / **Custom Field** / **Customize Form** `validate` |
| `after_install` / migrate patch | registers fieldtype Select options |

`ui_styles.doc_table.register.register()` is imported from `hooks.py` so Python `no_value_fields` / `display_fieldtypes` include `Doc Table` for the process lifetime (no DB column).

### Why patch `frappe.model` (no hook today)

Frappe has no hook such as `additional_no_value_fields` for apps to register display-only fieldtypes. The lists are hardcoded in `frappe.model`; core types like **Attachment Gallery** are added in core. **Doc Table** must be in those lists so Frappe skips DB columns and applies display-only validation (mandatory, global search, data import, etc.). `register.py` patches the tuples at import time and rebinds modules that already imported stale copies. `is_virtual` is not used (it forces Read and hides empty fields). Semgrep `frappe-monkey-patching-not-allowed` is suppressed on `_patch_python_fieldtype_lists` until Frappe adds proper extension hooks.

---

## Outside references (files outside `doc_table/`)

| Location | What was set |
|----------|----------------|
| `ui_styles/modules.txt` | Module name **Doc Table** |
| `ui_styles/public/doc_table/` | Control JS + CSS |
| `ui_styles/hooks.py` | Includes, validate hooks, install |
| `ui_styles/install.py` / `uninstall.py` | Call doc_table install/uninstall |
| `ui_styles/patches.txt` | `ensure_fieldtype_options` after migrate |
| Compendium `docs/en/ui-styles/doc-table/` | Operator guide |

---

## Module internals

| Path | Role |
|------|------|
| `register.py` | Patch fieldtype registries; Property Setters for Custom Field / Customize Form Field options and *Filters* depends_on |
| `parse.py` | Options parsing + Link field resolution |
| `api.py` | `get_doc_table_data` whitelist + DocType/Custom Field validate |
| `install.py` / `uninstall.py` | Option registration lifecycle |
| `public/doc_table/form_builder_preview.js` | Form Builder preview (registers `DocTableControl`) + Filters button |

**Note:** Property Setters cannot change **DocField** Select options (`DocField` is a Meta special DocType). The DocType Form Builder picks fieldtypes from `frappe.model.all_fieldtypes`, which the Desk JS include extends.

**Limitation:** If the site already has a foreign Property Setter on **Custom Field** or **Customize Form Field** `fieldtype` options, install will not overwrite it and "Doc Table" may be missing from those Select fields. Form Builder paths still work. See Compendium docs for the manual fix.

### Client ↔ server contract

- Fieldtype string: `Doc Table`
- Options line format: `doctype:` (required), optional `link:` / `link: none`, `columns:`, `order_by:`, `page_size:`, `page_size_max:`, `visible_rows:`, `pagination:` (any order; always keyworded)
- Whitelist: `ui_styles.doc_table.api.get_doc_table_data` (`GET`) - loads *Options* / *Filters* from parent field by `fieldname`
- Fields are display-only (`no_value_fields`); do not rely on `is_virtual` (it hides empty Read fields in Desk)

---

## Enable after deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
```

Hard-refresh Desk after build so `ControlDocTable` is available.
