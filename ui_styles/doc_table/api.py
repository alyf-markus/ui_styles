# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint

from ui_styles.doc_table import FIELDTYPE
from ui_styles.doc_table.parse import (
	parse_options,
	resolve_columns,
	resolve_fetch_limit,
	resolve_link_fields,
	resolve_order_by,
	resolve_page_settings,
	validate_doc_table_field,
)


def validate_doctype(doc, method: str | None = None) -> None:
	for df in doc.get("fields") or []:
		validate_doc_table_field(df, parent_doctype=doc.name)


def validate_custom_field(doc, method: str | None = None) -> None:
	validate_doc_table_field(doc, parent_doctype=doc.dt)


def validate_customize_form(doc, method: str | None = None) -> None:
	for df in doc.get("fields") or []:
		validate_doc_table_field(df, parent_doctype=doc.doc_type)


@frappe.whitelist(methods=["GET"])
@frappe.read_only()
def get_doc_table_data(
	parent_doctype: str,
	parent_name: str,
	fieldname: str,
	limit: int | None = None,
	start: int | None = None,
	extra_filters: str | list | None = None,
) -> dict:
	"""Return columns and rows for a **Doc Table** field on a parent form.

	*Options* and *Filters* come from the parent field definition (not the
	caller). *extra_filters* may only supply resolved values for configured
	``eval:`` filter rows.
	"""
	if not parent_doctype or not parent_name:
		frappe.throw(_("Parent document is required"))
	if not fieldname:
		frappe.throw(_("Fieldname is required"))

	frappe.has_permission(parent_doctype, "read", doc=parent_name, throw=True)
	df = _get_readable_doc_table_field(parent_doctype, fieldname)

	parsed = parse_options(df.options)
	frappe.has_permission(parsed.doctype, "read", throw=True)

	link_fields = resolve_link_fields(
		parsed.doctype,
		parent_doctype,
		parsed.link_fieldname,
		skip_parent_link=parsed.skip_parent_link,
	)

	meta = frappe.get_meta(parsed.doctype)
	title_field = meta.get_title_field()
	display_fields = resolve_columns(meta, parsed.columns, title_field)
	order_by = resolve_order_by(meta, parsed.order_by)

	# Always fetch name for routing; avoid duplicate select fields.
	fetch_fields = ["name", "modified", *display_fields]
	for col_fieldname in display_fields:
		col_df = meta.get_field(col_fieldname)
		if (
			col_df
			and col_df.fieldtype == "Currency"
			and col_df.options
			and ":" not in col_df.options
			and col_df.options not in fetch_fields
		):
			fetch_fields.append(col_df.options)

	seen = set()
	fetch_fields = [f for f in fetch_fields if not (f in seen or seen.add(f))]

	page_size, page_size_max, visible_rows, pagination = resolve_page_settings(parsed)
	# Options decide fetch size; `limit` arg kept for call compatibility.
	# pages mode steps by visible_rows; none mode uses page_size (Load More).
	limit = resolve_fetch_limit(page_size, visible_rows, pagination)
	start = max(cint(start) or 0, 0)

	list_kwargs = {
		"fields": fetch_fields,
		"order_by": order_by,
		"limit_start": start,
		# Fetch one extra row to detect whether another page exists.
		"limit_page_length": limit + 1,
		"ignore_permissions": False,
	}
	_apply_parent_link_filters(list_kwargs, link_fields, parent_name)
	_apply_extra_filters(
		list_kwargs,
		meta,
		_resolve_extra_filters(df, extra_filters),
	)

	fetched = frappe.get_list(parsed.doctype, **list_kwargs)
	has_more = len(fetched) > limit
	rows = fetched[:limit]

	columns = _build_columns(meta, display_fields)
	total = _count_rows(parsed.doctype, list_kwargs)

	return {
		"doctype": parsed.doctype,
		"title_field": title_field,
		"link_fields": link_fields,
		"columns": columns,
		"rows": rows,
		"limit": limit,
		"start": start,
		"has_more": has_more,
		"total": total,
		"page_size": page_size,
		"page_size_max": page_size_max,
		"visible_rows": visible_rows,
		"pagination": pagination,
	}


_ALLOWED_FILTER_OPERATORS = frozenset(
	{
		"=",
		"!=",
		">",
		"<",
		">=",
		"<=",
		"like",
		"not like",
		"in",
		"not in",
		"is",
		"Between",
		"Timespan",
	}
)


