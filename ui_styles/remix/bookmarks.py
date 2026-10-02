# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import json

import frappe
from frappe import _

BOOKMARKS_KEY = "erpnext_remix_bookmarks"
BOOKMARKS_MAX = 20


def _require_bookmarks():
	from ui_styles.remix.boot import get_flags

	flags = get_flags()
	if not flags["enabled"] or not flags["favorites"]:
		frappe.throw(_("Favorites is not enabled."), frappe.PermissionError)


def _load_items() -> list[dict]:
	raw = frappe.db.get_value(
		"DefaultValue",
		{"defkey": BOOKMARKS_KEY, "parent": frappe.session.user},
		"defvalue",
	)
	if not raw:
		return []
	try:
		items = json.loads(raw)
	except json.JSONDecodeError, TypeError:
		return []
	if not isinstance(items, list):
		return []
	return [item for item in items if isinstance(item, dict) and item.get("route")]


def _save_items(items: list[dict]) -> None:
	frappe.defaults.set_user_default(BOOKMARKS_KEY, json.dumps(items))


def _clean_route(route: str | None) -> str:
	return (route or "").strip().strip("/")


def get_bookmarks() -> list[dict]:
	return _load_items()


@frappe.whitelist()
def get() -> list[dict]:
	_require_bookmarks()
	return get_bookmarks()


@frappe.whitelist()
def add(route: str, label: str | None = None) -> list[dict]:
	"""Bookmark a Desk route, e.g. "Form/Purchase Receipt/MAT-PRE-2026-00001"."""
	_require_bookmarks()
	route = _clean_route(route)
	if not route:
		frappe.throw(_("Nothing to bookmark."), frappe.ValidationError)

	items = [item for item in _load_items() if item["route"] != route]
	items.insert(0, {"route": route, "label": (label or route).strip()[:140]})
	if len(items) > BOOKMARKS_MAX:
		frappe.throw(_("Bookmarks are full (max {0}).").format(BOOKMARKS_MAX), frappe.ValidationError)
	_save_items(items)
	return items


@frappe.whitelist()
def remove(route: str) -> list[dict]:
	_require_bookmarks()
	route = _clean_route(route)
	items = [item for item in _load_items() if item["route"] != route]
	_save_items(items)
	return items
