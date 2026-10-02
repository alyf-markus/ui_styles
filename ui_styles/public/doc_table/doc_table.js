frappe.provide("ui_styles.doc_table");

ui_styles.doc_table.FIELDTYPE = "Doc Table";
ui_styles.doc_table.DEFAULT_PAGE_SIZE = 20;
ui_styles.doc_table.DEFAULT_PAGE_SIZE_MAX = 100;
ui_styles.doc_table.DEFAULT_VISIBLE_ROWS = 5;
ui_styles.doc_table.DEFAULT_PAGINATION = "none";

ui_styles.doc_table.parse_doctype_from_options = function (value) {
	if (typeof value !== "string" || !value) {
		return "";
	}
	for (const line of value.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed) {
			continue;
		}
		const sep = trimmed.indexOf(":");
		if (sep < 0) {
			continue;
		}
		const key = trimmed.slice(0, sep).trim().toLowerCase().replace(/\s+/g, "_");
		if (key === "doctype") {
			return trimmed.slice(sep + 1).trim();
		}
	}
	return "";
};

ui_styles.doc_table.parse_link_from_options = function (value) {
	if (typeof value !== "string" || !value) {
		return { skip_parent_link: false, link_fieldname: null };
	}
	let skip_parent_link = false;
	let link_fieldname = null;
	for (const line of value.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed) {
			continue;
		}
		const sep = trimmed.indexOf(":");
		if (sep < 0) {
			continue;
		}
		const key = trimmed.slice(0, sep).trim().toLowerCase().replace(/\s+/g, "_");
		if (key !== "link") {
			continue;
		}
		const link_value = trimmed.slice(sep + 1).trim();
		if (link_value.toLowerCase() === "none") {
			skip_parent_link = true;
			link_fieldname = null;
		} else {
			skip_parent_link = false;
			link_fieldname = link_value;
		}
	}
	return { skip_parent_link, link_fieldname };
};

(function () {
	function register_client_fieldtype() {
		if (!frappe.model.all_fieldtypes.includes(ui_styles.doc_table.FIELDTYPE)) {
			frappe.model.all_fieldtypes.push(ui_styles.doc_table.FIELDTYPE);
			frappe.model.all_fieldtypes.sort((a, b) =>
				a.toLowerCase().localeCompare(b.toLowerCase())
			);
		}
		if (!frappe.model.no_value_type.includes(ui_styles.doc_table.FIELDTYPE)) {
			frappe.model.no_value_type.push(ui_styles.doc_table.FIELDTYPE);
		}
	}

	register_client_fieldtype();
})();