def _get_readable_doc_table_field(parent_doctype: str, fieldname: str):
	"""Return the parent **Doc Table** field if the user may read its permlevel."""
	parent_meta = frappe.get_meta(parent_doctype)
	df = parent_meta.get_field(fieldname)
	if not df or getattr(df, "fieldtype", None) != FIELDTYPE:
		frappe.throw(
			_("Field {0} is not a Doc Table on {1}").format(
				frappe.bold(fieldname), frappe.bold(parent_doctype)
			)
		)

	permlevel = cint(df.permlevel)
	if permlevel and permlevel not in parent_meta.get_permlevel_access("read"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	return df


def _configured_filter_rows(df) -> list[tuple[str, str, object, bool]]:
	"""Return configured *Filters* as ``(fieldname, operator, value, is_eval)``."""
	raw = df.get("link_filters")
	if not raw:
		return []

	parsed = frappe.parse_json(raw) if isinstance(raw, str) else raw
	if not isinstance(parsed, list):
		return []

	rows = []
	for filter_row in parsed:
		if not isinstance(filter_row, list | tuple) or len(filter_row) not in (3, 4):
			continue
		if len(filter_row) == 4:
			_doctype, fname, operator, value = filter_row
		else:
			fname, operator, value = filter_row
		is_eval = isinstance(value, str) and value.startswith("eval:")
		rows.append((fname, operator, value, is_eval))
	return rows


def _resolve_extra_filters(df, extra_filters: str | list | None) -> list[list]:
	"""Build filters from field *Filters*; accept client values only for ``eval:`` rows."""
	configured = _configured_filter_rows(df)
	client_values = _client_filter_value_map(extra_filters)

	configured_keys = {(fname, operator) for fname, operator, _value, _is_eval in configured}
	for key in client_values:
		if key not in configured_keys:
			frappe.throw(_("Invalid Doc Table filter"))

	rows = []
	for fname, operator, value, is_eval in configured:
		if is_eval:
			if (fname, operator) not in client_values:
				# Client must resolve eval filters from the open form.
				continue
			rows.append([fname, operator, client_values[(fname, operator)]])
		else:
			rows.append([fname, operator, value])
	return rows


def _client_filter_value_map(extra_filters: str | list | None) -> dict[tuple[str, str], object]:
	if not extra_filters:
		return {}
	if isinstance(extra_filters, str):
		extra_filters = frappe.parse_json(extra_filters)
	if not isinstance(extra_filters, list):
		return {}

	values = {}
	for filter_row in extra_filters:
		if not isinstance(filter_row, list | tuple) or len(filter_row) < 3:
			frappe.throw(_("Invalid Doc Table filter"))
		fname, operator, value = filter_row[0], filter_row[1], filter_row[2]
		values[(fname, operator)] = value
	return values


def _apply_parent_link_filters(list_kwargs: dict, link_fields: list[str], parent_name: str) -> None:
	if not link_fields:
		# Options used ``link: none`` - rely on field *Filters* only.
		return
	# resolve_link_fields guarantees at most one Link field.
	list_kwargs["filters"] = [[link_fields[0], "=", parent_name]]


def _count_rows(doctype: str, list_kwargs: dict) -> int:
	"""Count matching rows with the same filters / permissions as the page query."""
	from frappe.model.utils import is_virtual_doctype

	# Single / virtual targets are rejected on save. Keep the request alive for legacy fields.
	if frappe.get_meta(doctype).issingle:
		return 0
	if is_virtual_doctype(doctype):
		return _count_rows_via_list(doctype, list_kwargs)

	args = {
		"fields": [{"COUNT": "name", "as": "total"}],
		"ignore_permissions": False,
		"limit_page_length": None,
		"order_by": None,
	}
	if list_kwargs.get("filters"):
		args["filters"] = list_kwargs["filters"]
	if list_kwargs.get("or_filters"):
		args["or_filters"] = list_kwargs["or_filters"]

	result = frappe.get_list(doctype, **args)
	if not result:
		return 0
	return cint(result[0].total)


def _count_rows_via_list(doctype: str, list_kwargs: dict) -> int:
	"""Count via get_list when DatabaseQuery cannot return SQL (virtual DocTypes)."""
	args = {
		"fields": ["name"],
		"ignore_permissions": False,
		"limit_page_length": 10000,
	}
	if list_kwargs.get("filters"):
		args["filters"] = list_kwargs["filters"]
	if list_kwargs.get("or_filters"):
		args["or_filters"] = list_kwargs["or_filters"]
	return len(frappe.get_list(doctype, **args))


def _apply_extra_filters(list_kwargs: dict, meta, extra_filters: list) -> None:
	if not extra_filters:
		return

	normalized = []
	for filter_row in extra_filters:
		if not isinstance(filter_row, list | tuple) or len(filter_row) < 3:
			frappe.throw(_("Invalid Doc Table filter"))
		fieldname, operator, value = filter_row[0], filter_row[1], filter_row[2]
		if fieldname != "name" and not meta.get_field(fieldname):
			frappe.throw(
				_("Doc Table filter field {0} is not valid on {1}").format(
					frappe.bold(fieldname), frappe.bold(meta.name)
				)
			)
		if operator not in _ALLOWED_FILTER_OPERATORS:
			frappe.throw(_("Invalid Doc Table filter operator: {0}").format(frappe.bold(operator)))
		normalized.append([fieldname, operator, value])

	existing = list_kwargs.get("filters") or []
	if isinstance(existing, dict):
		existing = [[key, "=", val] for key, val in existing.items()]
	list_kwargs["filters"] = [*existing, *normalized]


def _build_columns(meta, display_fields: list[str]) -> list[dict]:
	columns = []
	for fieldname in display_fields:
		if fieldname == "name":
			columns.append(_column_dict("name", _("ID")))
			continue
		df = meta.get_field(fieldname)
		columns.append(
			_column_dict(
				fieldname,
				_(df.label) if df else fieldname,
				fieldtype=df.fieldtype if df else "Data",
				options=df.options if df else None,
			)
		)

	# No list-view / Options columns: fall back to ID so the grid is usable.
	if not columns:
		columns.append(_column_dict("name", _("ID")))

	return columns


def _column_dict(
	fieldname: str,
	label: str,
	fieldtype: str = "Data",
	options: str | None = None,
) -> dict:
	column = {
		"id": fieldname,
		"name": label,
		"fieldtype": fieldtype,
		"options": options,
		"editable": False,
		"focusable": False,
		# Read-only viewer: hide header chevron menu (overlaps right-aligned labels).
		"dropdown": False,
		"sortable": False,
		"resizable": True,
	}
	if fieldtype in {"Currency", "Float", "Int", "Percent"}:
		column["align"] = "right"
	return column
