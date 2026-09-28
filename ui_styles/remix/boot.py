# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe.utils import cint

from ui_styles.remix.appearance import PRESET_CHROME, empty_colors, get_colors

SETTINGS_DOCTYPE = "Remix Settings"


def _off() -> dict:
	return {
		"enabled": 0,
		"search": 0,
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
	if not cint(doc.enabled):
		return _off()

	history = cint(doc.history)
	favorites = cint(doc.favorites)
	alternative_navigation = cint(doc.alternative_navigation)
	if not history and not favorites and not alternative_navigation:
		return _off()

	colors = cint(doc.colors)
	return {
		"enabled": 1,
		"search": cint(doc.search) if alternative_navigation else 0,
		"history": history,
		"alternative_navigation": alternative_navigation,
		"favorites": favorites,
		"colors": colors,
		"manual_colors": cint(doc.manual_colors) if colors else 0,
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
			"app_favorites": [],
			"bookmarks": [],
			"app_titles": {},
			"user_colors": empty_colors(),
			"color_presets": PRESET_CHROME if flags.get("colors") else {},
			"manual_colors": flags.get("manual_colors", 0),
		}
	)
	return payload


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
		from ui_styles.remix.app_favorites import get_permitted_favorites
		from ui_styles.remix.bookmarks import get_bookmarks

		bootinfo.remix["app_favorites"] = get_permitted_favorites()
		bootinfo.remix["bookmarks"] = get_bookmarks()

	if flags["alternative_navigation"] or flags["favorites"]:
		bootinfo.remix["app_titles"] = installed_app_titles()

	if flags["colors"]:
		bootinfo.remix["user_colors"] = get_colors()
