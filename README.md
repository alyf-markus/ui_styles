### UI Styles

Adds various style and UI features to Frappe/ERPNext. Features are opt-in: they stay passive until a System Manager enables them via the **UI Styles** workspace.

> [!IMPORTANT]
> Functions and features in this app are provided **as-is**, without warranty. They are tested only against the Frappe/ERPNext versions used in branch name; other versions may behave differently. Even though they have no write functions, they are not tested against information leaks due to permission settings.

Agent conventions: see [`AGENTS.md`](./AGENTS.md).

#### Doc Table

Registers fieldtype **Doc Table**: a read-only form grid of related real DocTypes (not child tables). See `ui_styles/doc_table/README.md`.

#### Desk Background

Opt-in Desk background tint. See `ui_styles/desk_background/README.md`.

#### List Scroll

Opt-in dense Desk list layout with a shared horizontal scrollbar. See `ui_styles/list_scroll/README.md`.

#### Remix

Opt-in Desk shell at `/remix` (history and favorites in the Frappe navbar, optional sidebar, colors). See `ui_styles/remix/README.md`.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app ui_styles
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/ui_styles
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### CI

This app can use GitHub Actions for CI. The following workflows are configured:

- CI: Installs this app on Frappe `version-16` and runs unit tests on every push to the `develop` branch.
- Linters: Runs [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and [pip-audit](https://pypi.org/project/pip-audit/) on every pull request.


### License

gpl-3.0
