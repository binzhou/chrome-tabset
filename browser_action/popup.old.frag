<!--<section id="main">
  <nav>
    <ul class="nav nav-tabs">
      <li data-ng-show="activeTabSet" data-ng-class="getTabClass(0)">
        <a href="#detailsTab" data-toggle="tab">{{ activeTabSet.name }}</a>
      </li>
      <li data-ng-class="getTabClass(1)">
        <a href="#overviewTab" data-toggle="tab">Tab Sets</a>
      </li>
    </ul>
  </nav>
  <div id="content" class="tab-content">
    <div class="tab-pane" id="detailsTab" data-ng-class="getTabClass(0)">
      <ul class="nav nav-tabs nav-stacked" data-ng-show="activeTabSet.entries.length > 0">
        <li data-ng-repeat="entry in activeTabSet.entries" data-ng-class="entryClass(entry)">
          <a href="#" title="{{ entry.url }}" data-toggle="tooltip" data-ng-click="session.launchTabSetEntry(activeTabSet, entry)">
            <button class="close">&times;</button>
            {{ entry.title | default:entry.url }}
          </a>
        </li>
      </ul>
      <p data-ng-show="activeTabSet.entries.length == 0">
        No tabs.
      </p>
    </div>

    <div class="tab-pane" id="overviewTab" data-ng-class="getTabClass(1)">
      <ul class="nav nav-tabs nav-stacked" data-ng-show="session.tabSets.length > 0">
        <li data-ng-repeat="tab_set in session.tabSets" data-ng-class="tabSetClass(tab_set)">
          <a href="#" data-ng-click="launchTabSet(tab_set)">
            <button class="close">&times;</button>
            <span class="pull-right">
              <span class="badge" style='margin-right:1em;'>{{ tab_set.entries.length }}</span>
            </span>
            {{ tabSetLabel(tab_set) }}

          </a>

        </li>
      </ul>
      <p data-ng-show="session.tabSets.length == 0">
        No tabsets.
      </p>
      <form class="form-inline" data-ng-hide="activeTabSet">
      <input type="text" placeholder="TabSet Name" data-ng-model="tabSetName">
      <a class="btn" href="#" data-ng-click="createTabSet()">Create TabSet</a>
      </form>
    </div>
  </div>
</section>-->
