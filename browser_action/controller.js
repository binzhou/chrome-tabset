function BrowserActionController($dialog, $scope, session, jsonDialog, simpleDialog, safeApply) {
  $scope.session = session;
  $scope.showDetails = false;
  $scope.activeTabSet = null;

  $scope.launchOptions = function(subsection) {
    chrome.tabs.create({
      url: "options/options.html"
    });
  };

  var updateTabSet = function(tab_set) {
    safeApply($scope, function(scope) {
      scope.activeTabSet = tab_set;
      scope.showDetails = tab_set != null;
    });
  };

  chrome.windows.getCurrent({}, function(w) {
    updateTabSet(session.tabSetForWindow(w.id));
  });

  $scope.entryFilter = function(filter) {
    return function(entry) {
      return (filter!='open' || entry.isOpen) && (filter!='close' || !entry.isOpen);
    };
  };

  $scope.createTabSet = function(name) {
    chrome.windows.getCurrent({'populate':true}, function(w) {
      session.createTabSet(w, {'name': name}, function(tab_set) {
        updateTabSet(tab_set);
      });
    });
  };

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
        if ($scope.activeTabSet == tab_set) {
          chrome.windows.getCurrent({'populate':false}, function(w) {
            updateTabSet(null);
          });
        }
      }
    });
  };

  $scope.dropAllTabSets = function() {
    var msgbox = simpleDialog.confirm("confirmDialog.html", {
      "title": "Delete All Tabsets",
      "body": "Are you sure you want to delete ALL tabsets? This action cannot be undone.",
      "accept": "Yes",
      "cancel": "No"
    });

    msgbox.open().then(function(accepted) {
      if (accepted) {
        session.dropAllTabSets();
        if ($scope.activeTabSet) {
          chrome.windows.getCurrent({'populate':false}, function(w) {
            updateTabSet(null);
          });
        }
      }
    });
  };

  $scope.exportTabSet = function(tab_set) {
    var dialog = jsonDialog.export("exportDialog.html", {
      "fname": "export-tabset-"+ (tab_set.name || "untitled") +".json",
      "title": "Export " + (tab_set.name || "(untitled)"),
      "obj": [ tab_set.toObj() ]
    });
    dialog.open();
  };

  $scope.exportAllTabSets = function() {
    var dialog = jsonDialog.export("exportDialog.html", {
      "fname": "export-all-tabsets.json",
      "title": "Export All TabSets (" + $scope.session.allTabSets.length + ")",
      "obj": $scope.session.tabSetManager.toObj()
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
  };

  $scope.dropAllTabSetEntries = function(tab_set) {
    var msgbox = simpleDialog.confirm("confirmDialog.html", {
      "title": "Clear Current Tabset (" + tab_set.name + ")",
      "body": "Are you sure you want to remove ALL entries from '" + tab_set.name + "'? This action cannot be undone and will close this browser window.",
      "accept": "Yes",
      "cancel": "No"
    });

    msgbox.open().then(function(accepted) {
      if (accepted) {
        session.dropAllTabSetEntries(tab_set);
      }
    });
  };

}
