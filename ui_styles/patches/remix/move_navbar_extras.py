# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import cint


def execute():
	if not frappe.db.exists("DocType", "Remix Settings"):
		return
	values = frappe.db.get_singles_dict("Remix Settings")
	if not cint(values.get("enabled")):
		return
	doc = frappe.get_single("Remix Settings")
	changed = False
	if cint(values.get("top_bar")) and not cint(doc.history):
		doc.history = 1
		changed = True
	if not cint(doc.history) and not cint(doc.favorites) and not cint(doc.alternative_navigation):
		doc.history = 1
		changed = True
	if changed:
		doc.save()