frappe.ui.form.ControlDocTable = class ControlDocTable extends frappe.ui.form.Control {
	make() {
		super.make();
		this.$wrapper.addClass("doc-table-control");
		this._rows = [];
		this._has_more = false;
		this._loading_more = false;
		this._total = 0;
		this._page_index = 1;
		this._page_size = ui_styles.doc_table.DEFAULT_PAGE_SIZE;
		this._page_size_max = ui_styles.doc_table.DEFAULT_PAGE_SIZE_MAX;
		this._visible_rows = ui_styles.doc_table.DEFAULT_VISIBLE_ROWS;
		this._pagination = ui_styles.doc_table.DEFAULT_PAGINATION;
		this._load_promise = null;

		this.$header = $(
			`<div class="doc-table-header flex align-items-center justify-between">
				<label class="control-label"></label>
				<div class="doc-table-toolbar flex align-items-center"></div>
			</div>`
		).appendTo(this.$wrapper);
		this.$label_text = this.$header.find(".control-label");
		this.$toolbar = this.$header.find(".doc-table-toolbar");
		// Same shell as child tables (ControlTable / form-grid).
		this.$grid_container = $('<div class="form-grid-container"></div>').appendTo(
			this.$wrapper
		);
		this.$grid = $('<div class="form-grid doc-table-grid"></div>').appendTo(
			this.$grid_container
		);
		this.$footer = $(
			`<div class="doc-table-footer flex align-items-center justify-between">
				<span class="text-muted small doc-table-status"></span>
				<div class="doc-table-footer-actions flex align-items-center">
					<button class="btn btn-xs btn-default doc-table-load-more" type="button">${__(
						"Load More"
					)}</button>
					<div class="doc-table-pager btn-group" role="group">
						<button class="btn btn-secondary btn-xs doc-table-prev-page" type="button" title="${__(
							"Previous"
						)}">${frappe.utils.icon("left", "xs")}</button>
						<button class="btn btn-secondary btn-xs doc-table-next-page" type="button" title="${__(
							"Next"
						)}">${frappe.utils.icon("right", "xs")}</button>
					</div>
				</div>
			</div>`
		)
			.appendTo(this.$wrapper)
			.hide();
		this.$status = this.$footer.find(".doc-table-status");
		this.$load_more_btn = this.$footer.find(".doc-table-load-more");
		this.$pager = this.$footer.find(".doc-table-pager");
		this.$prev_btn = this.$footer.find(".doc-table-prev-page");
		this.$next_btn = this.$footer.find(".doc-table-next-page");
		this.$empty = $(
			`<div class="text-muted small doc-table-empty">${__("No linked documents")}</div>`
		)
			.appendTo(this.$wrapper)
			.hide();
		this.$error = $('<div class="text-danger small doc-table-error"></div>')
			.appendTo(this.$wrapper)
			.hide();

		this.make_toolbar();
		this.$load_more_btn.on("click", () => this.load_more());
		this.$prev_btn.on("click", () => this.go_to_prev_page());
		this.$next_btn.on("click", () => this.go_to_next_page());
		this.set_label();
	}

	make_toolbar() {
		this.$new_btn = $(
			`<button class="btn btn-xs btn-default doc-table-icon-btn" type="button" title="${__(
				"Add"
			)}">${frappe.utils.icon("add", "sm")}</button>`
		).appendTo(this.$toolbar);
		this.$refresh_btn = $(
			`<button class="btn btn-xs btn-default doc-table-icon-btn" type="button" title="${__(
				"Refresh"
			)}">${frappe.utils.icon("refresh", "sm")}</button>`
		).appendTo(this.$toolbar);
		this.$open_list_btn = $(
			`<button class="btn btn-xs btn-default doc-table-icon-btn" type="button" title="${__(
				"Open List"
			)}">${frappe.utils.icon("list", "sm")}</button>`
		).appendTo(this.$toolbar);

		this.$new_btn.on("click", () => this.new_doc());
		this.$refresh_btn.on("click", () => this.refresh_input());
		this.$open_list_btn.on("click", () => this.open_list());
	}

	set_label() {
		const label = __(this.df.label || this.df.fieldname || "");
		this.$label_text.text(label);
		this.$label_text.toggle(Boolean(label));
	}

	get_status(explain) {
		// is_virtual / null value would hide this like an empty Read field.
		// Keep Doc Table visible whenever the field is not explicitly hidden
		// and the user has permission (same idea as HTML / Button).
		if (cint(this.df.hidden)) {
			return "None";
		}
		if (cint(this.df.hidden_due_to_dependency)) {
			return "None";
		}

		const perm_status = frappe.perm.get_field_display_status(
			this.df,
			frappe.model.get_doc(this.doctype, this.docname),
			this.perm || (this.frm && this.frm.perm),
			explain
		);
		if (perm_status === "None") {
			return "None";
		}
		return "Read";
	}

	refresh() {
		this.set_label();
		super.refresh();
	}

	refresh_input() {
		if (!this.frm || this.frm.is_new() || !this.df.options) {
			this.render_empty(__("Save the document to load related rows."));
			return;
		}
		this._page_index = 1;
		this.load_rows({ reset: true });
	}

	is_pages_mode() {
		return this._pagination === "pages";
	}

	page_step() {
		// pages mode steps by visible_rows; Load More uses page_size.
		if (this.is_pages_mode()) {
			return this._visible_rows || ui_styles.doc_table.DEFAULT_VISIBLE_ROWS;
		}
		return this._page_size || ui_styles.doc_table.DEFAULT_PAGE_SIZE;
	}

	apply_paging_settings(data) {
		this._page_size = cint(data.page_size) || ui_styles.doc_table.DEFAULT_PAGE_SIZE;
		this._page_size_max =
			cint(data.page_size_max) || ui_styles.doc_table.DEFAULT_PAGE_SIZE_MAX;
		this._visible_rows = cint(data.visible_rows) || ui_styles.doc_table.DEFAULT_VISIBLE_ROWS;
		this._pagination = data.pagination || ui_styles.doc_table.DEFAULT_PAGINATION;
	}

	async load_rows({ reset = true } = {}) {
		this.$error.hide().empty();

		const step = this.page_step();
		let start;
		if (this.is_pages_mode()) {
			start = (this._page_index - 1) * step;
		} else {
			start = reset ? 0 : this._rows.length;
		}
		const limit = step;
		const appending = !reset && !this.is_pages_mode() && this.datatable;

		const fetch_rows = frappe.call({
			method: "ui_styles.doc_table.api.get_doc_table_data",
			type: "GET",
			args: {
				parent_doctype: this.frm.doctype,
				parent_name: this.frm.docname,
				fieldname: this.df.fieldname,
				extra_filters: JSON.stringify(this.get_extra_filters()),
				limit: limit,
				start: start,
			},
		});
		this._load_promise = fetch_rows;
		try {
			const { message } = await fetch_rows;
			const data = message || {};
			this.apply_paging_settings(data);
			const page_rows = data.rows || [];
			this._start = cint(data.start) || start;
			this._rows = this.is_pages_mode() || reset ? page_rows : [...this._rows, ...page_rows];
			this._data = {
				...data,
				rows: this._rows,
			};
			this._has_more = Boolean(data.has_more);
			this._total = cint(data.total);

			if (appending && page_rows.length) {
				this.append_table_rows(page_rows, data);
			} else {
				this.render_table(this._data);
			}
		} catch (e) {
			let msg = __("Could not load Doc Table");
			if (e && e.message) {
				msg = e.message;
			}
			this.$error.text(msg).show();
			this.$footer.hide();
		} finally {
			if (this._load_promise === fetch_rows) {
				this._load_promise = null;
			}
			this._loading_more = false;
			this.$load_more_btn.prop("disabled", false);
			this.$prev_btn.prop("disabled", false);
			this.$next_btn.prop("disabled", false);
		}
	}

	async load_more() {
		if (this.is_pages_mode() || this._loading_more || !this._has_more) {
			return;
		}
		this._loading_more = true;
		this.$load_more_btn.prop("disabled", true);
		await this.load_rows({ reset: false });
	}

	async go_to_prev_page() {
		if (!this.is_pages_mode() || this._loading_more || this._page_index <= 1) {
			return;
		}
		this._loading_more = true;
		this.$prev_btn.prop("disabled", true);
		this._page_index -= 1;
		await this.load_rows({ reset: true });
	}

	async go_to_next_page() {
		if (!this.is_pages_mode() || this._loading_more || !this._has_more) {
			return;
		}
		this._loading_more = true;
		this.$next_btn.prop("disabled", true);
		this._page_index += 1;
		await this.load_rows({ reset: true });
	}

	render_empty(message) {
		this.$grid.empty();
		this.$grid_container.hide();
		if (this.datatable) {
			this.datatable = null;
		}
		this._rows = [];
		this._has_more = false;
		this._total = 0;
		this._page_index = 1;
		this.$footer.hide();
		this.$empty.text(message || __("No linked documents")).show();
	}

	render_table(data) {
		const rows = data.rows || [];
		if (!rows.length) {
			this.render_empty();
			return;
		}

		this.$empty.hide();
		this.$grid_container.show();
		const columns = this.build_columns(data);
		const cell_height = 35;
		const visible_rows = this._visible_rows || ui_styles.doc_table.DEFAULT_VISIBLE_ROWS;
		const table_rows = this.pad_table_rows(this.build_table_rows(rows), visible_rows);

		if (this.datatable) {
			// Update in place so Refresh does not flash an empty grid.
			this.datatable.refresh(table_rows, columns);
			this.apply_table_layout(cell_height, visible_rows);
			this.bind_row_links(data);
			this.update_footer();
			return;
		}

		this.$grid.empty();
		this.datatable = new frappe.DataTable(this.$grid.get(0), {
			columns: columns,
			data: table_rows,
			// Ratio layout shares the full width; fluid sizes from content and
			// leaves some columns huge while others clip.
			layout: "ratio",
			serialNoColumn: false,
			checkboxColumn: false,
			inlineFilters: false,
			cellHeight: cell_height,
			noDataMessage: __("No linked documents"),
			disableReorderColumn: true,
		});

		this.apply_table_layout(cell_height, visible_rows);
		this.bind_row_links(data);
		this.update_footer();
	}

	append_table_rows(page_rows, data) {
		const table_rows = this.build_table_rows(page_rows);
		this.datatable.appendRows(table_rows);
		this.update_footer();
	}

	build_columns(data) {
		const table_meta = data;
		return (data.columns || []).map((col) => ({
			...col,
			width: this.get_column_ratio(col),
			dropdown: false,
			sortable: false,
			resizable: true,
			// DataTable calls format(value, preparedRow, column, originalRowData)
			format: (value, _prepared_row, _column, doc) =>
				this.format_cell(col, value, doc || {}, table_meta),
		}));
	}

	build_table_rows(rows) {
		// Keep the full API row (name for open-link routing, currency option
		// fields for formatters). DataTable only renders column ids; stripping
		// helpers here broke first-column links when name was not displayed.
		return rows.map((row) => ({ ...row }));
	}

	pad_table_rows(table_rows, visible_rows) {
		// Keep pages-mode body height stable when the last page is short.
		if (!this.is_pages_mode() || table_rows.length >= visible_rows) {
			return table_rows;
		}
		const padded = [...table_rows];
		while (padded.length < visible_rows) {
			padded.push({ __doc_table_placeholder: 1 });
		}
		return padded;
	}

	apply_table_layout(cell_height, visible_rows) {
		// Header sits outside .dt-scrollable; size the body to ~N rows and scroll the rest.
		const body_height = this.df.max_height || `${cell_height * visible_rows}px`;
		const $scrollable = this.$grid.find(".dt-scrollable");
		$scrollable.css({
			height: body_height,
			maxHeight: body_height,
			overflowX: "hidden",
			overflowY: "auto",
		});
		if (this.datatable.style && this.datatable.style.setBodyStyle) {
			this.datatable.style.setBodyStyle();
		}
		// DataTable shrinks .dt-scrollable to content width; force full grid width so
		// the vertical scrollbar sits on the right frame edge.
		const grid_width = this.$grid.innerWidth();
		this.$grid.find(".datatable, .dt-header, .dt-scrollable").css({
			width: grid_width ? `${grid_width}px` : "100%",
			maxWidth: "100%",
			marginLeft: 0,
		});
		// Recalculate ratio widths against the forced full width.
		if (this.datatable.style && this.datatable.style.setDimensions) {
			this.datatable.style.setDimensions();
		}
	}

	bind_row_links(data) {
		this.$grid.off("click.doc_table").on("click.doc_table", "a.doc-table-link", (e) => {
			e.preventDefault();
			const name = $(e.currentTarget).data("name");
			if (name && data.doctype) {
				frappe.set_route("Form", data.doctype, name);
			}
		});
	}

	get_column_ratio(col) {
		const fieldtype = col.fieldtype || "Data";
		if (["Check"].includes(fieldtype)) {
			return 1;
		}
		if (
			["Int", "Float", "Percent", "Currency", "Date", "Datetime", "Time"].includes(fieldtype)
		) {
			return 2;
		}
		if (["Select", "Color", "Rating"].includes(fieldtype)) {
			return 2;
		}
		if (["Small Text", "Text", "Long Text", "Text Editor"].includes(fieldtype)) {
			return 4;
		}
		// Link, Data, Dynamic Link, name, status, etc.
		return 3;
	}

	update_footer() {
		const count = this._rows.length;
		if (!count) {
			this.$footer.hide();
			return;
		}

		const total = this._total || count;
		this.$footer.show();

		if (this.is_pages_mode()) {
			const step = this.page_step();
			const start = (this._page_index - 1) * step + 1;
			const end = (this._page_index - 1) * step + count;
			this.$status.text(__("Showing {0}-{1} of {2}", [start, end, total]));
			this.$load_more_btn.hide();
			if (total > step) {
				this.$pager.show();
				this.$prev_btn.prop("disabled", this._page_index <= 1);
				this.$next_btn.prop("disabled", !this._has_more);
			} else {
				this.$pager.hide();
			}
			return;
		}

		this.$status.text(__("Showing {0} of {1}", [count, total]));
		this.$pager.hide();
		if (this._has_more) {
			this.$load_more_btn.show();
		} else {
			this.$load_more_btn.hide();
		}
	}

	is_doc_link_column(col, table_meta) {
		const fieldname = col.id;
		if (fieldname === "name") {
			return true;
		}
		const columns = table_meta.columns || [];
		const has_name = columns.some((c) => c.id === "name");
		if (has_name) {
			// ID is shown: also link the title column when present.
			return fieldname === table_meta.title_field;
		}
		// No ID column: open the document from the first visible column.
		return columns[0] && fieldname === columns[0].id;
	}

	format_cell(col, value, doc, table_meta) {
		if (doc && doc.__doc_table_placeholder) {
			return `<span class="doc-table-cell doc-table-placeholder-cell">&nbsp;</span>`;
		}

		const fieldname = col.id;
		const docname = (doc && doc.name) || "";
		const is_link = this.is_doc_link_column(col, table_meta);
		let html;
		let title;

		if (fieldname === "name") {
			title = value || docname || "";
			html = frappe.utils.escape_html(title);
		} else if (value == null || value === "") {
			if (!is_link || !docname) {
				return "";
			}
			title = docname;
			html = frappe.utils.escape_html(docname);
		} else {
			const fieldtype = col.fieldtype || "Data";
			const df = {
				fieldname: fieldname,
				fieldtype: fieldtype,
				options: col.options,
				parent: table_meta.doctype,
			};

			if (fieldtype === "Date") {
				html = frappe.datetime.str_to_user(value, false, true) || "";
			} else if (fieldtype === "Datetime") {
				html = frappe.datetime.str_to_user(value) || "";
			} else if (fieldtype === "Time") {
				html = frappe.datetime.str_to_user(value, true) || "";
			} else if (frappe.format) {
				html = frappe.format(value, df, { inline: true, only_value: true }, doc);
			} else {
				const formatter = frappe.form.get_formatter(fieldtype);
				if (formatter) {
					html = formatter(value, df, { inline: true, only_value: true }, doc);
				} else {
					html = frappe.utils.escape_html(String(value));
				}
			}
			title = $("<div>").html(html).text() || String(value);
		}

		if (!html) {
			return "";
		}

		if (is_link && docname) {
			html = `<a href="/app/${frappe.router.slug(table_meta.doctype)}/${encodeURIComponent(
				docname
			)}" class="doc-table-link" data-name="${frappe.utils.escape_html(
				docname
			)}">${html}</a>`;
		}

		if (title) {
			return `<span class="doc-table-cell" title="${frappe.utils.escape_html(
				String(title)
			)}">${html}</span>`;
		}
		return html;
	}

	async open_list() {
		const doctype = this.get_target_doctype();
		if (!doctype || !this.frm || this.frm.is_new()) {
			return;
		}
		const link_fields = await this.get_link_fields();
		const filters = {};
		if (link_fields.length === 1) {
			filters[link_fields[0]] = this.frm.docname;
		}
		this.get_extra_filters().forEach((row) => {
			const [fieldname, operator, value] = row;
			filters[fieldname] = operator === "=" ? value : [operator, value];
		});
		frappe.route_options = filters;
		frappe.set_route("List", doctype);
	}

	get_extra_filters() {
		if (!this.df.link_filters) {
			return [];
		}
		try {
			const rows =
				typeof this.df.link_filters === "string"
					? JSON.parse(this.df.link_filters)
					: this.df.link_filters;
			if (!Array.isArray(rows)) {
				return [];
			}
			return rows.map((filter) => {
				let fieldname;
				let operator;
				let value;
				if (filter.length === 4) {
					[, fieldname, operator, value] = filter;
				} else {
					[fieldname, operator, value] = filter;
				}
				if (typeof value === "string" && value.startsWith("eval:")) {
					value = frappe.utils.eval(value.slice(5), {
						doc: this.frm.doc,
						parent: this.frm.doc.parenttype ? this.frm.doc : null,
						frappe,
					});
				}
				return [fieldname, operator, value];
			});
		} catch (e) {
			console.error("Invalid Doc Table link_filters", e);
			return [];
		}
	}

	async new_doc() {
		const doctype = this.get_target_doctype();
		if (!doctype || !this.frm || this.frm.is_new()) {
			return;
		}
		const link_fields = await this.get_link_fields();
		const doc = {};
		link_fields.forEach((fieldname) => {
			doc[fieldname] = this.frm.docname;
		});
		frappe.new_doc(doctype, doc);
	}

	async get_link_fields() {
		if (this._data && this._data.link_fields !== undefined) {
			return this._data.link_fields;
		}
		const { skip_parent_link, link_fieldname } = ui_styles.doc_table.parse_link_from_options(
			this.df.options
		);
		if (skip_parent_link) {
			return [];
		}
		if (link_fieldname) {
			return [link_fieldname];
		}
		const target_doctype = this.get_target_doctype();
		const parent_doctype = this.frm && this.frm.doctype;
		if (!target_doctype || !parent_doctype) {
			return [];
		}
		if (this._load_promise) {
			try {
				await this._load_promise;
			} catch (e) {
				// Fall back to client-side auto-detect below.
			}
			if (this._data && this._data.link_fields !== undefined) {
				return this._data.link_fields;
			}
		}
		await frappe.model.with_doctype(target_doctype);
		const meta = frappe.get_meta(target_doctype);
		if (!meta || !meta.fields) {
			return [];
		}
		const candidates = meta.fields
			.filter((df) => df.fieldtype === "Link" && df.options === parent_doctype)
			.map((df) => df.fieldname);
		return candidates.length === 1 ? candidates : [];
	}

	get_target_doctype() {
		if (this._data && this._data.doctype) {
			return this._data.doctype;
		}
		return ui_styles.doc_table.parse_doctype_from_options(this.df.options);
	}

	get_value() {
		return null;
	}

	set_input() {
		// display-only
	}
};
