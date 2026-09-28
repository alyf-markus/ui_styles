# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.installer import add_module_defs


def execute():
	frappe.cache.delete_value("app_modules")
	frappe.setup_module_map(include_all_apps=True)
	add_module_defs("ui_styles", ignore_if_duplicate=True)
	frappe.reload_doc("remix", "doctype", "remix_settings", force=True)
