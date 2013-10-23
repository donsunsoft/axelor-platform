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

ui.formInput('ImageLink', {
	css: 'image-item',
	cssClass: 'from-item image-item',

	BLANK: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",

	controller: ['$scope', '$element', '$interpolate', function($scope, $element, $interpolate) {

		$scope.parseText = function(text) {
			if (!text|| !text.match(/{{.*?}}/)) {
				return text;
			}
			return $interpolate(text)($scope.record);
		};
	}],

	init: function(scope) {
		var field = scope.field;

		scope.width = field.width || 140;
		scope.height = field.height || 140;
	},

	link_readonly: function(scope, element, attrs, model) {

		var BLANK = this.BLANK;
		var image = element.children('img:first');

		scope.$render_readonly = function() {
			var content = model.$viewValue || null;
			if (content == null) {
				image.get(0).src = BLANK;
			}
			image.get(0).src = scope.parseText(content);
		};

		scope.$watch('isReadonly()', function(readonly, old) {
			if (!readonly || readonly === old) return;
			scope.$render_readonly();
		});
	},
	template_editable: '<input type="text">',
	template_readonly:
		'<div style="min-width: {{width}}px;">'+
			'<img class="img-polaroid" style="width: {{width}}px; height: {{height}}px;">'+
		'</div>'
});

ui.formInput('Image', 'ImageLink', {

	link_editable: function(scope, element, attrs, model) {

		var input = element.children('input:first');
		var image = element.children('img:first');
		var buttons = element.children('.btn-group');
		var BLANK = this.BLANK;

		input.add(buttons).hide();
		image.add(buttons).hover(function(){
			buttons.show();
		}, function() {
			buttons.hide();
		});

		scope.doSelect = function() {
			input.click();
		};

		scope.doSave = function() {
			var content = image.get(0).src;
			if (content) {
				window.open(content);
			}
		};

		scope.doRemove = function() {
			image.get(0).src = BLANK;
			image.get(0).src = null;
			input.val(null);
			update(null);
		};

		input.change(function(e, ui) {
			var file = input.get(0).files[0];
			var reader = new FileReader();

			reader.onload = function(e){
				var content = e.target.result;
				image.get(0).src = content;
				update(content);
			};

			reader.readAsDataURL(file);
		});

		function update(value) {
			setTimeout(function(){
				model.$setViewValue(value);
				scope.$apply();
			});
		}

		scope.$render_editable = function() {
			var content = model.$viewValue || null;
			if (content == null) {
				image.get(0).src = BLANK;
			}
			image.get(0).src = content;
		};
	},
	template_editable:
	'<div style="min-width: {{width}}px;">' +
		'<input type="file" accept="image/*">' +
		'<img class="img-polaroid" style="width: {{width}}px; height: {{height}}px; display: inline-block;">' +
		'<div class="btn-group">' +
			'<button ng-click="doSelect()" class="btn" type="button"><i class="icon-upload-alt"></i></button>' +
			'<button ng-click="doSave()" class="btn" type="button"><i class="icon-download-alt"></i></button>' +
			'<button ng-click="doRemove()" class="btn" type="button"><i class="icon-remove"></i></button>' +
		'</div>' +
	'</div>'
});

ui.formInput('Binary', {

	css: 'file-item',
	cellCss: 'form-item file-item',

	link_editable: function(scope, element, attrs, model) {

		var field = scope.field;
		var input = element.children('input:first').hide();
		var frame = element.children("iframe").hide();

		scope.doSelect = function() {
			input.click();
		};

		scope.doSave = function() {
			var record = scope.record,
				model = scope._model;

			var url = "ws/rest/" + model + "/" + record.id + "/" + field.name + "/download";
			frame.attr("src", url);
			setTimeout(function(){
				frame.attr("src", "");
			},100);
		};

		scope.doRemove = function() {
			var record = scope.record;
			input.val(null);
			model.$setViewValue(null);
			record.$upload = null;
		};

		input.change(function(e) {
			var file = input.get(0).files[0];
			var record = scope.record;
			if (file) {
				record.$upload = {
					field: field.name,
					file: file
				};
				//Update file and mine just in case of new record
				if(!record.id && scope._model == 'com.axelor.meta.db.MetaFile'){
					record.fileName = file.name;
					record.mine = file.type;
				}
				record.size = file.size;
				setTimeout(function(){
					model.$setViewValue(0); // mark form for save
					scope.$apply();
				});
			}
		});

	},
	template_editable:
	'<div>' +
		'<iframe></iframe>' +
		'<input type="file">' +
		'<div class="btn-group">' +
			'<button ng-click="doSelect()" class="btn" type="button"><i class="icon-upload-alt"></i></button>' +
			'<button ng-click="doSave()" class="btn" type="button"><i class="icon-download-alt"></i></button>' +
			'<button ng-click="doRemove()" class="btn" type="button"><i class="icon-remove"></i></button>' +
		'</div>' +
	'</div>'
});

})(this);
