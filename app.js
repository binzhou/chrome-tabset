var TabSetApp = angular.module('TabSetApp', ['ui.bootstrap', 'ui.if'], function($tooltipProvider) {
  $tooltipProvider.options({ 'appendToBody': true });
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
  .factory('session', function() {
    return chrome.extension.getBackgroundPage().session;
  })
  .controller('ExportDialogController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
    $scope.title = model.title;
    $scope.obj = model.obj;
    $scope.close = function(){
      dialog.close();
    };
  }])
  .controller('ImportDialogController', ['$scope', 'dialog', 'model', function($scope, dialog, model){
    $scope.title = model.title;
    $scope.json = '';
    $scope.cancel_btn = model.cancel;
    $scope.import_btn = model.import;
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
            'model': function() { return { 'title': opts.title, 'obj': opts.obj }; }
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
