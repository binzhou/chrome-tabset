Chrome TabSets
==============

A Chrome extension for saving collections of tabs in TabSets.

TabSets can be restored to a window and will automatically track all newly opened tabs.
Closed tabs will also be tracked by default (but can be manually removed from the TabSet).

TabSets are stored locally, but can be exported and imported in a simple JSON format.

Development
-----------

Requires [nodejs](nodejs.org) to build.

Then run
```
# npm install --dev
```
to install build dependencies.

To build
```
# grunt build
```

To package into crx
```
# grunt dist
```
*Note*: expected `tabset.pem` to exist.

