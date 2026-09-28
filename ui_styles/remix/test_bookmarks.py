# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from ui_styles.remix.bookmarks import add, get, remove


class TestBookmarks(IntegrationTestCase):
	def setUp(self):
		super().setUp()
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.favorites = 1
		doc.save()
		for item in list(get()):
			remove(item["route"])

	def tearDown(self):
		for item in list(get()):
			remove(item["route"])
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 0
		doc.save()
		super().tearDown()

	def test_add_document_route(self):
		items = add("/Form/ToDo/TEST-0001/", "ToDo TEST-0001")
		self.assertEqual(items[0]["route"], "Form/ToDo/TEST-0001")
		self.assertEqual(get()[0]["label"], "ToDo TEST-0001")

	def test_add_moves_existing_to_front(self):
		add("Form/ToDo/A", "A")
		add("Form/ToDo/B", "B")
		add("Form/ToDo/A", "A")
		self.assertEqual([item["route"] for item in get()], ["Form/ToDo/A", "Form/ToDo/B"])

	def test_remove(self):
		add("Form/ToDo/A", "A")
		remove("Form/ToDo/A")
		self.assertEqual(get(), [])

	def test_blocked_when_disabled(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 0
		doc.save()
		with self.assertRaises(frappe.PermissionError):
			add("Form/ToDo/A", "A")
