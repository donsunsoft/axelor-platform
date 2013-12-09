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
(function() {

var ui = angular.module('axelor.ui');

PortalCtrl.$inject = ['$scope', '$element'];
function PortalCtrl($scope, $element) {

	var view = $scope._views['portal'];
	var viewPromise = $scope.loadView('portal', view.name);

	$scope.applyLater(function(){
		if (view.deferred)
			view.deferred.resolve($scope);
	}, 0);

	viewPromise.success(function(fields, schema){
		$scope.parse(schema);
	});
	
	$scope.parse = function(schema) {
	};
	
	$scope.show = function(promise) {
		$scope.updateRoute();
	};
	
	$scope.onShow = function() {
		
	};

	$scope.getContext = function() {
		return _.extend({}, $scope._context);
	};

	$scope.getRouteOptions = function() {
		return {
			mode: 'portal',
			args: []
		};
	};
	
	$scope.setRouteOptions = function(options) {
		$scope.updateRoute();
	};
	
}

ui.directive('uiViewPortal', function(){
	return {
		scope: true,
		controller: PortalCtrl,
		link: function(scope, element, attrs) {
			
			scope.parse = function(schema) {
				scope.portletCols = schema.cols || 2;
				scope.portlets = schema.items;
			};
			
			setTimeout(function(){
				element.sortable({
					handle: ".portlet-header",
					items: "> .portlet"
				});
			});
		},
		replace: true,
		transclude: true,
		template:
		'<div class="portal" ng-transclude>'+
			'<div ui-view-portlet ng-repeat="p in portlets" '+
				'x-action="{{p.action}}" '+
				'x-can-search="{{p.canSearch}}" '+
				'x-col-span="{{p.colSpan}}" '+
				'x-row-span="{{p.rowSpan}}" ' +
				'x-height="{{p.height}}"></div>'+
		'</div>'
	};
});

PortletCtrl.$inject = ['$scope', '$element', 'MenuService', 'DataSource', 'ViewService'];
function PortletCtrl($scope, $element, MenuService, DataSource, ViewService) {
	
	var self = this;
	
	function init() {
		
		ViewCtrl.call(self, $scope, DataSource, ViewService);
		
		$scope.show = function() {

		};
		
		$scope.onShow = function() {
			
		};
	}
	
	$scope.initPortlet = function(action) {

		MenuService.action(action).success(function(result){
			if (_.isEmpty(result.data)) {
				return;
			}
			var view = result.data[0].view;
			
			$scope._viewParams = view;
			$scope._viewAction = action;

			init();

			$scope.title = view.title;
			$scope.parsePortlet(view);
		});
	};

	$scope.$on('on:attrs-change:refresh', function(e) {
		e.preventDefault();
		if ($scope.onRefresh) {
			$scope.onRefresh();
		}
	});
}

ui.directive('uiViewPortlet', ['$compile', function($compile){
	return {
		scope: true,
		controller: PortletCtrl,
		link: function(scope, element, attrs) {
			setTimeout(function(){
				scope.initPortlet(attrs.action);
			});
			
			var initialized = false;
			scope.parsePortlet = function(view) {
				if (initialized) {
					return;
				}
				initialized = true;
				
				scope.noFilter = attrs.canSearch != "true";

				var template = $compile($('<div ui-portlet-' + view.viewType + '></div>'))(scope);
				element.find('.portlet-content:first').append(template);
				
				scope.show();
				
				if (scope.portletCols) {

					var cols = scope.portletCols;
					var colSpan = +attrs.colSpan || 1;
					var rowSpan = +attrs.rowSpan || 1;

					var width = 100;
					var height = (+attrs.height || 250) * rowSpan;
					
					width = (width / cols) * colSpan;
				
					element.width(width + '%').height(height);
				}
			};
			
			scope.onPortletToggle = function(event) {
				var e = $(event.target);
				e.toggleClass('icon-chevron-up icon-chevron-down');
				element.toggleClass('portlet-minimized');
				if (e.hasClass('icon-chevron-up')) {
					axelor.$adjustSize();
				}
			};
			
			scope.doNext = function() {
				if (this.canNext()) this.onNext();
			};
			
			scope.doPrev = function() {
				if (this.canPrev()) this.onPrev();
			};
		},
		replace: true,
		template:
		'<div class="portlet">'+
			'<div class="portlet-body stackbar">'+
				'<div class="portlet-header navbar">'+
					'<div class="navbar-inner">'+
						'<div class="container-fluid">'+
							'<span class="brand" ng-bind-html-unsafe="title"></span>'+
							'<ul class="nav pull-right">'+
								'<li class="portlet-pager" ng-show="showPager">'+
									'<span class="portlet-pager-text">{{pagerText()}}</span>'+
									'<span class="icons-bar">'+
										'<i ng-click="doPrev()" ng-class="{disabled: !canPrev()}" class="icon-step-backward"></i>'+
										'<i ng-click="doNext()" ng-class="{disabled: !canNext()}" class="icon-step-forward"></i>'+
									'</span>'+
								'</li>'+
								'<li class="divider-vertical"></li>'+
								'<li>'+
									'<span class="icons-bar">'+
										'<i title="{{\'Refresh\' | t}}" ng-click="onRefresh()" class="icon-refresh"></i>'+
										'<i title="{{\'Toggle\' | t}}" ng-click="onPortletToggle($event)" class="icon-chevron-up"></i>'+
									'</span>'+
								'</li>'+
							'</ul>'+
						'</div>'+
					'</div>'+
				'</div>'+
				'<div class="portlet-content"></div>'+
			'</div>'+
		'</div>'
	};
}]);

})();