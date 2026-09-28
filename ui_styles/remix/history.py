# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import cint

HISTORY_MAX = 10


def _require_history():
	from ui_styles.remix.boot import get_flags

	flags = get_flags()
	if not flags["enabled"] or not flags["history"]:
		frappe.throw(_("History is not enabled."), frappe.PermissionError)


@frappe.whitelist()
def get_recent(limit: int | None = None) -> list[dict]:
	_require_history()
	if frappe.session.user == "Guest":
		return []

	limit = min(max(cint(limit) or HISTORY_MAX, 1), HISTORY_MAX)
	rows = frappe.get_all(
		"Route History",
		fields=["route", "creation"],
		filters={"user": frappe.session.user},
		order_by="creation desc",
		limit=limit * 4,
	)
	seen = set()
	items = []
	for row in rows:
		route = (row.route or "").strip()
		if not route or route in seen:
			continue
		seen.add(route)
		items.append({"route": route, "creation": str(row.creation) if row.creation else None})
		if len(items) >= limit:
			break
	return items
