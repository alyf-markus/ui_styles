# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


class RemixSettings(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		alternative_navigation: DF.Check
		colors: DF.Check
		enabled: DF.Check
		favorites: DF.Check
		history: DF.Check
		manual_colors: DF.Check
		search: DF.Check
	# end: auto-generated types

	def validate(self):
		self._normalize_flags()
		if cint(self.enabled) and not (
			cint(self.history) or cint(self.favorites) or cint(self.alternative_navigation)
		):
			frappe.throw(
				_("Enable Remix requires History, Favorites, or Alternative Navigation."),
				title=_("Invalid Remix Settings"),
			)

	def _normalize_flags(self):
		if not cint(self.enabled):
			self.history = 0
			self.favorites = 0
			self.alternative_navigation = 0
			self.colors = 0
			self.manual_colors = 0
		if not cint(self.alternative_navigation):
			self.search = 0
		if not cint(self.colors):
			self.manual_colors = 0

	def on_update(self):
		frappe.clear_cache()
