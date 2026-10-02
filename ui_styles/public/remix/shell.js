frappe.provide("ui_styles.remix");

const LAST_APP_KEY = "erpnext_remix:last_app";
const SECTION_STATE_KEY = "erpnext_remix:sections";
const CONTENT_SEARCH_KEY = "erpnext_remix:content_search";
const CONTENT_SEARCH_MAX = 20;
const CONTENT_SEARCH_MASTERS = [
	"Customer",
	"Supplier",
	"Item",
	"Contact",
	"Address",
	"Employee",
	"Lead",
	"Project",
];
const HISTORY_MAX = 10;
const COLOR_PROPS = [
	"--remix-green",
	"--remix-green-hover",
	"--remix-green-active",
	"--remix-ink",
	"--remix-ink-muted",
];
const COLOR_STYLE_ID = "remix-color-tokens";

ui_styles.remix.app_group = function (sidebar) {
	if (sidebar.module) {
		return sidebar.module;
	}
	if (sidebar.app) {
		const app = (frappe.boot.app_data || []).find((row) => row.app_name === sidebar.app);
		return (app && app.app_title) || sidebar.app;
	}
	return __("Other");
};

ui_styles.remix.app_title = function (sidebar) {
	if (sidebar.app) {
		const titles = (frappe.boot.remix && frappe.boot.remix.app_titles) || {};
		if (titles[sidebar.app]) {
			return titles[sidebar.app];
		}
		const app = (frappe.boot.app_data || []).find((row) => row.app_name === sidebar.app);
		return (app && app.app_title) || sidebar.app;
	}
	return __("Other");
};

ui_styles.remix.get_apps = function () {
	const sidebars = frappe.boot.workspace_sidebar_item || {};
	return Object.values(sidebars)
		.filter((sidebar) => {
			if (!sidebar.label || sidebar.label.startsWith("My Workspaces")) {
				return false;
			}
			// Auto-generated module dumps clutter the switcher.
			if (!sidebar.app && sidebar.header_icon === "hammer") {
				return false;
			}
			return true;
		})
		.map((sidebar) => ({
			...sidebar,
			group: ui_styles.remix.app_group(sidebar),
			app_title: ui_styles.remix.app_title(sidebar),
		}))
		.sort((a, b) => {
			const app = __(a.app_title).localeCompare(__(b.app_title), frappe.boot.lang);
			if (app) {
				return app;
			}
			const group = __(a.group).localeCompare(__(b.group), frappe.boot.lang);
			if (group) {
				return group;
			}
			return __(a.label).localeCompare(__(b.label), frappe.boot.lang);
		});
};

ui_styles.remix.grouped_apps = function (apps) {
	const app_titles = new Set(apps.map((app) => app.app_title));
	const use_app_headers = app_titles.size > 1;
	const module_counts = {};
	apps.forEach((app) => {
		const key = `${app.app_title}::${app.group}`;
		module_counts[key] = (module_counts[key] || 0) + 1;
	});
	const rows = [];
	let current_app = null;
	let current_module = null;
	apps.forEach((app) => {
		if (use_app_headers && app.app_title !== current_app) {
			current_app = app.app_title;
			current_module = null;
			rows.push({ type: "group", label: app.app_title, level: 1 });
		}
		const module_key = `${app.app_title}::${app.group}`;
		if (module_counts[module_key] > 1 && app.group !== current_module) {
			current_module = app.group;
			rows.push({ type: "group", label: app.group, level: use_app_headers ? 2 : 1 });
		}
		if (module_counts[module_key] <= 1) {
			current_module = null;
		}
		rows.push({ type: "app", app });
	});
	return rows;
};

ui_styles.remix.favorite_labels = function () {
	if (!ui_styles.remix.flags().favorites) {
		return [];
	}
	return frappe.boot.remix.app_favorites || [];
};

ui_styles.remix.is_favorite_app = function (label) {
	return ui_styles.remix.favorite_labels().includes(label);
};

ui_styles.remix.get_item_path = function (item) {
	if (!item || item.type !== "Link") {
		return null;
	}
	if (item.link_type === "URL") {
		return item.url || item.link_to;
	}
	if (item.link_type === "Report") {
		const args = {
			type: item.link_type,
			name: item.link_to,
		};
		if (item.report) {
			args.is_query_report =
				item.report.report_type === "Query Report" ||
				item.report.report_type === "Script Report";
			args.report_ref_doctype = item.report.ref_doctype;
		}
		return frappe.utils.generate_route(args);
	}
	if (item.link_type === "Workspace") {
		const workspaces = frappe.workspaces[frappe.router.slug(item.link_to)];
		const slug = frappe.router.slug(item.link_to);
		if (workspaces && workspaces.public) {
			return frappe.router.make_url([slug]);
		}
		return frappe.router.make_url(["private", slug]);
	}
	return frappe.utils.generate_route({
		type: item.link_type,
		name: item.link_to,
		tab: item.tab,
	});
};

ui_styles.remix.history_label = function (route_str) {
	const route = (route_str || "").split("/").filter(Boolean);
	if (!route.length) {
		return route_str || "";
	}
	if (route[0] === "Form" && route[1]) {
		const doctype = __(route[1]);
		const name = route.slice(2).join("/");
		if (name && name !== route[1]) {
			return `${doctype} ${name}`;
		}
		return doctype;
	}
	if (route[0] === "List" && route[1]) {
		return `${__(route[1])} ${__("List")}`;
	}
	if (route[0] === "Tree" && route[1]) {
		return `${__(route[1])} ${__("Tree")}`;
	}
	if (route[0] === "query-report" && route[1]) {
		return `${__(route[1])} ${__("Report")}`;
	}
	if ((route[0] === "Workspaces" || route[0] === "dashboard") && route[1]) {
		return __(route[1]);
	}
	if (frappe.utils.get_route_label) {
		return $("<div>").html(frappe.utils.get_route_label(route_str)).text();
	}
	return route.join(" / ");
};

if (!window.__ui_styles_remix_logo_guard) {
	window.__ui_styles_remix_logo_guard = true;
	document.addEventListener(
		"error",
		(event) => {
			const img = event.target;
			if (
				!img ||
				img.tagName !== "IMG" ||
				img.dataset.remixFallback ||
				!img.closest(".desktop-navbar")
			) {
				return;
			}
			img.dataset.remixFallback = "1";
			img.src = "/assets/erpnext/images/erpnext-logo.svg";
		},
		true
	);
}

