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
ViewCtrl.$inject = ['$scope', 'DataSource', 'ViewService'];
function ViewCtrl($scope, DataSource, ViewService) {

	if ($scope._viewParams == null) {
		$scope._viewParams = $scope.selectedTab;
	}

	if ($scope._viewParams == null) {
		throw "View parameters are not provided.";
	}

	var params = $scope._viewParams;

	$scope._views = ViewService.accept(params);
	$scope._viewType = params.viewType;

	$scope._model = params.model;
	$scope._fields = {};

	$scope._dataSource = null;
	$scope._domain = params.domain;
	$scope._context = params.context;
	
	if (params.model) {
		$scope._dataSource = DataSource.create(params.model, params);
	}
	
	$scope._defer = function() {
		return ViewService.defer();
	};

	$scope.loadView = function(viewType, viewName) {
		var view = $scope._views[viewType];
		if (view == null) {
			view = {
				type: viewType,
				name: viewName
			};
		}
		return ViewService.getMetaDef($scope._model, view);
	};
	
	$scope.updateRoute = function() {
		this.$emit("on:update-route");
	};

	$scope.getRouteOptions = function() {
		throw "Not Implemented.";
	};
	
	$scope.setRouteOptions = function(options) {
		throw "Not Implemented.";
	};
	
	var switchedTo = null;

	$scope.switchTo = function(viewType, /* optional */ callback) {

		var view = $scope._views[viewType];
		if (view == null) {
			return;
		}
		
		var promise = view.deferred.promise;
		promise.then(function(viewScope){

			if (viewScope == null || switchedTo === viewType) {
				return;
			}
			
			switchedTo = viewType;

			$scope._viewType = viewType;
			$scope._viewParams.viewType = viewType; //XXX: remove
			$scope._viewParams.$viewScope = viewScope;
			
			viewScope.show();
			
			if (viewScope.updateRoute) {
				viewScope.updateRoute();
			}

			if (callback) {
				callback(viewScope);
			}
		});
	};
	
	if (!params.action) {
		return;
	}
	
	// hide toolbar button titles
	$scope.tbTitleHide = __appSettings['application.view.toolbar-title'] === 'hide';

	// show single or default record if specified
	var context = params.context || {};
	if (context._showSingle || context._showRecord) {
		var ds = DataSource.create(params.model, params);
		
		function doEdit(id, readonly) {
			$scope.switchTo('form', function(scope){
				scope._viewPromise.then(function(){
					scope.doRead(id).success(function(record){
						scope.edit(record);
						if (readonly) scope.setEditable(false);
					});
				});
			});
		}
		
		if (context._showRecord > 0) {
			params.viewType = "form";
			return $scope.switchTo('form');
		}

		return ds.search({
			offset: 0,
			limit: 2,
			fields: ["id"]
		}).success(function(records, page){
			if (page.total === 1 && records.length === 1) {
				return doEdit(records[0].id, true);
			}
			return $scope.switchTo($scope._viewType || 'grid');
		});
	}
	
	// switch to the the current viewType
	$scope.switchTo($scope._viewType || 'grid');
}

/**
 * Base controller for DataSource views. This controller should not be used
 * directly but actual controller should inherit from it.
 * 
 */
