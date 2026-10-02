frappe.provide("ui_styles.doc_table");

/**
 * Form Builder has no DocTableControl in core Frappe. Register DataControl so
 * label / add / delete actions render, then replace the input with a static
 * dummy table preview (no DocType lookups, no MutationObserver).
 */
(function () {
	const FIELDTYPE = "Doc Table";

	function find_df_in_layout(layout, fieldname) {
		if (!layout || !layout.tabs) {
			return null;
		}
		for (const tab of layout.tabs) {
			for (const section of tab.sections || []) {
				for (const column of section.columns || []) {
					for (const field of column.fields || []) {
						if (field.df && field.df.fieldname === fieldname) {
							return field.df;
						}
					}
				}
			}
		}
		return null;
	}

	function open_filters_dialog(df) {
		const doctype = ui_styles.doc_table.parse_doctype_from_options(df.options || "");
		if (!doctype) {
			frappe.throw({
				message: __("Please set Options to a DocType before setting filters"),
				title: __("DocType Missing"),
			});
		}

		const dialog = new frappe.ui.Dialog({
			title: __("Set Filters"),
			fields: [{ fieldtype: "HTML", fieldname: "filter_area" }],
			primary_action_label: __("Apply"),
			primary_action: () => {
				const filters = filter_group.get_filters().map((filter) => {
					filter.pop();
					filter[0] = doctype;
					return filter;
				});
				df.link_filters = JSON.stringify(filters);
				if (frappe.form_builder && frappe.form_builder.store) {
					frappe.form_builder.store.form.selected_field = df;
					frappe.form_builder.store.dirty = true;
				}
				dialog.hide();
				paint_doc_table_fields(frappe.form_builder);
			},
		});

		const filter_group = new frappe.ui.FilterGroup({
			parent: dialog.get_field("filter_area").$wrapper,
			doctype: doctype,
			on_change: () => {},
		});

		frappe.model.with_doctype(doctype, () => {
			dialog.show();
			if (!df.link_filters) {
				return;
			}
			try {
				const existing = JSON.parse(df.link_filters);
				if (existing && existing.length) {
					filter_group.add_filters_to_filter_group(existing);
				}
			} catch (e) {
				console.error("Invalid Doc Table link_filters", e);
			}
		});
	}

	function has_filters(df) {
		if (!df || !df.link_filters) {
			return false;
		}
		try {
			const filters = JSON.parse(df.link_filters);
			return Array.isArray(filters) && filters.length > 0;
		} catch (e) {
			return false;
		}
	}

	function dummy_table_html(filters_applied) {
		const columns = [__("ID"), __("Column 1"), __("Column 2"), __("Column 3")];
		const heads = columns
			.map(
				(label) =>
					`<div class="doc-table-builder-col">${frappe.utils.escape_html(label)}</div>`
			)
			.join("");
		const applied = filters_applied ? " btn-filter-applied" : "";
		// Icon-only control (same as Form Builder Link fields). Kept on the
		// preview so Vue does not wipe it when re-rendering .field-actions.
		return `<div class="doc-table-builder-preview form-grid">
			<div class="doc-table-builder-head grid-heading-row">
				<div class="doc-table-builder-cols">${heads}</div>
				<button type="button" class="btn btn-xs btn-icon doc-table-filter-btn${applied}" title="${__(
					"Set Filters"
				)}">
					<div>${frappe.utils.icon("filter", "sm")}</div>
				</button>
			</div>
			<div class="doc-table-builder-body text-muted text-center">${__("No Data")}</div>
		</div>`;
	}

	function bind_filter_button($btn, $control, store) {
		if ($btn.data("doc-table-filter-bound")) {
			return;
		}
		$btn.data("doc-table-filter-bound", true);
		$btn.on("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const current = find_df_in_layout(
				store && store.form && store.form.layout,
				$control.attr("data-fieldname")
			);
			if (!current || current.fieldtype !== FIELDTYPE) {
				return;
			}
			open_filters_dialog(current);
		});
	}

	function paint_doc_table_fields(form_builder) {
		if (!form_builder || !form_builder.$wrapper) {
			return;
		}
		const store = form_builder.store;
		const layout = store && store.form && store.form.layout;

		form_builder.$wrapper.find('[data-fieldtype="Doc Table"]').each(function () {
			const $control = $(this);
			const fieldname = $control.attr("data-fieldname");
			const df = find_df_in_layout(layout, fieldname);
			const applied = has_filters(df);

			if (!$control.find(".doc-table-builder-preview").length) {
				const $input = $control.find("input.form-control").first();
				const $preview = $(dummy_table_html(applied));
				if ($input.length) {
					$input.replaceWith($preview);
				} else {
					$control.append($preview);
				}
			}

			const $btn = $control.find(".doc-table-filter-btn").first();
			if ($btn.length) {
				$btn.toggleClass("btn-filter-applied", applied);
				bind_filter_button($btn, $control, store);
			}
		});
	}

	function schedule_paint(form_builder, delays) {
		(delays || [0, 50, 150, 400]).forEach((ms) => {
			setTimeout(() => paint_doc_table_fields(form_builder), ms);
		});
	}

	function register_doc_table_control(form_builder) {
		const app =
			form_builder &&
			form_builder.$form_builder &&
			form_builder.$form_builder.$ &&
			form_builder.$form_builder.$.appContext &&
			form_builder.$form_builder.$.appContext.app;
		if (!app) {
			return false;
		}
		if (app._context.components.DocTableControl) {
			return true;
		}

		const DataControl = app._context.components.DataControl;
		if (!DataControl) {
			return false;
		}

		app.component("DocTableControl", DataControl);
		return true;
	}

	function enhance_form_builder(form_builder) {
		if (!form_builder) {
			return;
		}

		const registered = register_doc_table_control(form_builder);
		if (registered && !form_builder.__doc_table_refetched) {
			form_builder.__doc_table_refetched = true;
			const done = () => schedule_paint(form_builder);
			if (form_builder.store && form_builder.store.fetch) {
				Promise.resolve(form_builder.store.fetch()).finally(done);
			} else {
				done();
			}
			return;
		}

		schedule_paint(form_builder);
	}

	function patch_form_builder_class() {
		if (!frappe.ui || !frappe.ui.FormBuilder || frappe.ui.FormBuilder.__doc_table_patched) {
			return Boolean(frappe.ui && frappe.ui.FormBuilder);
		}
		frappe.ui.FormBuilder.__doc_table_patched = true;

		const proto = frappe.ui.FormBuilder.prototype;
		const _setup_app = proto.setup_app;
		proto.setup_app = function () {
			_setup_app.apply(this, arguments);
			enhance_form_builder(this);
		};

		const _init = proto.init;
		proto.init = function (refresh) {
			_init.apply(this, arguments);
			if (refresh) {
				enhance_form_builder(this);
			}
		};

		return true;
	}

	function install() {
		if (patch_form_builder_class()) {
			if (frappe.form_builder) {
				enhance_form_builder(frappe.form_builder);
			}
			return;
		}

		const orig_require = frappe.require.bind(frappe);
		frappe.require = function (modules, callback) {
			const result = orig_require(modules, callback);
			const names = Array.isArray(modules) ? modules : [modules];
			const wants_form_builder = names.some((name) =>
				String(name).includes("form_builder.bundle")
			);
			if (!wants_form_builder) {
				return result;
			}

			const after = (value) => {
				patch_form_builder_class();
				return value;
			};

			if (result && typeof result.then === "function") {
				return result.then(after);
			}
			after();
			return result;
		};
	}

	ui_styles.doc_table.install_form_builder_preview = install;
	install();
})();
