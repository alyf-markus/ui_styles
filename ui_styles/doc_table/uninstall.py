# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe

from ui_styles.doc_table import FIELDTYPE
from ui_styles.doc_table.register import remove_fieldtype_options


def before_uninstall() -> None:
	remove_fieldtype_options()
	# Leave existing Doc Table fields in place but warn if any remain.
	remaining = frappe.db.count("Custom Field", {"fieldtype": FIELDTYPE})
	if remaining:
		frappe.msgprint(
			f"Left {remaining} Custom Field(s) with fieldtype Doc Table. Change or remove them manually.",
			alert=True,
		)
