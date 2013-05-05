function Session(cb) {
  this.trackedWindows = {};
  this.trackedTabs = {};

  this.loaded = false;
  this.load(cb);
}

Session.prototype._trackableUrl = function(u) {
  return /^https?:\/\//.test(u);
}

Session.prototype._createTab = function(t, w_info) {
  return {
    'id': t.id,
    'windowInfo': w_info,
    'tracked': true,
    'entry': this._trackableUrl(t.url) ? {'url': t.url, 'title': t.title, 'isAlive': true} : null,
  }
}

Session.prototype._orphanTab = function(t_info) {
  var w_info = t_info.windowInfo;
  w_info.activeTabs.splice(_.indexOf(w_info.activeTabs, t_info), 1);
  if (!_.isNull(t_info.entry)) {
    var tab_set = w_info.tabSet;
    tab_set.entries.splice(_.indexOf(tab_set.entries, t_info.entry), 1);
  }
}

Session.prototype._insertTab = function(t_info, pos) {
  var w_info = t_info.windowInfo;
  w_info.activeTabs.splice(pos, 0, t_info);
  this._insertEntry(t_info);
}

Session.prototype._insertEntry = function(t_info) {
  if (_.isNull(t_info.entry)) {
    return;
  }
  var w_info = t_info.windowInfo;
  var insertPos = _.indexOf(w_info.activeTabs, t_info);
  if (insertPos == w_info.activeTabs.length - 1) {
    w_info.tabSet.entries.push(t_info.entry);
  } else {
    var next_entry = w_info.activeTabs[insertPos+1].entry;
    var ts_pos = _.indexOf(w_info.tabSet.entries, next_entry);
    w_info.tabSet.entries.splice(ts_pos, 0, t_info.entry);
  }
}

Session.prototype._orphanEntry = function(t_info) {
  if (_.isNull(t_info.entry)) {
    return;
  }
  t_info.entry.isAlive = false;
  t_info.entry = null;
}

Session.prototype._cloneEntry = function(t_info) {
  if (_.isNull(t_info.entry)) {
    return;
  }
  var entry = _.clone(t_info.entry);
  this._orphanEntry(t_info);
  t_info.entry = entry;
  this._positionTabSetEntry(t_info);
}

Session.prototype._tabCreated = function(t) {
  if (! _.has(this.trackedWindows, t.windowId)) {
    return;
  }
  var w_info = this.trackedWindows[t.windowId];
  var t_info = this._createTab(t, w_info);
  this._insertTab(t_info, t.index);
  this.trackedTabs[t.id] = t_info;
}

Session.prototype._tabChanged = function(tid, change, t) {
  if (! _.has(this.trackedTabs, tid) || (! _.has(change, 'url') && change.status != 'complete')) {
    return;
  }

  var t_info = this.trackedTabs[tid];
  var entry_delta = {
    'url': _.has(change, 'url') ? change.url : t.url,
    'title': t.title
  };

  if (!this._trackableUrl(entry_delta.url)) {
    this._orphanEntry(t_info);
    return;
  }

  if (! _.isNull(t_info.entry)) {
    _.extend(t_info.entry, entry_delta);
    return;
  }

  t_info.entry = _.extend({'isAlive': true}, entry_delta);
  this._insertEntry(t_info);
}

Session.prototype._tabMoved = function(tid, move) {
  if (! _.has(this.trackedTabs, tid)) {
    return;
  }

  var t_info = this.trackedTabs[tid];
  this._orphanTab(t_info);
  this._insertTab(t_info, move.toIndex);
}

Session.prototype._tabDetached = function(tid, detach) {
  if (! _.has(this.trackedTabs, tid)) {
    return;
  }

  var t_info = this.trackedTabs[tid];
  this._orphanTab(t_info);
  delete this.trackedTabs[t_info.id];
}

Session.prototype._tabAttached = function(tid, attach) {
  if (! _.has(this.trackedWindows, attach.newWindowId)) {
    return;
  }

  var self = this;
  chrome.tabs.get(tid, function(t) {
    self._tabCreated(t);
  })
}

Session.prototype._tabRemoved = function(tid, remove) {
  if (! _.has(this.trackedTabs, tid) || remove.isWindowClosing) {
    return;
  }
  var t_info = this.trackedTabs[tid];
  if (t_info.tracked) {
    this._orphanEntry(t_info);
  }
  this._orphanTab(t_info);
  delete this.trackedTabs[t_info.id];
}

Session.prototype._tabReplaced = function(new_tid, old_tid) {
  if (! _.has(this.trackedTabs, old_tid)) {
    return;
  }

  var self = this;
  var t_info = self.trackedTabs[old_tid];
  t_info.id = new_tid;

  delete self.trackedTabs[old_tid];
  self.trackedTabs[new_tid] = t_info;
}

Session.prototype._windowRemoved = function(wid) {
  if (! _.has(this.trackedWindows, wid)) {
    return;
  }

  var self = this;
  var w_info = self.trackedWindows[wid];

  _.each(w_info.activeTabs, function(t_info) {
    if (!t_info.tracked) {
      self._oprhanTab(t_info);
    }
    delete self.trackedTabs[t_info.id];
  });

  delete self.trackedWindows[wid];
}

