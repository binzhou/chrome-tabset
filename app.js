var TabSetApp = angular.module('TabSetApp', ['ui.bootstrap'])
  .filter('default', function() {
    return function(input, value) {
      return input != null && input != undefined && input != "" ? input : value || '';
    }
  })
  .factory('session', function() {
    return chrome.extension.getBackgroundPage().session;
  });