function DSViewCtrl(type, $scope, $element) {

	if (type == null) {
		throw "No view type provided.";
	}
	if ($scope._dataSource == null) {
		throw "DataSource is not provided.";
	}
	
	$scope._viewResolver = $scope._defer();
	$scope._viewPromise = $scope._viewResolver.promise;
	
	var ds = $scope._dataSource;
	var view = $scope._views[type] || {};
	var viewPromise = null;
	var hiddenButtons = {};

	$scope.fields = {};
	$scope.schema = null;
	
	$scope.show = function() {
		if (viewPromise == null) {
			viewPromise = $scope.loadView(type, view.name);
			viewPromise.success(function(fields, schema){
				var toolbar = [];
				_.each(schema.toolbar, function(button){
					button.custom = true;
					if (/^(new|edit|save|delete|copy|cancel|back|refresh|search|export|log|files)$/.test(button.name)) {
						hiddenButtons[button.name] = button;
						button.custom = false;
					}
					toolbar.push(button);
				});
				if (schema.title) {
					$scope.viewTitle = schema.title;
				}
				$scope.fields = fields;
				$scope.schema = schema;
				$scope.toolbar = toolbar;
				$scope.menubar = schema.menubar;

				// watch on view.loaded to improve performance
				schema.loaded = true;
			});
		}
		
		$scope.onShow(viewPromise);
	};
	
	$scope.onShow = function(promise) {
		
	};

	$scope.canNext = function() {
		return ds && ds.canNext();
	};

	$scope.canPrev = function() {
		return ds && ds.canPrev();
	};
	
	$scope.getPageSize = function() {
		var page = ds && ds._page;
		if (page) {
			return page.limit;
		}
		return 40;
	};

	$scope.setPageSize = function(value) {
		var page = ds && ds._page,
			limit = Math.max(0, +value) || 40;
		if (page && page.limit != limit) {
			page.limit = limit;
			$scope.onRefresh();
		}
	};
	
	var can = (function (scope) {
		var fn = null;
		var perms = {
			'new': 'create',
			'copy': 'create',
			'edit': 'write',
			'save': 'write',
			'delete': 'remove',
			'export': 'export'
		};
		var actions = {
			'new': 'canNew',
			'edit': 'canEdit',
			'save': 'canSave',
			'copy': 'canCopy',
			'delete': 'canDelete',
			'attach': 'canAttach'
		};

		function attr(which) {
			if (fn === null && _.isFunction(scope.attr)) {
				fn = scope.attr;
			}
			return !fn || fn(which) !== false;
		}
		
		function perm(which) {
			return which === undefined || scope.hasPermission(which);
		}
		
		return function can(what) {
			return attr(actions[what]) && perm(perms[what]);
		};
	})($scope);
	
	$scope.hasButton = function(name) {
		if (!can(name)) {
			return false;
		}
		if (_(hiddenButtons).has(name)) {
			var button = hiddenButtons[name];
			if (button.isHidden) {
				return !button.isHidden();
			}
			return !button.hidden;
		}
		return true;
	};
	
	$scope.hasPermission = function(perm) {
		var view = $scope.schema;
		var defaultValue = arguments.length === 2 ? arguments[1] : true;
		if (!view || !view.perms) return defaultValue;
		var perms = view.perms;
		var permitted = perms[perm];
		if (permitted === undefined) {
			return defaultValue;
		}
		return _.toBoolean(permitted);
	};

	$scope.isPermitted = function(perm, record, callback) {
		var ds = this._dataSource;
		ds.isPermitted(perm, record).success(function(res){
			var errors = res.errors;
			if (errors) {
				return axelor.dialogs.error(errors.read);
			}
			callback();
		});
	};
	
	$scope.canShowToolbar = function() {
		var params = ($scope._viewParams || {}).params;
		if (params && params['show-toolbar'] === false) {
			return false;
		}
		return true;
	};
	
	if (view.deferred) {
		view.deferred.resolve($scope);
	}
}

angular.module('axelor.ui').directive('uiViewPane', function() {

	return {
		replace: true,
		controller: ['$scope', '$attrs', 'DataSource', 'ViewService', function ($scope, $attrs, DataSource, ViewService) {
			
			var params = $scope.$eval($attrs.uiViewPane);
			
			$scope._viewParams = params;
			ViewCtrl.call(this, $scope, DataSource, ViewService);
			
			$scope.viewList = [];
			$scope.viewType = null;

			var switchTo = $scope.switchTo;
			$scope.switchTo = function (type, callback) {
				var view = $scope._views[type];
				if (view && $scope.viewList.indexOf(type) === -1) {
					$scope.viewList.push(type);
				}
				$scope.viewType = type;
				return switchTo(type, callback);
			};
			
			$scope.$watch('selectedTab.viewType', function (type) {
				if ($scope.viewType !== type && type) {
					$scope.switchTo(type);
				}
			});

			$scope.viewTemplate = function (type) {
				return 'partials/views/' + type + '.html';
			};

			$scope.switchTo((params.viewType || params.type));
		}],
		link: function(scope, element, attrs) {
		
		},
		template:
			"<div class='view-pane'>" +
				"<div class='view-container' ng-repeat='type in viewList' ui-show='type == viewType' ng-include='viewTemplate(type)'></div>" +
			"</div>"
	};
});

