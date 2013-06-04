function BrowserActionController($dialog, $scope, session, jsonDialog, simpleDialog) {
  $scope.session = session;
  $scope.ready = false;
  $scope.showDetails = false;
  $scope.activeTabSet = null;

  var updateTabSet = function(tab_set) {
    $scope.$apply(function(scope) {
      scope.activeTabSet = tab_set;
      scope.showDetails = tab_set != null;
    });
  }

  chrome.windows.getCurrent({}, function(w){
    session.updateBrowserAction(w.id);
    updateTabSet(session.tabSetForWindow(w.id));
    $scope.$apply(function(scope) {
      scope.ready = true;
    });
  });

  $scope.entryFilter = function(filter) {
    return function(entry) {
      return (filter!='open' || entry.isOpen) && (filter!='close' || !entry.isOpen);
    };
  };

  $scope.createTabSet = function(name) {
    chrome.windows.getCurrent({'populate':true}, function(w) {
      session.createTabSet(w, {'name': name}, function(tab_set) {
        session.updateBrowserAction(w.id);
        updateTabSet(tab_set);
      });
    });
  };

  $scope.dropTabSet = function(tab_set) {
    var msgbox = simpleDialog.confirm("confirmDialog.html", {
      "title": "Delete Tabset",
      "body": "Are you sure you wantto delete '" + tab_set.name + "'?",
      "accept": "Yes",
      "cancel": "No"
    });

    msgbox.open().then(function(accepted) {
      if (accepted) {
        session.dropTabSet(tab_set);
        chrome.windows.getCurrent({'populate':false}, function(w) {
          session.updateBrowserAction(w.id);
          updateTabSet(null);
        });
      }
    });
  };

  $scope.exportTabSet = function(tab_set) {
    var dialog = jsonDialog.export("exportDialog.html", {
      "title": "Export " + (tab_set.name || "(untitled)"),
      "obj": [ tab_set.toObj() ]
    });
    dialog.open();
  };

  $scope.exportAllTabSets = function() {
    var dialog = jsonDialog.export("exportDialog.html", {
      "title": "Export All TabSets (" + $scope.session.allTabSets.length + ")",
      "obj": $scope.session.allTabSets
    });
    dialog.open();
  };

  $scope.importTabSet = function() {
    var dialog = jsonDialog.import("importDialog.html", {
      "title": "Import TabSets",
    });
    dialog.open().then(function(obj) {
      if (obj) {
        session.importTabSets(obj);
      }
    });
  };

  $scope.renameTabSet = function(tab_set) {
    var dialog = simpleDialog.input("inputDialog.html", {
      'title': "Rename TabSet",
      'body': "New name for '" + tab_set.name + "'",
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

  $scope.infoTabSet = function(tab_set) {
    var open_tabs = 0;
    for (var i in tab_set.entries) {
      console.log(tab_set);
      if (tab_set.entries[i].isOpen) {
        open_tabs += 1;
      }
    }

    var dialog = simpleDialog.info("infoDialog.html", {
      'title': "'" + tab_set.name + "' Info",
      'info_groups': [
        {
          'Open Tabs': open_tabs,
          'Closed Tabs': tab_set.entries.length - open_tabs,
          'Total Tabs': tab_set.entries.length
        },
        {
          'Created': tab_set.created && tab_set.created.toLocaleString(),
          'Last Opened': tab_set.lastOpened && tab_set.lastOpened.toLocaleString(),
          'Last Closed': tab_set.lastClosed && tab_set.lastClosed.toLocaleString()
        }
      ]
    });
    dialog.open();
  };



  $scope.launchTabSet = function(tab_set) {
    session.launchTabSet(tab_set, function() {
      window.close();
    });
  };

  $scope.launchTabSetEntry = function(entry) {
    session.launchTabSetEntry($scope.activeTabSet, entry, function() {
      window.close();
    });
  };

  $scope.dropTabSetEntry = function(entry) {
    session.dropTabSetEntry($scope.activeTabSet, entry);
  }
}
