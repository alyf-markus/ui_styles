---
title: Site settings
order: 20
roles:
  - System Manager
---

# Site settings

Open **Remix Settings** from the **UI Styles** workspace (System Manager).

| Field | fieldname | Purpose |
| --- | --- | --- |
| *Enable Remix* | `enabled` | Master switch. Off: `/desk` unchanged, `/remix` redirects to `/desk`. On: `/desk` shows a Remix link and `/remix` loads the shell. Default after install: off. |
| *History* | `history` | Clock menu in the regular Frappe navbar with the last 10 distinct pages. Default: off. |
| *Favorites* | `favorites` | Bookmark star in the regular Frappe navbar: save the current page (lists, reports, documents) and open it later from the dropdown. If Alternative Navigation is also on, apps can be starred in the switcher. Default: off. |
| *Alternative Navigation* | `alternative_navigation` | Replace the Frappe sidebar with the Remix app switcher and menu. Default: off. |
| *Search* | `search` | Awesome Bar at the top of the Remix sidebar, above the app switcher. The _Search in documents_ checkbox below it switches to Global Search results (customers, documents, ...) so Enter opens the first match directly; the choice is remembered per browser. Only shown when Alternative Navigation is on. Default: off. |
| *Colors* | `colors` | Let each user pick a Desk Colour theme (same themes as **Desk Background**) for the Desk background and the Remix sidebar. Until a theme is chosen, chrome follows the system Desk colours or the **Desk Background** site setting; a chosen Remix theme takes precedence for that user. Default: off. |
| *Manual Colours* | `manual_colors` | Also allow hex colours (Custom: *Background* and *Sidebar*) instead of a Desk Colour theme. Only shown when Colors is on. Default: off. |

When *Enable Remix* is on, at least one of *History*, *Favorites*, or *Alternative Navigation* must be on.

Saving **Remix Settings** clears cache. Hard-refresh Desk to apply changes.