angular.module('axelor.ui').directive('uiViewPopup', function() {
	
	return {
		controller: ['$scope', '$attrs', function ($scope, $attrs) {
			var params = $scope.$eval($attrs.uiViewPopup);

			$scope.tab = params;
			$scope._isPopup = true;
		}],
		link: function (scope, element, attrs) {
			
			var canClose = false;
			scope.onBeforeClose = function(e) {
				if (canClose) {
					return;
				}
				e.preventDefault();
				e.stopPropagation();

				scope.closeTab(scope.tab, function() {
					canClose = true;
					element.dialog('close');
				});
			};

			scope.onPopupClose = function () {
				var tab = scope.tab,
					params = tab.params || {},
					parent = tab.$popupParent;
				if (parent && parent.reload && params.popup === "reload") {
					parent.reload();
				}
				scope.applyLater();
			};
			
			scope.$watch('viewTitle', function (title) {
				scope._setTitle(title);
			});
			
			var unwatch = scope.$watch("_viewParams.$viewScope.schema.loaded", function(loaded) {
				if (!loaded) {
					return;
				}
				unwatch();
				var viewScope = scope._viewParams.$viewScope;
				var viewPromise = viewScope._viewPromise;
				scope._doShow(viewPromise);
			});
		},
		replace: true,
		template:
			'<div ui-dialog ui-dialog-size x-on-close="onPopupClose" x-on-ok="false" x-on-before-close="onBeforeClose">' +
				'<div ui-view-pane="tab"></div>' +
			'</div>'
	};
});

angular.module('axelor.ui').directive('uiRecordPager', function(){

	return {
		replace: true,
		link: function(scope, element, attrs) {
			
			var elText = element.find('.record-pager-text').show(),
				elChanger = element.find('.record-pager-change').hide(),
				elInput = elChanger.find('input');
			
			elText.click(function(e) {
				elText.add(elChanger).toggle();
			});

			elChanger.on('click', 'button',  function() {
				elText.add(elChanger).toggle();
				if (scope.setPageSize) {
					scope.setPageSize(elInput.val());
				}
			});
		},
		template:
		'<div class="record-pager">'+
	    '<span>'+
	    	'<span class="record-pager-text">{{pagerText()}}</span>'+
			'<span class="input-append record-pager-change">'+
				'<input type="text" style="width: 30px;" value="{{getPageSize()}}">'+
				'<button type="button" class="btn add-on"><i class="icon icon-ok"></i></button>'+
			'</span>'+
	    '</span>'+
	    '<div class="btn-group">'+
	    	'<button class="btn" ng-disabled="!canPrev()" ng-click="onPrev()"><i class="icon-chevron-left"></i></button>'+
	    	'<button class="btn" ng-disabled="!canNext()" ng-click="onNext()"><i class="icon-chevron-right"></i></button>'+
	    '</div>'+
	    '</div>'
	};
});

angular.module('axelor.ui').directive('uiViewSwitcher', function(){
	return {
		scope: true,
		link: function(scope, element, attrs) {

			element.find("button").click(function(e){
				var type = $(this).attr("x-view-type"),
					ds = scope._dataSource,
					page = ds && ds._page;

				if (type === "form" && page) {
					if (page.index === -1) page.index = 0;
				}

				if (scope.selectedTab.viewType === 'grid' && !_.isEmpty(scope.selection)) {
					page.index = _.first(scope.selection);
				}

				scope.switchTo(type);
				scope.$apply();
			})
			.each(function() {
				if (scope._views[$(this).attr("x-view-type")] === undefined) {
					$(this).hide();
				}
			});
			scope.$watch("_viewType", function(type){
				element.find("button").attr("disabled", false);
				element.find("button[x-view-type=" + type + "]").attr("disabled", true);
			});
		},
		replace: true,
		template:
		'<div class="view-switcher pull-right">'+
		  	'<div class="btn-group">'+
		  		'<button class="btn" x-view-type="grid"		><i class="icon-table"		></i></button>'+
		  		'<button class="btn" x-view-type="calendar"	><i class="icon-calendar"	></i></button>'+
		  		'<button class="btn" x-view-type="chart"	><i class="icon-bar-chart"	></i></button>'+
		  		'<button class="btn" x-view-type="form"		><i class="icon-edit"		></i></button>'+
		    '</div>'+
		'</div>'
	};
});

