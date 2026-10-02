# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import json

import frappe
from frappe import _

FAVORITES_KEY = "erpnext_remix_app_favorites"


def _require_favorites():
	from ui_styles.remix.boot import get_flags

	flags = get_flags()
	if not flags["enabled"] or not flags["favorites"]:
		frappe.throw(_("Favorites is not enabled."), frappe.PermissionError)


def _load_labels() -> list[str]:
	raw = frappe.db.get_value(
		"DefaultValue",
		{"defkey": FAVORITES_KEY, "parent": frappe.session.user},
		"defvalue",
	)
	if not raw:
		return []
	try:
		labels = json.loads(raw)
	except json.JSONDecodeError, TypeError:
		return []
	if not isinstance(labels, list):
		return []
	return [label for label in labels if isinstance(label, str) and label]


def _save_labels(labels: list[str]) -> None:
	frappe.defaults.set_user_default(FAVORITES_KEY, json.dumps(labels))


def known_app_labels() -> set[str]:
	return {
		name
		for name in frappe.get_all("Workspace Sidebar", pluck="name")
		if name and not name.startswith("My Workspaces")
	}


def get_permitted_favorites() -> list[str]:
	known = known_app_labels()
	seen = set()
	allowed = []
	for label in _load_labels():
		if label in known and label not in seen:
			allowed.append(label)
			seen.add(label)
	return allowed


@frappe.whitelist()
def get_favorites() -> list[str]:
	_require_favorites()
	return get_permitted_favorites()


@frappe.whitelist()
def favorite(label: str) -> list[str]:
	_require_favorites()
	if label not in known_app_labels():
		frappe.throw(_("Unknown app."), frappe.ValidationError)

	stored = _load_labels()
	if label not in stored:
		stored.append(label)
	_save_labels(stored)
	return get_permitted_favorites()


@frappe.whitelist()
def unfavorite(label: str) -> list[str]:
	_require_favorites()
	stored = [item for item in _load_labels() if item != label]
	_save_labels(stored)
	return get_permitted_favorites()
