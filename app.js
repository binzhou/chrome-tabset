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
  });
