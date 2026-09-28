// Copyright (c) 2026, ALYF GmbH and contributors
// For license information, please see license.txt

frappe.ui.form.on("Remix Settings", {
	after_save() {
		frappe.ui.toolbar.clear_cache();
	},
});