ui_styles.remix.hard_nav = function (href) {
	window.location.href = href;
};

ui_styles.remix.rewrite_sidebar_links = function () {
	if (!ui_styles.remix.is_remix()) {
		return;
	}
	document.querySelectorAll(".body-sidebar a[href^='/desk']").forEach((el) => {
		el.setAttribute("href", el.getAttribute("href").replace(/^\/desk\b/, "/remix"));
	});
};

ui_styles.remix.add_switch_links = function () {
	if (!ui_styles.remix.flags().enabled) {
		$(".remix-desk-nav-link").remove();
		return;
	}

	const on_remix = ui_styles.remix.is_remix();
	const href = on_remix ? "/desk" : "/remix";
	const label = on_remix ? __("Standard Desk") : __("Remix");
	const icon = on_remix ? "layout" : "layout-dashboard";
	const html = `
		<a class="remix-desk-nav-link standard-sidebar-item" href="${frappe.utils.escape_html(
			href
		)}" title="${frappe.utils.escape_html(label)}">
			<span class="item-anchor">
				<span class="sidebar-item-icon">${frappe.utils.icon(icon, "md")}</span>
				<span class="sidebar-item-label">${frappe.utils.escape_html(label)}</span>
			</span>
		</a>
	`;

	$(".remix-desk-nav-link").remove();

	const $sidebar = $(".standard-items-sections");
	if ($sidebar.length) {
		$sidebar.prepend(html);
	}

	if (!on_remix) {
		const $desktop_nav = $(".desktop-navbar .flex").last();
		if ($desktop_nav.length) {
			$desktop_nav.prepend(
				`<a class="remix-desk-nav-link btn btn-default btn-sm" href="/remix">${__(
					"Remix"
				)}</a>`
			);
		}
	}

	$(".remix-desk-nav-link").on("click", function (event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		ui_styles.remix.hard_nav(this.getAttribute("href"));
	});
};

ui_styles.remix.boot_shell = function () {
	if (ui_styles.remix._shell) {
		ui_styles.remix._shell.refresh();
		return;
	}
	ui_styles.remix._shell = new RemixShell();
};

class RemixShell {
	constructor() {
		this.flags = ui_styles.remix.flags();
		document.body.classList.add("remix-desk");
		document.body.classList.remove("remix-has-topbar");
		document.body.classList.toggle("remix-has-sidebar", this.flags.alternative_navigation);
		this.apply_user_colors();
		this.watch_theme();
		this.apps = ui_styles.remix.get_apps();
		this.current_app = this.pick_initial_app();
		this.make();
		this.bind();
		this.patch_frappe_sidebar_paths();
		if (this.flags.search) {
			this.setup_awesomebar();
		}
		this.render();
		this.sync_app_to_route();
	}

	pick_initial_app() {
		const saved = localStorage.getItem(LAST_APP_KEY);
		if (saved && this.apps.find((app) => app.label === saved)) {
			return saved;
		}
		return this.apps[0] ? this.apps[0].label : null;
	}

	make() {
		this.$sidebar = $();
		if (this.flags.alternative_navigation) {
			const search_html = this.flags.search
				? `
				<div class="remix-search">
					<input
						id="remix-awesomebar-search"
						type="text"
						class="form-control remix-awesomebar-input"
						placeholder="${__("Search or type a command")}"
						autocomplete="off"
					/>
				</div>
				<label class="remix-search-content">
					<input type="checkbox" class="remix-search-content-toggle" />
					<span>${__("Search in documents")}</span>
				</label>`
				: "";
			this.$sidebar = $(`
				<aside class="remix-sidebar">
					${search_html}
					<label class="remix-app-label" id="remix-app-label">${__("App")}</label>
					<div class="remix-app-switcher" id="remix-app-switcher">
						<button
							type="button"
							class="remix-app-switcher-toggle"
							aria-labelledby="remix-app-label"
							aria-haspopup="listbox"
							aria-expanded="false"
						>
							<span class="remix-app-switcher-current"></span>
							<span class="remix-app-switcher-chevron">${frappe.utils.icon("chevron-down", "sm")}</span>
						</button>
						<div class="remix-app-switcher-menu" role="listbox"></div>
					</div>
					<nav class="remix-menu" aria-label="${__("App menu")}"></nav>
					<a class="remix-desk-switch" href="/desk">
						<span class="remix-menu-icon">${frappe.utils.icon("layout", "sm")}</span>
						<span>${frappe.utils.escape_html(__("Standard Desk"))}</span>
					</a>
				</aside>
			`);
			this.$sidebar.prependTo(document.body);
			this.$sidebar.find(".remix-desk-switch").on("click", function (event) {
				event.preventDefault();
				event.stopImmediatePropagation();
				ui_styles.remix.hard_nav("/desk");
			});
		}
		this.$menu = this.$sidebar.find(".remix-menu");
		this.$app_switcher = this.$sidebar.find("#remix-app-switcher");
		this.$app_switcher_toggle = this.$app_switcher.find(".remix-app-switcher-toggle");
		this.$app_switcher_current = this.$app_switcher.find(".remix-app-switcher-current");
		this.$app_switcher_menu = this.$app_switcher.find(".remix-app-switcher-menu");
		this.mount_navbar_extras();
	}

	navbar_extras_html() {
		const parts = [];
		if (this.flags.favorites) {
			parts.push(`
				<div class="remix-favorites">
					<button type="button" class="btn-reset nav-link text-muted remix-favorites-button" title="${__(
						"Bookmarks"
					)}" aria-label="${__("Bookmarks")}" aria-haspopup="true" aria-expanded="false">
						${frappe.utils.icon("star", "md")}
					</button>
					<div class="remix-favorites-menu" role="menu"></div>
				</div>
			`);
		}
		if (this.flags.history) {
			parts.push(`
				<div class="remix-history">
					<button type="button" class="btn-reset nav-link text-muted remix-history-button" title="${__(
						"History"
					)}" aria-label="${__("History")}" aria-haspopup="true" aria-expanded="false">
						<span class="remix-history-icon" aria-hidden="true"></span>
					</button>
					<div class="remix-history-menu" role="menu"></div>
				</div>
			`);
		}
		if (this.flags.colors && !this.flags.alternative_navigation) {
			parts.push(`
				<button type="button" class="btn-reset nav-link text-muted remix-colors-button" title="${__(
					"Colors"
				)}" aria-label="${__("Colors")}">
					${frappe.utils.icon("paint-bucket", "md")}
				</button>
			`);
		}
		if (!parts.length) {
			return "";
		}
		return `<div class="remix-navbar-extras">${parts.join("")}</div>`;
	}

