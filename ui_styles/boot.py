# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

"""Aggregate extend_bootinfo from each UI Styles module."""

from ui_styles.desk_background.boot import extend_bootinfo as desk_background_extend_bootinfo
from ui_styles.list_scroll.boot import extend_bootinfo as list_scroll_extend_bootinfo
from ui_styles.remix.boot import extend_bootinfo as remix_extend_bootinfo


def extend_bootinfo(bootinfo):
	# desk_background:
	desk_background_extend_bootinfo(bootinfo)
	# list_scroll:
	list_scroll_extend_bootinfo(bootinfo)
	# remix:
	remix_extend_bootinfo(bootinfo)