angular.module('axelor.ui').directive('uiHotKeys', function() {

	var keys = {
		45: 'new',		// insert
		69: 'edit',		// e
		83: 'save',		// s
		68: 'delete',	// d
		82: 'refresh',	// r
		70: 'search',	// f
		71: 'select',	// g
		74: 'prev',		// j
		75:	'next',		// n

		77: 'focus-menu',		// m
	   120: 'toggle-menu',		// F9

		81: 'close'		// q
	};
	
	return function(scope, element, attrs) {
		
		var loginWindow = $("#loginWindow");
		
		$(document).on('keydown.axelor-keys', function (e) {
			
			if (loginWindow.is(":visible")) {
				return;
			}
			
			var action = keys[e.which];
			
			if (action === "toggle-menu") {
				$('[nav-menu-toggle]').splitter('toggle');
				return false;
			}
			
			if (e.altKey || e.shiftKey || !e.ctrlKey) {
				return;
			}

			if (action === "focus-menu") {
				var activeMenu = $('.sidebar .nav-tree li.active');
				if (activeMenu.size() === 0) {
					activeMenu = $('.sidebar .nav-tree li:first');
				}
				
				var navTree = activeMenu.parents('[nav-tree]:first');
				if (navTree.size()) {
					navTree.navtree('selectItem', activeMenu);
				}
				return false;
			}
			
			var tab = scope.selectedTab,
				vs = tab ? tab.$viewScope : null;
			
			if (!vs || !keys.hasOwnProperty(e.which)) {
				return;
			}

			if (action === "close") {
				scope.closeTab(tab, function() {
					scope.applyLater();
				});
				return false;
			}
			
			if (action === "search") {
				var filterBox = $('.filter-box .search-query:visible');
				if (filterBox.size()) {
					filterBox.focus().select();
					return false;
				}
			}
			
			if (_.isFunction(vs.onHotKey)) {
				return vs.onHotKey(e, action);
			}
		});
		
		$(document).on("dblclick.hot-edit", ".form-item-container.readonly", function (e) {
			var fs = $(e.target).data('$scope');
			var field = fs ? fs.field : null;
			if (!field || field.readonly) {
				return;
			}
			if (fs.hasPermission("write") && fs.isReadonly() && fs.hasButton('edit')) {
				var elem = $(e.target),
					parent = $(e.target).parent();
				$.event.trigger('cancel:hot-edit');
				fs.applyLater(function () {
					fs.attr("force-edit", true);
					setTimeout(function() {
						parent.find(':input:first').focus().select();
					}, 100);
					elem.on('cancel:hot-edit', function() {
						fs.attr("force-edit", false);
						fs.applyLater();
					});
					var unwatch = fs.$watch("attr('force-edit')", function(edit) {
						if (!edit) {
							elem.off('cancel:hot-edit');
							unwatch();
						}
					});
				});
			}
		});
		
		$(document).on("keydown.hot-edit", ".form-item-container.editable", function (e) {
			if (!(e.which === 13 || e.which === 27) || e.ctrlKey || e.shiftKey) {
				return;
			}
			var elem = $(e.target);
			if (!elem.is('.form-item-container')) {
				elem = elem.parents('.form-item-container:first');
			}

			var fs = elem.data('$scope');
			var field = fs ? fs.field : null;
			if (!field || field.readonly || !fs.attr('force-edit')) {
				return;
			}
			
			fs.attr("force-edit", false);
			fs.applyLater();
		});
		
		scope.$on('$destroy', function() {
			$(document).off('keydown.axelor-keys');
			$(document).off('dblclick:hot-edit');
			$(document).off('keydown:hot-edit');
		});
	};
});