	mount_navbar_extras() {
		$(".remix-navbar-extras").remove();
		this.$history = $();
		this.$history_menu = $();
		this.$favorites = $();
		this.$favorites_menu = $();
		this.$user = $();
		this.$user_menu = $();
		const html = this.navbar_extras_html();
		if (!html) {
			return;
		}
		this.$navbar_extras = $(html);
		const $desktop = $(".desktop-navbar .flex").last();
		if ($desktop.length) {
			$desktop.prepend(this.$navbar_extras);
		} else {
			const $page =
				frappe.container && frappe.container.page ? $(frappe.container.page) : $();
			let $actions = $page.find(".page-head .page-actions").first();
			if (!$actions.length) {
				$actions = $(".page-container:visible .page-head .page-actions").first();
			}
			if (!$actions.length) {
				// Forms fire page-change before their page head exists; try again shortly.
				this._mount_retries = (this._mount_retries || 0) + 1;
				if (this._mount_retries <= 5) {
					setTimeout(() => this.mount_navbar_extras(), 200);
				}
				return;
			}
			$actions.prepend(this.$navbar_extras);
		}
		this._mount_retries = 0;
		this.$history = this.$navbar_extras.find(".remix-history");
		this.$history_menu = this.$history.find(".remix-history-menu");
		this.$favorites = this.$navbar_extras.find(".remix-favorites");
		this.$favorites_menu = this.$favorites.find(".remix-favorites-menu");
		this.bind_navbar_extras();
		if (this.flags.favorites) {
			this.render_favorites_menu();
		}
	}

	fill_user_menu() {
		const items = [
			{
				label: __("My Settings"),
				action: () => frappe.set_route("Form", "User", frappe.session.user),
			},
			{
				label: __("Toggle Theme"),
				action: () => new frappe.ui.ThemeSwitcher().show(),
			},
			{
				label: __("Set Logo"),
				action: () => this.open_logo_settings(),
			},
		];
		if (this.flags.colors) {
			items.splice(3, 0, {
				label: __("Colors"),
				action: () => this.open_color_settings(),
			});
		}
		items.push(
			{
				label: __("Standard Desk"),
				action: () => ui_styles.remix.hard_nav("/desk"),
			},
			{
				label: __("About"),
				action: () => frappe.ui.toolbar.show_about(),
			},
			{
				label: __("Reload"),
				action: () => frappe.ui.toolbar.clear_cache(),
			},
			{
				label: __("Logout"),
				action: () => frappe.app.logout(),
			}
		);
		items.forEach((item) => {
			const href = item.href || "#";
			const $item = $(
				`<a class="dropdown-item" href="${frappe.utils.escape_html(
					href
				)}" role="menuitem">${frappe.utils.escape_html(item.label)}</a>`
			);
			if (item.action) {
				$item.on("click", (event) => {
					event.preventDefault();
					this.close_user_menu();
					item.action();
				});
			}
			this.$user_menu.append($item);
		});
	}

	bind() {
		if (this.$app_switcher_toggle.length) {
			this.$app_switcher_toggle.on("click", (event) => {
				event.stopPropagation();
				this.toggle_app_switcher();
			});
		}
		if (this.flags.colors && this.$sidebar.length) {
			const $colors = $(`
				<button type="button" class="btn-reset remix-desk-switch remix-sidebar-colors">
					<span class="remix-menu-icon">${frappe.utils.icon("paint-bucket", "sm")}</span>
					<span>${frappe.utils.escape_html(__("Colors"))}</span>
				</button>
			`);
			this.$sidebar.find(".remix-desk-switch").before($colors);
			$colors.on("click", (event) => {
				event.preventDefault();
				this.open_color_settings();
			});
		}
		$(document).on("click.ui_styles_remix_user", (event) => {
			if (!$(event.target).closest(".remix-history").length) {
				this.close_history_menu();
			}
			if (!$(event.target).closest(".remix-favorites").length) {
				this.close_favorites_menu();
			}
			if (!$(event.target).closest(".remix-app-switcher").length) {
				this.close_app_switcher();
			}
		});
		$(document).on("keydown.ui_styles_remix_apps", (event) => {
			if (event.key === "Escape") {
				this.close_app_switcher();
				this.close_history_menu();
				this.close_favorites_menu();
			}
		});
		$(document).on("page-change.ui_styles_remix", () => {
			this.close_app_switcher();
			this.close_history_menu();
			this.close_favorites_menu();
			this.sync_app_to_route();
			this.mount_navbar_extras();
		});
	}

	bind_navbar_extras() {
		if (!this.$navbar_extras || !this.$navbar_extras.length) {
			return;
		}
		if (this.flags.history && this.$history.length) {
			this.$history.find(".remix-history-button").on("click", (event) => {
				event.stopPropagation();
				this.toggle_history_menu();
			});
		}
		if (this.flags.favorites && this.$favorites.length) {
			this.$favorites.find(".remix-favorites-button").on("click", (event) => {
				event.stopPropagation();
				this.toggle_favorites_menu();
			});
		}
		this.$navbar_extras.find(".remix-colors-button").on("click", (event) => {
			event.preventDefault();
			this.open_color_settings();
		});
	}

	toggle_app_switcher() {
		if (!this.$app_switcher || !this.$app_switcher.length) {
			return;
		}
		const open = !this.$app_switcher.hasClass("is-open");
		this.$app_switcher.toggleClass("is-open", open);
		this.$app_switcher_toggle.attr("aria-expanded", open ? "true" : "false");
	}

	close_app_switcher() {
		if (!this.$app_switcher || !this.$app_switcher.length) {
			return;
		}
		this.$app_switcher.removeClass("is-open");
		this.$app_switcher_toggle.attr("aria-expanded", "false");
	}

	toggle_user_menu() {
		const open = !this.$user.hasClass("is-open");
		this.$user.toggleClass("is-open", open);
		this.$user.find(".remix-user-button").attr("aria-expanded", open ? "true" : "false");
		if (open) {
			this.close_history_menu();
		}
	}

