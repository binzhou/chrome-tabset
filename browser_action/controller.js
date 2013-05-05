function BrowserActionController($scope, session) {
  $scope.session = session;
  $scope.ready = false;
  $scope.activeTabSets = null;
  $scope.showDetails = false;

  var updateTabSet = function(tab_set) {
    $scope.$apply(function(scope) {
      scope.activeTabSets = [tab_set];
      scope.showDetails = true;
    });
  }

  chrome.windows.getCurrent({}, function(w){
    if (_.has(session.trackedWindows, w.id)) {
      updateTabSet(session.trackedWindows[w.id].tabSet);
    }
    $scope.$apply(function(scope) {
      scope.ready = true;
    });
  });

  $scope.createTabSet = function(name) {
    chrome.windows.getCurrent({'populate':true}, function(w) {
      session.createTabSet(name, w, updateTabSet);
    });
  };

  $scope.launchTabSet = function(tab_set) {
    session.launchTabSet(tab_set, function() {
      window.close();
    });
  };
}
