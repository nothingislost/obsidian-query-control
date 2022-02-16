import { around } from "monkey-around";
import { Component, Modal, parseYaml, Plugin, ViewCreator, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, EmbeddedQueryControlSettings, SettingTab, sortOptions } from "./settings";
import { translate } from "./utils";

export default class EmbeddedQueryControlPlugin extends Plugin {
  SearchHeaderDom: any;
  SearchResultsExport: any;
  settings: EmbeddedQueryControlSettings;
  settingsTab: SettingTab;

  async onload() {
    await this.loadSettings();
    let plugin = this;
    this.registerSettingsTab();
    this.register(
      around(this.app.viewRegistry.constructor.prototype, {
        registerView(old: any) {
          return function (type: string, viewCreator: ViewCreator, ...args: unknown[]) {
            plugin.app.workspace.trigger("view-registered", type, viewCreator);
            return old.call(this, type, viewCreator, ...args);
          };
        },
      })
    );
    let uninstall: () => void;
    if (!this.app.workspace.layoutReady) {
      let eventRef = this.app.workspace.on("view-registered", (type: string, viewCreator: ViewCreator) => {
        if (type !== "search") return;
        this.app.workspace.offref(eventRef);
        // @ts-ignore we need a leaf before any leafs exists in the workspace, so we create one from scratch
        let leaf = new WorkspaceLeaf(plugin.app);
        let searchView = viewCreator(leaf);
        let uninstall = around(Modal.prototype, {
          open(old: any) {
            return function (...args: any[]) {
              plugin.SearchResultsExport = this.constructor;
              return;
            };
          },
        });
        searchView.onCopyResultsClick(new MouseEvent(null));
        uninstall();
        plugin.SearchHeaderDom = searchView.headerDom.constructor;
      });
    } else {
      this.getSearchExport();
    }
    this.register(
      (uninstall = around(Component.prototype, {
        addChild(old: any) {
          return function (child, ...args: any[]) {
            try {
              if (child.hasOwnProperty("searchQuery") && child.hasOwnProperty("sourcePath")) {
                let EmbeddedQuery = child.constructor;
                let EmbeddedQueryDOM = child.dom.constructor;
                plugin.patchSearchView(EmbeddedQuery, EmbeddedQueryDOM);
                uninstall();
              }
            } catch (err) {
              console.log(err);
            }
            const result = old.call(this, child, ...args);
            return result;
          };
        },
      }))
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  registerSettingsTab() {
    this.settingsTab = new SettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
  }

  getSearchHeader() {
    let searchHeader: any = this.app.workspace.getLeavesOfType("search")?.first()?.view?.headerDom;
    return searchHeader?.constructor;
  }

  getSearchExport() {
    const plugin = this;
    let searchView: any = this.app.workspace.getLeavesOfType("search")?.first()?.view;
    let uninstall = around(Modal.prototype, {
      open(old: any) {
        return function (...args: any[]) {
          plugin.SearchResultsExport = this.constructor;
          return;
        };
      },
    });
    searchView?.onCopyResultsClick(new MouseEvent(null));
    uninstall();
  }

  onunload(): void {}

  patchSearchView(EmbeddedQuery: any, EmbeddedQueryDOM: any) {
    const plugin = this;
    this.register(
      around(EmbeddedQuery.prototype, {
        onload(old: any) {
          return function (...args: any[]) {
            try {
              let defaultHeaderEl = this.containerEl.parentElement.querySelector(
                ".internal-query-header"
              ) as HTMLElement;
              let matches = this.query.matchAll(
                /^(?<key>collapsed|context|hideTitle|hideResults|sort|title):\s*(?<value>.+?)$/gm
              );
              let settings: Record<string, string> = {};
              for (let match of matches) {
                let value = match.groups.value.toLowerCase();
                if (value === "true" || value === "false") {
                  match.groups.value = value === "true";
                }
                settings[match.groups.key] = match.groups.value;
              }
              this.query = this.query
                .replace(/^((collapsed|context|hideTitle|hideResults|sort|title):.+?)$/gm, "")
                .trim();
              defaultHeaderEl.setText(settings.title || this.query);
              this.dom.settings = settings;
            } catch {}
            const result = old.call(this, ...args);
            return result;
          };
        },
      })
    );
    this.register(
      around(EmbeddedQueryDOM.prototype, {
        startLoader(old: any) {
          return function (...args: any[]) {
            try {
              if (!this.patched) {
                if (this.el?.closest(".internal-query")) {
                  let defaultHeaderEl = this.el.parentElement.querySelector(".internal-query-header");
                  this.patched = true;
                  this.setExtraContext = function (value: boolean) {
                    this.extraContext = value;
                    this.extraContextButtonEl.toggleClass("is-active", value);
                    this.children.forEach(child => {
                      child.setExtraContext(value);
                    });
                    this.infinityScroll.invalidateAll();
                  };
                  this.setTitleDisplay = function (value: boolean) {
                    this.showTitle = value;
                    this.showTitleButtonEl.toggleClass("is-active", value);
                    defaultHeaderEl.toggleClass("is-hidden", value);
                  };
                  this.setResultsDisplay = function (value: boolean) {
                    this.showResults = value;
                    this.showResultsButtonEl.toggleClass("is-active", value);
                    this.el.toggleClass("is-hidden", value);
                  };
                  this.setCollapseAll = function (value: boolean) {
                    this.collapseAllButtonEl.toggleClass("is-active", value);
                    this.collapseAll = value;
                    this.children.forEach(child => {
                      child.setCollapse(value, false);
                    });
                    this.infinityScroll.invalidateAll();
                  };
                  this.setSortOrder = (sortType: string) => {
                    this.sortOrder = sortType;
                    this.changed();
                  };
                  this.onCopyResultsClick = event => {
                    event.preventDefault();
                    new plugin.SearchResultsExport(this.app, this).open();
                  };
                  let SearchHeaderDOM = plugin.SearchHeaderDom ? plugin.SearchHeaderDom : plugin.getSearchHeader();
                  let headerDom = (this.headerDom = new SearchHeaderDOM(this.app, this.el.parentElement));
                  defaultHeaderEl.insertAdjacentElement("afterend", headerDom.navHeaderEl);
                  this.collapseAllButtonEl = headerDom.addNavButton(
                    "bullet-list",
                    translate("plugins.search.label-collapse-results"),
                    () => {
                      return this.setCollapseAll(!this.collapseAll);
                    }
                  );
                  this.extraContextButtonEl = headerDom.addNavButton(
                    "expand-vertically",
                    translate("plugins.search.label-more-context"),
                    () => {
                      return this.setExtraContext(!this.extraContext);
                    }
                  );
                  headerDom.addSortButton(
                    (sortType: string) => {
                      return this.setSortOrder(sortType);
                    },
                    () => {
                      return this.sortOrder;
                    }
                  );
                  this.showTitleButtonEl = headerDom.addNavButton("strikethrough-glyph", "Hide title", () => {
                    return this.setTitleDisplay(!this.showTitle);
                  });
                  this.showResultsButtonEl = headerDom.addNavButton("lines-of-text", "Hide results", () => {
                    return this.setResultsDisplay(!this.showResults);
                  });
                  headerDom.addNavButton("documents", "Copy results", this.onCopyResultsClick.bind(this));
                  let allSettings = {
                    title: plugin.settings.defaultHideResults,
                    collapsed: plugin.settings.defaultCollapse,
                    context: plugin.settings.defaultShowContext,
                    hideTitle: plugin.settings.defaultHideTitle,
                    hideResults: plugin.settings.defaultHideResults,
                    sort: plugin.settings.defaultSortOrder,
                  };
                  if (!this.settings) this.settings = {};
                  Object.entries(allSettings).forEach(([setting, defaultValue]) => {
                    if (!this.settings.hasOwnProperty(setting)) {
                      this.settings[setting] = defaultValue;
                    } else if (setting === "sort" && !sortOptions.hasOwnProperty(this.settings.sort)) {
                      this.settings[setting] = defaultValue;
                    }
                  });
                  this.setExtraContext(this.settings.context);
                  this.sortOrder = this.settings.sort;
                  this.setCollapseAll(this.settings.collapse);
                  this.setTitleDisplay(this.settings.hideTitle);
                  this.setResultsDisplay(this.settings.hideResults);
                }
              }
            } catch (err) {
              console.log(err);
            }
            const result = old.call(this, ...args);
            return result;
          };
        },
      })
    );
  }
}
