/*
 * Copyright (c) 2012-2013 Axelor. All Rights Reserved.
 *
 * The contents of this file are subject to the Common Public
 * Attribution License Version 1.0 (the “License”); you may not use
 * this file except in compliance with the License. You may obtain a
 * copy of the License at:
 *
 * http://license.axelor.com/.
 *
 * The License is based on the Mozilla Public License Version 1.1 but
 * Sections 14 and 15 have been added to cover use of software over a
 * computer network and provide for limited attribution for the
 * Original Developer. In addition, Exhibit A has been modified to be
 * consistent with Exhibit B.
 *
 * Software distributed under the License is distributed on an “AS IS”
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is part of "Axelor Business Suite", developed by
 * Axelor exclusively.
 *
 * The Original Developer is the Initial Developer. The Initial Developer of
 * the Original Code is Axelor.
 *
 * All portions of the code written by Axelor are
 * Copyright (c) 2012-2013 Axelor. All Rights Reserved.
 */
(function(undefined){

var ui = angular.module('axelor.ui');

//used to keep track of columns by x-path
function setDummyCols(element, cols) {
	var e = $('<div>').appendTo(element).hide();
	_.each(cols, function(col, i) {
		$('<span class="slick-dummy-column">')
			.data('column', col)
			.attr('x-path', col.xpath)
			.appendTo(e);
	});
}

function makeFilterCombo(input, selection, callback) {

	var data = _.map(selection, function(item){
		return {
			key: item.value,
			value: item.title
		};
	});
	
	function update(item) {
		var filter = {};
		item = item || {};
		input.val(item.value || '');
		filter[input.data('columnId')] = item.key || '';
		callback(filter);
	}

	input.autocomplete({
		minLength: 0,
		source: data,
		focus: function(event, ui) {
			return false;
		},
		select: function(event, ui) {
			update(ui.item);
			return false;
		}
	}).keyup(function(e){
		return false;
	}).keydown(function(e){
		switch(e.keyCode) {
		case 8:		// backspace
		case 46:	// delete
			update(null);
		}
	}).focus(function(){
		input.autocomplete("search", "");
	});
}

var Editor = function(args) {
	
	var element;
	var column = args.column;
	var scope;

	var form = $(args.container)
		.parents('[ui-slick-grid]:first')
		.find('[ui-slick-editors]:first');
	
	element = form.find('[x-field="'+ column.field +'"]');
	scope = form.data('$scope');
	
	if (!element.parent().is('td.form-item'))
		element = element.parent();
	element.data('$parent', element.parent());

	this.init = function() {

		element.css('display', 'inline-block')
			   .appendTo(args.container);
		
		if (element.data('keydown.nav') == null) {
			element.data('keydown.nav', true);
			element.bind("keydown.nav", function (e) {
				switch (e.keyCode) {
				case 37: // LEFT
				case 39: // RIGHT
					e.stopImmediatePropagation();
					break;
				case 13: // ENTER
				case 38: // UP
				case 40: // DOWN
					if ($(e.target).is('textarea')) {
						e.stopImmediatePropagation();
					}
				}
			});
			
			element.bind('close:slick-editor', function(e) {
				var grid = args.grid;
				var lock = grid.getEditorLock();
				if (lock.isActive()) {
					lock.commitCurrentEdit();
				}
			});
		}
		
		if (args.item && args.item.id > 0)
			element.hide();
		this.focus();
	};
	
	this.destroy = function() {
		element.appendTo(element.data('$parent') || form)
			   .removeData('$parent');
		element.trigger("hide:slick-editor");
	};
	
	this.position = function(pos) {
		element.trigger("show:slick-editor");
		scope.applyLater(function(){
			element.trigger("show:slick-editor");
		});
	};
	
	function focus() {
		// Firefox throws exception if element is hidden
		if (element.is(':hidden')) return;
		if (element.is(':input'))
			return element.focus().select();
		element.find(':input:first').focus().select();
	}

	this.focus = function() {
		_.delay(focus);
	};

	this.loadValue = function(item) {
		var that = this,
			record = scope.record || {},
			current = item || { id: 0 },
			updated = false;
			
		if (record.id !== current.id || record.version !== current.version) {
			scope.editRecord(current);
		} else {
			record[column.field] = current[column.field];
			updated = true;
		}
		setTimeout(function(){
			if (updated) {
				scope.$apply();
			}
			element.show();
			that.focus();
		});
	};
	
	this.serializeValue = function() {
		var record = scope.record || {};
		var value = record[column.field];
		return value === undefined ? "" : value;
	};
	
	this.applyValue = function(item, state) {
		item[column.field] = state;
		item.$dirty = true;
		if (item.id === undefined) {
			args.grid.onCellChange.notify(args.grid.getActiveCell());
		}
	};
	
	this.isValueChanged = function() {
		
		// force change event on spinner widget
		element.find('.ui-spinner-input').trigger('grid:check', args.item);
		element.find('.ui-mask').trigger('grid:check');
		
		var record = scope.record || {},
			current = args.item || { id: 0 };
		
		var v1 = record[column.field],
			v2 = current[column.field];

		return !angular.equals(v1, v2);
	};
	
	this.validate = function() {
		return {
			valid: !element.hasClass('ng-invalid'),
			msg: null
        };
	};
	
	this.init();
};

var Formatters = {

	"integer": function(field, value) {
		return value;
	},

	"decimal": function(field, value) {
		var scale = field.scale || 2,
			num = +(value);
		if (num) {
			return num.toFixed(scale);
		}
		return value;
	},
	
	"boolean": function(field, value) {
		return value ? '<i class="icon-ok"></i>' : "";
	},
	
	"date": function(field, value) {
		return value ? moment(value).format('DD/MM/YYYY') : "";
	},
	
	"time": function(field, value) {
		return value ? value : "";
	},

	"datetime": function(field, value) {
		return value ? moment(value).format('DD/MM/YYYY HH:mm') : "";
	},
	
	"many-to-one": function(field, value) {
		return value ? value[field.targetName] : "";
	},
	
	"one-to-many": function(field, value) {
		return value ? '(' + value.length + ')' : "";
	},

	"many-to-many": function(field, value) {
		return value ? '(' + value.length + ')' : "";
	},
	
	"button": function(field, value, context, grid) {
		var elem;
		var isIcon = field.icon.indexOf('icon-') === 0;
		var css = isIcon ? "slick-icon-button " + field.icon : "slick-img-button";
		
		if (field.readonlyIf && axelor.$eval(grid.scope, field.readonlyIf, context)) {
			css += " readonly disabled";
		};
		
		if(isIcon) {
			elem = '<a href="#" tabindex="-1"';
			if (field.help) {
				elem += ' title="' + field.help + '"';
			}
			elem += '><i class="' + css + '"></i></a>';
		} else {
			elem = '<img class="' + css + '" src="' + field.icon + '"';
			if (field.help) {
				elem += ' title="' + field.help + '"';
			}
			elem += '>';
		}
		
		return elem;
	},

	"progress": function(field, value) {
		var props = ui.ProgressMixin.compute(field, value);
		return '<div class="progress ' + props.css + '" style="height: 18px; margin: 0; margin-top: 1px;">'+
		  '<div class="bar" style="width: ' + props.width +'%;"></div>'+
		'</div>';
	},
	
	"selection": function(field, value) {
		var cmp = field.type === "integer" ? function(a, b) { return a == b ; } : _.isEqual;
		var res = _.find(field.selection, function(item){
			return cmp(item.value, value);
		}) || {};
		return res.title;
	},

	"url": function(field, value) {
		return '<a target="_blank" ng-show="text" href="' + value + '">' + value + '</a>';
	}
};

function totalsFormatter(totals, columnDef) {
	
	var field = columnDef.descriptor;
	if (field.aggregate == null) {
		return "";
	}

	var vals = totals[field.aggregate] || {};
	var val = vals[field.name];

	var formatter = Formatters[field.type];
	if (formatter) {
		return formatter(field, val);
	}
	
	return val;
}

function Factory(grid) {
	this.grid = grid;
}

_.extend(Factory.prototype, {

	getEditor : function(col) {
		var field = col.descriptor;
		if (!field || field.readonly || col.forEdit === false) {
			return null;
		}
		if (field.type == 'binary') {
			return null;
		}
		if (col.editor) {
			return col.editor;
		}
		return col.editor = Editor;
	},
	
	getFormatter: function(col) {
		return _.bind(this.formatter, this);
	},
	
	formatter: function(row, cell, value, columnDef, dataContext) {
		
		var field = columnDef.descriptor || {},
			attrs = _.extend({}, field, field.widgetAttrs),
			widget = attrs.widgetName,
			type = attrs.type;

		if (widget === "Progress" || widget === "progress" || widget === "SelectProgress") {
			type = "progress";
		}
		if (_.isArray(field.selection)) {
			type = "selection";
		}

		if (type === "button" || type === "progress") {
			return Formatters[type](field, value, dataContext, this.grid);
		}

		if(widget === "Url") {
			type = "url";
		}

		if (value === null || value === undefined || (_.isObject(value) && _.isEmpty(value))) {
			return "";
		}

		var fn = Formatters[type];
		if (fn) {
			return fn(field, value, dataContext, this.grid);
		}
		return value;
	},
	
	formatProgress: function(field, value) {
		
		var props = ui.ProgressMixin.compute(field, value);
		
		return '<div class="progress ' + props.css + '" style="height: 18px; margin: 0; margin-top: 1px;">'+
		  '<div class="bar" style="width: ' + props.width +'%;"></div>'+
		'</div>';
	},
	
	formatDecimal: function(field, value) {
		var scale = field.scale || 2,
			num = +(value);
		if (num) {
			return num.toFixed(scale);
		}
		return value;
	},
	
	formatButton: function(field, value, columnDef) {
		return '<img class="slick-img-button" src="' + field.icon + '">';
	}
});

var Grid = function(scope, element, attrs, ViewService, ActionService) {
	
	var noFilter = scope.$eval('noFilter');
	if (_.isString(noFilter)) {
		noFilter = noFilter === 'true';
	}

	this.compile = function(template) {
		return ViewService.compile(template)(scope.$new());
	};
	
	this.newActionHandler = function(scope, element, options) {
		return ActionService.handler(scope, element, options);
	};
	
	this.scope = scope;
	this.element = element;
	this.attrs = attrs;
	this.handler = scope.handler;
	this.showFilters = !noFilter;
	this.$oldValues = null;
	this.grid = this.parse(scope.view);
};

Grid.prototype.parse = function(view) {

	var that = this,
		scope = this.scope,
		handler = scope.handler,
		dataView = scope.dataView,
		element = this.element;

	scope.fields_view = {};
	
	var cols = [];
	
	_.each(view.items, function(item) {
		var field = handler.fields[item.name],
			path = handler.formPath, type;

		field = _.extend({}, item, field);
		scope.fields_view[item.name] = field;
		path = path ? path + '.' + item.name : item.name;
		type = field.selection ? 'string' : field.type;
		
		var sortable = true;
		switch (field.type) {
		case 'button':
		case 'one-to-many':
		case 'many-to-many':
			sortable = false;
			break;
		default:
			sortable: true;
		}

		if (field.type == "button") {
			if (scope.selector) return;
			field.image = field.title;
			field.handler = that.newActionHandler(scope.$new(), element, {
				action: field.onClick
			});
			item.title = "&nbsp;";
			item.width = 10;
		}

		var column = {
			name: item.title || _.chain(item.name).humanize().titleize().value(),
			id: item.name,
			field: item.name,
			forEdit: item.forEdit,
			descriptor: field,
			sortable: sortable,
			width: item.width,
			hasWidth: item.width ? true : false,
			cssClass: type,
			headerCssClass: type,
			xpath: path
		};
		
		cols.push(column);
		
		if (field.aggregate) {
			column.groupTotalsFormatter = totalsFormatter;
		}
		
		if (field.type === "button") {
			return ;
		}

		var menus = [{
			iconImage: "lib/slickgrid/images/sort-asc.gif",
			title: _t("Sort Ascending"),
			command: "sort-asc"
		}, {
			iconImage: "lib/slickgrid/images/sort-desc.gif",
			title: _t("Sort Descending"),
			command: "sort-desc"
		}, {
			separator: true
		}, {
			title: _t("Group by") + " <i>" + column.name + "</i>",
			command: "group-by"
		}, {
			title: _t("Ungroup"),
			command: "ungroup"
		}, {
			separator: true
		}, {
			title: _t("Hide") + " <i>" + column.name + "</i>",
			command: "hide"
		}];
		
		column.header = {
			menu: {
				items: menus,
				position: function($menu, $button) {
					$menu.css('top', 0)
						 .css('left', 0);
					$menu.position({
						my: 'left top',
						at: 'left bottom',
						of: $button
					});
				}
			}
		};
	});
	
	// create edit column
	var editColumn = null;
	if (!scope.selector && view.editIcon && (!handler.hasPermission || handler.hasPermission('write'))) {
		editColumn = new EditIconColumn({
			onClick: function (e, args) {
				if (handler && handler.onEdit) {
					handler.applyLater(function () {
						handler.onEdit(true);
					}, 10);
				}
			}
		});
		cols.unshift(editColumn.getColumnDefinition());
	}

	// create checkbox column
	var selectColumn = null;
	if (scope.selector) {
		selectColumn = new Slick.CheckboxSelectColumn({
			cssClass: "slick-cell-checkboxsel",
			multiSelect: scope.selector !== "single"
		});
		
		cols.unshift(_.extend(selectColumn.getColumnDefinition(), {
			headerCssClass: "slick-cell-checkboxsel"
		}));
	}
	
	var factory = new Factory(this);

	var options = {
		rowHeight: 26,
		editable: view.editable,
		editorFactory:  factory,
		formatterFactory: factory,
		enableCellNavigation: true,
		enableColumnReorder: false,
		forceFitColumns: true,
		multiColumnSort: true,
		showHeaderRow: this.showFilters,
		multiSelect: scope.selector !== "single",
		explicitInitialization: true
	};

	var grid = new Slick.Grid(element, dataView, cols, options);
	
	this.cols = cols;
	this.grid = grid;
	
	this._selectColumn = selectColumn;
	this._editColumn = editColumn;
	
	element.show();
	element.data('grid', grid);
	
	function adjustSize() {
		scope.ajaxStop(function () {
			setTimeout(function () {
				that.adjustSize();
			});
		});
	}

	element.on('adjustSize', _.debounce(adjustSize, 100));
	
	if (element.is(':visible')) {
		setTimeout(function () {
			element.trigger('adjustSize');
		});
	}
	
	element.addClass('slickgrid-empty');
	this.doInit = _.once(function doInit() {
		this._doInit(view);
		element.removeClass('slickgrid-empty');
	}.bind(this));

	return grid;
};

Grid.prototype._doInit = function(view) {

	var that = this,
		grid = this.grid,
		scope = this.scope,
		handler = this.scope.handler,
		dataView = this.scope.dataView,
		element = this.element;

	var headerMenu = new Slick.Plugins.HeaderMenu({
		buttonImage: "lib/slickgrid/images/down.gif"
	});

	grid.setSelectionModel(new Slick.RowSelectionModel());
	grid.registerPlugin(new Slick.Data.GroupItemMetadataProvider());
	grid.registerPlugin(headerMenu);
	if (this._selectColumn) {
		grid.registerPlugin(this._selectColumn);
	}
	if (this._editColumn) {
		grid.registerPlugin(this._editColumn);
	}

	// performance tweaks
	var _containerH = 0;
	var _containerW = 0;
	var _resizeCanvas = grid.resizeCanvas;
	grid.resizeCanvas = _.debounce(function() {
		var w = element.width(),
			h = element.height();
		if (element.is(':hidden') || (w === _containerW && h === _containerH)) {
			return;
		}
		_containerW = w;
		_containerH = h;
		_resizeCanvas.call(grid);
	}, 100);

	grid.init();
	this.$$initialized = true;

	// end performance tweaks
	
	dataView.$syncSelection = function(old, oldIds, focus) {
		var selection = dataView.mapIdsToRows(oldIds);
		grid.setSelectedRows(selection);
		if (selection.length === 0 && !grid.getEditorLock().isActive()) {
			grid.setActiveCell(null);
        } else if (focus) {
        	grid.setActiveCell(_.first(selection), 1);
        	grid.focus();
        }
	};
	
	// register grid event handlers
	this.subscribe(grid.onSort, this.onSort);
	this.subscribe(grid.onSelectedRowsChanged, this.onSelectionChanged);
	this.subscribe(grid.onClick, this.onItemClick);
	this.subscribe(grid.onDblClick, this.onItemDblClick);
	
	this.subscribe(grid.onKeyDown, this.onKeyDown);
	this.subscribe(grid.onCellChange, this.onCellChange);
	this.subscribe(grid.onAddNewRow, this.onAddNewRow);
	this.subscribe(grid.onBeforeEditCell, this.onBeforeEditCell);
	
	// register dataView event handlers
	this.subscribe(dataView.onRowCountChanged, this.onRowCountChanged);
	this.subscribe(dataView.onRowsChanged, this.onRowsChanged);

	// register header menu event handlers
	this.subscribe(headerMenu.onBeforeMenuShow, this.onBeforeMenuShow);
	this.subscribe(headerMenu.onCommand, this.onMenuCommand);

	// delegate some methods to handler scope
	//TODO: this spoils the handler scope, find some better way
	handler.showColumn = _.bind(this.showColumn, this);
	handler.resetColumns = _.bind(this.resetColumns, this);
	handler.setColumnTitle = _.bind(this.setColumnTitle, this);

	// hilite support
	var getItemMetadata = dataView.getItemMetadata;
	dataView.getItemMetadata = function (row) {
		var item = grid.getDataItem(row);
		if (item && item.$style === undefined) {
			that.hilite(row);
		}
		var meta = getItemMetadata.apply(dataView, arguments);
		var my = that.getItemMetadata(row);
		if (my && meta && meta.cssClasses) {
			my.cssClasses += " " + meta.cssClasses;
		}
		return meta || my;
	};
	this.subscribe(grid.onCellChange, function (e, args) {
		that.hilite(args.row);
		grid.invalidateRow(args.row);
		grid.render();
	});

	function setFilterCols() {

		if (!that.showFilters) {
			return;
		}

		var filters = {};
		var filtersRow = $(grid.getHeaderRow());

		function updateFilters(event) {
			var elem = $(this);
			if (elem.is('.ui-autocomplete-input')) {
				return;
			}
			filters[$(this).data('columnId')] = $(this).val().trim();
		}
		
		filtersRow.on('keyup', ':input', updateFilters);
		filtersRow.on('keypress', ':input', function(event){
			if (event.keyCode === 13) {
				updateFilters.call(this, event);
				scope.handler.filter(filters);
			}
		});

		function _setInputs(cols) {
			_.each(cols, function(col){
				if (!col.xpath || col.descriptor.type === 'button') return;
				var header = grid.getHeaderRowColumn(col.id),
					input = $('<input type="text">').data("columnId", col.id).appendTo(header),
					field = col.descriptor || {};
				if (_.isArray(field.selection)) {
					makeFilterCombo(input, field.selection, function(filter){
						_.extend(filters, filter);
					});
				}
			});
		};

		var _setColumns = grid.setColumns;
		grid.setColumns = function(columns) {
			_setColumns.apply(grid, arguments);
			_setInputs(columns);
		};
		
		_setInputs(that.cols);
	}
	
	setFilterCols();
	setDummyCols(element, this.cols);
	
	var onInit = scope.onInit();
	if (_.isFunction(onInit)) {
		onInit(grid);
	}
	
	if (view.groupBy) {
		this.groupBy(view.groupBy);
	}

	setTimeout(function () {
		// hide columns
		_.each(that.cols, function (col) {
			if (col.descriptor && col.descriptor.hidden) {
				that.showColumn(col.field, false);
			}
		});
	});

	if (scope.$parent._viewResolver) {
		scope.$parent._viewResolver.resolve(view, element);
	}
	
	scope.$on("cancel:grid-edit", function(e) {
		
		if (that.$oldValues && that.canSave()){
			
			dataView.beginUpdate();
			dataView.setItems(that.$oldValues);
			dataView.endUpdate();

			that.$oldValues = null;
			
			that.clearDirty();
			
			grid.invalidateAllRows();
			grid.render();
			
			e.preventDefault();
		}
	});
	
	scope.$on("on:new", function(e) {
		that.$oldValues = null;
		that.clearDirty();
	});
	
	scope.$on("on:edit", function(e) {
		that.$oldValues = null;
		that.clearDirty();
	});
	
	scope.$on("on:before-save", function(e) {

		var lock = grid.getEditorLock();
		if (lock.isActive()) {
			lock.commitCurrentEdit();
		}
		
		if (!that.isDirty() || that.saveChanges()) {
			return;
		}
		
		var args = that.grid.getActiveCell();
		that.focusInvalidCell(args);

		e.preventDefault();
		return false;
	});
	
	//XXX: ui-dialog issue (filter row)
	var zIndex = element.parents('.ui-dialog:first').zIndex();
	if (zIndex) {
		element.find('.slick-headerrow-column').zIndex(zIndex);
	}
	
	scope.$timeout(grid.invalidate);
	scope.applyLater();
};

Grid.prototype.subscribe = function(event, handler) {
	event.subscribe(_.bind(handler, this));
};

Grid.prototype.adjustSize = function() {
	if (!this.grid || this.element.is(':hidden') || this.grid.getEditorLock().isActive()) {
		return;
	}
	this.doInit();
	this.grid.resizeCanvas();
};

Grid.prototype.getColumn = function(indexOrName) {
	var cols = this.grid.getColumns(),
		index = indexOrName;

	if (_.isString(index)) {
		index = this.grid.getColumnIndex(index);
	}
	return cols[index];
};

Grid.prototype.showColumn = function(name, show) {
	
	var that = this,
		grid = this.grid,
		cols = this.cols;
	
	if (this.visibleCols == null) {
		this.visibleCols = _.pluck(cols, 'id');
	}
	
	show = _.isUndefined(show) ? true : show;
	
	var visible = new Array(),
		current = new Array();
	
	_.each(cols, function(col){
		if (col.id != name && _.contains(that.visibleCols, col.id))
			return visible.push(col.id);
		if (col.id == name && show)
			return visible.push(name);
	});
	
	this.visibleCols = visible;
	current = _.filter(cols, function(col) {
		return _.contains(visible, col.id);
	});
	grid.setColumns(current);
	grid.getViewport().rightPx = 0;
	grid.resizeCanvas();
	grid.autosizeColumns();
};

Grid.prototype.resetColumns = function() {
	var grid = this.grid,
		cols = this.cols;
	
	this.visibleCols = _.pluck(cols, 'id');
	
	grid.setColumns(cols);
	grid.getViewport().rightPx = 0;
	grid.resizeCanvas();
	grid.autosizeColumns();
};

Grid.prototype.setColumnTitle = function(name, title) {
	this.grid.updateColumnHeader(name, title);
};

Grid.prototype.getItemMetadata = function(row) {
	var item = this.grid.getDataItem(row);
	if (item && item.$style) {
		return {
			cssClasses: item.$style
		};
	}
	return null;
};

Grid.prototype.hilite = function (row, field) {
	var view = this.scope.view,
		record = this.grid.getDataItem(row),
		params = null;

	if (!view || !record || record.__group || record.__groupTotals) {
		return null;
	}

	if (!field) {
		_.each(this.scope.fields_view, function (item) {
			if (item.hilites) this.hilite(row, item);
		}, this);
	}
	
	var hilites = field ? field.hilites : view.hilites;
	if (!hilites || hilites.length === 0) {
		return null;
	}
	
	record.$style = null;
	
	for (var i = 0; i < hilites.length; i++) {
		var params = hilites[i],
			condition = params.condition,
			styles = null,
			pass = false;
		
		try {
			pass = axelor.$eval(this.scope, condition, record);
		} catch (e) {
		}
		if (!pass) {
			continue;
		}
		if (field) {
			styles = record.$styles || (record.$styles = {});
			styles[field.name] = params.css;
		} else {
			record.$style = params.css;
		}
		break;
	}
};

Grid.prototype.onBeforeMenuShow = function(event, args) {

	var menu = args.menu;
	if (!menu || !menu.items || !this.visibleCols) {
		return;
	}

	menu.items = _.filter(menu.items, function(item) {
		return item.command !== 'show';
	});

	_.each(this.cols, function(col) {
		if (_.contains(this.visibleCols, col.id)) return;
		menu.items.push({
			title: _t('Show') + " <i>" + col.name + "</i>",
			command: 'show',
			field: col.field
		});
	}, this);
};

Grid.prototype.onMenuCommand = function(event, args) {
	
	var grid = this.grid;

	if (args.command === 'sort-asc' ||
		args.command == 'sort-desc') {
		
		var opts = {
			grid: grid,
			multiColumnSort: true,
			sortCols: [{
			    sortCol: args.column,
			    sortAsc: args.command === 'sort-asc'
			}]
		};
		return grid.onSort.notify(opts, event, grid);
	}
	
	if (args.command === 'group-by') {
		return this.groupBy(args.column.field);
	}
	
	if (args.command === 'ungroup') {
		return this.groupBy([]);
	}
	
	if (args.command === 'hide') {
		return this.showColumn(args.column.field, false);
	}
	
	if (args.command === 'show') {
		return this.showColumn(args.item.field, true);
	}
};

Grid.prototype.onBeforeEditCell = function(event, args) {
	if (this.$oldValues === null) {
		this.$oldValues = [];
		var n = 0;
		while (n < this.grid.getDataLength()) {
			var item = this.grid.getDataItem(n++);
			if (item && item.id) {
				this.$oldValues.push(_.clone(item));
			}
		}
	}
	if (args.item && args.item._original === undefined) {
		args.item._original = _.clone(args.item);
	}
	if (!args.item) {
		this.editorScope.editRecord(null);
	}
};

Grid.prototype.onKeyDown = function(e, args) {
	var that = this,
		grid = this.grid,
		lock = grid.getEditorLock();

	if (e.isDefaultPrevented()){
		e.stopImmediatePropagation();
		return false;
	}
	
	if (!e.isBlocked && (blocked() || !lock.isActive())) {
		return false;
	}
	
	function blockCallback(blocked) {
		if (blocked && e.which === $.ui.keyCode.TAB) {
			setTimeout(function(){
				var cell = e.shiftKey ? that.findPrevEditable(args.row, args.cell)
									  : that.findNextEditable(args.row, args.cell);
				if (cell) {
					grid.setActiveCell(cell.row, cell.cell);
					grid.editActiveCell();
				}
			});
		}
	}
	
	function blocked() {
		if (that.isDirty() && axelor.blockUI(blockCallback)) {
			grid.focus();
			e.stopImmediatePropagation();
			return true;
		}
		return false;
	}

	function commit(row, cell) {
		if (lock.commitCurrentEdit() && !blocked()) {
			grid.setActiveCell(row, cell);
			grid.editActiveCell();
			return true;
		}
		return false;
	}

	// firefox & IE fails to trigger onChange
	if (($.browser.mozilla || $.browser.msie) &&
			(e.which === $.ui.keyCode.TAB || e.which === $.ui.keyCode.ENTER)) {
		var editor = grid.getCellEditor(),
			target = $(e.target);
		if (editor.isValueChanged()) {
			target.change();
		}
		setTimeout(function(){
			target.blur();
		});
	}
	var handled = false;
	if (e.which === $.ui.keyCode.TAB) {
		var cell = e.shiftKey ? this.findPrevEditable(args.row, args.cell) :
								this.findNextEditable(args.row, args.cell);

		if (cell && commit(cell.row, cell.cell) && cell.row > args.row && this.isDirty()) {
			var saved = this.saveChanges(args, function(){
				grid.focus();
				grid.setActiveCell(cell.row, cell.cell);
				grid.editActiveCell();
			});
			if (!saved) {
				this.focusInvalidCell(args);
			}
		}
		handled = true;
	}

	if (e.which === $.ui.keyCode.ENTER) {
		if (e.ctrlKey) {
			if (!this.saveChanges(args)) {
				this.focusInvalidCell(args);
			}
		} else {
			if (!lock.commitCurrentEdit()) {
				this.focusInvalidCell(args);
			}
			grid.focus();
		}
		grid.focus();
		handled = true;
	}

	if (e.which === $.ui.keyCode.ESCAPE) {
		grid.focus();
	}
	
	if (handled) {
		e.stopImmediatePropagation();
		return false;
	}
};

Grid.prototype.isCellEditable = function(cell) {
	var cols = this.grid.getColumns(),
		col = cols[cell];
	if (!col || col.id === "_edit_column") {
		return false;
	}
	var field = col.descriptor || {};
	return !field.readonly && field.type !== 'button';
};

Grid.prototype.findNextEditable = function(posY, posX) {
	var grid = this.grid,
		cols = grid.getColumns(),
		args = {row: posY, cell: posX + 1};
	while (args.cell < cols.length) {
		if (this.isCellEditable(args.cell)) {
			return args;
		}
		args.cell += 1;
	}
	if (grid.getDataItem(args.row)) {
		args.row += 1;
	}
	args.cell = 0;
	while (args.cell < posX) {
		if (this.isCellEditable(args.cell)) {
			return args;
		}
		args.cell += 1;
	}
	return null;
};

Grid.prototype.findPrevEditable = function(posY, posX) {
	var grid = this.grid,
		cols = grid.getColumns(),
		args = {row: posY, cell: posX - 1};
	while (args.cell > -1) {
		if (this.isCellEditable(args.cell)) {
			return args;
		}
		args.cell -= 1;
	}
	if (args.row >= 0) {
		args.row -= 1;
	}
	args.cell = cols.length - 1;
	while (args.cell > posX) {
		if (this.isCellEditable(args.cell)) {
			return args;
		}
		args.cell -= 1;
	}
	return null;
};

Grid.prototype.saveChanges = function(args, callback) {

	var grid = this.grid,
		lock = grid.getEditorLock();

	if ((lock.isActive() && !lock.commitCurrentEdit()) || !this.editorScope.isValid()) {
		return false;
	}

	if (args == null) {
		args = _.extend({ row: 0, cell: 0 }, this.grid.getActiveCell());
		args.item = this.grid.getDataItem(args.row);
	}
	
	var data = this.scope.dataView;
	var ds = this.handler._dataSource,
		records = [];

	records = _.map(data.getItems(), function(rec) {
		var res = {};
		for(var key in rec) {
			var val = rec[key];
			if (_.isString(val) && val.trim() === "")
				val = null;
			res[key] = val;
		}
		if (res.id === 0) {
			res.id = null;
		}
		if (res.$dirty && _.isUndefined(res.version)) {
			res.version = res.$version;
		}
		return res;
	});
	
	function focus() {
		grid.setActiveCell(args.row, args.cell);
		grid.focus();
		if (callback) {
			callback();
		}
	}

	var onBeforeSave = this.scope.onBeforeSave(),
		onAfterSave = this.scope.onAfterSave();

	if (onBeforeSave && onBeforeSave(records) === false) {
		return setTimeout(focus, 200);
	}

	return ds.saveAll(records).success(function(records, page) {
		if (data.getItemById(0)) {
			data.deleteItem(0);
		}
		if (onAfterSave) {
			onAfterSave(records, page);
		}
		setTimeout(focus);
	});
};

Grid.prototype.canSave = function() {
	return this.editorScope && this.editorScope.isValid() && this.isDirty();
};

Grid.prototype.isDirty = function(row) {
	var grid = this.grid;
	
	if (row === null || row === undefined) {
		var n = 0;
		while (n < grid.getDataLength()) {
			var item = grid.getDataItem(n);
			if (item && item.$dirty) {
				return true;
			}
			n ++;
		}
	} else {
		var item = grid.getDataItem(row);
		if (item && item.$dirty) {
			return true;
		}
	}
	return false;
};

Grid.prototype.markDirty = function(row, field) {
	
	var grid = this.grid,
		hash = grid.getCellCssStyles("highlight") || {},
		items = hash[row] || {};
	
	items[field] = "dirty";
	hash[row] = items;

	grid.setCellCssStyles("highlight", hash);
	grid.invalidateAllRows();
	grid.render();
};

Grid.prototype.clearDirty = function(row) {
	var grid = this.grid,
		hash = grid.getCellCssStyles("highlight") || {};

	if (row === null || row === undefined) {
		hash = {};
	} else {
		delete hash[row];
	}
	
	grid.setCellCssStyles("highlight", hash);
	grid.invalidateAllRows();
	grid.render();
};

Grid.prototype.focusInvalidCell = function(args) {
	var grid = this.grid,
		formCtrl = this.editorForm.children('form').data('$formController'),
		error = formCtrl.$error || {};
	
	for(var name in error) {
		var errors = error[name] || [];
		if (errors.length) {
			var name = errors[0].$name,
				cell = grid.getColumnIndex(name);
			if (cell > -1) {
				grid.setActiveCell(args.row, cell);
				grid.editActiveCell();
				break;
			}
		}
	}
};

Grid.prototype.onAddNewRow = function(event, args) {
	var scope = this.scope,
		grid = this.grid,
		dataView = scope.dataView,
		item = args.item;

	if (!item.id) {
		item.id = 0;
		grid.invalidateRow(dataView.length);
		dataView.addItem(item);
	    
		grid.updateRowCount();
	    grid.render();
	}
};

Grid.prototype.setEditors = function(form, formScope, forEdit) {
	var grid = this.grid,
		data = this.scope.dataView,
		element = this.element;
	
	forEdit = forEdit === undefined ? true : forEdit;

	grid.setOptions({
		editable: true,
		asyncEditorLoading: false,
		enableAddRow: forEdit,
		editorLock: new Slick.EditorLock()
	});
	
	form.prependTo(element).hide();
	formScope.onChangeNotify = function(scope, values) {
		var item, editor, cell = grid.getActiveCell();
		if (cell == null || formScope.record !== scope.record) {
			return;
		}
		item = grid.getDataItem(cell.row);
		if (item) {
			editor = grid.getCellEditor();
			if (grid.getEditorLock().isActive()) {
				grid.getEditorLock().commitCurrentEdit();
			}
			item = _.extend(item, values);

			grid.updateRowCount();
			grid.invalidateRow(cell.row);
			grid.render();
			
			grid.setActiveCell(cell.row, cell.cell);
			
			if (editor) {
				grid.editActiveCell();
			}
		}
	};

	// delegate isDirty to the dataView
	data.canSave = _.bind(this.canSave, this);
	data.saveChanges = _.bind(this.saveChanges, this);
	
	if (!forEdit) {
		formScope.setEditable(false);
	}
	
	this.editorForm = form;
	this.editorScope = formScope;
	this.editorForEdit = forEdit;
	this.editable = true;
};

Grid.prototype.onSelectionChanged = function(event, args) {
	if (this.handler.onSelectionChanged)
		this.handler.onSelectionChanged(event, args);
};

Grid.prototype.onCellChange = function(event, args) {
	var grid = this.grid,
		cols = grid.getColumns(),
		name = cols[args.cell].field;

	this.markDirty(args.row, name);
};

Grid.prototype.onSort = function(event, args) {
	if (this.canSave())
		return;
	if (this.handler.onSort)
		this.handler.onSort(event, args);
};

Grid.prototype.onButtonClick = function(event, args) {
	
	if ($(event.srcElement).is('.readonly')) {
		event.stopImmediatePropagation();
		return false;
	}
	
	var grid = this.grid;
	var data = this.scope.dataView;
	var cols = this.getColumn(args.cell);
	var field = (cols || {}).descriptor || {};
	
	if (field.handler) {
		
		var handlerScope = this.scope.handler;
		var model = handlerScope._model;
		var record = data.getItem(args.row) || {};
		
		field.handler.scope.record = record;
		if(field.prompt) {
			field.handler.prompt = field.prompt;
		}
		field.handler.scope.getContext = function() {
			return _.extend({
				_model: model,
			}, record);
		};
		field.handler.onClick().then(function(res){
			grid.invalidateRows([args.row]);
			grid.render();
		});
	}
};

Grid.prototype.onItemClick = function(event, args) {
	if (this.grid.getEditorLock().isActive()) {
		this.grid.getEditorLock().commitCurrentEdit();
	}
	// prevent edit if some action is still in progress
	if (this.isDirty() && axelor.blockUI()) {
		event.stopImmediatePropagation();
		return false;
	}
	// checkbox column
	if (this.scope.selector && args.cell == 0) {
		return false;
	}

	//XXX: hack to show popup grid (selector and editable in conflict?)
	if (this.scope.selector && this.editable) {
		var col = this.grid.getColumns()[args.cell] || {},
			field = col.descriptor || {};
		if (col.forEdit !== false &&
				(field.type === 'one-to-many' || field.type === 'many-to-many')) {
			this.grid.setActiveCell(args.row, args.cell);
			this.grid.editActiveCell();
			event.preventDefault();
			event.stopImmediatePropagation();
			return false;
		}
	}

	var source = $(event.target);
	if (source.is('img.slick-img-button,i.slick-icon-button')) {
		return this.onButtonClick(event, args);
	}
	
	if (!this.scope.selector && this.editable) {
		return this.grid.setActiveCell();
	}
	if (this.handler.onItemClick) {
		this.handler.onItemClick(event, args);
	}
};

Grid.prototype.onItemDblClick = function(event, args) {
	
	if ($(event.srcElement).is('img.slick-img-button,i.slick-icon-button')) {
		return this.onButtonClick(event, args);
	}
	
	var col = this.grid.getColumns()[args.cell];
	if (col.id === '_edit_column') return;
	var item = this.grid.getDataItem(args.row) || {};
	if (item.__group || item.__groupTotals) {
		return;
	}
	if (this.canSave())
		return;
	if (this.handler.onItemDblClick)
		this.handler.onItemDblClick(event, args);
	event.stopImmediatePropagation();
};

Grid.prototype.onRowCountChanged = function(event, args) {
	this.grid.updateRowCount();
	this.grid.render();
};

Grid.prototype.onRowsChanged = function(event, args) {
	var grid = this.grid,
		data = this.scope.dataView,
		forEdit = this.editorForEdit;
	
	if(this.editable && !data.getItemById(0)) {
		grid.setOptions({
			enableAddRow: forEdit === undefined ? true : forEdit
		});
	}
	
	if (!this.isDirty()) {
		this.clearDirty();
	}
	grid.invalidateRows(args.rows);
	grid.render();
};

Grid.prototype.groupBy = function(names) {
	
	var data = this.scope.dataView,
		cols = this.grid.getColumns();
	
	var aggregators = _.map(cols, function(col) {
		var field = col.descriptor;
		if (!field) return null;
		if (field.aggregate === "sum") {
			return new Slick.Data.Aggregators.Sum(field.name);
		}
		if (field.aggregate === "avg") {
			return new Slick.Data.Aggregators.Avg(field.name);
		}
		if (field.aggregate === "min") {
			return new Slick.Data.Aggregators.Min(field.name);
		}
		if (field.aggregate === "max") {
			return new Slick.Data.Aggregators.Max(field.name);
		}
	});
	
	aggregators = _.compact(aggregators);
	
	var all = names;

	if (_.isString(all)) {
		all = all.split(/\s*,\s*/);
	}
	
	var grouping = _.map(all, function(name) {
		
		var col = this.getColumn(name),
			field = col.descriptor,
			formatter = Formatters[field.selection ? 'selection' : field.type];
		
		return {
			getter: function(item) {
				if (formatter) {
					return formatter(field, item[name]);
				}
				return item[name];
			},
			formatter: function(g) {
				var title = col.name + ": " + g.value;
				return '<span class="slick-group-text">' + title + '</span>' + ' ' +
					   '<span class="slick-group-count">' + _t("({0} items)", g.count) + '</span>';
			},
			aggregators: aggregators,
			collapsed: true,
			aggregateCollapsed: false
		};
	}, this);
	
	data.setGrouping(grouping);
};

function EditIconColumn(options) {

	var _grid;
    var _self = this;
    var _handler = new Slick.EventHandler();
    
    var _opts = _.extend({
    	onClick: angular.noop
    }, options);

    function init(grid) {
    	_grid = grid;
    	_handler.subscribe(grid.onClick, handleClick);
    };
    
    function handleClick(e, args) {
    	if (_grid.getColumns()[args.cell].id !==  '_edit_column' || !$(e.target).is("i")) {
    		return;
    	}
    	return _opts.onClick(e, args);
    }
    
    function destroy() {
    	_handler.unsubscribeAll();
    }
    	
    function editFormatter(row, cell, value, columnDef, dataContext) {
    	if (!dataContext || !dataContext.id) return "";
    	return '<i class="icon-pencil"></i>';
    }

    function getColumnDefinition() {
		return {
			id : '_edit_column',
			name : "<span class='slick-column-name'>&nbsp;</span>",
			field : "edit",
			width : 24,
			resizable : false,
			sortable : false,
			cssClass: 'edit-icon',
			formatter : editFormatter
		};
	}
    
    $.extend(this, {
		"init": init,
		"destroy": destroy,
		
		"getColumnDefinition": getColumnDefinition
	});
}

ui.directive('uiSlickEditors', function() {
	
	return {
		restrict: 'EA',
		replace: true,
		controller: ['$scope', '$element', 'DataSource', 'ViewService', function($scope, $element, DataSource, ViewService) {
			ViewCtrl($scope, DataSource, ViewService);
			FormViewCtrl.call(this, $scope, $element);
			$scope.setEditable();
			$scope.onShow = function(viewPromise) {
				
			};

			var _getContext = $scope.getContext;
			$scope.getContext = function() {
				var context = _getContext();
				var handler = $scope.handler || {};
				if (context && handler.field && handler.field.target) {
					context._parent = handler.getContext();
				}
				return context;
			};
			
			$scope.show();
		}],
		link: function(scope, element, attrs) {

			var grid = null;
			scope.canWatch = function () {
				if (!scope.grid || !scope.grid.$$initialized) {
					return false;
				}
				if (grid === null) {
					grid = scope.grid.grid;
					return true;
				}
				return grid.getEditorLock().isActive();
			};
		},
		template: '<div ui-view-form x-handler="true" ui-watch-if="canWatch()"></div>'
	};
});

ui.directive('uiSlickGrid', ['ViewService', 'ActionService', function(ViewService, ActionService) {
	
	var types = {
		'one-to-many' : 'one-to-many-inline',
		'many-to-many' : 'many-to-many-inline'
	};

	function makeForm(scope, model, items, fields, forEdit) {

		var _fields = fields || {},
			_items = [];
		
		_.each(items, function(item) {
			var field = _fields[item.name] || item,
				type = types[field.type];

			if (!type && !forEdit) {
				return item.forEdit = false;
			}
			
			var params = _.extend({}, item, { showTitle: false });
			if (type) {
				params.widget = type;
				params.canEdit = forEdit;
			}

			_items.push(params);
		});

		var schema = {
			cols: _items.length,
			colWidths: '=',
			viewType : 'form',
			items: _items
		};

		scope._viewParams = {
			model: model,
			views: [schema]
		};

		return ViewService.compile('<div ui-slick-editors></div>')(scope);
	};
	
	return {
		restrict: 'EA',
		replace: false,
		scope: {
			'view'		: '=',
			'dataView'	: '=',
			'handler'	: '=',
			'selector'	: '@',
			'editable'	: '@',
			'noFilter'	: '@',
			'onInit'	: '&',
			'onBeforeSave'	: '&',
			'onAfterSave'	: '&'
		},
		link: function(scope, element, attrs) {

			var grid = null,
				schema = null,
				handler = scope.handler,
				initialized = false;

			function doInit() {
				if (initialized || !schema || !scope.dataView) return;
				initialized = true;

				if (attrs.editable === "false") {
					schema.editable = false;
				}
				scope.selector = attrs.selector;
				scope.noFilter = attrs.noFilter;

				var forEdit = schema.editable || false,
					canEdit = schema.editable || false,
					hasMulti = false;

				hasMulti = _.find(schema.items, function(item) {
					var field = handler.fields[item.name] || {};
					return _.str.endsWith(field.type, '-many');
				});

				if (hasMulti) {
					canEdit = true;
				}

				var form = null,
					formScope = null;
				
				if (canEdit) {
					formScope = scope.$new();
					form = makeForm(formScope, handler._model, schema.items, handler.fields, forEdit);
				}
								
				grid = new Grid(scope, element, attrs, ViewService, ActionService);
				if (form) {
					formScope.grid = grid;
					grid.setEditors(form, formScope, forEdit);
				}
			};

			element.addClass('slickgrid').hide();
			var unwatch = scope.$watch("view.loaded", function(viewLoaded) {
				if (!viewLoaded || !scope.dataView) {
					return;
				}
				unwatch();
				schema = scope.view;
				element.show();
				doInit();
			});
		}
	};
}]);

})();