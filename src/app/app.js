angular.module('tabsetapp.services', [])

.factory('safeApply', function() {
  return function($scope, fn) {
      var phase = $scope.$root.$$phase;
      if(phase == '$apply' || phase == '$digest') {
          if (fn) {
              $scope.$eval(fn);
          }
      } else {
          if (fn) {
              $scope.$apply(fn);
          } else {
              $scope.$apply();
          }
      }
  }
})

.factory('session', function() {
  return chrome.extension.getBackgroundPage().session;
})

.factory('fuzzy', function() {
  var fuzzy = {};
  fuzzy.parse = function(query) {
    var terms = query.toLowerCase().replace(/\s+/g, ' ').split(' ');
    return terms;
    return terms.filter(function(term) { term !== ''; });
  };

  fuzzy.matches = function(query, text) {
    var terms = fuzzy.parse(query);
    return fuzzy._matches(terms, ext.toLowerCase());
  }
  fuzzy._matches = function(terms, text) {
    var start = 0;
    var pos = [];
    for (var i in terms) {
      var term = terms[i];
      var skipto = text.indexOf(term);
      if (skipto < 0) {
        break;
      }

      text = text.substring(skipto + term.length);
      pos.push(start + skipto);
      start += skipto + term.length;
    }
    return pos;
  }

  fuzzy.test = function(query, text) {
    var terms = fuzzy.parse(query);
    return fuzzy._matches(terms, text.toLowerCase()).length == terms.length;
  }

  fuzzy.highlight = function(query, text, prefix, suffix) {
    var terms = fuzzy.parse(query);
    var matches = fuzzy._matches(terms, text.toLowerCase())
    var out = '';
    var upto = 0;
    for (var i in matches) {
      var match_start = matches[i];
      var match_end = match_start + terms[i].length;
      out += text.substring(upto, match_start);
      out += prefix;
      out += text.substring(match_start, match_end);
      out += suffix;
      upto = match_end;
    }
    out += text.substring(upto, text.length);
    return out;
  }
  return fuzzy;
});

angular.module('tabsetapp.filters', ['tabsetapp.services', 'ngSanitize'])

.filter('default', function() {
  return function(input, value) {
    return input != null && input != undefined && input != "" ? input : value || '';
  }
})

.filter('favicon', function() {
  return function(input) {
    return 'chrome://favicon/' + input;
  }
})

.filter('fuzzy_highlight', ['fuzzy', function(fuzzy) {
  return function(input, query) {
    return fuzzy.highlight(query, input, "<span class='highlight'>", "</span>");
  }
}]);

angular.module('tabsetapp.directives.forms', ['tabsetapp.services'])

.directive('textFileInput', ['safeApply', function(safeApply) {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attr, ctrl) {
      var set_value = function() {
        var files = element[0].files;
        if (files.length == 0) {
          safeApply(scope, function() {
            ctrl.$setValidity('file', true);
          });
        }
        var reader = new FileReader();
        reader.readAsText(files[0]);
        reader.onload = function() {
          safeApply(scope, function(scope) {
            ctrl.$setValidity('file', true);
            ctrl.$setViewValue(reader.result);
          });
        };
        reader.onerror = function() {
          safeApply(scope, function(scope) {
            ctrl.$setValidity('file', false);
          });
        };
      };
      element.bind('change', set_value);
      set_value();
      ctrl.$render = function() {
        element.val(null);
      };
    }
  }
}])

.directive('json', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attr, ctrl) {
      var mustbe = attr.json;
      ctrl.$parsers.unshift(function(viewValue) {
        try {
          var json = angular.fromJson(viewValue);
        } catch(err) {
          ctrl.$setValidity('json', false);
          return;
        }
        ctrl.$setValidity('json', true);
        if (mustbe) {
          var jsonType = Object.prototype.toString.call(json).match(/^\[object\s(.*)\]$/)[1];
          ctrl.$setValidity('json_type', jsonType.toLowerCase() === mustbe.toLowerCase());
        }
      });
    }
  }
});

angular.module('tabsetapp.directives', ['tabsetapp.directives.forms'])

.directive('autoSelect', function () {
  return function (scope, element, attrs) {
    var el = element[0];
    element.bind('click', function () {
      var selection = el.ownerDocument.defaultView.getSelection();
      selection.setBaseAndExtent(el, 0, el, 1);
    });
  };
})

.directive('activeLink', ['$location', function($location) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var clazz = attrs.activeLink || "active";
      var path = attrs.href;
      var isDefault = angular.isDefined(attrs.activeDefault);
      var target = attrs.activeTarget || "self";
      if (target == "parent") {
        element = element.parent();
      }
      path = path.substring(1);
      scope.$watch(function() { return $location.path(); }, function(newPath) {
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
}]);

angular.module('tabsetapp.ui.dialog.json', ['ui.bootstrap'])

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
}]);

angular.module('tabsetapp.ui.dialog.simple', ['ui.bootstrap'])

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

angular.module('tabsetapp.ui', ['tabsetapp.ui.dialog.simple', 'tabsetapp.ui.dialog.json', 'ui.bootstrap']);


angular.module('tabsetapp', ['tabsetapp.services', 'tabsetapp.filters', 'tabsetapp.directives', 'tabsetapp.ui'])
.config(['$compileProvider', function($compileProvider) {
  $compileProvider.urlSanitizationWhitelist(/^\s*(https?|ftp|mailto|blob):/);
}]);

var TabSetApp = angular.module('TabSetApp', ['tabsetapp']);
