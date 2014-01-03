/*
 * Copyright (c) 2012-2014 Axelor. All Rights Reserved.
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
 * Copyright (c) 2012-2014 Axelor. All Rights Reserved.
 */
(function(){

var ui = angular.module("axelor.ui");

ui.OneToManyCtrl = OneToManyCtrl;
ui.OneToManyCtrl.$inject = ['$scope', '$element', 'DataSource', 'ViewService'];

function OneToManyCtrl($scope, $element, DataSource, ViewService, initCallback) {

	ui.RefFieldCtrl.call(this, $scope, $element, DataSource, ViewService, function(){
		GridViewCtrl.call(this, $scope, $element);
		$scope.editorCanSave = false;
		$scope.selectEnable = false;
		if (initCallback) {
			initCallback();
		}
	});

	var embedded = null,
		detailView = null;

	$scope.createNestedEditor = function() {

		embedded = $('<div ui-embedded-editor class="inline-form"></div>');
		embedded.attr('x-title', $element.attr('x-title'));
		embedded = ViewService.compile(embedded)($scope);
		embedded.hide();
		
		$element.append(embedded);
		embedded.data('$rel', $element.children('.slickgrid:first').children('.slick-viewport'));

		return embedded;
	};
	
	var _showNestedEditor = $scope.showNestedEditor;
	$scope.showNestedEditor = function(show, record) {
		_showNestedEditor(show, record);
		if (embedded) {
			embedded.data('$rel').hide();
			embedded.data('$scope').edit(record);
		}
		return embedded;
	};
	
	$scope.showDetailView = function() {
		if (detailView == null) {
			detailView = $('<div ui-embedded-editor class="detail-form"></div>').attr('x-title', $element.attr('x-title'));
			detailView = ViewService.compile(detailView)($scope);
			detailView.data('$rel', $());
			detailView.data('$scope').isDetailView = true;
			$element.after(detailView);
		}
		var es = detailView.data('$scope');
		detailView.toggle(es.visible = !es.visible);
	};
	
	$scope.select = function(value) {
		var items = value,
			records;
	
		if (!_.isArray(value)) {
			items = [value];
		}

		records = _.map($scope.getItems(), function(item){
			return _.clone(item);
		});

		_.each(items, function(item){
			item = _.clone(item);
			var find = _.find(records, function(rec){
				return rec.id && rec.id == item.id;
			});
			
			if (find)
				_.extend(find, item);
			else
				records.push(item);
		});
		
		_.each(records, function(rec){
			if (rec.id <= 0) rec.id = null;
		});
		
		$scope.setValue(records, true);
		$scope.applyLater(function(){
			$scope.$broadcast('grid:changed');
		});
	};
	
	var _setItems = $scope.setItems;
	$scope.setItems = function(items) {
		_setItems(items);
		if (embedded !== null) {
			embedded.data('$scope').onClose();
		}
		if (detailView !== null)
		if (items === null || _.isEmpty(items))
			detailView.hide();
		else
			detailView.show();
	};
	
	$scope.removeItems = function(items, fireOnChange) {
		var all, ids, records;
		
		if (_.isEmpty(items)) return;
		
		all = _.isArray(items) ? items : [items];
		
		ids = _.map(all, function(item) {
			return _.isNumber(item) ? item : item.id;
		});

		records = _.filter($scope.getItems(), function(item) {
			return ids.indexOf(item.id) === -1;
		});
		
		$scope.setValue(records, fireOnChange);
		$scope.applyLater();
	};

	$scope.removeSelected = function(selection) {
		if (_.isEmpty(selection)) return;
		var items = _.map(selection, function(i) {
			return $scope.getItem(i);
		});
		return $scope.removeItems(items, true);
	};
	
	$scope.canEdit = function () {
		var selected = $scope.selection.length ? $scope.selection[0] : null;
		return $scope.canView() && selected !== null;
	};
	
	var _canRemove = $scope.canRemove;
	$scope.canRemove = function () {
		var selected = $scope.selection.length ? $scope.selection[0] : null;
		return _canRemove() && selected !== null;
	};
	
	$scope.onEdit = function() {
		var selected = $scope.selection.length ? $scope.selection[0] : null;
		if (selected !== null) {
			var record = $scope.dataView.getItem(selected);
			$scope.showEditor(record);
		}
	};
	
	$scope.onRemove = function() {
		if (this.isReadonly()) {
			return;
		}
		axelor.dialogs.confirm(_t("Do you really want to delete the selected record(s)?"), function(confirmed){
			if (confirmed && $scope.selection && $scope.selection.length)
				$scope.removeSelected($scope.selection);
		});
	};
	
	$scope.onSummary = function() {
		var selected = $scope.getSelectedRecord();
		if (selected) {
			$scope.showNestedEditor(true, selected);
		}
	};
	
	$scope.getSelectedRecord = function() {
		var selected = _.first($scope.selection || []);
		if (_.isUndefined(selected))
			return null;
		return $scope.dataView.getItem(selected);
	};
	
	var _onSelectionChanged = $scope.onSelectionChanged;
	$scope.onSelectionChanged = function(e, args) {
		_onSelectionChanged(e, args);
		if (detailView === null)
			return;
		setTimeout(function(){
			detailView.show();
			detailView.data('$scope').edit($scope.getSelectedRecord());
		});
	};
	
	$scope.onItemDblClick = function(event, args) {
		if($scope.canView()){
			$scope.onEdit();
			$scope.$apply();
		}
	};

	$scope.filter = function() {
		
	};
	
	$scope.onSort = function(event, args) {
		
		//TODO: implement client side sorting (prevent losing O2M changes).
		if ($scope.isDirty() && !$scope.editorCanSave) {
			return;
		}

		var records = $scope.getItems();
		if (records == null || records.length == 0)
			return;

		var sortBy = [];
		
		angular.forEach(args.sortCols, function(column){
			var name = column.sortCol.field;
			var spec = column.sortAsc ? name : '-' + name;
			sortBy.push(spec);
		});
		
		var ids = _.pluck(records, 'id');
		var criterion = {
			'fieldName': 'id',
			'operator': 'in',
			'value': ids
		};

		var fields = _.pluck($scope.fields, 'name');
		var filter = {
			operator: 'and',
			criteria: [criterion]
		};
		
		$scope.selection = [];
		$scope._dataSource.search({
			filter: filter,
			fields: fields,
			sortBy: sortBy,
			archived: true,
			limit: -1,
			domain: null,
			context: null
		});
	};
	
	$scope.onShow = function(viewPromise) {

	};
	
	$scope.show();
}

ui.ManyToManyCtrl = ManyToManyCtrl;
ui.ManyToManyCtrl.$inject = ['$scope', '$element', 'DataSource', 'ViewService'];

function ManyToManyCtrl($scope, $element, DataSource, ViewService) {

	OneToManyCtrl.call(this, $scope, $element, DataSource, ViewService, function(){
		$scope.editorCanSave = true;
		$scope.selectEnable = true;
	});
	
	var _setValue = $scope.setValue;
	$scope.setValue = function(value, trigger) {
		var compact = _.map(value, function(item) {
			return {
				id: item.id,
				$version: item.version
			};
		});
		_setValue(compact, trigger);
	};
}

ui.formInput('OneToMany', {
	
	css: 'one2many-item',
	
	transclude: true,
	
	showTitle: false,
	
	collapseIfEmpty: true,
	
	controller: OneToManyCtrl,
	
	link: function(scope, element, attrs, model) {

		scope.ngModel = model;
		scope.title = attrs.title;
		
		scope.formPath = scope.formPath ? scope.formPath + "." + attrs.name : attrs.name;
		
		var dummyId = 0;

		function ensureIds(records) {
			var items = [];
			angular.forEach(records, function(record){
				var item = angular.copy(record, {});
				if (item.id == null)
					item.id = --dummyId;
				items.push(item);
			});
			return items;
		};
		
		function fetchData() {
			var items = scope.getValue();
			scope.fetchData(items, function(records){
				records =  ensureIds(records);
				scope.setItems(records);
			});
		}

		var doRenderUnwatch = null;
		var doViewPromised = false;

		function doRender() {
			if (doRenderUnwatch) {
				return;
			}
			doRenderUnwatch = scope.$watch(function () {
				if (!isVisible() || !doViewPromised) {
					return;
				}
				doRenderUnwatch();
				doRenderUnwatch = null;
					fetchData();
				});
		};
		
		function isVisible() {
			return element.parents('.tab-content.form-item').filter(':hidden').size() === 0;
		}

		scope._viewPromise.then(function () {
			doViewPromised = true;
			if (doRenderUnwatch) {
				doRenderUnwatch();
				doRenderUnwatch = null;
				doRender();
			}
			});

		model.$render = doRender;
		
		var adjustSize = (function() {
			var rowSize = 26,
				minSize = 56,
				maxSize = (rowSize * 10) + minSize;
			var inc = 0;
			return function(value) {
				inc = arguments[1] || inc;
				var count = _.size(value) + inc, height = minSize;
				if (count > 0) {
					height = (rowSize * count) + (minSize + rowSize);
				}
				element.css('min-height', Math.min(height, maxSize));
				axelor.$adjustSize();
			};
		})();
		
		if (this.collapseIfEmpty) {
			scope.$watch(attrs.ngModel, function(value){
				adjustSize(value);
			});
		}

		scope.onGridInit = function(grid) {
			var editable = grid.getOptions().editable;
			if (editable) {
				element.addClass('inline-editable');
				scope.$on('on:new', function(event){
					if (scope.dataView.getItemById(0)) {
						scope.dataView.deleteItem(0);
					}
					grid.setOptions({enableAddRow: true});
				});

				scope.$watch("isReadonly()", function(readonly) {
					grid.setOptions({
						editable: !readonly
					});
				});
				adjustSize(scope.getValue(), 1);
			}

			if (!(scope._viewParams || {}).summaryView) {
				return;
			}
			var col = {
				id: '_summary',
				name: '<span>&nbsp;</span>',
				sortable: false,
				resizable: false,
				width: 16,
				formatter: function(row, cell, value, columnDef, dataContext) {
					return '<i class="icon-caret-right" style="display: inline-block; cursor: pointer; padding: 2px 8px; font-size: 15.5px;"></i>';
				}
			};
			
			var cols = grid.getColumns();
			cols.splice(0, 0, col);
			
			grid.setColumns(cols);
			grid.onClick.subscribe(function(e, args) {
				if ($(e.target).is('.icon-caret-right'))
					setTimeout(function(){
						scope.onSummary();
					});
			});
		};
		
		scope.onGridBeforeSave = function(records) {
			if (!scope.editorCanSave) {
				if (scope.dataView.getItemById(0)) {
					scope.dataView.deleteItem(0);
				}
				scope.select(records);
				return false;
			}
			return true;
		};

		scope.onGridAfterSave = function(records, args) {
			if (scope.editorCanSave) {
				scope.select(records);
			}
		};
		
		scope.isDisabled = function() {
			return this.isReadonly();
		};

		var field = scope.field;
		if (field.widgetName === 'MasterDetail') {
			setTimeout(function(){
				scope.showDetailView();
			});
		}

		attrs.$observe('title', function(title){
			scope.title = title;
		});
	},
	
	template_editable: null,
	
	template_readonly: null,
	
	template:
	'<div class="stackbar">'+
	'<div class="navbar">'+
		'<div class="navbar-inner">'+
			'<div class="container-fluid">'+
				'<span class="brand" href="" ui-help-popover ng-bind-html-unsafe="title"></span>'+
				'<span class="icons-bar pull-right" ng-show="!isReadonly()">'+
					'<i ng-click="onEdit()" ng-show="hasPermission(\'read\') && canEdit()" title="{{\'Edit\' | t}}" class="icon-pencil"></i>'+
					'<i ng-click="onNew()" ng-show="hasPermission(\'write\') && !isDisabled() && canNew()" title="{{\'New\' | t}}" class="icon-plus"></i>'+
					'<i ng-click="onRemove()" ng-show="hasPermission(\'remove\') && !isDisabled() && canRemove()" title="{{\'Remove\' | t}}" class="icon-minus"></i>'+
					'<i ng-click="onSelect()" ng-show="hasPermission(\'read\') && !isDisabled() && canSelect()" title="{{\'Select\' | t}}" class="icon-search"></i>'+
				'</span>'+
			'</div>'+
		'</div>'+
	'</div>'+
	'<div ui-view-grid ' +
		'x-view="schema" '+
		'x-data-view="dataView" '+
		'x-handler="this" '+
		'x-no-filter="true" '+
		'x-on-init="onGridInit" '+
		'x-on-before-save="onGridBeforeSave" '+
		'x-on-after-save="onGridAfterSave" '+
		'></div>'+
	'</div>'
});

ui.formInput('ManyToMany', 'OneToMany', {
	
	css	: 'many2many-item',
	
	controller: ManyToManyCtrl
});

ui.formInput('TagSelect', 'ManyToMany', 'MultiSelect', {

	css	: 'many2many-tags',

	showTitle: true,
	
	init: function(scope) {
		this._super(scope);

		var nameField = scope.field.targetName || 'id';
		
		scope.parse = function(value) {
			return value;
		};

		scope.formatItem = function(item) {
			return item ? item[nameField] : item;
		};

		scope.getItems = function() {
			return _.pluck(this.getSelection(), "value");
		};
		
		scope.handleClick = function(e, item) {
        	scope.showEditor(item);
        };
	},

	link_editable: function(scope, element, attrs, model) {
		this._super.apply(this, arguments);
		
		var input = this.findInput(element);
		var field = scope.field;
		var targetFields = null;
		var requiredFields = (field.create||"").split(/,\s*/);

		function createItem(fields, term, popup) {
			var ds = scope._dataSource,
				data = {}, missing = false;

			_.each(fields, function(field) {
				if (field.name === "name") return data["name"] = term;
				if (field.name === "code") return data["code"] = term;
				if (field.nameColumn) return data[field.name] = term;
				if (requiredFields.indexOf(field.name) > -1) {
					return data[field.name] = term;
				}
				if (field.required) {
					missing = true;
				}
			});
			if (popup || missing || _.isEmpty(data)) {
				return scope.showPopupEditor(data);
			}
			ds.save(data).success(function(record){
				scope.select(record);
				input.width(50);
			});
		}
		
		function create(term, popup) {
			if (targetFields) {
				return createItem(targetFields, term, popup);
			}
			scope.loadView("form").success(function(fields, view){
				targetFields = fields;
				return createItem(fields, term, popup);
			});
		}

		scope.loadSelection = function(request, response) {

			var canSelect = field.canSelect !== false;
			var canCreate = field.canNew !== false;

			if (!canSelect) {
				return response([]);
			}

			this.fetchSelection(request, function(items) {
				var term = request.term;
				if (term && canCreate) {
					items.push({
						label : _t('Create "{0}" and add...', '<b>' + term + '</b>'),
						click : function() { create(term); }
					});
					items.push({
						label : _t('Create "{0}"...', '<b>' + term + '</b>'),
						click : function() { create(term, true); }
					});
				}
				if (term && canSelect) {
					items.push({
						label : _t("Search..."),
						click : function() { scope.showSelector(); }
					});
				}
				if (!term && canSelect) {
					items.push({
						label: _t("Search..."),
						click: function() { scope.showSelector(); }
					});
				}
				if (!term && canCreate) {
					items.push({
						label: _t("Create..."),
						click: function() { scope.showPopupEditor(); }
					});
				}
				response(items);
			});
		};

		scope.matchValues = function(a, b) {
			if (a === b) return true;
			if (!a) return false;
			if (!b) return false;
			return a.id === b.id;
		};

		var _setValue = scope.setValue;
		scope.setValue = function(value, fireOnChange) {
			var items = _.map(value, function(item) {
				if (item.version === undefined) {
					return item;
				}
				var ver = item.version;
				var val = _.omit(item, "version");
				val.$version = ver;
				return val;
			});
			items = _.isEmpty(items) ? null : items;
			return _setValue.call(this, items, fireOnChange);
		};
		
		var _handleSelect = scope.handleSelect;
		scope.handleSelect = function(e, ui) {
			if (ui.item.click) {
				setTimeout(function(){
					input.val("");
				});
				ui.item.click.call(scope);
				return scope.applyLater();
			}
			return _handleSelect.apply(this, arguments);
		};

		var _removeItem = scope.removeItem;
		scope.removeItem = function(e, ui) {
			if (field.canRemove === false) return;
			_removeItem.apply(this, arguments);
		};
	}
});

ui.formInput('OneToManyInline', 'OneToMany', {

	css	: 'one2many-inline',

	collapseIfEmpty : false,
	
	link: function(scope, element, attrs, model) {
		
		this._super.apply(this, arguments);

		scope.onSort = function() {
			
		};
		
		var field = scope.field;
		var input = element.children('input');
		var grid = element.children('[ui-slick-grid]');
		
		var container = null;
		var wrapper = $('<div class="slick-editor-dropdown"></div>')
			.css("position", "absolute")
			.hide();

		var render = model.$render,
			renderPending = false;
		model.$render = function() {
			if (wrapper.is(":visible")) {
				renderPending = false;
				render();
				grid.trigger('adjustSize');
			} else {
				renderPending = true;
			}
		};
		
		setTimeout(function(){
			container = element.parents('.ui-dialog-content,.view-container').first();
			grid.height(175).appendTo(wrapper);
			wrapper.height(175).appendTo(container);
		});
		
		function adjust() {
			if (!wrapper.is(":visible"))
				return;
			wrapper.position({
				my: "left top",
				at: "left bottom",
				of: element,
				within: container
			})
			.zIndex(element.zIndex() + 1)
			.width(element.width());
		}
		
		element.on("show:slick-editor", function(e){
			if (renderPending) {
				renderPending = false;
				render();
			}
			wrapper.show();
			adjust();
		});

		element.on("hide:slick-editor", function(e){
			wrapper.hide();
		});
		
		element.on("adjustSize", _.debounce(adjust, 300));
		
		function hidePopup(e) {
			if (element.is(':hidden')) {
				return;
			}
			var all = element.add(wrapper);
			var elem = $(e.target);
			if (all.is(elem) || all.has(elem).size() > 0) return;
			if (elem.zIndex() > element.parents('.slickgrid:first').zIndex()) return;

			element.trigger('close:slick-editor');
		}
		
		$(document).on('mousedown.mini-grid', hidePopup);
		
		scope.$watch(attrs.ngModel, function(value) {
			var text = "";
			if (value && value.length)
				text = "(" + value.length + ")";
			input.val(text);
		});
		
		scope.$watch('schema.loaded', function(viewLoaded) {
			var schema = scope.schema;
			if (schema && field.canEdit === false) {
				schema.editIcon = false;
			}
		});
		
		scope.$on("$destroy", function(e){
			wrapper.remove();
			$(document).off('mousedown.mini-grid', hidePopup);
		});

		scope.canEdit = function () {
			return scope.hasPermission('create') && !scope.isReadonly() && field.canEdit !== false;
		};
		
		scope.canRemove = function() {
			return scope.hasPermission('create') && !scope.isReadonly() && field.canEdit !== false;
		};
	},
	
	template_editable: null,
	
	template_readonly: null,
	
	template:
	'<span class="picker-input picker-icons-2" style="position: absolute;">'+
		'<input type="text" readonly>'+
		'<span class="picker-icons">'+
			'<i class="icon-plus" ng-click="onNew()" ng-show="canEdit()" title="{{\'Select\' | t}}"></i>'+
			'<i class="icon-minus" ng-click="onRemove()" ng-show="canRemove()" title="{{\'Select\' | t}}"></i>'+
		'</span>'+
		'<div ui-view-grid ' +
			'x-view="schema" '+
			'x-data-view="dataView" '+
			'x-handler="this" '+
			'x-no-filter="true" '+
			'x-on-init="onGridInit" '+
			'x-on-before-save="onGridBeforeSave" '+
			'x-on-after-save="onGridAfterSave" '+
			'></div>'+
	'</span>'
});

ui.formInput('ManyToManyInline', 'OneToManyInline', {
	
	css	: 'many2many-inline',
	
	controller: ManyToManyCtrl,
	
	link: function(scope, element, attrs, model) {
		this._super.apply(this, arguments);
		scope.onNew = scope.onSelect;
	}
});

FormTrailCtrl.$inject = ['$scope', '$element', 'DataSource', 'ViewService'];
function FormTrailCtrl($scope, $element, DataSource, ViewService) {

	OneToManyCtrl.call(this, $scope, $element, DataSource, ViewService);

	$scope.records = [];
	
	$scope.getFetchFields = function() {
		return null;
	};

	$scope.fetchRecords = function(options) {
		$scope.fields = undefined;
		var items = $scope.getValue();
		return $scope.fetchData(items, function(records){
			$scope.records = records;
		});
	};

	var view = $scope._views["form"] || {};
	var viewPromise = null;

	$scope.show = function() {
		if (viewPromise == null) {
			viewPromise = $scope.loadView("form", view.name);
			viewPromise.success(function(fields, schema){
				$scope.fields = fields;
				$scope.schema = schema;
				$scope._viewResolver.resolve(schema, $element);
			});
		}
	};

	$scope.show();
}

ui.formInput('FormTrail', 'OneToMany', {
	
	controller: FormTrailCtrl,
	
	link: function(scope, element, attrs, model) {

		var promise = scope._viewPromise;
		
		model.$render = function() {
			promise.then(function(){
				scope.fetchRecords();
			});
		};
	},
	
	template_readonly: null,
	template_editable: null,
	template: '<div>' +
		'<div ui-form-list></div>'+
	'</div>'
});

}).call(this);