Session.prototype.createTabSet = function(name, w, cb) {
  if (_.isUndefined(cb) && _.isFunction(w)) {
    var cb = w;
    w = undefined;
  }

  var self = this;
  if (_.isUndefined(w)) {
    chrome.windows.create({"focused": true}, function(w) {
      self.createTabSet(name, w, cb);
    })
    return;
  }

  if (_.has(self.trackedWindows, w.id)) {
    var w_info = self.trackedWindows[w.id];
    w_info.tabSet.name = name;
  } else {
    var tabs = _.sortBy(w.tabs, function(t) { return t.index; });

    var w_info = {
      'id': w.id
    }

    w_info.activeTabs = _.map(w.tabs, function(t) {
      return self._createTab(t, w_info);
    });

    var entries = _.chain(w_info.activeTabs)
      .filter(function(ti){ return ! _.isNull(ti.entry); })
      .pluck('entry')
      .value();

    w_info.tabSet = {
      'name': name,
      'entries': entries
    }

    _.each(w_info.activeTabs, function(t_info) {
      self.trackedTabs[t_info.id] = t_info;
    })
    self.trackedWindows[w_info.id] = w_info;
    self.tabSets.push(w_info.tabSet);
  }

  self._changeBrowserAction(w.id);
  cb(w_info.tabSet);
}

Session.prototype.launchTabSet = function(tab_set, cb) {
  var w_info = _.findWhere(this.trackedWindows, {"tabSet": tab_set});
  if (! _.isUndefined(w_info)) {
    chrome.windows.update(w_info.id, {"focused": true}, cb);
    return;
  }

  var self = this;
  var live_entries = _.where(tab_set.entries, {"isAlive": true});
  chrome.windows.create({
    "url": _.pluck(live_entries, "url"),
    "focused": true
  }, function(w) {
    var tabs = _.sortBy(w.tabs, function(t) { return t.index; });

    var w_info = {
      'id': w.id,
      'tabSet': tab_set
    }

    w_info.activeTabs = _.map(w.tabs, function(t) {
      return self._createTab(t, w_info);
    });

    _.each(_.zip(live_entries, w_info.activeTabs), function(pair) {
      var entry = pair[0];
      var t_info = pair[1];
      t_info.entry = entry;
    })

    _.each(w_info.activeTabs, function(t_info) {
      self.trackedTabs[t_info.id] = t_info;
    })
    self.trackedWindows[w_info.id] = w_info;

    self._changeBrowserAction(w.id);
    cb(w.id);
  });
}

Session.prototype.load = function(cb) {
  var defaults = {
    "tabSets": [],
  };

  var self = this;
  chrome.storage.local.get(defaults, function(items) {
    self.tabSets = items["tabSets"];
    self.loaded = true;
    chrome.windows.getCurrent({}, function(w) {
      if (!_.isUndefined(w)) {
        self._changeBrowserAction(w.id);
      }
      if (!_.isUndefined(cb)) {
        cb(self);
      }
    })
  });
};

Session.prototype._changeBrowserAction = function(wid){
  if (this.loaded && _.has(this.trackedWindows, wid)) {
    var w_info = this.trackedWindows[wid];
    chrome.browserAction.setTitle({
      'title': "Current TabSet: "+w_info.tabSet.name
    });
    chrome.browserAction.setBadgeText({
      'text': w_info.tabSet.name.slice(0,4)
    });
    chrome.browserAction.setIcon({
      'path': {
        '19': 'img/active-19.png',
        '38': 'img/active-38.png'
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
        '19': 'img/inactive-19.png',
        '38': 'img/inactive-38.png'
      }
    });
  }
}

var session = new Session();

chrome.tabs.onCreated.addListener(function(t) {
  if (session.loaded) {
    session._tabCreated(t);
  }
})

chrome.tabs.onUpdated.addListener(function(tid, c, t) {
  if (session.loaded) {
    session._tabChanged(tid, c, t);
  }
});

chrome.tabs.onMoved.addListener(function(tid, move) {
  if (session.loaded) {
    session._tabMoved(tid, move);
  }
});

chrome.tabs.onDetached.addListener(function(tid, detach) {
  if (session.loaded) {
    session._tabDetached(tid, detach);
  }
});

chrome.tabs.onAttached.addListener(function(tid, attach) {
  if (session.loaded) {
    session._tabAttached(tid, attach);
  }
});

chrome.tabs.onRemoved.addListener(function(tid, remove) {
  if (session.loaded) {
    session._tabRemoved(tid, remove);
  }
});

chrome.tabs.onReplaced.addListener(function(new_tid, old_tid) {
  if (session.loaded) {
    session._tabReplaced(new_tid, old_tid);
  }
});

chrome.windows.onRemoved.addListener(function(wid) {
  if (session.loaded) {
    session._windowRemoved(wid);
  }
});

chrome.windows.onFocusChanged.addListener(function(wid) {
  if (session.loaded) {
    session._changeBrowserAction(wid);
  }
});
