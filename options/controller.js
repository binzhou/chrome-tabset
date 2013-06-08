var TabSetOptionsApp = angular.module('TabSetOptionsApp', ['tabsetapp'])
.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
    when('/browse', {templateUrl: 'browse.html',   controller: TabSetsController}).
    when('/import', {templateUrl: 'import.html',   controller: ImportController}).
    when('/tools', {templateUrl: 'tools.html',   controller: ToolsController}).
    otherwise({redirectTo: '/browse'});
}]);

function NavigationController($scope) {

};

function TabSetsController($dialog, $scope, session, jsonDialog, simpleDialog, safeApply, fuzzy) {
  $scope.session = session;
  $scope.query = '';

  var onUpdate = function() {
    safeApply($scope);
  };

  session.on("changed", onUpdate);
  $scope.$on("$destroy", function () {
    session.off("changed", onUpdate)
  });

  $scope.fuzzyTabSet = function(tab_set) {
    if (fuzzy.test($scope.query, tab_set.name)) {
      return true;
    }
    for (var i in tab_set.entries) {
      var entry = tab_set.entries[i];
      if ($scope.fuzzyEntry(entry)) {
        return true;
      }
    }
    return false;
  }

  $scope.fuzzyEntry = function(entry) {
    return fuzzy.test($scope.query, entry.title) || fuzzy.test($scope.query, entry.url);
  }

  $scope.dropTabSet = function(tab_set) {
    var msgbox = simpleDialog.confirm("confirmDialog.html", {
      "title": "Delete Tabset",
      "body": "Are you sure you want to delete '" + tab_set.name + "'? This action cannot be undone.",
      "accept": "Yes",
      "cancel": "No"
    });

    msgbox.open().then(function(accepted) {
      if (accepted) {
        session.dropTabSet(tab_set);
      }
    });
  };

  $scope.dropTabSetEntry = function(tab_set, entry) {
    session.dropTabSetEntry(tab_set, entry);
  };

  $scope.exportTabSet = function(tab_set) {
    var dialog = jsonDialog.export("exportDialog.html", {
      "fname": "export-tabset-"+ (tab_set.name || "untitled") +".json",
      "title": "Export " + (tab_set.name || "(untitled)"),
      "obj": [ tab_set.toObj() ]
    });
    dialog.open();
  };

  $scope.renameTabSet = function(tab_set) {
    var dialog = simpleDialog.input("inputDialog.html", {
      'title': "Rename '" + tab_set.name + "'",
      'placeholder': "New Name",
      'default': tab_set.name,
      'accept': "Rename"
    });
    dialog.open().then(function(name) {
      if (name) {
        session.renameTabSet(tab_set, name);
      }
    });
  };

  $scope.launchTabSet = function(tab_set) {
    session.launchTabSet(tab_set);
  };

  $scope.launchEntry = function(tab_set, entry) {
    if (!angular.isDefined(session.openTabSets[tab_set.id])) {
      var msgbox = simpleDialog.confirm("confirmDialog.html", {
        "title": "Launch Entry",
        "body": "Do you wish to launch the entire TabSet?",
        "accept": "Launch TabSet",
        "cancel": "Launch as new tab"
      });
      msgbox.open().then(function(accepted) {
        if (!angular.isDefined(accepted)) {
          return;
        } else if (accepted) {
          session.launchTabSet(tab_set, function(w) {
            $scope.launchEntry(tab_set, entry);
          });
        } else {
          chrome.tabs.create({
            'url': entry.url,
            'active': true
          });
        }
      });
    } else {
      session.launchTabSetEntry(tab_set, entry);
    }
  };
}

function ImportController($scope, $location, simpleDialog, session) {
  $scope.json = "";

  $scope.reset = function() {
    $scope.json = "";
    $scope.importForm.$setPristine();
  }

  $scope.importJson = function() {
    if ($scope.json && !$scope.jsonInvalid) {
      var imported = session.importTabSets(angular.fromJson($scope.json));
      var msgbox = simpleDialog.confirm("confirmDialog.html", {
        "title": "TabSets Imported",
        "body": "Successfully imported " + imported + " TabSets.",
        "accept": "Done",
        "cancel": "Import More"
      });

      msgbox.open().then(function(done) {
        $scope.reset();
        if (done) {
          $location.hash("tabsets");
        }
      });
    }
  }
}

function ToolsController($scope, $location, simpleDialog, jsonDialog, session) {
  $scope.importData = function() {
    $location.hash("import");
  };

  $scope.exportData = function() {
    var dialog = jsonDialog.export("exportDialog.html", {
      "fname": "export-all-tabsets.json",
      "title": "Export All TabSets (" + session.allTabSets.length + ")",
      "obj": session.tabSetManager.toObj()
    });
    dialog.open();
  };

  $scope.clearData = function() {
    var msgbox = simpleDialog.confirm("confirmDialog.html", {
      "title": "Delete All Tabsets",
      "body": "Are you sure you want to delete ALL tabsets? This action cannot be undone.",
      "accept": "Yes",
      "cancel": "No"
    });

    msgbox.open().then(function(accepted) {
      if (accepted) {
        session.dropAllTabSets();
        chrome.windows.getCurrent({'populate':false}, function(w) {
          session.updateBrowserAction(w.id);
        });
      }
    });
  };
}