	close_user_menu() {
		if (!this.$user || !this.$user.length) {
			return;
		}
		this.$user.removeClass("is-open");
		this.$user.find(".remix-user-button").attr("aria-expanded", "false");
	}

	toggle_history_menu() {
		if (!this.$history.length) {
			return;
		}
		const open = !this.$history.hasClass("is-open");
		this.$history.toggleClass("is-open", open);
		this.$history.find(".remix-history-button").attr("aria-expanded", open ? "true" : "false");
		if (open) {
			this.close_favorites_menu();
			this.render_history_menu();
		}
	}

	close_history_menu() {
		if (!this.$history || !this.$history.length) {
			return;
		}
		this.$history.removeClass("is-open");
		this.$history.find(".remix-history-button").attr("aria-expanded", "false");
	}

	toggle_favorites_menu() {
		if (!this.$favorites.length) {
			return;
		}
		const open = !this.$favorites.hasClass("is-open");
		this.$favorites.toggleClass("is-open", open);
		this.$favorites
			.find(".remix-favorites-button")
			.attr("aria-expanded", open ? "true" : "false");
		if (open) {
			this.close_history_menu();
			this.render_favorites_menu();
		}
	}

	close_favorites_menu() {
		if (!this.$favorites || !this.$favorites.length) {
			return;
		}
		this.$favorites.removeClass("is-open");
		this.$favorites.find(".remix-favorites-button").attr("aria-expanded", "false");
	}

	current_bookmark() {
		// frappe.get_route() is still empty during "startup", so no get_route_str() here.
		const parts = (frappe.get_route() || []).filter(Boolean);
		if (!parts.length) {
			return null;
		}
		const route = parts.join("/");
		return { route, label: ui_styles.remix.history_label(route) };
	}

	bookmarks() {
		return (frappe.boot.remix && frappe.boot.remix.bookmarks) || [];
	}

	is_bookmarked(route) {
		return this.bookmarks().some((item) => item.route === route);
	}

	set_bookmarks(items) {
		frappe.boot.remix.bookmarks = items || [];
		this.render_favorites_menu();
	}

	toggle_current_bookmark() {
		const current = this.current_bookmark();
		if (!current) {
			frappe.show_alert({
				message: __("This page cannot be bookmarked."),
				indicator: "orange",
			});
			return;
		}
		const method = this.is_bookmarked(current.route)
			? "ui_styles.remix.bookmarks.remove"
			: "ui_styles.remix.bookmarks.add";
		frappe.call({
			method,
			args: current,
			callback: (r) => this.set_bookmarks(r.message),
		});
	}

