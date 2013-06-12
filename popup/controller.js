var TabSetPopupApp = angular.module('TabSetPopupApp', ['tabsetapp']);

function PopupController($scope, session, safeApply, fuzzy) {
  $scope.ready = false;
  $scope.tab_set = null;
  $scope.session = session;
  $scope.query = "";

  chrome.windows.getCurrent({}, function(w) {
    safeApply($scope, function($scope) {
      $scope.tab_set = session.tabSetForWindow(w.id);
      $scope.ready = true;
    })
  });

  var onUpdate = function() {
    safeApply($scope);
  };

  session.on("changed", onUpdate);
  $scope.$on("$destroy", function () {
    session.off("changed", onUpdate)
  });

  $scope.fuzzyTabSet = function(query) {
    return function(tab_set) {
      return fuzzy.test(query, tab_set.name);
    };
  };

  $scope.fuzzyEntry = function(query) {
    return function(entry) {
      return fuzzy.test(query, entry.title) || fuzzy.test(query, entry.url);
    };
  };

  $scope.launchTabSet = function(tab_set) {
    session.launchTabSet(tab_set);
  };

  $scope.launchOptions = function(subsection) {
    var url = "options/options.html";
    if (subsection) {
      url += "#/" + subsection;
    }
    chrome.tabs.create({
      url: url
    });
  };

  $scope.dropTabSetEntry = function(entry) {
    session.dropTabSetEntry($scope.tab_set, entry);
  };

  $scope.launchEntry = function(entry) {
    session.launchTabSetEntry($scope.tab_set, entry);
  };
};
