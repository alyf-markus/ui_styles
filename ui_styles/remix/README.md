# Remix

Opt-in Desk shell at `/remix` with History and Favorites in the regular Frappe navbar, optional app sidebar, and colors. Configure on **Remix Settings** (UI Styles workspace). Standard `/desk` is unchanged until Remix is enabled.

See `docs/en/ui-styles/remix/` for operator guides.

## Development

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
```