	// Bookmarks of visited Desk pages (lists, reports, documents), not apps.
	render_favorites_menu() {
		if (!this.$favorites_menu || !this.$favorites_menu.length) {
			return;
		}
		const current = this.current_bookmark();
		const bookmarked = Boolean(current && this.is_bookmarked(current.route));
		this.$favorites
			.find(".remix-favorites-button")
			.toggleClass("is-bookmarked", bookmarked)
			.attr("title", bookmarked ? __("Remove bookmark") : __("Bookmark this page"));

		this.$favorites_menu.empty();
		if (current) {
			const $toggle = $(`
				<button type="button" class="btn-reset dropdown-item remix-history-item remix-bookmark-toggle">
					${frappe.utils.icon("star", "sm")}
					<span class="remix-history-label">${frappe.utils.escape_html(
						bookmarked ? __("Remove bookmark") : __("Bookmark this page")
					)}</span>
				</button>
			`);
			$toggle.on("click", (event) => {
				event.preventDefault();
				this.toggle_current_bookmark();
			});
			this.$favorites_menu.append($toggle);
		}
		const items = this.bookmarks();
		if (!items.length) {
			this.$favorites_menu.append(
				`<div class="remix-history-empty text-muted">${__("No bookmarks yet")}</div>`
			);
			return;
		}
		this.$favorites_menu.append('<div class="remix-app-rest"></div>');
		items.forEach((item) => {
			const $row = $(`
				<div class="remix-bookmark">
					<a class="dropdown-item remix-history-item remix-bookmark-link" href="${frappe.utils.escape_html(
						frappe.router.make_url(item.route.split("/"))
					)}" role="menuitem">
						<span class="remix-history-label">${frappe.utils.escape_html(item.label || item.route)}</span>
					</a>
					<button type="button" class="btn-reset remix-bookmark-remove" title="${__(
						"Remove bookmark"
					)}" aria-label="${__("Remove bookmark")}">&times;</button>
				</div>
			`);
			$row.find(".remix-bookmark-link").on("click", () => this.close_favorites_menu());
			$row.find(".remix-bookmark-remove").on("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				frappe.call({
					method: "ui_styles.remix.bookmarks.remove",
					args: { route: item.route },
					callback: (r) => this.set_bookmarks(r.message),
				});
			});
			this.$favorites_menu.append($row);
		});
	}

	fill_app_list($parent, pick) {
		const favorite_set = new Set(ui_styles.remix.favorite_labels());
		const favorites = ui_styles.remix
			.favorite_labels()
			.map((label) => this.apps.find((app) => app.label === label))
			.filter(Boolean);
		const remaining = this.apps.filter((app) => !favorite_set.has(app.label));

		if (favorites.length) {
			favorites.forEach((app) => $parent.append(this.make_app_option(app, pick)));
			if (remaining.length) {
				if (this._rest_apps_open == null) {
					this._rest_apps_open = remaining.some((app) => app.label === this.current_app);
				}
				$parent.append(this.make_rest_apps(remaining, pick));
			}
		} else {
			this._rest_apps_open = null;
			this.append_app_tree($parent, this.apps, pick);
		}
	}

	session_history() {
		const items = [];
		(frappe.route_history_queue || []).forEach((row) => {
			if (row && row.route) {
				items.push({ route: row.route, creation: row.creation || null });
			}
		});
		(frappe.route_history || [])
			.slice()
			.reverse()
			.forEach((route) => {
				if (!route || !route[0] || !route[1]) {
					return;
				}
				items.push({ route: route.join("/"), creation: null });
			});
		return items;
	}

	merge_history(session_items, saved_items) {
		const current = frappe.get_route_str && frappe.get_route_str();
		const seen = new Set();
		const merged = [];
		session_items.concat(saved_items || []).forEach((item) => {
			const route = (item.route || "").replace(/^\/+/, "");
			if (!route || route === current || seen.has(route)) {
				return;
			}
			seen.add(route);
			merged.push({
				route,
				creation: item.creation || null,
				label: ui_styles.remix.history_label(route),
				href: frappe.router.make_url(route.split("/")),
			});
		});
		return merged.slice(0, HISTORY_MAX);
	}

	render_history_menu() {
		if (!this.$history_menu || !this.$history_menu.length) {
			return;
		}
		this.$history_menu.html(
			`<div class="remix-history-empty text-muted">${__("No recent pages")}</div>`
		);
		const session_items = this.session_history();
		frappe.call({
			method: "ui_styles.remix.history.get_recent",
			args: { limit: HISTORY_MAX },
			callback: (r) => {
				this.fill_history_menu(this.merge_history(session_items, r.message || []));
			},
			error: () => {
				this.fill_history_menu(this.merge_history(session_items, []));
			},
		});
	}

	fill_history_menu(items) {
		if (!this.$history_menu || !this.$history_menu.length) {
			return;
		}
		this.$history_menu.empty();
		if (!items.length) {
			this.$history_menu.append(
				`<div class="remix-history-empty text-muted">${__("No recent pages")}</div>`
			);
			return;
		}
		items.forEach((item) => {
			const when = item.creation ? frappe.datetime.comment_when(item.creation, true) : "";
			const $row = $(`
				<a class="dropdown-item remix-history-item" href="${frappe.utils.escape_html(
					item.href
				)}" role="menuitem">
					<span class="remix-history-label">${frappe.utils.escape_html(item.label)}</span>
					${when ? `<span class="remix-history-when">${when}</span>` : ""}
				</a>
			`);
			this.$history_menu.append($row);
		});
	}

	open_logo_settings() {
		if (frappe.model.can_write("Company")) {
			const company =
				frappe.defaults.get_user_default("Company") || frappe.boot.sysdefaults.company;
			if (company) {
				frappe.set_route("Form", "Company", company);
				return;
			}
		}
		if (frappe.model.can_write("Navbar Settings")) {
			frappe.set_route("Form", "Navbar Settings");
			return;
		}
		frappe.msgprint(
			__("Set a Company Logo on Company, or an Application Logo in Navbar Settings.")
		);
	}

	desk_theme() {
		return (document.documentElement.getAttribute("data-theme") || "light").toLowerCase() ===
			"dark"
			? "dark"
			: "light";
	}

	user_color_state() {
		const state = (frappe.boot.remix && frappe.boot.remix.user_colors) || {};
		if (!state.preset || state.preset === "Standard") {
			return { preset: "Standard", background: null, sidebar: null };
		}
		return state;
	}

	patch_frappe_sidebar_paths() {
		const TypeLink = frappe.ui.sidebar_item && frappe.ui.sidebar_item.TypeLink;
		if (!TypeLink || TypeLink.prototype.__ui_styles_remix_path) {
			return;
		}
		TypeLink.prototype.__ui_styles_remix_path = true;
		const orig = TypeLink.prototype.get_path;
		TypeLink.prototype.get_path = function () {
			const path = orig.apply(this, arguments);
			if (typeof path === "string" && ui_styles.remix.is_remix()) {
				return path.replace(/^\/desk\b/, "/remix");
			}
			return path;
		};
	}

	preset_chrome(label) {
		const presets = (frappe.boot.remix && frappe.boot.remix.color_presets) || {};
		const row = presets[label];
		if (!row) {
			return null;
		}
		return row[this.desk_theme()] || row.light || null;
	}

	resolved_hex() {
		const state = this.user_color_state();
		if (state.preset === "Custom" && state.background && state.sidebar) {
			return { background: state.background, sidebar: state.sidebar };
		}
		return this.preset_chrome(state.preset);
	}

	clear_colors() {
		COLOR_PROPS.forEach((name) => document.body.style.removeProperty(name));
		$(`#${COLOR_STYLE_ID}`).remove();
	}

	apply_user_colors() {
		if (!this.flags.colors) {
			this.clear_colors();
			return;
		}
		const hex = this.resolved_hex();
		if (!hex) {
			this.clear_colors();
			return;
		}
		this.apply_colors(hex);
	}

	watch_theme() {
		if (this._theme_observer || typeof MutationObserver === "undefined") {
			return;
		}
		this._theme_observer = new MutationObserver(() => this.apply_user_colors());
		this._theme_observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
	}

	parse_hex(value) {
		const match = /^#?([0-9a-f]{6})$/i.exec(value || "");
		if (!match) {
			return null;
		}
		const n = parseInt(match[1], 16);
		return {
			hex: `#${match[1].toLowerCase()}`,
			r: (n >> 16) & 255,
			g: (n >> 8) & 255,
			b: n & 255,
		};
	}

	mix_hex(from, to, amount) {
		const r = Math.round(from.r + (to.r - from.r) * amount);
		const g = Math.round(from.g + (to.g - from.g) * amount);
		const b = Math.round(from.b + (to.b - from.b) * amount);
		return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
	}

	ink_for(color) {
		const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
		if (luminance > 0.55) {
			return { ink: "#1a1a1a", muted: "#5c5c5c" };
		}
		return { ink: "#e8f5ef", muted: "#9cbcaf" };
	}

	apply_colors(colors) {
		const background = this.parse_hex(colors && colors.background);
		const sidebar = this.parse_hex(colors && colors.sidebar);
		if (!background || !sidebar) {
			this.clear_colors();
			return;
		}
		const white = { r: 255, g: 255, b: 255 };
		const side_ink = this.ink_for(sidebar);
		const root = document.body;
		root.style.setProperty("--remix-green", sidebar.hex);
		root.style.setProperty("--remix-green-hover", this.mix_hex(sidebar, white, 0.14));
		root.style.setProperty("--remix-green-active", this.mix_hex(sidebar, white, 0.24));
		root.style.setProperty("--remix-ink", side_ink.ink);
		root.style.setProperty("--remix-ink-muted", side_ink.muted);
		this.apply_desk_tokens(background.hex, sidebar.hex);
	}

	// Same Desk variables Desk Background sets: page surface + navbar/border tint.
	// Appended after the Desk Background style, so a Remix theme wins while chosen.
	apply_desk_tokens(surface, navbar) {
		let style = document.getElementById(COLOR_STYLE_ID);
		if (!style) {
			style = document.createElement("style");
			style.id = COLOR_STYLE_ID;
			document.head.appendChild(style);
		}
		style.textContent = `
:root[data-theme] {
	--bg-color: ${surface};
	--fg-color: ${surface};
	--card-bg: ${surface};
	--modal-bg: ${surface};
	--popover-bg: ${surface};
	--navbar-bg: ${navbar};
	--sidebar-select-color: ${navbar};
	--border-color: ${navbar};
	--dark-border-color: ${navbar};
	--table-border-color: ${navbar};
	--sidebar-border-color: ${navbar};
	--btn-group-border-color: ${navbar};
}
:root[data-theme] .list-row-head {
	background-color: var(--navbar-bg);
}
`;
	}

	preview_dialog_colors(dialog) {
		const preset = dialog.get_value("preset");
		if (preset === "Custom") {
			this.apply_colors({
				background: dialog.get_value("background"),
				sidebar: dialog.get_value("sidebar"),
			});
			return;
		}
		const hex = this.preset_chrome(preset);
		if (hex) {
			this.apply_colors(hex);
			return;
		}
		this.clear_colors();
	}

	open_color_settings() {
		const state = this.user_color_state();
		const resolved = this.resolved_hex() || {};
		const preset_names = ["Standard"].concat(
			Object.keys((frappe.boot.remix && frappe.boot.remix.color_presets) || {})
		);
		if (this.flags.manual_colors) {
			preset_names.push("Custom");
		}
		let dialog;
		const fields = [
			{
				fieldtype: "Select",
				fieldname: "preset",
				label: __("Colour"),
				options: preset_names.join("\n"),
				default: state.preset || "Standard",
				onchange: () => this.preview_dialog_colors(dialog),
			},
		];
		if (this.flags.manual_colors) {
			fields.push(
				{
					fieldtype: "Color",
					fieldname: "background",
					label: __("Background"),
					default: state.background || resolved.background || "#ffffff",
					depends_on: "eval:doc.preset==='Custom'",
					onchange: () => this.preview_dialog_colors(dialog),
				},
				{
					fieldtype: "Color",
					fieldname: "sidebar",
					label: __("Sidebar"),
					default: state.sidebar || resolved.sidebar || "#f8f8f8",
					depends_on: "eval:doc.preset==='Custom'",
					onchange: () => this.preview_dialog_colors(dialog),
				}
			);
		}
		dialog = new frappe.ui.Dialog({
			title: __("Colors"),
			fields,
			primary_action_label: __("Save"),
			primary_action: (values) => {
				frappe.call({
					method: "ui_styles.remix.appearance.save_colors",
					args: values,
					callback: (r) => {
						frappe.boot.remix.user_colors = r.message || values;
						this.apply_user_colors();
						dialog.hide();
					},
				});
			},
			secondary_action_label: __("Reset"),
			secondary_action: () => {
				dialog.set_value("preset", "Standard");
				this.clear_colors();
			},
		});
		dialog.$wrapper.on("hidden.bs.modal", () => {
			this.apply_user_colors();
		});
		dialog.show();
	}

	section_state_key() {
		return `${SECTION_STATE_KEY}:${this.current_app || ""}`;
	}

	is_section_expanded(label) {
		try {
			const state = JSON.parse(localStorage.getItem(this.section_state_key()) || "{}");
			return state[label] === true;
		} catch (e) {
			return false;
		}
	}

	set_section_expanded(label, expanded) {
		let state;
		try {
			state = JSON.parse(localStorage.getItem(this.section_state_key()) || "{}");
		} catch (e) {
			state = {};
		}
		state[label] = expanded;
		localStorage.setItem(this.section_state_key(), JSON.stringify(state));
	}

	setup_awesomebar() {
		if (!this.flags.search || !this.$sidebar.length) {
			return;
		}
		const $search = this.$sidebar.find(".remix-search");
		if (!$search.length) {
			return;
		}
		if (!frappe.boot.desk_settings.search_bar) {
			$search.hide();
			this.$sidebar.find(".remix-search-content").hide();
			return;
		}
		const awesome_bar = new frappe.search.AwesomeBar();
		awesome_bar.options = [];
		awesome_bar.global_results = [];
		frappe.search.utils.setup_recent();

		const $input = $search.find("#remix-awesomebar-search");
		this.bind_content_search($input);
		const fake_modal = {
			find: (selector) => {
				if (selector === "#navbar-search") {
					return $input;
				}
				if (selector === ".cool-awesomebar-modal-footer") {
					return $();
				}
				return $search.find(selector);
			},
			modal: () => fake_modal,
		};
		awesome_bar.setup_event_listeners(fake_modal);
		this.awesome_bar = awesome_bar;
	}

	// "Search in documents": skip the command palette and list Global Search hits
	// (customers, documents, ...) directly, so Enter opens the first match.
	// Bound before the AwesomeBar's own input handler so it can swallow the event.
	bind_content_search($input) {
		const $toggle = this.$sidebar.find(".remix-search-content-toggle");
		const command_placeholder = $input.attr("placeholder");
		const sync = () => {
			const on = $toggle.prop("checked");
			localStorage.setItem(CONTENT_SEARCH_KEY, on ? "1" : "0");
			$input.attr(
				"placeholder",
				on ? __("Search customers, documents ...") : command_placeholder
			);
			$input.trigger("input");
		};
		$toggle.prop("checked", localStorage.getItem(CONTENT_SEARCH_KEY) === "1");
		$toggle.on("change", sync);
		sync();

		let request_id = 0;
		const show_results = frappe.utils.debounce((txt) => {
			const current = ++request_id;
			// Frappe's default limit of 20 is applied before sorting by DocType priority,
			// so a matching Supplier or Customer gets cut off behind 20 equally ranked
			// purchase documents. Fetch more, let the server sort masters first, show the top.
			frappe
				.xcall("frappe.utils.global_search.search", { text: txt, limit: 200 })
				.then((rows) => {
					if (current !== request_id) {
						return;
					}
					const needle = txt.toLowerCase();
					const exact = [];
					const masters = [];
					const rest = [];
					(rows || []).forEach((row) => {
						const label = row.title || row.name;
						const item = {
							label,
							value: `${__(row.doctype)}: ${row.name}`,
							description:
								label === row.name
									? __(row.doctype)
									: `${__(row.doctype)} ${row.name}`,
							route: ["Form", row.doctype, row.name],
							_master: CONTENT_SEARCH_MASTERS.indexOf(row.doctype),
						};
						if (row.name.toLowerCase() === needle) {
							exact.push(item);
						} else if (item._master >= 0) {
							masters.push(item);
						} else {
							rest.push(item);
						}
					});
					// The server returns matches in arbitrary DocType order. An exact document
					// name comes first so Enter opens that record, then master data (the
					// customer itself before its 20 invoices), then everything else.
					masters.sort((a, b) => a._master - b._master);
					const items = exact.concat(masters, rest).slice(0, CONTENT_SEARCH_MAX);
					items.forEach((item, i) => {
						item.index = 1000 - i;
					});
					items.push({
						label: __("Search for {0}", [frappe.utils.xss_sanitise(txt).bold()]),
						value: __("Search for {0}", [frappe.utils.xss_sanitise(txt)]),
						index: 0,
						onclick: () =>
							frappe.searchdialog.search.init_search(txt, "global_search"),
					});
					this.awesome_bar.awesomplete.list = items;
				});
		}, 250);

		$input.on("input", (event) => {
			if (!$toggle.prop("checked") || !this.awesome_bar) {
				return;
			}
			event.stopImmediatePropagation();
			const txt = $input.val().trim();
			if (txt.length < 2) {
				request_id++;
				this.awesome_bar.awesomplete.list = [];
				return;
			}
			show_results(txt);
		});
	}

	refresh() {
		this.apps = ui_styles.remix.get_apps();
		this.render();
	}

	render() {
		if (this.flags.alternative_navigation) {
			this.render_apps();
			this.render_menu();
		}
		if (this.flags.favorites) {
			this.render_favorites_menu();
		}
	}

	render_apps() {
		const open = this.$app_switcher.hasClass("is-open");
		const scroll = this.$app_switcher_menu.scrollTop();
		const current = this.apps.find((app) => app.label === this.current_app);
		this.$app_switcher_current.text(current ? __(current.label) : __("App"));
		this.$app_switcher_menu.empty();
		this.fill_app_list(this.$app_switcher_menu, (app) => this.select_app(app.label));

		this.$app_switcher.toggleClass("is-open", open);
		this.$app_switcher_toggle.attr("aria-expanded", open ? "true" : "false");
		this.$app_switcher_menu.scrollTop(scroll);
	}

	append_app_tree($parent, apps, pick) {
		ui_styles.remix.grouped_apps(apps).forEach((row) => {
			if (row.type === "group") {
				const level = row.level === 2 ? "is-nested" : "";
				$parent.append(
					`<div class="remix-app-group ${level}">${frappe.utils.escape_html(
						__(row.label)
					)}</div>`
				);
				return;
			}
			$parent.append(this.make_app_option(row.app, pick));
		});
	}

	make_rest_apps(apps, pick) {
		const open = Boolean(this._rest_apps_open);
		const $rest = $(`
			<div class="remix-app-rest ${open ? "is-open" : ""}">
				<button type="button" class="btn-reset remix-app-rest-toggle" aria-expanded="${
					open ? "true" : "false"
				}">
					<span class="remix-app-rest-chevron">${frappe.utils.icon("chevron-right", "sm")}</span>
					<span>${frappe.utils.escape_html(__("Remaining Apps"))}</span>
				</button>
				<div class="remix-app-rest-list"></div>
			</div>
		`);
		this.append_app_tree($rest.find(".remix-app-rest-list"), apps, pick);
		$rest.find(".remix-app-rest-toggle").on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this._rest_apps_open = !$rest.hasClass("is-open");
			$rest.toggleClass("is-open", this._rest_apps_open);
			$rest
				.find(".remix-app-rest-toggle")
				.attr("aria-expanded", this._rest_apps_open ? "true" : "false");
		});
		return $rest;
	}

	make_app_option(app, pick) {
		const selected = app.label === this.current_app;
		const show_star = this.flags.favorites;
		const favorite = show_star && ui_styles.remix.is_favorite_app(app.label);
		const star_title = favorite ? __("Remove from favorites") : __("Add to favorites");
		const star_html = show_star
			? `<button
					type="button"
					class="btn-reset remix-app-star ${favorite ? "is-favorite" : ""}"
					title="${star_title}"
					aria-label="${star_title}"
					aria-pressed="${favorite ? "true" : "false"}"
				>
					${frappe.utils.icon("star", "sm")}
				</button>`
			: "";
		const $option = $(`
			<div
				class="remix-app-option ${selected ? "is-selected" : ""}"
				role="option"
				aria-selected="${selected ? "true" : "false"}"
			>
				<button type="button" class="btn-reset remix-app-option-name">
					${frappe.utils.escape_html(__(app.label))}
				</button>
				${star_html}
			</div>
		`);
		$option.find(".remix-app-option-name").on("click", (event) => {
			event.preventDefault();
			pick(app);
		});
		$option.find(".remix-app-star").on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.toggle_app_favorite(app.label);
		});
		return $option;
	}

	select_app(label) {
		if (label !== this.current_app) {
			this.current_app = label;
			localStorage.setItem(LAST_APP_KEY, this.current_app);
			this.render_menu();
		}
		this.close_app_switcher();
		this.render_apps();
	}

	toggle_app_favorite(label) {
		const method = ui_styles.remix.is_favorite_app(label)
			? "ui_styles.remix.app_favorites.unfavorite"
			: "ui_styles.remix.app_favorites.favorite";
		frappe.call({
			method,
			args: { label },
			callback: (r) => {
				frappe.boot.remix.app_favorites = r.message || [];
				this.render_apps();
			},
		});
	}

	current_sidebar() {
		return this.apps.find((app) => app.label === this.current_app);
	}

	grouped_items() {
		const sidebar = this.current_sidebar();
		if (!sidebar) {
			return [];
		}
		const items = [];
		let current_section = null;
		(sidebar.items || []).forEach((item) => {
			item.nested_items = item.nested_items || [];
			if (item.type === "Section Break") {
				current_section = { ...item, nested_items: [] };
				items.push(current_section);
			} else if (current_section && item.child) {
				current_section.nested_items.push(item);
			} else {
				items.push(item);
			}
		});
		return items;
	}

	render_menu() {
		this.$menu.empty();
		const items = this.grouped_items();
		if (!items.length) {
			this.$menu.append(`<div class="remix-empty text-muted">${__("No menu items")}</div>`);
			return;
		}
		items.forEach((item) => this.$menu.append(this.make_menu_item(item)));
		this.highlight_active();
	}

	make_menu_item(item, nested = false) {
		if (item.type === "Section Break") {
			const expanded = this.is_section_expanded(item.label);
			const $section = $(`
				<div class="remix-section ${
					expanded ? "" : "is-collapsed"
				}" data-section="${frappe.utils.escape_html(item.label)}">
					<button type="button" class="btn-reset remix-section-toggle" aria-expanded="${
						expanded ? "true" : "false"
					}">
						<span class="remix-section-chevron">${frappe.utils.icon("chevron-right", "sm")}</span>
						<span class="remix-section-label">${frappe.utils.escape_html(__(item.label))}</span>
					</button>
					<div class="remix-section-items"></div>
				</div>
			`);
			$section.find(".remix-section-toggle").on("click", () => {
				const now_expanded = $section.hasClass("is-collapsed");
				$section.toggleClass("is-collapsed", !now_expanded);
				$section
					.find(".remix-section-toggle")
					.attr("aria-expanded", now_expanded ? "true" : "false");
				this.set_section_expanded(item.label, now_expanded);
			});
			(item.nested_items || []).forEach((child) => {
				$section.find(".remix-section-items").append(this.make_menu_item(child, true));
			});
			return $section;
		}
		if (item.type !== "Link") {
			return $();
		}

		const path = ui_styles.remix.get_item_path(item);
		if (!path) {
			return $();
		}

		const $row = $(`
			<div class="remix-menu-item ${nested ? "is-nested" : ""}">
				<a class="remix-menu-link" href="${frappe.utils.escape_html(path)}">
					<span class="remix-menu-icon">${item.icon ? frappe.utils.icon(item.icon, "sm") : ""}</span>
					<span class="remix-menu-label">${frappe.utils.escape_html(__(item.label))}</span>
				</a>
			</div>
		`);
		return $row;
	}

	entity_from_route(route) {
		if (!route || !route.length) {
			return null;
		}
		if (route[0] === "Workspaces") {
			return route[route.length - 1] || null;
		}
		if (
			route[0] === "query-report" ||
			route[0] === "dashboard-view" ||
			route[0] === "dashboard"
		) {
			return route[1] || null;
		}
		if (route.length === 1) {
			return route[0];
		}
		return route[1] || route[0];
	}

	apps_for_route() {
		const path = (window.location.pathname || "").replace(/\/$/, "");
		const route = frappe.get_route() || [];
		const entity = this.entity_from_route(route);
		const found = [];
		const seen = new Set();
		this.apps.forEach((app) => {
			let hit = false;
			if (entity && frappe.router.slug(app.label) === frappe.router.slug(entity)) {
				hit = true;
			}
			(app.items || []).forEach((item) => {
				if (item.type !== "Link") {
					return;
				}
				if (entity && item.link_to === entity) {
					hit = true;
				}
				const item_path = ui_styles.remix.get_item_path(item);
				if (!item_path) {
					return;
				}
				const href = item_path.replace(/\/$/, "");
				if (href && (path === href || path.startsWith(href + "/"))) {
					hit = true;
				}
			});
			if (hit && !seen.has(app.label)) {
				seen.add(app.label);
				found.push(app);
			}
		});
		return found;
	}

	pick_app_for_route(matches) {
		if (!matches.length) {
			return null;
		}
		if (matches.some((app) => app.label === this.current_app)) {
			return this.current_app;
		}
		const route = frappe.get_route() || [];
		const entity = this.entity_from_route(route);
		let module_name = null;
		try {
			if (entity && frappe.get_meta) {
				const meta = frappe.get_meta(entity);
				module_name = meta && meta.module;
			}
		} catch (e) {
			module_name = null;
		}
		let pool = matches;
		if (module_name) {
			const same_module = matches.filter(
				(app) => app.module === module_name || app.label === module_name
			);
			if (same_module.length) {
				pool = same_module;
			}
		}
		return pool.slice().sort((a, b) => (b.items || []).length - (a.items || []).length)[0]
			.label;
	}

	sync_app_to_route() {
		if (!this.flags.alternative_navigation) {
			return;
		}
		const next = this.pick_app_for_route(this.apps_for_route());
		if (next && next !== this.current_app) {
			this.current_app = next;
			localStorage.setItem(LAST_APP_KEY, this.current_app);
			this.render_apps();
			this.render_menu();
			return;
		}
		this.highlight_active();
	}

	highlight_active() {
		if (!this.$menu.length) {
			return;
		}
		const path = window.location.pathname.replace(/\/$/, "");
		this.$menu.find(".remix-menu-item").removeClass("active");
		this.$menu.find(".remix-menu-link").each((_, el) => {
			const href = (el.getAttribute("href") || "").replace(/\/$/, "");
			if (href && (path === href || path.startsWith(href + "/"))) {
				const $item = $(el).closest(".remix-menu-item");
				$item.addClass("active");
				const $section = $item.closest(".remix-section");
				if ($section.length && $section.hasClass("is-collapsed")) {
					$section.removeClass("is-collapsed");
					$section.find(".remix-section-toggle").attr("aria-expanded", "true");
				}
			}
		});
	}
}

$(document).on("startup", () => {
	const flags = ui_styles.remix.flags();
	if (!flags.enabled) {
		return;
	}
	if (ui_styles.remix.is_remix()) {
		ui_styles.remix.patch_router();
		ui_styles.remix.boot_shell();
		ui_styles.remix.rewrite_sidebar_links();
	}
	ui_styles.remix.add_switch_links();
});

$(document).on("page-change desktop_screen toolbar_setup form-load", () => {
	if (ui_styles.remix.flags().enabled) {
		ui_styles.remix.add_switch_links();
		ui_styles.remix.rewrite_sidebar_links();
		if (ui_styles.remix._shell) {
			ui_styles.remix._shell.mount_navbar_extras();
		}
	}
});
