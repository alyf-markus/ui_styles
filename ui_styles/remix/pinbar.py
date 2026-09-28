# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import json

import frappe
from frappe import _

PINBAR_KEY = "erpnext_remix_pinbar"
PINBAR_MAX = 10


def _require_pin():
	from ui_styles.remix.boot import get_flags

	flags = get_flags()
	if not flags["enabled"] or not flags["pin"]:
		frappe.throw(_("Pin is not enabled."), frappe.PermissionError)


def _load_items() -> list[dict]:
	raw = frappe.db.get_value(
		"DefaultValue",
		{"defkey": PINBAR_KEY, "parent": frappe.session.user},
		"defvalue",
	)
	if not raw:
		return []
	try:
		items = json.loads(raw)
	except (json.JSONDecodeError, TypeError):
		return []
	if not isinstance(items, list):
		return []
	return items


def _save_items(items: list[dict]) -> None:
	frappe.defaults.set_user_default(PINBAR_KEY, json.dumps(items))


def _item_key(item: dict) -> tuple[str, str]:
	return ((item.get("link_type") or "").lower(), item.get("link_to") or "")


def is_pin_allowed(item: dict) -> bool:
	"""Return whether the current user may open this Pinbar item."""
	from frappe.desk.desk_views import DeskViews

	link_type = (item.get("link_type") or "").lower()
	link_to = item.get("link_to")
	if not link_to:
		return False

	if link_type == "doctype":
		if not frappe.db.exists("DocType", link_to):
			return False
		return bool(frappe.has_permission(link_to, "read"))

	if link_type == "report":
		return link_to in DeskViews.get_allowed_reports()

	if link_type == "page":
		return link_to in DeskViews.get_allowed_pages()

	if link_type == "workspace":
		return bool(frappe.get_list("Workspace", filters={"name": link_to}, limit=1))

	if link_type == "dashboard":
		allowed = DeskViews.get_allowed_dashboards() or []
		names = [row["name"] if isinstance(row, dict) else row for row in allowed]
		return link_to in names

	if link_type == "url":
		return True

	return False


def get_permitted_items() -> list[dict]:
	return [item for item in _load_items() if is_pin_allowed(item)]


@frappe.whitelist()
def get_pinbar() -> list[dict]:
	_require_pin()
	return get_permitted_items()


@frappe.whitelist()
def pin(item: dict | str) -> list[dict]:
	_require_pin()
	if isinstance(item, str):
		item = json.loads(item)

	if not is_pin_allowed(item):
		frappe.throw(_("You do not have permission to pin this item."), frappe.PermissionError)

	stored = _load_items()
	key = _item_key(item)
	stored = [existing for existing in stored if _item_key(existing) != key]

	if len(stored) >= PINBAR_MAX:
		frappe.throw(_("Pinbar is full (max {0}).").format(PINBAR_MAX))

	stored.append(
		{
			"label": item.get("label") or item.get("link_to"),
			"link_type": item.get("link_type"),
			"link_to": item.get("link_to"),
			"icon": item.get("icon") or "link",
		}
	)
	_save_items(stored)
	return get_permitted_items()


@frappe.whitelist()
def unpin(link_type: str, link_to: str) -> list[dict]:
	_require_pin()
	key = ((link_type or "").lower(), link_to or "")
	stored = [item for item in _load_items() if _item_key(item) != key]
	_save_items(stored)
	return get_permitted_items()


@frappe.whitelist()
def reorder(items: list | str) -> list[dict]:
	_require_pin()
	if isinstance(items, str):
		items = json.loads(items)
	if not items:
		return get_permitted_items()

	stored = _load_items()
	keyed = {_item_key(item): item for item in stored}
	ordered = []
	seen = set()
	for item in items:
		key = _item_key(item)
		if key in keyed and key not in seen:
			ordered.append(keyed[key])
			seen.add(key)
	for item in stored:
		key = _item_key(item)
		if key not in seen:
			ordered.append(item)
	_save_items(ordered)
	return get_permitted_items()
