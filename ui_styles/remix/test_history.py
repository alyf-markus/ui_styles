# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from ui_styles.remix.history import get_recent


class TestHistory(IntegrationTestCase):
	def setUp(self):
		super().setUp()
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.history = 1
		doc.save()
		frappe.db.delete("Route History", {"user": frappe.session.user, "route": ("like", "remix-test-%")})

	def tearDown(self):
		frappe.db.delete("Route History", {"user": frappe.session.user, "route": ("like", "remix-test-%")})
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 0
		doc.save()
		super().tearDown()

	def test_get_recent_returns_latest_unique_routes(self):
		_insert_route("remix-test-alpha")
		_insert_route("remix-test-beta")
		_insert_route("remix-test-alpha")
		routes = [item["route"] for item in get_recent(10) if item["route"].startswith("remix-test-")]
		self.assertEqual(routes[:2], ["remix-test-alpha", "remix-test-beta"])


def _insert_route(route: str) -> None:
	frappe.get_doc(
		{
			"doctype": "Route History",
			"route": route,
			"user": frappe.session.user,
		}
	).insert(ignore_permissions=True)
