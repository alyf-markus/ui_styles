frappe.provide("ui_styles.remix");

ui_styles.remix.PREFIX = "remix";

ui_styles.remix.is_remix = function () {
	const path = (window.location.pathname || "").replace(/^\//, "");
	return path === ui_styles.remix.PREFIX || path.startsWith(ui_styles.remix.PREFIX + "/");
};

ui_styles.remix.flags = function () {
	const r = (frappe.boot && frappe.boot.remix) || {};
	return {
		enabled: Number(r.enabled) === 1,
		top_bar: Number(r.top_bar) === 1,
		search: Number(r.search) === 1,
		pin: Number(r.pin) === 1,
		history: Number(r.history) === 1,
		alternative_navigation: Number(r.alternative_navigation) === 1,
		favorites: Number(r.favorites) === 1,
		colors: Number(r.colors) === 1,
		manual_colors: Number(r.manual_colors) === 1,
	};
};

ui_styles.remix.patch_router = function () {
	if (!frappe.router || frappe.router.__ui_styles_remix_patched) {
		return;
	}
	frappe.router.__ui_styles_remix_patched = true;

	const prefix = ui_styles.remix.PREFIX;
	const desk_prefixes = ["desk", "app", prefix];

	frappe.router.is_app_route = function (path) {
		if (!path) return;
		if (path.substr(0, 1) === "/") path = path.substr(1);
		path = path.split("/");
		return path[0] ? desk_prefixes.includes(path[0]) : false;
	};

	const orig_strip = frappe.router.strip_prefix.bind(frappe.router);
	frappe.router.strip_prefix = function (route) {
		if (!route) {
			route = window.location.pathname;
		}
		if (route.substr(0, 1) === "/") route = route.substr(1);
		if (route === prefix) {
			return "";
		}
		if (route.startsWith(prefix + "/")) {
			route = route.slice(prefix.length + 1);
			if (route.substr(0, 1) === "#") route = route.substr(1);
			if (route.substr(0, 1) === "!") route = route.substr(1);
			return route;
		}
		return orig_strip(route.startsWith("/") ? route : "/" + route);
	};

	const orig_make_url = frappe.router.make_url.bind(frappe.router);
	frappe.router.make_url = function (params) {
		return orig_make_url(params).replace(/^\/desk\b/, "/" + prefix);
	};

	const orig_get_route = frappe.router.get_route_from_arguments.bind(frappe.router);
	frappe.router.get_route_from_arguments = function () {
		let route = orig_get_route.apply(this, arguments);
		if (route && route[0] === prefix) {
			route.shift();
		}
		return route;
	};

	if (frappe.utils && frappe.utils.generate_route) {
		const orig_generate = frappe.utils.generate_route.bind(frappe.utils);
		frappe.utils.generate_route = function (item) {
			const route = orig_generate(item);
			if (typeof route === "string") {
				return route.replace(/^\/desk\b/, "/" + prefix);
			}
			return route;
		};
	}
};

if (ui_styles.remix.is_remix() && window.frappe && frappe.router && ui_styles.remix.flags().enabled) {
	ui_styles.remix.patch_router();
}
