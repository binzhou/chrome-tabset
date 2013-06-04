function TabSetsController($dialog, $scope, session, jsonDialog, simpleDialog) {
  $scope.session = session;

  var onUpdate = function() {
    try {
      $scope.$digest();
    } catch(err) {
      return;
    }
  };

  session.on("changed", onUpdate);
  $scope.$on("$destroy", function () {
    session.off("changed", onUpdate)
  });
}

function ImportController($scope, $location, simpleDialog, session) {
  $scope.json = "";
  $scope.jsonInvalid = false;

  $scope.$watch("file", function(file) {
    var reader = new FileReader();
        reader.readAsText(file);
    reader.onload = function() {
      $scope.$apply(function($scope) {
        try {
          var json = angular.toJson(angular.fromJson(reader.result));
        } catch(err) {
          var json = "Invalid file."
        }
        $scope.json = json;
      });
    }
  });

  $scope.$watch("json", function(json) {
    if (!json) {
      $scope.jsonInvalid = false;
      return;
    }
    try {
      var obj = angular.fromJson($scope.json);
    } catch(err) {
      $scope.jsonInvalid = true;
      return;
    }
    $scope.jsonInvalid = !(obj instanceof Array);
  });

  $scope.reset = function() {
    $scope.json = "";
    $scope.file = null;
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
