# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase

from ui_styles.remix.app_favorites import favorite, get_favorites, unfavorite


class TestAppFavorites(IntegrationTestCase):
	def setUp(self):
		super().setUp()
		self._enable_favorites()
		self.sidebars = [
			_ensure_sidebar("Remix Fav Alpha"),
			_ensure_sidebar("Remix Fav Beta"),
		]
		for label in list(get_favorites()):
			unfavorite(label)

	def tearDown(self):
		for label in list(get_favorites()):
			unfavorite(label)
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 0
		doc.save()
		super().tearDown()

	def _enable_favorites(self):
		doc = frappe.get_single("Remix Settings")
		doc.enabled = 1
		doc.alternative_navigation = 1
		doc.favorites = 1
		doc.save()

	def test_favorite_and_get(self):
		labels = favorite(self.sidebars[0])
		self.assertEqual(labels, [self.sidebars[0]])
		self.assertEqual(get_favorites(), [self.sidebars[0]])

	def test_unfavorite(self):
		favorite(self.sidebars[0])
		self.assertEqual(get_favorites(), [self.sidebars[0]])
		unfavorite(self.sidebars[0])
		self.assertEqual(get_favorites(), [])

	def test_unknown_app_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			favorite("Not A Real Remix App")

	def test_duplicate_favorite_keeps_order(self):
		favorite(self.sidebars[0])
		favorite(self.sidebars[1])
		favorite(self.sidebars[0])
		self.assertEqual(get_favorites(), [self.sidebars[0], self.sidebars[1]])


def _ensure_sidebar(title: str) -> str:
	if frappe.db.exists("Workspace Sidebar", title):
		return title
	frappe.get_doc(
		{
			"doctype": "Workspace Sidebar",
			"title": title,
			"header_icon": "star",
			"items": [
				{
					"type": "Link",
					"label": "ToDo",
					"link_type": "DocType",
					"link_to": "ToDo",
				}
			],
		}
	).insert(ignore_permissions=True)
	return title
