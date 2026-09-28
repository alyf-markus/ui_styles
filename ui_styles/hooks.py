app_name = "ui_styles"
app_title = "UI Styles"
app_publisher = "ALYF GmbH"
app_description = "Adds various style and UI features to Frappe/ERPNext"
app_email = "hallo@alyf.de"
app_license = "gpl-3.0"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "ui_styles",
# 		"logo": "/assets/ui_styles/logo.png",
# 		"title": "UI Styles",
# 		"route": "/ui_styles",
# 		"has_permission": "ui_styles.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# doc_table, desk_background, list_scroll, remix: imported by the app bundles.
app_include_css = "ui_styles.bundle.css"
app_include_js = "ui_styles.bundle.js"

# include js, css files in header of web template
# web_include_css = "/assets/ui_styles/css/ui_styles.css"
# web_include_js = "/assets/ui_styles/js/ui_styles.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "ui_styles/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
	# desk_background:
	"User": "desk_background/user_form.js",
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "ui_styles/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "ui_styles.utils.jinja_methods",
# 	"filters": "ui_styles.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "ui_styles.install.before_install"
# Aggregates per-module after_install (see install.py).
after_install = "ui_styles.install.after_install"

# Aggregates per-module extend_bootinfo (see boot.py).
extend_bootinfo = "ui_styles.boot.extend_bootinfo"

# remix:
website_route_rules = [
	{"from_route": "/remix/<path:app_path>", "to_route": "remix"},
]

# Uninstallation
# ------------

# Aggregates per-module before_uninstall (see uninstall.py).
before_uninstall = "ui_styles.uninstall.before_uninstall"
# after_uninstall = "ui_styles.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "ui_styles.utils.before_app_install"
# after_app_install = "ui_styles.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "ui_styles.utils.before_app_uninstall"
# after_app_uninstall = "ui_styles.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "ui_styles.notifications.get_notification_config"

# Awesome Bar
# -----------
# Extra search results: list of dicts with label, description, route, index.
# route: ["List", "ToDo"], "/desk/docs/some/page", or "https://example.com"
# awesomebar_search = ["ui_styles.search.awesomebar_results"]

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	# doc_table:
	"DocType": {
		"validate": "ui_styles.doc_table.api.validate_doctype",
	},
	"Custom Field": {
		"validate": "ui_styles.doc_table.api.validate_custom_field",
	},
	"Customize Form": {
		"validate": "ui_styles.doc_table.api.validate_customize_form",
	},
	# desk_background:
	"User": {
		"validate": "ui_styles.desk_background.user.validate_user_desk_color",
	},
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"ui_styles.tasks.all"
# 	],
# 	"daily": [
# 		"ui_styles.tasks.daily"
# 	],
# 	"hourly": [
# 		"ui_styles.tasks.hourly"
# 	],
# 	"weekly": [
# 		"ui_styles.tasks.weekly"
# 	],
# 	"monthly": [
# 		"ui_styles.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "ui_styles.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "ui_styles.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "ui_styles.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["ui_styles.utils.before_request"]
# after_request = ["ui_styles.utils.after_request"]

# Job Events
# ----------
# before_job = ["ui_styles.utils.before_job"]
# after_job = ["ui_styles.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"ui_styles.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
ignore_translatable_strings_from = ["frappe", "erpnext"]

# doc_table: register fieldtype with Frappe model lists for this process.
from ui_styles.doc_table.register import register as _register_doc_table

_register_doc_table()
