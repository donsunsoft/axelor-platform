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
(function(){
	
var ui = angular.module('axelor.ui');

var equals = angular.equals,
	forEach = angular.forEach,
	isArray = angular.isArray,
	isObject = angular.isObject,
	isDate = angular.isDate;

function updateValues(source, target) {
	if (equals(source, target))
		return;

	function compact(value) {
		if (!value) return value;
		if (value.version === undefined) return value;
		if (!value.id) return value;
		var res = _.extend(value);
		res.version = undefined;
		return res;
	};

	forEach(source, function(value, key) {
		if (isDate(value))
			return target[key] = value;
		if (isArray(value)) {
			var dest = target[key] || [];
			value = _.map(value, function(item){
				var found = _.find(dest, function(v){
					return v.id === item.id;
				});
				if (_.has(item, "version") && item.id) item.$fetched = true;
				return found ? _.extend({}, found, item) : item;
			});
			return target[key] = value;
		}
		if (isObject(value)) {
			var dest = target[key] || {};
			if (dest.id === value.id) {
				if (dest.version) {
					dest = _.extend({}, dest);
					updateValues(value, dest);
				} else {
					dest.$updatedValues = value;
				}
			} else {
				dest = compact(value);
			}
			return target[key] = dest;
		}
		return target[key] = value;
	});
}

function handleError(scope, item, message) {
	
	if (item == null) {
		return;
	}

	var ctrl = item.data('$ngModelController');
	if (ctrl == null || ctrl.$doReset) {
		return;
	}

	var e = $('<span class="error"></span>').text(message);
	var p = item.parent('td.form-item');

	if (item.children(':first').is(':input,.input-append,.picker-input')) {
		p.append(e);
	} else {
		p.prepend(e);
	}

	var clear = scope.$on('on:edit', function(){
		ctrl.$doReset();
	});
	
	function cleanUp(items) {
		var idx = items.indexOf(ctrl.$doReset);
		if (idx > -1) {
			items.splice(idx, 1);
		}
	}
	
	ctrl.$doReset = function(value) {
		
		cleanUp(ctrl.$viewChangeListeners);
		cleanUp(ctrl.$formatters);
		
		ctrl.$setValidity('invalid', true);
		ctrl.$doReset = null;
		
		e.remove();
		clear();
		
		return value;
	};
	
	ctrl.$setValidity('invalid', false);
	ctrl.$viewChangeListeners.push(ctrl.$doReset);
	ctrl.$formatters.push(ctrl.$doReset);
}

function ActionHandler($scope, ViewService, options) {

	if (options == null || !options.action)
		throw 'No action provided.';

	this.canSave = options.canSave;
	this.prompt = options.prompt;
	this.action = options.action;
	this.element = options.element || $();

	this.scope = $scope;
	this.ws = ViewService;
}

ActionHandler.prototype = {
	
	constructor: ActionHandler,
	
	onLoad : function() {
		return this.handle();
	},
	
	onNew: function() {
		return this.handle();
	},
	
	onSave: function() {
		return this.handle();
	},
	
	onSelect: function() {
		return this.handle();
	},
	
	onClick: function(event) {
		var self = this;
		if (this.prompt) {
			var deferred = this.ws.defer(),
				promise = deferred.promise;
			axelor.dialogs.confirm(this.prompt, function(confirmed){
				if (confirmed) {
					self.handle().then(deferred.resolve, deferred.reject);
				} else {
					deferred.reject();
				}
			});
			return promise;
		}
		return this.handle();
	},

	onChange: function(event) {
		var deferred = this.ws.defer(),
			promise = deferred.promise;

		var self = this;
		setTimeout(function(){
			self.handle().then(deferred.resolve, deferred.reject);
		});
		return promise;
	},
	
	_getContext: function() {
		var scope = this.scope,
			context = scope.getContext ? scope.getContext() : scope.record,
			viewParams = scope._viewParams || {};
		
		context = _.extend({}, viewParams.context, context);

		// include button name as _signal (used by workflow engine)
		if (this.element.is("button,a.button-item")) {
			context['_signal'] = this.element.attr('name');
		}

		return context;
	},

	handle: function() {
		var action = this.action.trim();
		
		// block the entire ui (auto unblocks when actions are complete)
		_.delay(axelor.blockUI, 100);

		return this._handleAction(action).then(function() {
			
		});
	},
	
	_handleSave: function() {

		var scope = this.scope,
			deferred = this.ws.defer();

		if (!scope.isValid()) {
			deferred.reject();
			return deferred.promise;
		}
		if (!scope.isDirty()) {
			deferred.resolve();
			return deferred.promise;
		}

		function doEdit(rec) {
			var params = scope._viewParams || {};
			scope.editRecord(rec);
			if (params.$viewScope) {
				params.$viewScope.updateRoute();
			}
			deferred.resolve();
		}

		var ds = scope._dataSource,
			values = _.extend({
				_original: scope.$$original
			}, scope.record);

		ds.save(values).success(function(rec, page) {
			if (scope.doRead) {
				return scope.doRead(rec.id).success(doEdit);
			}
			return ds.read(rec.id).success(doEdit);
		});
		this._invalidateContext = true;
		return deferred.promise;
	},

	_handleAction: function(action) {

		var self = this,
			scope = this.scope,
			context = this._getContext(),
			deferred = this.ws.defer();

		function resolveLater() {
			deferred.resolve();
			return deferred.promise;
		}
		
		function chain(items) {
			var first = _.first(items);
			if (first === undefined) {
				return resolveLater();
			}
			return self._handleSingle(first).then(function(pending) {
				if (_.isString(pending)) {
					return self._handleAction(pending);
				}
				return chain(_.rest(items));
			});
		}

		if (!action) {
			return resolveLater();
		}

		if (action === 'save') {
			return this._handleSave();
		}

		if (this._invalidateContext) {
			context = this._getContext();
			this._invalidateContext = false;
		}

		var model = context._model || scope._model;
		var promise = this.ws.action(action, model, context).then(function(response){
			var resp = response.data,
				data = resp.data || [];
			if (resp.errors) {
				data.splice(0, 0, {
					errors: resp.errors
				});
			}
			return chain(data);
		});

		promise.then(function(){
			deferred.resolve();
		});
		
		return deferred.promise;
	},

	_handleSingle: function(data) {

		var deferred = this.ws.defer();

		if (data == null || data.length == 0) {
			deferred.resolve();
			return deferred.promise;
		}

		var self = this,
			scope = this.scope,
			formScope = scope,
			formElement = this.element.parents('form:first');

		if (!formElement.get(0)) { // toolbar button
			formElement = this.element.parents('.form-view:first').find('form:first');
		}
		
		if (formElement.length == 0) {
			formElement = this.element;
		}
		formScope = formElement.data('$scope') || scope;

		if(data.flash) {
			//TODO: show embedded message instead
			axelor.dialogs.say(data.flash);
		}

		if(data.error) {
			axelor.dialogs.error(data.error, function(){
				scope.applyLater(function(){
					if (data.action) {
						self._handleAction(data.action);
					}
					deferred.reject();
				});
			});
			return deferred.promise;
		}
		
		if (data.alert) {
			axelor.dialogs.confirm(data.alert, function(confirmed){
				scope.applyLater(function(){
					if (confirmed) {
						return deferred.resolve(data.pending);
					}
					if (data.action) {
						self._handleAction(data.action);
					}
					deferred.reject();
				});
			}, _t('Warning'));
			return deferred.promise;
		}
		
		if (!_.isEmpty(data.errors)) {
			_.each(data.errors, function(v, k){
				var item = (findItems(k) || $()).first();
				handleError(scope, item, v);
			});
			deferred.reject();
			return deferred.promise;
		}
		
		if (data.values) {
			updateValues(data.values, scope.record, scope);
			if (scope.onChangeNotify) {
				scope.onChangeNotify(scope, data.values);
			}
			this._invalidateContext = true;
			axelor.$adjustSize();
		}
		
		if (data.reload) {
			this._invalidateContext = true;
			var promise = scope.reload(true);
			if (promise) {
				promise.then(function(){
					deferred.resolve(data.pending);
				});
			}
			return deferred.promise;
		}
		
		if (data.save) {
			this._handleSave().then(function(){
				deferred.resolve(data.pending);
			});
			return deferred.promise;
		}
		
		if (data.signal) {
			formScope.$broadcast(data.signal, data['signal-data']);
		}

		function findItems(name) {

			var items;
			var containers = formElement.parents('.form-view:first')
										.find('.record-toolbar:first')
										.add(formElement);

			// first search by nested x-path
			if (scope.formPath) {
				items = containers.find('[x-path="' + scope.formPath + '.' + name + '"]');
				if (items.size()) {
					return items;
				}
			}
			
			// then search by x-path
			items = containers.find('[x-path="' + name + '"]');
			if (items.size()) {
				return items;
			}
		
			// else search by name
			items = containers.find('[name="' + name +'"]');
			if (items.size()) {
				return items;
			}
		}
		
		function setAttrs(item, itemAttrs) {
			
			var label = item.data('label'),
				itemScope = item.data('$scope'),
				column;

			// handle o2m/m2m columns
			if (item.is('.slick-dummy-column')) {
				column = item.data('column');
				itemScope = item.parents('[x-path]:first').data('$scope');
				forEach(itemAttrs, function(value, attr){
					if (attr == 'hidden')
						itemScope.showColumn(column.id, !value);
					if (attr == 'title')
						setTimeout(function(){
							itemScope.setColumnTitle(column.id, value);
						});
				});
				return;
			}
			
			//handle o2m/m2m title
			if(item.is('.one2many-item') || item.is('.many2many-item')){
				forEach(itemAttrs, function(value, attr){
					if (attr == 'title') {
						itemScope.title = value;
					}
				});
			}

			// handle notebook
			if (item.is('.tab-pane')) {
				forEach(itemAttrs, function(value, attr){
					if (attr == 'hidden') {
						itemScope.attr('hidden', value);
					}
					if (attr == 'title') {
						itemScope.title = value;
					}
				});
				return;
			}

			forEach(itemAttrs, function(value, attr){
				
				switch(attr) {
				case 'required':
					itemScope.attr('required', value);
					break;
				case 'readonly':
					itemScope.attr('readonly', value);
					break;
				case 'hidden':
					itemScope.attr('hidden', value);
					break;
				case 'collapse':
					itemScope.attr('collapse', value);
					break;
				case 'title':
					if (label) {
						label.html(value);
					} else if (item.is('label')) {
						item.html(value);
					}
					itemScope.attr('title', value);
					break;
				case 'color':
					//TODO: set color
				case 'domain':
					if (itemScope.setDomain)
						itemScope.setDomain(value);
					break;
				case 'refresh':
					itemScope.$broadcast('on:attrs-change:refresh');
					break;

				case 'value':
				case 'value:set':
					if (itemScope.setValue) {
						itemScope.setValue(value);
					}
					break;
				case 'value:add':
					if (itemScope.fetchData && itemScope.select) {
						itemScope.fetchData(value, function(records){
							itemScope.select(records);
						});
					}
					break;
				case 'value:del':
					if (itemScope.removeItems) {
						itemScope.removeItems(value);
					}
					break;
				}
			});
		}
		
		forEach(data.attrs, function(itemAttrs, itemName) {
			var items = findItems(itemName);
			if (items == null || items.length == 0) {
				return;
			}
			items.each(function() {
				setAttrs($(this), itemAttrs);
			});
		});
		
		function openTab(scope, tab) {
			if (scope.openTab) {
				scope.openTab(tab);
			} else if (scope.$parent) {
				openTab(scope.$parent, tab);
			}
		}

		if (data.view) {
			var tab = data.view;
			tab.action = _.uniqueId('$act');
			if (!tab.viewType)
				tab.viewType = 'grid';
			if (tab.viewType == 'grid' || tab.viewType == 'form')
				tab.model = tab.model || tab.resource;
			if (!tab.views) {
				tab.views = [{ type: tab.viewType }];
				if (tab.viewType === 'html') {
					angular.extend(tab.views[0], {
						resource: tab.resource,
						title: tab.title
					});
				}
			}
			if (tab.viewType == 'form' || tab.viewType == 'grid') {
				var views = _.groupBy(tab.views, 'type');
				if (!views.grid) tab.views.push({type: 'grid'});
				if (!views.form) tab.views.push({type: 'form'});
			}
			
			if (tab.params && tab.params.popup) {
				tab.$popupParent = formScope;
			}
			openTab(scope, tab);
		}
		
		if (data.canClose) {
			if (scope.onOK) {
				scope.onOK();
			}
		}

		deferred.resolve();
		
		return deferred.promise;
	}
};

ui.factory('ActionService', ['ViewService', function(ViewService) {
	
	function handler(scope, element, options) {
		var opts = _.extend({}, options, { element: element });
		return new ActionHandler(scope, ViewService, opts);
	}
	
	return {
		handler: handler
	};
}]);

var EVENTS = ['onClick', 'onChange', 'onSelect', 'onNew', 'onLoad', 'onSave'];

ui.directive('uiActions', ['ViewService', function(ViewService) {

	function link(scope, element, attrs) {

		var props = _.isEmpty(scope.field) ? scope.schema : scope.field;
		if (props == null)
			return;

		_.each(EVENTS, function(name){
			var action = props[name];
			if (action == null) {
				return;
			}
			
			var handler = new ActionHandler(scope, ViewService, {
				element: element,
				action: action,
				canSave: props.canSave,
				prompt: props.prompt
			});
			scope.$events[name] = _.bind(handler[name], handler);
		});
	}
	
	return {
		link: function(scope, element, attrs) {
			scope.$evalAsync(function() {
				link(scope, element, attrs);
			});
		}
	};
}]);

}).call(this);
