function BrowserActionController($scope, session) {
  $scope.session = session;
  $scope.ready = false;
  $scope.showDetails = false;
  $scope.activeTabSet = null;

  var updateTabSet = function(tab_set) {
    $scope.$apply(function(scope) {
      scope.activeTabSet = tab_set;
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

  $scope.entryFilter = function(filter) {
    return function(entry) {
      return (filter!='open' || entry.isAlive) && (filter!='close' || !entry.isAlive);
    };
  };

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

  $scope.launchTabSetEntry = function(entry) {
    session.launchTabSetEntry($scope.activeTabSet, entry, function() {
      window.close();
    })
  };

  $scope.openTabSetExport = function() {
    $scope.tabSetExportOpened = true;
  };

  $scope.closeTabSetExport = function() {
    $scope.tabSetExportOpened = false;
  };

  $scope.openAllExport = function() {
    $scope.allExportOpened = true;
  };

  $scope.closeAllExport = function() {
    $scope.allExportOpened = false;
  };
}
