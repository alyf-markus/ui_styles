# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from ui_styles.remix.pinbar import pin


class TestPinbar(IntegrationTestCase):
	def tearDown(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 0
		doc.save()
		super().tearDown()

	def test_pin_blocked_when_remix_top_bar_is_gone(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.history = 1
		doc.save()
		with self.assertRaises(frappe.PermissionError):
			pin({"label": "ToDo", "link_type": "DocType", "link_to": "ToDo"})
