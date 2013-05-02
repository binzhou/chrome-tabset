function Session() {
  this.windows = {};
  this.tabs= {};

  this.loaded = false;
  this.load();
}

Session.prototype.createNewTabSet(name) {
  // generate rfc4122 v4 compliant uuid.
  // see http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  var tsid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });

  var ts = {
    "id": tsid,
    "created": new Date().toLocateString(),
    "tabs": []
  };

  if (_.isUndefined(name)) {
    this.anonSets.push(ts);
    this.anonSets = _.take(this.anonMax);
  } else {
    ts["name"] = name;
    this.tabSets[tsid] = ts;
  }

  return ts;
}

Session.prototype.windowCreated = function(w) {
  var w_info = {
    "ts": this.createNewTabSet(),
    "window": w,
    "active": []
  };
  this.windows[w.id] = w_info;
  return w_info;
}

Session.prototype.tabCreated = function(t) {
  var entry = {
    "url": t.url,
    "alive": true
  };
  var t_info = {
    "tab": t,
    "entry": entry
  };
  this.tabs[t.id] = t_info;

  var w = this.windows[t.windowId];

  w.active.splice(t.index, 0, t_info);
  var insertPos = _.indexOf(w.active, t_info);
  if (insertPos == w.active.length - 1) {
    w.ts.tabs.push(entry);
  } else {
    var tsPos = _.indexOf(w.ts.tabs, w.active[insertPos+1].entry);
    w.ts.tabs.splice(tsPos, 0, entry);
  }
}

Session.prototype.renameTabSet(ts, name) {
  if (!_.has(ts, name)) {
    this.anonSets = _.without(this.anonSet, ts);
    this.tabSets[ts.id] = ts;
  }
  ts["name"] = name;
}

Session.prototype.launchTabSet(ts) {
  var w_info = _.findWhere(this.windows, {"ts": ts});
  if (! _.isUndefined(w_info)) {
    this.windows.update(w_info.w.id, {"focused": true});
  }

  var live_tabs = _.filter(ts.tabs, function(t) { return t.alive; });

  function linkTabSet(w) {
    var w_info = this.windows[w.id];
    if (w_info.active.length != live_tabs.length) {
      console.log("something weird happened. active.length != live_tabs.length");
      return;
    }

    var old_ts = w_info.ts;
    this.anonSets = _.without(this.anonSets, old_ts);
    this.anonMax--;

    w_info.ts = ts;
    _.each(_.zip(live_tabs, w_info.active), function(pair) {
      var entry = pair[0];
      var t_info = pair[1];
      t_info.entry = entry;
    });
  }

  this.anonMax++;
  this.windows.create({
    "url": _.pluck(live_tabs, "url"),
    "focues": true
  }, linkTabSet);
}

Session.prototype.load = function() {
  var self = this;

  function loadWindows(ws) {
    _.each(ws, function(w) {
      self.windowCreated(w);
      _.each(w.tabs, function(t) {
        self.tabCreated(t);
      })
    })
    self.loaded = true;
  };

  var defaults = {
    "tabSets": {},
    "anonSets": [],
    "maxAnon": 10
  };

  chrome.storage.local.get(defaults, function(items) {
    self.tabSets = items["tabSets"];
    self.anonSets = items["anonSets"];
    self.maxAnon = items["maxAnon"];

    chrome.windows.getAll({"populate": true}, loadWindows);
  });
};

session = new Session();

chrome.windows.onCreated.addListener(function(w) {
  if (session.loaded) {
    session.windowCreated(w);
  }
});

chrome.tabs.onCreated.addListener(function(t) {
  if (session.loaded) {
    session.tabCreated(t);
  }
})

chrome.tabs.onUpdated.addListener(function(tid, c, t) {
  if (session.loaded && c.url) {
    session.tabs[tid].entry.url = c.url;
  }
});

/*chrome.windows.create({ url: "example.com" }, function(w) {
  console.log("create callback");
  for (var i in w.tabs) {
    var t = w.tabs[i];
    console.log("- "+t.id);
  }
});*/
