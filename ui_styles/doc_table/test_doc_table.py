# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests import IntegrationTestCase, UnitTestCase

from ui_styles.doc_table.parse import parse_options


class TestDocTableParse(UnitTestCase):
	def test_parse_options_doctype_only(self):
		parsed = parse_options("doctype: Sales Invoice")
		self.assertEqual(parsed.doctype, "Sales Invoice")
		self.assertIsNone(parsed.link_fieldname)
		self.assertIsNone(parsed.columns)
		self.assertFalse(parsed.skip_parent_link)
		self.assertIsNone(parsed.order_by)

	def test_parse_options_with_link_field(self):
		parsed = parse_options("doctype: Sales Invoice\nlink: customer")
		self.assertEqual(parsed.doctype, "Sales Invoice")
		self.assertEqual(parsed.link_fieldname, "customer")
		self.assertIsNone(parsed.columns)
		self.assertFalse(parsed.skip_parent_link)

	def test_parse_options_with_columns(self):
		parsed = parse_options(
			"doctype: Sales Invoice\nlink: customer\ncolumns: name, posting_date, grand_total"
		)
		self.assertEqual(parsed.doctype, "Sales Invoice")
		self.assertEqual(parsed.link_fieldname, "customer")
		self.assertEqual(parsed.columns, ("name", "posting_date", "grand_total"))

	def test_parse_options_columns_only(self):
		parsed = parse_options("doctype: Sales Invoice\ncolumns: name, posting_date, status")
		self.assertEqual(parsed.doctype, "Sales Invoice")
		self.assertIsNone(parsed.link_fieldname)
		self.assertEqual(parsed.columns, ("name", "posting_date", "status"))
		self.assertFalse(parsed.skip_parent_link)

	def test_parse_options_link_none(self):
		parsed = parse_options("doctype: Sales Invoice\nlink: none")
		self.assertEqual(parsed.doctype, "Sales Invoice")
		self.assertIsNone(parsed.link_fieldname)
		self.assertIsNone(parsed.columns)
		self.assertTrue(parsed.skip_parent_link)

	def test_parse_options_link_none_with_columns(self):
		parsed = parse_options("doctype: ToDo\nlink: none\ncolumns: status, description")
		self.assertEqual(parsed.doctype, "ToDo")
		self.assertTrue(parsed.skip_parent_link)
		self.assertEqual(parsed.columns, ("status", "description"))

	def test_parse_options_link_none_case_insensitive(self):
		parsed = parse_options("doctype: ToDo\nLink: None")
		self.assertTrue(parsed.skip_parent_link)

	def test_parse_options_order_by(self):
		parsed = parse_options("doctype: Sales Invoice\nlink: customer\norder_by: posting_date desc")
		self.assertEqual(parsed.link_fieldname, "customer")
		self.assertEqual(parsed.order_by, "posting_date desc")
		self.assertIsNone(parsed.columns)

	def test_parse_options_any_order(self):
		parsed = parse_options(
			"order_by: posting_date desc\ncolumns: name, status\nlink: customer\ndoctype: Sales Invoice"
		)
		self.assertEqual(parsed.doctype, "Sales Invoice")
		self.assertEqual(parsed.link_fieldname, "customer")
		self.assertEqual(parsed.columns, ("name", "status"))
		self.assertEqual(parsed.order_by, "posting_date desc")

	def test_parse_options_order_by_multiple(self):
		parsed = parse_options("doctype: ToDo\nlink: none\norder_by: status asc, modified desc")
		self.assertTrue(parsed.skip_parent_link)
		self.assertEqual(parsed.order_by, "status asc, modified desc")

	def test_parse_options_rejects_empty(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("")
		with self.assertRaises(frappe.ValidationError):
			parse_options("   \n  ")

	def test_parse_options_rejects_bare_line(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("Sales Invoice")
		with self.assertRaises(frappe.ValidationError):
			parse_options("doctype: Sales Invoice\ncustomer")

	def test_parse_options_rejects_unknown_directive(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("doctype: Sales Invoice\nfoo: bar")

	def test_parse_options_requires_doctype(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("link: none\ncolumns: status")

	def test_parse_options_page_settings(self):
		parsed = parse_options(
			"doctype: ToDo\nlink: none\npage_size: 10\npage_size_max: 50\nvisible_rows: 8\npagination: pages"
		)
		self.assertEqual(parsed.page_size, 10)
		self.assertEqual(parsed.page_size_max, 50)
		self.assertEqual(parsed.visible_rows, 8)
		self.assertEqual(parsed.pagination, "pages")

	def test_parse_options_pagination_defaults_none(self):
		parsed = parse_options("doctype: ToDo\nlink: none")
		self.assertIsNone(parsed.page_size)
		self.assertIsNone(parsed.page_size_max)
		self.assertIsNone(parsed.visible_rows)
		self.assertIsNone(parsed.pagination)

	def test_parse_options_pagination_none(self):
		parsed = parse_options("doctype: ToDo\nlink: none\npagination: none")
		self.assertEqual(parsed.pagination, "none")

	def test_parse_options_pagination_case_insensitive(self):
		parsed = parse_options("doctype: ToDo\nlink: none\nPagination: Pages")
		self.assertEqual(parsed.pagination, "pages")

	def test_parse_options_rejects_invalid_pagination(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("doctype: ToDo\nlink: none\npagination: load_more")

	def test_parse_options_rejects_page_size_over_max(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("doctype: ToDo\nlink: none\npage_size: 50\npage_size_max: 20")

	def test_parse_options_rejects_page_size_over_hard_max(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("doctype: ToDo\nlink: none\npage_size: 501")

	def test_parse_options_rejects_visible_rows_over_max(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("doctype: ToDo\nlink: none\nvisible_rows: 51")

	def test_parse_options_rejects_duplicate_page_size(self):
		with self.assertRaises(frappe.ValidationError):
			parse_options("doctype: ToDo\nlink: none\npage_size: 10\npage_size: 20")

	def test_resolve_page_settings_defaults(self):
		from ui_styles.doc_table.parse import resolve_page_settings

		parsed = parse_options("doctype: ToDo\nlink: none")
		page_size, page_size_max, visible_rows, pagination = resolve_page_settings(parsed)
		self.assertEqual(page_size, 20)
		self.assertEqual(page_size_max, 100)
		self.assertEqual(visible_rows, 5)
		self.assertEqual(pagination, "none")

	def test_resolve_fetch_limit_by_pagination(self):
		from ui_styles.doc_table.parse import resolve_fetch_limit

		self.assertEqual(resolve_fetch_limit(20, 5, "none"), 20)
		self.assertEqual(resolve_fetch_limit(20, 5, "pages"), 5)
		self.assertEqual(resolve_fetch_limit(50, 8, "pages"), 8)


class TestDocTableLinks(IntegrationTestCase):
	# Frappe core DocTypes only - CI installs ui_styles without ERPNext.
	_target_doctype = "Route History"
	_parent_doctype = "User"
	_link_fieldname = "user"

	def setUp(self):
		super().setUp()
		# Prior interrupted runs can leave ambiguous Link Custom Fields on Route History.
		leftovers = frappe.get_all(
			"Custom Field",
			filters={
				"dt": self._target_doctype,
				"fieldname": ("like", "custom_dt_%"),
			},
			pluck="name",
		)
		for name in leftovers:
			frappe.delete_doc("Custom Field", name, force=True)
		if leftovers:
			frappe.clear_cache(doctype=self._target_doctype)

	def test_resolve_explicit_customer_link(self):
		from ui_styles.doc_table.parse import resolve_link_fields

		self.assertEqual(
			resolve_link_fields(
				self._target_doctype,
				self._parent_doctype,
				self._link_fieldname,
			),
			[self._link_fieldname],
		)

	def test_resolve_auto_detect_single_link(self):
		from ui_styles.doc_table.parse import resolve_link_fields

		self.assertEqual(
			resolve_link_fields(self._target_doctype, self._parent_doctype),
			[self._link_fieldname],
		)

	def test_resolve_explicit_link_must_point_at_parent(self):
		from ui_styles.doc_table.parse import resolve_link_fields

		with self.assertRaises(frappe.ValidationError):
			# ref_doctype is a Link, but to DocType - not User
			resolve_link_fields("Document Follow", self._parent_doctype, "ref_doctype")

	def test_resolve_link_none(self):
		from ui_styles.doc_table.parse import resolve_link_fields

		self.assertEqual(
			resolve_link_fields(
				self._target_doctype,
				self._parent_doctype,
				skip_parent_link=True,
			),
			[],
		)

	def test_resolve_rejects_ambiguous_auto_detect(self):
		from ui_styles.doc_table.parse import resolve_link_fields

		fieldname = f"custom_dt_ambig_{frappe.generate_hash(length=8)}"
		cf_name = None
		try:
			cf = frappe.get_doc(
				doctype="Custom Field",
				dt=self._target_doctype,
				fieldname=fieldname,
				label="Doc Table Test User",
				fieldtype="Link",
				options=self._parent_doctype,
				insert_after=self._link_fieldname,
			).insert()
			cf_name = cf.name
			frappe.clear_cache(doctype=self._target_doctype)
			with self.assertRaises(frappe.ValidationError):
				resolve_link_fields(self._target_doctype, self._parent_doctype)
		finally:
			if cf_name and frappe.db.exists("Custom Field", cf_name):
				frappe.delete_doc("Custom Field", cf_name)
				frappe.clear_cache(doctype=self._target_doctype)


class TestDocTableValidate(IntegrationTestCase):
	def test_rejects_single_doctype(self):
		from ui_styles.doc_table.parse import validate_doc_table_field

		df = frappe._dict(
			fieldtype="Doc Table",
			options="doctype: System Settings\nlink: none",
		)
		with self.assertRaises(frappe.ValidationError):
			validate_doc_table_field(df, parent_doctype="User")

	def test_rejects_virtual_doctype(self):
		from ui_styles.doc_table.parse import validate_doc_table_field

		virtual = frappe.db.get_value("DocType", {"is_virtual": 1, "istable": 0}, "name")
		if not virtual:
			self.skipTest("No virtual DocType installed")
		df = frappe._dict(
			fieldtype="Doc Table",
			options=f"doctype: {virtual}\nlink: none",
		)
		with self.assertRaises(frappe.ValidationError):
			validate_doc_table_field(df, parent_doctype="User")


class TestDocTableCount(IntegrationTestCase):
	def test_count_rows_returns_int_for_todo(self):
		from ui_styles.doc_table.api import _count_rows

		total = _count_rows("ToDo", {"filters": [["status", "=", "Open"]]})
		self.assertIsInstance(total, int)
		self.assertGreaterEqual(total, 0)

	def test_count_rows_single_does_not_raise(self):
		from ui_styles.doc_table.api import _count_rows

		self.assertEqual(_count_rows("System Settings", {}), 0)


class TestDocTableRegister(IntegrationTestCase):
	def tearDown(self):
		from ui_styles.doc_table.register import ensure_fieldtype_options

		ensure_fieldtype_options()
		super().tearDown()

	def _replace_fieldtype_options_setter(self, doctype: str, options: str, module: str = ""):
		from frappe.custom.doctype.property_setter.property_setter import make_property_setter

		ps_name = f"{doctype}-fieldtype-options"
		if frappe.db.exists("Property Setter", ps_name):
			frappe.delete_doc("Property Setter", ps_name, ignore_permissions=True, force=True)
		frappe.clear_cache(doctype=doctype)
		make_property_setter(
			doctype,
			"fieldtype",
			"options",
			options,
			"Text",
			validate_fields_for_doctype=False,
			is_system_generated=False,
		)
		frappe.db.set_value("Property Setter", ps_name, "module", module, update_modified=False)
		frappe.clear_cache(doctype=doctype)
		return ps_name

	def test_install_skips_foreign_fieldtype_options(self):
		from ui_styles.doc_table import FIELDTYPE
		from ui_styles.doc_table.register import _ensure_options_contain, _remove_option_value

		doctype = "Custom Field"
		marker = "ZZZ Doc Table Test Type"
		meta = frappe.get_meta(doctype, cached=False)
		base_options = meta.get_field("fieldtype").options or ""
		# Ensure Doc Table is not already present so install would want to write.
		base_without = "\n".join(opt for opt in base_options.split("\n") if opt != FIELDTYPE)
		custom_options = base_without + "\n" + marker
		ps_name = self._replace_fieldtype_options_setter(doctype, custom_options)

		try:
			_ensure_options_contain(doctype, "fieldtype", FIELDTYPE)
			frappe.clear_cache(doctype=doctype)
			value_after_install = frappe.db.get_value("Property Setter", ps_name, "value")
			module_after = frappe.db.get_value("Property Setter", ps_name, "module")
			# Must not overwrite or claim a pre-existing foreign setter.
			self.assertNotIn(FIELDTYPE, (value_after_install or "").split("\n"))
			self.assertIn(marker, (value_after_install or "").split("\n"))
			self.assertEqual(module_after or "", "")
			_remove_option_value(doctype, "fieldtype", FIELDTYPE)
			self.assertTrue(frappe.db.exists("Property Setter", ps_name))
			self.assertEqual(
				frappe.db.get_value("Property Setter", ps_name, "value"),
				value_after_install,
			)
		finally:
			if frappe.db.exists("Property Setter", ps_name):
				frappe.delete_doc("Property Setter", ps_name, ignore_permissions=True, force=True)
			frappe.clear_cache(doctype=doctype)

	def test_uninstall_does_not_delete_foreign_stock_matching_options(self):
		"""Foreign setter that equals stock + Doc Table must survive uninstall."""
		from ui_styles.doc_table import FIELDTYPE
		from ui_styles.doc_table.register import _remove_option_value

		doctype = "Custom Field"
		stock_options = (
			frappe.db.get_value("DocField", {"parent": doctype, "fieldname": "fieldtype"}, "options") or ""
		)
		# Pre-existing setter already contains Doc Table and otherwise matches stock.
		options = stock_options.split("\n")
		if FIELDTYPE not in options:
			insert_at = len(options)
			for idx, opt in enumerate(options):
				if opt and opt.lower() > FIELDTYPE.lower():
					insert_at = idx
					break
			options.insert(insert_at, FIELDTYPE)
		ps_name = self._replace_fieldtype_options_setter(doctype, "\n".join(options))

		try:
			_remove_option_value(doctype, "fieldtype", FIELDTYPE)
			self.assertTrue(frappe.db.exists("Property Setter", ps_name))
			self.assertIn(
				FIELDTYPE,
				(frappe.db.get_value("Property Setter", ps_name, "value") or "").split("\n"),
			)
			self.assertEqual(frappe.db.get_value("Property Setter", ps_name, "module") or "", "")
		finally:
			if frappe.db.exists("Property Setter", ps_name):
				frappe.delete_doc("Property Setter", ps_name, ignore_permissions=True, force=True)
			frappe.clear_cache(doctype=doctype)

	def test_uninstall_does_not_delete_foreign_link_filters_depends_on(self):
		from frappe.custom.doctype.property_setter.property_setter import make_property_setter

		from ui_styles.doc_table.register import (
			_LINK_FILTERS_DEPENDS_ON,
			_remove_link_filters_depends_on,
		)

		doctype = "Custom Field"
		ps_name = f"{doctype}-link_filters-depends_on"
		if frappe.db.exists("Property Setter", ps_name):
			frappe.delete_doc("Property Setter", ps_name, ignore_permissions=True, force=True)
		frappe.clear_cache(doctype=doctype)

		make_property_setter(
			doctype,
			"link_filters",
			"depends_on",
			_LINK_FILTERS_DEPENDS_ON,
			"Data",
			validate_fields_for_doctype=False,
			is_system_generated=False,
		)
		frappe.db.set_value("Property Setter", ps_name, "module", "", update_modified=False)
		frappe.clear_cache(doctype=doctype)

		try:
			_remove_link_filters_depends_on(doctype)
			self.assertTrue(frappe.db.exists("Property Setter", ps_name))
			self.assertEqual(
				frappe.db.get_value("Property Setter", ps_name, "value"),
				_LINK_FILTERS_DEPENDS_ON,
			)
		finally:
			if frappe.db.exists("Property Setter", ps_name):
				frappe.delete_doc("Property Setter", ps_name, ignore_permissions=True, force=True)
			frappe.clear_cache(doctype=doctype)
