# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe.utils import cint

from ui_styles.remix.appearance import PRESET_CHROME, empty_colors, get_colors

SETTINGS_DOCTYPE = "Remix Settings"


def _flag(value, default: int = 0) -> int:
	if value is None or value == "":
		return default
	return cint(value)


def _off() -> dict:
	return {
		"enabled": 0,
		"top_bar": 0,
		"search": 0,
		"pin": 0,
		"history": 0,
		"alternative_navigation": 0,
		"favorites": 0,
		"colors": 0,
		"manual_colors": 0,
	}


def get_flags() -> dict:
	if not frappe.db.exists("DocType", SETTINGS_DOCTYPE):
		return _off()

	doc = frappe.get_cached_doc(SETTINGS_DOCTYPE)
	if not _flag(doc.enabled):
		return _off()

	history = _flag(doc.history)
	favorites = _flag(doc.favorites)
	alternative_navigation = _flag(doc.alternative_navigation)
	if not history and not favorites and not alternative_navigation:
		return _off()

	return {
		"enabled": 1,
		"top_bar": 0,
		"search": _flag(doc.search) if alternative_navigation else 0,
		"pin": 0,
		"history": history,
		"alternative_navigation": alternative_navigation,
		"favorites": favorites,
		"colors": _flag(doc.colors),
		"manual_colors": _flag(doc.manual_colors) if _flag(doc.colors) else 0,
	}


def feature_enabled() -> bool:
	return bool(get_flags()["enabled"])


def body_class() -> str:
	flags = get_flags()
	classes = ["remix-desk"]
	if flags["alternative_navigation"]:
		classes.append("remix-has-sidebar")
	return " ".join(classes)


def _empty_payload(flags: dict) -> dict:
	payload = dict(flags)
	payload.update(
		{
			"pinbar": [],
			"app_favorites": [],
			"bookmarks": [],
			"app_titles": {},
			"logo": None,
			"user_colors": empty_colors(),
			"color_presets": PRESET_CHROME if flags.get("colors") else {},
			"manual_colors": flags.get("manual_colors", 0),
		}
	)
	return payload


def _logo_usable(file_url: str) -> bool:
	if not file_url:
		return False
	if file_url.startswith("/assets/") or file_url.startswith("/files/"):
		return True
	if not file_url.startswith("/private/"):
		return True
	file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
	if not file_name:
		return False
	return bool(frappe.has_permission("File", "read", file_name))


def get_remix_logo():
	"""Prefer a logo the current user can actually load."""
	candidates = []
	if "erpnext" in frappe.get_installed_apps():
		company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value(
			"Global Defaults", "default_company"
		)
		if company:
			candidates.append(frappe.db.get_value("Company", company, "company_logo"))
	candidates.append(frappe.db.get_single_value("Navbar Settings", "app_logo"))
	if "erpnext" in frappe.get_installed_apps():
		candidates.append("/assets/erpnext/images/erpnext-logo.svg")
	candidates.append("/assets/frappe/images/frappe-framework-logo.svg")
	for url in frappe.get_hooks("app_logo_url") or []:
		candidates.append(url)
	for url in candidates:
		if _logo_usable(url):
			return url
	return None


def installed_app_titles() -> dict[str, str]:
	titles = {}
	for app_name in frappe.get_installed_apps():
		screen = frappe.get_hooks("add_to_apps_screen", app_name=app_name)
		title = screen[0].get("title") if screen else None
		if not title:
			hook_title = frappe.get_hooks("app_title", app_name=app_name)
			title = hook_title[0] if hook_title else app_name
		titles[app_name] = title
	return titles


def extend_bootinfo(bootinfo):
	flags = get_flags()
	bootinfo.remix = _empty_payload(flags)
	if frappe.session.user == "Guest" or not flags["enabled"]:
		return

	if flags["favorites"]:
		try:
			from ui_styles.remix.app_favorites import get_permitted_favorites

			bootinfo.remix["app_favorites"] = get_permitted_favorites()
		except Exception:
			bootinfo.remix["app_favorites"] = []
		try:
			from ui_styles.remix.bookmarks import get_bookmarks

			bootinfo.remix["bookmarks"] = get_bookmarks()
		except Exception:
			bootinfo.remix["bookmarks"] = []

	if flags["alternative_navigation"] or flags["favorites"]:
		try:
			bootinfo.remix["app_titles"] = installed_app_titles()
		except Exception:
			bootinfo.remix["app_titles"] = {}

	if flags["colors"]:
		try:
			bootinfo.remix["user_colors"] = get_colors()
		except Exception:
			bootinfo.remix["user_colors"] = empty_colors()
