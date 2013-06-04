var TabSetApp = angular.module('TabSetApp', ['ui.bootstrap', 'ui.if'], function($tooltipProvider, $compileProvider, $locationProvider) {
  $compileProvider.urlSanitizationWhitelist(/^\s*(https?|ftp|mailto|blob):/);
  $tooltipProvider.options({ 'appendToBody': true });
  $locationProvider.html5Mode(true).hashPrefix('!');
})
  .filter('default', function() {
    return function(input, value) {
      return input != null && input != undefined && input != "" ? input : value || '';
    }
  })
  .filter('favicon', function() {
    return function(input, value) {
      return 'chrome://favicon/' + input;
    }
  })
  .directive('autoSelect', function () {
    return function (scope, element, attrs) {
      var el = element[0];
      element.click(function () {
        var selection = el.ownerDocument.defaultView.getSelection();
            selection.setBaseAndExtent( el, 0, el, 1 );
      });
    };
  })
  .directive('activeLink', ['$location', function($location) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var clazz = attrs.activeLink;
        var path = attrs.href;
        var isDefault = attrs.activeDefault !== void 0;
        var target = attrs.activeTarget || "self";
        if (target == "parent") {
          element = element.parent();
        }
        path = path.substring(1);
        scope.$watch(function() { return $location.hash(); }, function(newPath) {
          if (path === newPath || (!newPath && isDefault)) {
            element.addClass(clazz);
          } else {
            element.removeClass(clazz);
          }
        });
      }
    };
  }])
  .directive('activeId', ['$location', function($location) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var clazz = attrs.activeId;
        var path = attrs.id;
        var isDefault = attrs.activeDefault !== void 0;
        scope.$watch(function() { return $location.hash(); }, function(newPath) {
          if (path === newPath || (!newPath && isDefault)) {
            element.addClass(clazz);
          } else {
            element.removeClass(clazz);
          }
        });
      }
    };
  }])
  .directive('fileInput', function() {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function(scope, element, attr, ngModel) {
        element.bind('change', function() {
          scope.$apply(function() {
            var files = element[0].files,
                isValid = true;

            if (attr.accept) {
              var i, j, acceptType, fileType,
                  types = attr.accept.split(',').map(function(t) { return t.split('/'); });
              for (i = 0; i < files.length && isValid; ++i) {
                fileType = files[i].type.split('/');
                isValid = false;
                for (j = 0; j < types.length && !isValid; ++j) {
                  acceptType = types[j];
                  isValid = acceptType[0] === fileType[0] && (acceptType[1] === '*' || acceptType[1] === fileType[1]);
                }
              }
            }
            ngModel.$setValidity('file', isValid);

            var viewValue;
            if (isValid) viewValue = attr.multiple ? files : files[0];
            ngModel.$setViewValue(viewValue);
          });
        });
      }
    }
  })
  .factory('session', function() {
    return chrome.extension.getBackgroundPage().session;
  })
  .controller('ExportDialogController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
    $scope.title = model.title;
    $scope.obj = model.obj;
    $scope.blob = new Blob([angular.toJson(model.obj)], {type:'application/json'});
    $scope.dl_link = webkitURL.createObjectURL($scope.blob);
    $scope.fname = model.fname;
    $scope.close = function(){
      dialog.close();
    };
  }])
  .controller('ImportDialogController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
    $scope.title = model.title;
    $scope.json = '';
    $scope.cancel_btn = model.cancel;
    $scope.import_btn = model.import;
    $scope.invalid_file = false;
    $scope.from_files = function(files) {
      if (files.length > 0) {
        $scoe.invalid_file = true;
        $scope.file = files[0];
        var reader = new FileReader();
        reader.readAsText($scope.file);
        reader.onload = function() {
          try {
            var json = angular.toJson(angular.fromJson(reader.result));
          } catch(err) {
            return;
          }
          $scope.$apply(function(scope) {
            scope.json = json;
            scope.invalid_file = false;
          });
        }
      } else {
        scope.invalid_file = false;
      }
    };
    $scope.cancel = function() {
      dialog.close();
    }
    $scope.import = function(){
      try {
        var obj = angular.fromJson($scope.json);
      } catch(err) {
        var obj = null;
      }
      dialog.close(obj);
    };
  }])
  .factory('jsonDialog', ['$dialog', function($dialog) {
    return {
      'export' : function(templateUrl,opts) {
        return $dialog.dialog({
          'templateUrl': templateUrl,
          'controller': 'ExportDialogController',
          'resolve': {
            'model': function() { return { 'title': opts.title, 'obj': opts.obj, 'fname': opts.fname }; }
          }
        })
      },
      'import' : function(templateUrl, opts) {
        return $dialog.dialog({
          'templateUrl': templateUrl,
          'controller': 'ImportDialogController',
          'resolve': {
            'model': function() { return {
              'title': opts.title,
              'import': opts.accept,
              'cancel': opts.cancel
            }; }
          }
        })
      }
    };
  }])
  .controller('ConfirmDialogController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
    $scope.title = model.title;
    $scope.body = model.body;
    $scope.accept_btn = model.accept;
    $scope.cancel_btn = model.cancel;

    $scope.accept = function() {
      dialog.close(true);
    }

    $scope.cancel = function() {
      dialog.close();
    }
  }])
  .controller('InputDialogController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
    $scope.title = model.title;
    $scope.body = model.body;
    $scope.placeholder = model.placeholder;
    $scope.accept_btn = model.accept;
    $scope.cancel_btn = model.cancel;
    $scope.input = model.default;


    $scope.accept = function() {
      dialog.close($scope.input);
    }

    $scope.cancel = function() {
      dialog.close();
    }
  }])
  .controller('InfoDialogController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
    $scope.title = model.title;
    $scope.info_groups = model.info_groups;

    $scope.close = function() {
      dialog.close();
    }
  }])
  .factory('simpleDialog', ['$dialog', function($dialog) {
    return {
      'confirm': function(templateUrl, opts) {
        return $dialog.dialog({
          'templateUrl': templateUrl,
          'controller': 'ConfirmDialogController',
          'resolve': {
            'model': function() { return {
              'title': opts.title,
              'body': opts.body,
              'accept': opts.accept,
              'cancel': opts.cancel
            }; }
          }
        });
      },
      'input': function(templateUrl, opts) {
        return $dialog.dialog({
          'templateUrl': templateUrl,
          'controller': 'InputDialogController',
          'resolve': {
            'model': function() { return {
              'title': opts.title,
              'body': opts.body,
              'placeholder': opts.placeholder,
              'default': opts.default,
              'accept': opts.accept,
              'cancel': opts.cancel
            }; }
          }
        });
      },
      'info': function(templateUrl, opts) {
        return $dialog.dialog({
          'templateUrl': templateUrl,
          'controller': 'InfoDialogController',
          'resolve': {
            'model': function() { return {
              'title': opts.title,
              'info_groups': opts.info_groups,
            }; }
          }
        });
      }
    };
  }]);
