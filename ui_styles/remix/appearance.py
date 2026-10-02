# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import json
import re

import frappe
from frappe import _

COLORS_KEY = "erpnext_remix_colors"
STANDARD = "Standard"
CUSTOM = "Custom"
_HEX = re.compile(r"^#([0-9a-fA-F]{6})$")

# Desk Colour Tint tokens: background = surface, sidebar = navbar. Copied so Remix
# does not import desk_background. A chosen theme tints the Desk background the
# same way Desk Background does, plus the Remix sidebar.
PRESET_CHROME = {
	"Off White": {
		"light": {"background": "#fafafa", "sidebar": "#f0f0f0"},
		"dark": {"background": "#1c1c1c", "sidebar": "#262626"},
	},
	"Warm Gray": {
		"light": {"background": "#f7f6f4", "sidebar": "#ebe9e6"},
		"dark": {"background": "#1c1b1a", "sidebar": "#262524"},
	},
	"Cool Gray": {
		"light": {"background": "#f5f6f7", "sidebar": "#e8eaed"},
		"dark": {"background": "#1a1b1c", "sidebar": "#242628"},
	},
	"Fog": {
		"light": {"background": "#f1f5f9", "sidebar": "#e2e8f0"},
		"dark": {"background": "#1a1d22", "sidebar": "#242a32"},
	},
	"Sand": {
		"light": {"background": "#faf8f5", "sidebar": "#f0ebe3"},
		"dark": {"background": "#221f1c", "sidebar": "#2e2a26"},
	},
	"Wheat": {
		"light": {"background": "#faf9f6", "sidebar": "#f3efe4"},
		"dark": {"background": "#221f1c", "sidebar": "#2e2b26"},
	},
	"Cream": {
		"light": {"background": "#fffdf5", "sidebar": "#faf3d9"},
		"dark": {"background": "#222018", "sidebar": "#2e2b20"},
	},
	"Butter": {
		"light": {"background": "#fffcef", "sidebar": "#faf0c8"},
		"dark": {"background": "#222018", "sidebar": "#2e2c1e"},
	},
	"Peach": {
		"light": {"background": "#fff6f1", "sidebar": "#ffe8dc"},
		"dark": {"background": "#2a1e18", "sidebar": "#3a2a22"},
	},
	"Apricot": {
		"light": {"background": "#fff7f0", "sidebar": "#ffead9"},
		"dark": {"background": "#2a1f18", "sidebar": "#3a2c22"},
	},
	"Light Red": {
		"light": {"background": "#fff7f7", "sidebar": "#ffd8d8"},
		"dark": {"background": "#361515", "sidebar": "#521515"},
	},
	"Blush": {
		"light": {"background": "#fff5f5", "sidebar": "#ffe8e8"},
		"dark": {"background": "#2a1a1a", "sidebar": "#3a2222"},
	},
	"Rose Quartz": {
		"light": {"background": "#faf7f8", "sidebar": "#f5eaed"},
		"dark": {"background": "#221a1c", "sidebar": "#2e2426"},
	},
	"Mint": {
		"light": {"background": "#f5faf7", "sidebar": "#e8f5ee"},
		"dark": {"background": "#1a221e", "sidebar": "#242e28"},
	},
	"Sage": {
		"light": {"background": "#f6f8f6", "sidebar": "#e9efe9"},
		"dark": {"background": "#1b1f1b", "sidebar": "#252a25"},
	},
	"Sea Foam": {
		"light": {"background": "#f4fafa", "sidebar": "#e6f4f4"},
		"dark": {"background": "#1a2222", "sidebar": "#242e2e"},
	},
	"Sky": {
		"light": {"background": "#f5f9fc", "sidebar": "#e8f2fa"},
		"dark": {"background": "#1a1f24", "sidebar": "#242a32"},
	},
	"Blue Gray": {
		"light": {"background": "#f4f7fa", "sidebar": "#e6edf3"},
		"dark": {"background": "#1a1e24", "sidebar": "#242a32"},
	},
	"Lavender": {
		"light": {"background": "#f8f6fa", "sidebar": "#ede9f5"},
		"dark": {"background": "#1f1a24", "sidebar": "#2a2430"},
	},
	"Lilac": {
		"light": {"background": "#f9f7fb", "sidebar": "#f0ebf5"},
		"dark": {"background": "#201e24", "sidebar": "#2a2830"},
	},
}


def preset_labels() -> list[str]:
	return [STANDARD, *PRESET_CHROME.keys()]


def _require_colors():
	from ui_styles.remix.boot import get_flags

	flags = get_flags()
	if not flags["enabled"] or not flags["colors"]:
		frappe.throw(_("Colors is not enabled."), frappe.PermissionError)


def _clean_hex(color: str | None) -> str | None:
	if not color:
		return None
	color = str(color).strip()
	if _HEX.match(color):
		return color.lower()
	return None


def _clean_preset(preset: str | None) -> str:
	if preset == CUSTOM:
		return CUSTOM
	if preset in PRESET_CHROME:
		return preset
	return STANDARD


def empty_colors() -> dict:
	return {"preset": STANDARD, "background": None, "sidebar": None}


def get_colors() -> dict:
	raw = frappe.db.get_value(
		"DefaultValue",
		{"defkey": COLORS_KEY, "parent": frappe.session.user},
		"defvalue",
	)
	parsed = {}
	if raw:
		try:
			parsed = json.loads(raw)
		except json.JSONDecodeError, TypeError:
			parsed = {}
	if not isinstance(parsed, dict):
		parsed = {}

	preset = _clean_preset(parsed.get("preset"))
	background = _clean_hex(parsed.get("background"))
	sidebar = _clean_hex(parsed.get("sidebar"))

	# Legacy saves (no preset, or Custom with the old "topbar" key) were the old
	# top bar chrome, not a Desk theme - treat as Standard (system colours).
	if preset != CUSTOM:
		background = None
		sidebar = None
	if preset == CUSTOM and (not background or not sidebar):
		return empty_colors()

	return {"preset": preset, "background": background, "sidebar": sidebar}


@frappe.whitelist()
def save_colors(
	preset: str | None = None,
	background: str | None = None,
	sidebar: str | None = None,
) -> dict:
	_require_colors()
	from ui_styles.remix.boot import get_flags

	flags = get_flags()
	preset = _clean_preset(preset)
	background_hex = _clean_hex(background)
	sidebar_hex = _clean_hex(sidebar)

	if preset == CUSTOM:
		if not flags["manual_colors"]:
			frappe.throw(_("Manual colours are not enabled."), frappe.PermissionError)
		if not background_hex or not sidebar_hex:
			frappe.throw(_("Pick a background colour and a sidebar colour."), frappe.ValidationError)
	else:
		background_hex = None
		sidebar_hex = None

	colors = {"preset": preset, "background": background_hex, "sidebar": sidebar_hex}
	frappe.defaults.set_user_default(COLORS_KEY, json.dumps(colors))
	return colors
