# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from ui_styles.remix.appearance import COLORS_KEY
from ui_styles.remix.boot import extend_bootinfo, get_flags


class TestRemixSettings(IntegrationTestCase):
	def setUp(self):
		super().setUp()
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 0
		doc.search = 0
		doc.history = 0
		doc.alternative_navigation = 0
		doc.favorites = 0
		doc.colors = 0
		doc.manual_colors = 0
		doc.save()

	def tearDown(self):
		self.setUp()
		super().tearDown()

	def test_boot_defaults_off(self):
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.remix["enabled"], 0)
		self.assertEqual(bootinfo.remix["alternative_navigation"], 0)
		self.assertEqual(bootinfo.remix["app_favorites"], [])

	def test_enable_requires_chrome(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		with self.assertRaises(frappe.ValidationError):
			doc.save()

	def test_nested_flags_require_parents(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 0
		doc.history = 1
		doc.alternative_navigation = 1
		doc.search = 1
		doc.favorites = 1
		doc.colors = 1
		doc.manual_colors = 1
		doc.save()
		flags = get_flags()
		self.assertEqual(flags["enabled"], 0)
		self.assertEqual(flags["search"], 0)
		self.assertEqual(flags["history"], 0)
		self.assertEqual(flags["alternative_navigation"], 0)
		self.assertEqual(flags["favorites"], 0)
		self.assertEqual(flags["colors"], 0)
		self.assertEqual(flags["manual_colors"], 0)

	def test_boot_flags_when_enabled(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.history = 1
		doc.search = 1
		doc.alternative_navigation = 1
		doc.favorites = 1
		doc.colors = 1
		doc.save()
		frappe.defaults.clear_user_default(COLORS_KEY)
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.remix["enabled"], 1)
		self.assertEqual(bootinfo.remix["search"], 1)
		self.assertEqual(bootinfo.remix["history"], 1)
		self.assertEqual(bootinfo.remix["alternative_navigation"], 1)
		self.assertEqual(bootinfo.remix["favorites"], 1)
		self.assertEqual(bootinfo.remix["colors"], 1)
		self.assertEqual(bootinfo.remix["manual_colors"], 0)
		self.assertEqual(bootinfo.remix["user_colors"]["preset"], "Standard")
		self.assertIn("Fog", bootinfo.remix["color_presets"])

	def test_legacy_hex_colors_are_standard(self):
		from ui_styles.remix.appearance import get_colors

		frappe.defaults.set_user_default(
			COLORS_KEY, '{"topbar": "#0a0a0a", "sidebar": "#0c3b2c"}'
		)
		self.assertEqual(get_colors()["preset"], "Standard")
		self.assertIsNone(get_colors()["background"])
		frappe.defaults.set_user_default(
			COLORS_KEY, '{"preset": "Custom", "topbar": "#0a0a0a", "sidebar": "#0c3b2c"}'
		)
		self.assertEqual(get_colors()["preset"], "Standard")
		frappe.defaults.set_user_default(
			COLORS_KEY, '{"preset": "Custom", "background": "#fff7f7", "sidebar": "#ffd8d8"}'
		)
		self.assertEqual(get_colors()["background"], "#fff7f7")

	def test_manual_colors_requires_colors(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.history = 1
		doc.colors = 0
		doc.manual_colors = 1
		doc.save()
		flags = get_flags()
		self.assertEqual(flags["colors"], 0)
		self.assertEqual(flags["manual_colors"], 0)

	def test_history_without_sidebar(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.history = 1
		doc.search = 1
		doc.alternative_navigation = 0
		doc.save()
		flags = get_flags()
		self.assertEqual(flags["history"], 1)
		self.assertEqual(flags["search"], 0)
		self.assertEqual(flags["alternative_navigation"], 0)

	def test_favorites_without_sidebar(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.favorites = 1
		doc.alternative_navigation = 0
		doc.save()
		flags = get_flags()
		self.assertEqual(flags["favorites"], 1)
		self.assertEqual(flags["alternative_navigation"], 0)

	def test_sidebar_only(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.history = 0
		doc.search = 1
		doc.alternative_navigation = 1
		doc.favorites = 1
		doc.save()
		flags = get_flags()
		self.assertEqual(flags["history"], 0)
		self.assertEqual(flags["search"], 1)
		self.assertEqual(flags["alternative_navigation"], 1)
		self.assertEqual(flags["favorites"], 1)
