# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from ui_styles.list_scroll.boot import extend_bootinfo


class TestListScrollSettings(IntegrationTestCase):
	def setUp(self):
		super().setUp()
		doc = frappe.get_single("List Scroll Settings")
		doc.dense_list_layout = 0
		doc.sticky_list_header = 0
		doc.floating_list_paging = 0
		doc.sticky_columns = 0
		doc.set("doctype_overrides", [])
		doc.save()

	def tearDown(self):
		self.setUp()
		super().tearDown()

	def test_boot_defaults_off(self):
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_scroll["any_dense"], 0)
		self.assertEqual(
			bootinfo.list_scroll["defaults"],
			{
				"dense_list_layout": 0,
				"sticky_list_header": 0,
				"floating_list_paging": 0,
				"sticky_columns": 0,
			},
		)
		self.assertEqual(bootinfo.list_scroll["by_doctype"], {})

	def test_boot_sticky_and_floating_require_dense(self):
		doc = frappe.get_single("List Scroll Settings")
		doc.dense_list_layout = 0
		doc.sticky_list_header = 1
		doc.floating_list_paging = 1
		doc.sticky_columns = 2
		doc.save()
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_scroll["any_dense"], 0)
		self.assertEqual(bootinfo.list_scroll["defaults"]["dense_list_layout"], 0)
		self.assertEqual(bootinfo.list_scroll["defaults"]["sticky_list_header"], 0)
		self.assertEqual(bootinfo.list_scroll["defaults"]["floating_list_paging"], 0)
		self.assertEqual(bootinfo.list_scroll["defaults"]["sticky_columns"], 0)

	def test_boot_flags_when_dense_on(self):
		doc = frappe.get_single("List Scroll Settings")
		doc.dense_list_layout = 1
		doc.sticky_list_header = 1
		doc.floating_list_paging = 1
		doc.sticky_columns = 2
		doc.save()
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_scroll["any_dense"], 1)
		self.assertEqual(bootinfo.list_scroll["defaults"]["dense_list_layout"], 1)
		self.assertEqual(bootinfo.list_scroll["defaults"]["sticky_list_header"], 1)
		self.assertEqual(bootinfo.list_scroll["defaults"]["floating_list_paging"], 1)
		self.assertEqual(bootinfo.list_scroll["defaults"]["sticky_columns"], 2)

	def test_boot_doctype_override_replaces_defaults(self):
		doc = frappe.get_single("List Scroll Settings")
		doc.dense_list_layout = 1
		doc.sticky_list_header = 1
		doc.floating_list_paging = 0
		doc.sticky_columns = 1
		doc.append(
			"doctype_overrides",
			{
				"reference_doctype": "ToDo",
				"dense_list_layout": 1,
				"sticky_list_header": 0,
				"floating_list_paging": 1,
				"sticky_columns": 3,
			},
		)
		doc.save()
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_scroll["defaults"]["sticky_columns"], 1)
		self.assertEqual(
			bootinfo.list_scroll["by_doctype"]["ToDo"],
			{
				"dense_list_layout": 1,
				"sticky_list_header": 0,
				"floating_list_paging": 1,
				"sticky_columns": 3,
			},
		)

	def test_override_dense_off_clears_dependent_flags(self):
		doc = frappe.get_single("List Scroll Settings")
		doc.dense_list_layout = 1
		doc.append(
			"doctype_overrides",
			{
				"reference_doctype": "ToDo",
				"dense_list_layout": 0,
				"sticky_list_header": 1,
				"floating_list_paging": 1,
				"sticky_columns": 2,
			},
		)
		doc.save()
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_scroll["any_dense"], 1)
		self.assertEqual(
			bootinfo.list_scroll["by_doctype"]["ToDo"],
			{
				"dense_list_layout": 0,
				"sticky_list_header": 0,
				"floating_list_paging": 0,
				"sticky_columns": 0,
			},
		)

	def test_duplicate_doctype_override_rejected(self):
		doc = frappe.get_single("List Scroll Settings")
		doc.dense_list_layout = 1
		doc.append(
			"doctype_overrides",
			{"reference_doctype": "ToDo", "dense_list_layout": 1, "sticky_columns": 1},
		)
		doc.append(
			"doctype_overrides",
			{"reference_doctype": "ToDo", "dense_list_layout": 1, "sticky_columns": 2},
		)
		with self.assertRaises(frappe.ValidationError):
			doc.save()
