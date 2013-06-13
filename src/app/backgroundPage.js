function validDateOrNull(str) {
  var date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

var Entry = function(args) {
  this.id = UUID();
  _.extend(this, {
    'url': '',
    'title': '',
    'isOpen': false,
    'created': new Date()
  });
  this.set(args);
}

Entry.prototype.set = function(args) {
  _.extend(this, _.pick(args, 'url', 'title', 'isOpen'));
}

Entry.prototype.open = function() {
  if (!this.isOpen) {
    this.set({'isOpen': true});
    this.lastOpened = new Date();
  }
}

Entry.prototype.close = function() {
  if (this.isOpen) {
    this.set({'isOpen': false});
    this.lastClosed = new Date();
  }
}

Entry.fromObj = function(obj) {
  var entry = new Entry(obj);
  entry.lastOpened = validDateOrNull(obj.lastOpened);
  entry.lastClosed = validDateOrNull(obj.lastClosed);
  entry.created = validDateOrNull(obj.created);
  return entry;
}

Entry.prototype.toObj = function() {
  return _.pick(this, 'url', 'title', 'isOpen', 'created', 'lastOpened', 'lastClosed');
}


var TabSet = function(args) {
  this.id = UUID();
  _.extend(this, {
    'name': '',
    'created': new Date()
  });

  this.entries = [];
  this.set(args);
}

TabSet.prototype.set = function(args) {
  _.extend(this, _.pick(args, 'name'));
}
TabSet.prototype.open = function() {
  this.lastOpened = new Date();
}
TabSet.prototype.close = function() {
  this.lastClosed = new Date();
}

TabSet.fromObj = function(obj) {
  var tab_set = new TabSet(obj);
  tab_set.entries = _.map(obj.entries, function(e) { return Entry.fromObj(e); });
  tab_set.lastOpened = validDateOrNull(obj.lastOpened);
  tab_set.lastClosed = validDateOrNull(obj.lastClosed);
  tab_set.created = validDateOrNull(obj.created)
  return tab_set;
}

TabSet.prototype.toObj = function() {
  return _.chain(this)
          .pick('name', 'created', 'lastOpened', 'lastClosed')
          .extend({
            'entries': _.map(this.entries, function(e) { return e.toObj(); })
          })
          .value();
}

TabSet.prototype.insertEntry = function(e, where) {
  var cur_idx = _.indexOf(this.entries, e);
  if (_.has(where, 'index')) {
    var new_idx = where.index;
    if (new_idx != cur_idx) {
      if (cur_idx >= 0) {
        this.entries.splice(cur_idx, 1);
      }
      this.entries.splice(new_idx, 0, e);
    }
  } else {
    var before_idx = _.indexOf(this.entries, where.before);
    if (before_idx < 0) {
      before_idx = this.entries.length+1;
    }

    var after_idx = _.indexOf(this.entries, where.after);
    if (after_idx < 0) {
      after_idx = -1;
    }

    if (after_idx >= before_idx) {
      return;
    }

    if (cur_idx > before_idx || cur_idx <= after_idx) {
      this.entries.splice(before_idx, 0, e);
      if (cur_idx >= 0) {
        this.entries.splice(cur_idx > before_idx ? cur_idx + 1 : cur_idx, 1);
      }
    }
  }
}

TabSet.prototype.dropEntry = function(e) {
  var idx = _.indexOf(this.entries, e);
  if (idx >= 0) {
    this.entries.splice(idx, 1);
  }
}

var TabSetManager = function(cb) {
  var self = this;
  self.tabSets = [];

  chrome.storage.local.get({"tabSets": "[]"}, function(items) {
    _.each(JSON.parse(items["tabSets"]), function(ts) { self.load(ts); });
    if (!_.isUndefined(cb)) {
      cb(self);
    }
  });
}

TabSetManager.prototype.load = function(obj) {
  var self = this;
  try {
    var tab_set = TabSet.fromObj(obj);
  } catch(err) {
    return false;
  }
  self.tabSets.push(tab_set);
  return true;
}

TabSetManager.prototype.toObj = function() {
  var self = this;
  return _.map(self.tabSets, function(ts) { return ts.toObj(); });
}

TabSetManager.prototype.save = function(cb) {
  var self = this;

  chrome.storage.local.set({ "tabSets": JSON.stringify(this.toObj()) }, function() {
    if (!_.isUndefined(cb)) {
      cb(self);
    }
  });
}

TabSetManager.prototype.newTabSet = function(args) {
  var tab_set = new TabSet(args);
  this.tabSets.push(tab_set);
  return tab_set;
}

TabSetManager.prototype.dropTabSet = function(tab_set) {
  var idx = _.indexOf(this.tabSets, tab_set);
  if (idx >= 0) {
    this.tabSets.splice(idx, 1);
  }
}


var SessionTab = function(tid) {
  this.id = tid;
  this.entry = null;
}

SessionTab.prototype.openEntry = function(e) {
  this.entry = e;
  this.entry.open();
}

SessionTab.prototype.closeEntry = function() {
  if (this.entry != null) {
    var e = this.entry;
    this.entry = null;
    e.close();
    return e;
  }
}

var SessionWindow = function(wid, tab_set) {
  this.id = wid;
  this.tabSet = tab_set;
  this.activeTabs = [];
  this.trackedTabs = {};
  this.openEntries ={};
}

SessionWindow.prototype._openEntry = function(s_tab, entry) {
  this.openEntries[entry.id] = s_tab;
  s_tab.openEntry(entry);
}

SessionWindow.prototype._closeEntry = function(s_tab) {
  if (s_tab.entry != null) {
    delete this.openEntries[s_tab.entry.id];
  }
  s_tab.closeEntry();
}

SessionWindow.prototype.newTab = function(t, entry) {
  var s_tab = this.trackedTabs[t.id];
  if (_.isUndefined(s_tab)) {
    s_tab = new SessionTab(t.id);
    this.trackedTabs[t.id] = s_tab;
    this.moveTab(t.id, t.index);
  }
  this.updateTab(t, entry);
}

SessionWindow.prototype.updateTab = function(t, entry) {
  var s_tab = this.trackedTabs[t.id];
  if (!_.isUndefined(entry)) {
    this._closeEntry(s_tab);
    if (_.isNull(entry)) {
      return;
    }
  } else if (s_tab.entry != null) {
    s_tab.entry.set(t);
    return;
  }

  entry = entry || _.findWhere(this.tabSet.entries, {'url': t.url, 'isOpen': false}) || new Entry(t);
  this._openEntry(s_tab, entry);
  this.moveTabEntry(t.id);
}

SessionWindow.prototype.moveTab = function(tid, index) {
  var s_tab = this.trackedTabs[tid];
  var cur_idx = _.indexOf(this.activeTabs, s_tab);
  if (cur_idx != index) {
    if (cur_idx >= 0) {
      this.activeTabs.splice(cur_idx, 1);
    }
    this.activeTabs.splice(index, 0, s_tab);
    this.moveTabEntry(tid);
  }
}

SessionWindow.prototype.moveTabEntry = function(tid) {
  var s_tab = this.trackedTabs[tid];
  if (s_tab.entry != null) {
    var cur_idx = _.indexOf(this.activeTabs, s_tab);
    var after_tab = this.activeTabs[cur_idx-1];
    var before_tab = this.activeTabs[cur_idx+1];
    this.tabSet.insertEntry(s_tab.entry, {
      'after': after_tab && after_tab.entry,
      'before': before_tab && before_tab.entry
    })
  }
}

SessionWindow.prototype.closeTab = function(tid) {
  var s_tab = this.trackedTabs[tid];
  if (!_.isUndefined(s_tab)) {
    this._closeEntry(s_tab);
    this.activeTabs.splice(_.indexOf(this.activeTabs, s_tab), 1);
    delete this.trackedTabs[tid];
  }
}

SessionWindow.prototype.swapTab = function(old_tid, new_tid) {
  var s_tab = this.trackedTabs[old_tid];
  if (!_.isUndefined(s_tab)) {
    s_tab.id = new_tid;
    delete this.trackedTabs[old_tid];
    this.trackedTabs[new_tid] = s_tab;
  }
}

SessionWindow.prototype.open = function() {
  this.tabSet.open();
}

SessionWindow.prototype.close = function() {
  this.tabSet.close();
}

var SessionManager = function(cb) {
  var self = this;
  self.trackedWindows = {};
  self.openTabSets = {};

  self.save = _.throttle(function() {
    self.tabSetManager.save();
    this.trigger("changed");
  }, 2000);

  self.refresh = _.throttle(function() {
    chrome.windows.getLastFocused({'populate':false}, function(w) {
      self.updateUi(w.id);
    });
  }, 500);

  self.tabSetManager = new TabSetManager(function(tsm) {
    self.allTabSets = tsm.tabSets;

    chrome.windows.onRemoved.addListener(function(wid) {
      self.detachWindow(wid);
    });

    chrome.windows.onFocusChanged.addListener(function(wid) {
      self.refresh();
    });

    chrome.tabs.onCreated.addListener(function(t) {
      var s_window = self.trackedWindows[t.windowId];
      if (!_.isUndefined(s_window)) {
        s_window.newTab(t, null); // new tab with no entry
        if (self.isTrackableUrl(t.url)) {
          s_window.updateTab(t);
        }
        self.save();
      }
    });

    chrome.tabs.onUpdated.addListener(function(tid, change, t) {
      var s_window = self.trackedWindows[t.windowId];
      if (!_.isUndefined(s_window) && (_.has(change, 'url') || _.has(change, 'status'))) {
        if (self.isTrackableUrl(t.url)) {
          s_window.updateTab(t);
        } else {
          s_window.updateTab(t, null);
        }
        self.save();
      }
    });

    chrome.tabs.onMoved.addListener(function(tid, move) {
      var s_window = self.trackedWindows[move.windowId];
      if (!_.isUndefined(s_window)) {
        s_window.moveTab(tid, move.toIndex);
        self.save();
      }
    });

    chrome.tabs.onDetached.addListener(function(tid, info) {
      var s_window = self.trackedWindows[info.oldWindowId];
      if (!_.isUndefined(s_window)) {
        s_window.closeTab(tid);
        self.save();
      }
    });

    chrome.tabs.onAttached.addListener(function(tid, info) {
      var s_window = self.trackedWindows[info.newWindowId];
      if (!_.isUndefined(s_window)) {
        chrome.tabs.get(tid, function(t) {
          s_window.newTab(t, null);
          if (self.isTrackableUrl(t.url)) {
            s_window.updateTab(t);
          }
          self.save();
        });
      }
    });

    chrome.tabs.onRemoved.addListener(function(tid, info) {
      var s_window = self.trackedWindows[info.windowId];
      if (!_.isUndefined(s_window) && !info.isWindowClosing) {
        s_window.closeTab(tid);
        self.save();
      }
    });

    chrome.tabs.onReplaced.addListener(function(new_tid, old_tid) {
      chrome.tabs.get(old_tid, function(t) {
        var s_window = self.trackedWindows[t.windowId];
        if (!_.isUndefined(s_window)) {
          s_window.swapTab(old_tid, new_tid);
          s_window.updateTab(t);
          self.save();
        }
      });
    });

    if (!_.isUndefined(cb)) {
      cb(self);
    }
  })
}

asEvented.call(SessionManager.prototype);

SessionManager.prototype.isTrackableUrl = function(u) {
  return /^https?:\/\//.test(u);
}

SessionManager.prototype.updateUi = function(wid){
  var s_window = this.trackedWindows[wid];
  if (!_.isUndefined(s_window)) {
    chrome.browserAction.setTitle({
      'title': "Current TabSet: "+s_window.tabSet.name
    });
    chrome.browserAction.setBadgeText({
      'text': s_window.tabSet.name.slice(0,4)
    });
    chrome.browserAction.setIcon({
      'path': {
        '19': 'assets/img/active-19.png',
        '38': 'assets/img/active-38.png'
      }
    });
  } else {
    chrome.browserAction.setTitle({
      'title': "No active TabSet"
    });
    chrome.browserAction.setBadgeText({
      'text': ""
    });
    chrome.browserAction.setIcon({
      'path': {
        '19': 'assets/img/inactive-19.png',
        '38': 'assets/img/inactive-38.png'
      }
    });
  }
}

SessionManager.prototype.createTabSet = function(w, args, cb) {
  var self = this;
  var tab_set = self.tabSetManager.newTabSet(args);

  var s_window = new SessionWindow(w.id, tab_set);
  _.each(w.tabs, function(t) {
    s_window.newTab(t, null); // new tab with no entry
    if (self.isTrackableUrl(t.url)) {
      s_window.updateTab(t);
    }
  });

  s_window.open();
  self.trackedWindows[w.id] = s_window;
  self.openTabSets[tab_set.id] = s_window;

  self.save();
  self.refresh();
  if (!_.isUndefined(cb)) {
    cb(tab_set);
  }
}

SessionManager.prototype.detachWindow = function(wid) {
  var self = this;
  var s_window = self.trackedWindows[wid];
  if (!_.isUndefined(s_window)) {
    s_window.close();
    delete self.openTabSets[s_window.tabSet.id];
    delete self.trackedWindows[wid];
    self.save();
  }
}

SessionManager.prototype.tabSetForWindow = function(wid) {
  if (_.has(this.trackedWindows, wid)) {
    return this.trackedWindows[wid].tabSet;
  }
}

SessionManager.prototype.launchTabSet = function(tab_set, cb) {
  var self = this;
  var s_window = self.openTabSets[tab_set.id];
  if (!_.isUndefined(s_window)) {
    chrome.windows.update(s_window.id, {'focused': true}, cb);
    return;
  }

  var alive_entries = _.where(tab_set.entries, {'isOpen': true});
  chrome.windows.create({'url': _.pluck(alive_entries, 'url'), 'focused': true}, function(w) {
    s_window = new SessionWindow(w.id, tab_set);
    var tabs = _.sortBy(w.tabs, function(t) { return t.index; });
    _.each(alive_entries, function(entry, idx) {
      s_window.newTab(tabs[idx], entry);
    });
    _.each(_.rest(tabs, alive_entries.length), function(t) {
      s_window.newTab(t, null);
      if (self.isTrackableUrl(t.url)) {
        s_window.updateTab(t);
      }
    });

    s_window.open();
    self.trackedWindows[w.id] = s_window;
    self.openTabSets[tab_set.id] = s_window;

    self.save();
    self.refresh();
    if (!_.isUndefined(cb)) {
      cb(w);
    }
  });
}

SessionManager.prototype.launchTabSetEntry = function(tab_set, entry, cb) {
  var self = this;

  var entry_idx = _.indexOf(tab_set.entries, entry);
  var s_window = self.openTabSets[tab_set.id];
  if (_.isUndefined(s_window) || entry_idx < 0) {
    if (!_.isUndefined(cb)) {
      cb();
    }
    return;
  }

  var s_tab = s_window.openEntries[entry.id];
  if (!_.isUndefined(s_tab)) {
    chrome.tabs.update(s_tab.id, {'active': true}, cb);
    return;
  }

  var insert_idx = -1;
  var before_entry = _.findWhere(_.rest(tab_set.entries, entry_idx+1), {'isOpen': true});
  if (before_entry != null) {
    _.any(s_window.activeTabs, function(s_tab) {
      insert_idx += 1;
      return s_tab.entry == before_entry;
    });
  }

  if (insert_idx == -1) {
    insert_idx = s_window.activeTabs.length;
  }

  chrome.tabs.create({
    'windowId': s_window.id,
    'index': insert_idx,
    'active': false
  }, function(t) {
    s_window.updateTab(t, entry);
    s_window.moveTabEntry(t.id);
    self.save();
    chrome.tabs.update(t.id, {
      'url': entry.url,
      'active': true
    }, cb);
  });
}

SessionManager.prototype.dropTabSetEntry = function(tab_set, entry , cb) {
  var self = this;

  var entry_idx = _.indexOf(tab_set.entries, entry);
  if (entry_idx < 0) {
    if (!_.isUndefined(cb)) {
      cb();
    }
  }

  tab_set.dropEntry(entry);
  self.save();

  var s_window = self.openTabSets[tab_set.id];

  if (!_.isUndefined(s_window)) {
    var s_tab = s_window.openEntries[entry.id];
    if (!_.isUndefined(s_tab)) {
      s_window.closeTab(s_tab.id);
      chrome.tabs.remove(s_tab.id, cb);
      return;
    }
  }

  if (!_.isUndefined(cb)) {
    cb();
  }
}

SessionManager.prototype.dropAllTabSetEntries = function(tab_set, cb) {
  var self = this;

  var s_window = self.openTabSets[tab_set.id];

  _.each(tab_set.entries.slice(), function(entry) {
    tab_set.dropEntry(entry);
    if (!_.isUndefined(s_window)) {
      var s_tab = s_window.openEntries[entry.id];
      if (!_.isUndefined(s_tab)) {
        s_window.closeTab(s_tab.id);
      }
    }
  });

  self.save();

  if (!_.isUndefined(s_window)) {
    chrome.windows.remove(s_window.id, cb);
    return;
  }

  if (!_.isUndefined(cb)) {
    cb();
  }
}

SessionManager.prototype.dropTabSet = function(tab_set) {
  var self = this;
  var s_window = self.openTabSets[tab_set.id];
  if (!_.isUndefined(s_window)) {
    self.detachWindow(s_window.id);
  }
  self.tabSetManager.dropTabSet(tab_set);
  self.save();
  self.refresh();
}

SessionManager.prototype.dropAllTabSets = function() {
  var self = this;
  _.each(self.allTabSets.slice(), function(tab_set) {
    self.dropTabSet(tab_set);
  });
  self.save();
  self.refresh();
}

SessionManager.prototype.renameTabSet = function(tab_set, name) {
  var self = this;
  tab_set.set({"name": name});
  self.save();
  self.refresh();
}

SessionManager.prototype.importTabSets = function(tab_sets) {
  var self  = this;
  var count = 0;
  _.each(tab_sets, function(tab_set) {
    if (self.tabSetManager.load(tab_set)) {
      count += 1;
    }
  });
  self.save();
  return count;
}

var session = new SessionManager();
