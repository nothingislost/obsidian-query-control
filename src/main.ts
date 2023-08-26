import { around } from "monkey-around";
import {
  Component,
  EmbeddedSearchClass,
  Modal,
  Plugin,
  // SearchHeaderDOM,
  SearchResultDOM,
  SearchResultItem,
  SearchView,
  ViewCreator,
  WorkspaceLeaf,
  requireApiVersion,
  BacklinksClass,
  BacklinkDOMClass,
} from "obsidian";
import { SearchMarkdownRenderer } from "./search-renderer";
import { DEFAULT_SETTINGS, EmbeddedQueryControlSettings, SettingTab, sortOptions } from "./settings";
import { translate } from "./utils";

// Live Preview creates an embedded query block
// LP calls addChild with an instance of the EmbeddedSearch class

// EmbeddedSearch `onload` is patched to add a nav bar
// a new component is added to handle the lifecycle of the rendered markdown elements

// EmbeddedSearch has a `dom` property which holds an instance ofthe SearchResultDOM class
// SearchResultDOM has children which are of type SearchResultItem

// SearchResultItem has children which are of type SearchResultItemMatch
// There is one SearchResultItem per matched TFile

// SearchResultItemMatch has a render() method which is used to render matches
// There is a SearchResultItemMatch for every match found within a TFile

// Hierarchy
// - LivePreviewDOM
//   - EmbeddedSearch
//     - SearchResultDOM
//       - SearchResultItem
//         - SearchResultItemMatch

const isFifteenPlus = requireApiVersion && requireApiVersion("0.15.0");

// const navBars = new WeakMap<HTMLElement, SearchHeaderDOM>();
const backlinkDoms = new WeakMap<HTMLElement, any>();

export default class EmbeddedQueryControlPlugin extends Plugin {
  // SearchHeaderDOM: typeof SearchHeaderDOM;
  SearchResultsExport: any;
  settings: EmbeddedQueryControlSettings;
  settingsTab: SettingTab;
  isSearchResultItemPatched: boolean;
  isSearchResultItemMatchPatched: boolean;
  isBacklinksPatched: boolean;
  isSearchPatched: boolean;

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
        let searchView = viewCreator(leaf) as SearchView;
        plugin.patchNativeSearch(searchView);
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
        // plugin.SearchHeaderDOM = searchView.headerDom.constructor as typeof SearchHeaderDOM;
      });
    } else {
      this.getSearchExport();
    }

    // The only way to obtain the EmbeddedSearch class is to catch it while it's being added to a parent component
    // The following will patch Component.addChild and will remove itself once it finds and patches EmbeddedSearch
    this.register(
      (uninstall = around(Component.prototype, {
        addChild(old: any) {
          return function (child: unknown, ...args: any[]) {
            try {
              if (
                !plugin.isSearchPatched &&
                child instanceof Component &&
                child.hasOwnProperty("searchQuery") &&
                child.hasOwnProperty("sourcePath") &&
                child.hasOwnProperty("dom")
              ) {
                let EmbeddedSearch = child as EmbeddedSearchClass;
                plugin.patchSearchView(EmbeddedSearch);
                plugin.isSearchPatched = true;
              }
              if (child instanceof Component && child.hasOwnProperty("backlinkDom")) {
                let backlinks = child as BacklinksClass;
                backlinkDoms.set(backlinks.backlinkDom.el.closest(".backlink-pane"), child);
                if (!plugin.isBacklinksPatched) {
                  plugin.patchBacklinksView(backlinks);
                  plugin.isBacklinksPatched = true;
                }
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

  // getSearchHeader(): typeof SearchHeaderDOM {
  //   let searchHeader: any = (this.app.workspace.getLeavesOfType("search")?.first()?.view as SearchView)?.headerDom;
  //   return searchHeader?.constructor;
  // }

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

  patchNativeSearch(searchView: SearchView) {
    const plugin = this;
    this.register(
      around(searchView.constructor.prototype, {
        onResize(old: any) {
          return function (...args: any[]) {
            // this works around measurement issues when the search el width
            // goes to zero and then back to a non zero value
            const _children = isFifteenPlus ? this.dom.vChildren?._children : this.dom.children;
            if (this.dom.el.clientWidth === 0) {
              _children.forEach((child: any) => {
                child.setCollapse(true, false);
              });
              this.dom.hidden = true;
            } else if (this.dom.hidden) {
              this.dom.hidden = false;
              // if we toggle too quickly, measurement happens before we want it to
              setTimeout(() => {
                _children.forEach((child: any) => {
                  child.setCollapse(this.dom.collapseAll, false);
                });
              }, 100);
            }
            return old.call(this, ...args);
          };
        },
        stopSearch(old: any) {
          return function (...args: any[]) {
            const result = old.call(this, ...args);
            if (this.renderComponent) {
              this.renderComponent.unload();
              this.renderComponent = new Component();
            }
            return result;
          };
        },
        addChild(old: any) {
          return function (...args: any[]) {
            try {
              if (!this.patched) {
                if (!this.renderComponent) {
                  this.renderComponent = new Component();
                  this.renderComponent.load();
                }
                this.patched = true;
                this.dom.parent = this;
                plugin.patchSearchResultDOM(this.dom.constructor);
                this.setRenderMarkdown = function (value: boolean) {
                  const _children = isFifteenPlus ? this.dom.vChildren?._children : this.dom.children;
                  this.dom.renderMarkdown = value;
                  _children.forEach((child: any) => {
                    child.renderContentMatches();
                  });
                  this.dom.infinityScroll.invalidateAll();
                  this.dom.childrenEl.toggleClass("cm-preview-code-block", value);
                  this.dom.childrenEl.toggleClass("is-rendered", value);
                  // this.renderMarkdownButtonEl.toggleClass("is-active", value);
                };
                // this.renderMarkdownButtonEl = this.headerDom.addNavButton("reading-glasses", "Render Markdown", () => {
                //   return this.setRenderMarkdown(!this.dom.renderMarkdown);
                // });

                let allSettings = {
                  renderMarkdown: plugin.settings.defaultRenderMarkdown,
                };
                if (!this.settings) this.settings = {};
                Object.entries(allSettings).forEach(([setting, defaultValue]) => {
                  if (!this.settings.hasOwnProperty(setting)) {
                    this.settings[setting] = defaultValue;
                  } else if (setting === "sort" && !sortOptions.hasOwnProperty(this.settings.sort)) {
                    this.settings[setting] = defaultValue;
                  }
                });
                this.setRenderMarkdown(this.settings.renderMarkdown);
              } else {
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

  patchSearchResultDOM(SearchResult: typeof SearchResultDOM) {
    const plugin = this;
    let uninstall = around(SearchResult.prototype, {
      addResult(old: any) {
        return function (...args: any[]) {
          uninstall();
          const result = old.call(this, ...args);
          let SearchResultItem = result.constructor;
          if (!plugin.isSearchResultItemPatched) plugin.patchSearchResultItem(SearchResultItem);
          return result;
        };
      },
    });
    this.register(uninstall);
    this.register(
      around(SearchResult.prototype, {
        startLoader(old: any) {
          return function (...args: any[]) {
            try {
              let containerEl = this.el.closest(".backlink-pane");
              let backlinksInstance = backlinkDoms.get(containerEl);
              if (containerEl && backlinksInstance) {
                if (backlinksInstance.patched) return;
                handleBacklinks(this, plugin, containerEl, backlinksInstance);
                return;
              }
              if (!this.patched && this.el.parentElement?.hasClass("internal-query")) {
                if (this.el?.closest(".internal-query")) {
                  this.patched = true;
                  let defaultHeaderEl = this.el.parentElement.querySelector(".internal-query-header");
                  this.setExtraContext = function (value: boolean) {
                    const _children = isFifteenPlus ? this.vChildren?._children : this.children;
                    this.extraContext = value;
                    // this.extraContextButtonEl.toggleClass("is-active", value);
                    _children.forEach((child: any) => {
                      child.setExtraContext(value);
                    });
                    this.infinityScroll.invalidateAll();
                  };
                  this.setTitleDisplay = function (value: boolean) {
                    this.showTitle = value;
                    // this.showTitleButtonEl.toggleClass("is-active", value);
                    defaultHeaderEl.toggleClass("is-hidden", value);
                  };
                  this.setResultsDisplay = function (value: boolean) {
                    this.showResults = value;
                    // this.showResultsButtonEl.toggleClass("is-active", value);
                    this.el.toggleClass("is-hidden", value);
                  };
                  this.setRenderMarkdown = function (value: boolean) {
                    this.renderMarkdown = value;
                    const _children = isFifteenPlus ? this.vChildren?._children : this.children;
                    _children.forEach((child: any) => {
                      child.renderContentMatches();
                    });
                    this.infinityScroll.invalidateAll();
                    this.childrenEl.toggleClass("cm-preview-code-block", value);
                    this.childrenEl.toggleClass("is-rendered", value);
                    // this.renderMarkdownButtonEl.toggleClass("is-active", value);
                  };
                  this.setCollapseAll = function (value: boolean) {
                    const _children = isFifteenPlus ? this.vChildren?._children : this.children;
                    // this.collapseAllButtonEl.toggleClass("is-active", value);
                    this.collapseAll = value;
                    _children.forEach((child: any) => {
                      child.setCollapse(value, false);
                    });
                    this.infinityScroll.invalidateAll();
                  };
                  this.setSortOrder = (sortType: string) => {
                    this.sortOrder = sortType;
                    this.changed();
                    this.infinityScroll.invalidateAll();
                  };
                  this.onCopyResultsClick = (event: MouseEvent) => {
                    event.preventDefault();
                    new plugin.SearchResultsExport(this.app, this).open();
                  };
                  // let _SearchHeaderDOM = plugin.SearchHeaderDOM ? plugin.SearchHeaderDOM : plugin.getSearchHeader();
                  // let headerDom = (this.headerDom = new _SearchHeaderDOM(this.app, this.el.parentElement));
                  // defaultHeaderEl.insertAdjacentElement("afterend", headerDom.navHeaderEl);
                  // this.collapseAllButtonEl = headerDom.addNavButton(
                  //   "bullet-list",
                  //   translate("plugins.search.label-collapse-results"),
                  //   () => {
                  //     return this.setCollapseAll(!this.collapseAll);
                  //   }
                  // );
                  // this.extraContextButtonEl = headerDom.addNavButton(
                  //   "expand-vertically",
                  //   translate("plugins.search.label-more-context"),
                  //   () => {
                  //     return this.setExtraContext(!this.extraContext);
                  //   }
                  // );
                  // headerDom.addSortButton(
                  //   (sortType: string) => {
                  //     return this.setSortOrder(sortType);
                  //   },
                  //   () => {
                  //     return this.sortOrder;
                  //   }
                  // );
                  // this.showTitleButtonEl = headerDom.addNavButton("strikethrough-glyph", "Hide title", () => {
                  //   return this.setTitleDisplay(!this.showTitle);
                  // });
                  // this.showResultsButtonEl = headerDom.addNavButton("minus-with-circle", "Hide results", () => {
                  //   return this.setResultsDisplay(!this.showResults);
                  // });
                  // this.renderMarkdownButtonEl = headerDom.addNavButton("reading-glasses", "Render Markdown", () => {
                  //   return this.setRenderMarkdown(!this.renderMarkdown);
                  // });
                  // headerDom.addNavButton("documents", "Copy results", this.onCopyResultsClick.bind(this));
                  let allSettings = {
                    title: plugin.settings.defaultHideResults,
                    collapsed: plugin.settings.defaultCollapse,
                    context: plugin.settings.defaultShowContext,
                    hideTitle: plugin.settings.defaultHideTitle,
                    hideResults: plugin.settings.defaultHideResults,
                    renderMarkdown: plugin.settings.defaultRenderMarkdown,
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
                  this.setCollapseAll(this.settings.collapsed);
                  this.setTitleDisplay(this.settings.hideTitle);
                  this.setRenderMarkdown(this.settings.renderMarkdown);
                  this.setResultsDisplay(this.settings.hideResults);
                } else {
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

  patchSearchResultItem(SearchResultItemClass: typeof SearchResultItem) {
    this.isSearchResultItemPatched = true;
    const plugin = this;
    let uninstall = around(SearchResultItemClass.prototype, {
      onResultClick(old: any) {
        return function (event: MouseEvent, e: any, ...args: any[]) {
          if (
            // TODO: Improve this exclusion list which allows for clicking
            //       on elements without navigating to the match result
            event.target instanceof HTMLElement &&
            (event.target.hasClass("internal-link") ||
              event.target.hasClass("task-list-item-checkbox") ||
              event.target.hasClass("admonition-title-content"))
          ) {
          } else {
            return old.call(this, event, e, ...args);
          }
        };
      },
      renderContentMatches(old: any) {
        return function (...args: any[]) {
          // TODO: Move this to its own around registration and uninstall on patch
          const result = old.call(this, ...args);
          const _children = isFifteenPlus ? this.vChildren?._children : this.children;
          if (!plugin.isSearchResultItemMatchPatched && _children.length) {
            let SearchResultItemMatch = _children.first().constructor;
            plugin.patchSearchResultItemMatch(SearchResultItemMatch);
          }
          return result;
        };
      },
    });
    plugin.register(uninstall);
  }

  patchSearchResultItemMatch(SearchResultItemMatch: any) {
    this.isSearchResultItemMatchPatched = true;
    const plugin = this;
    plugin.register(
      around(SearchResultItemMatch.prototype, {
        render(old: any) {
          return function (...args: any[]) {
            // NOTE: if we don't mangle ```query blocks, we could end up with infinite query recursion
            let _parent = isFifteenPlus ? this.parentDom : this.parent;
            let content = _parent.content.substring(this.start, this.end).replace("```query", "\\`\\`\\`query");
            let leadingSpaces = content.match(/^\s+/g)?.first();
            if (leadingSpaces) {
              content = content.replace(new RegExp(`^${leadingSpaces}`, "gm"), "");
            }
            let parentComponent = _parent.parent.parent;
            if (parentComponent && _parent.parent.renderMarkdown) {
              let component = parentComponent?.renderComponent;
              this.el.empty();
              let renderer = new SearchMarkdownRenderer(plugin.app, this.el, this);
              renderer.onRenderComplete = () => {
                // TODO: See if we can improve measurement
                // It exists because the markdown renderer is rendering async
                // and the measurement processes are happening before the content has been rendered
                _parent?.parent?.infinityScroll.measure(_parent, this);
              };
              component.addChild(renderer);
              renderer.renderer.set(content);
            } else {
              return old.call(this, ...args);
            }
          };
        },
      })
    );
  }

  patchSearchView(embeddedSearch: EmbeddedSearchClass) {
    const plugin = this;
    const EmbeddedSearch = embeddedSearch.constructor as typeof EmbeddedSearchClass;
    const SearchResult = embeddedSearch.dom.constructor as typeof SearchResultDOM;

    this.register(
      around(EmbeddedSearch.prototype, {
        onunload(old: any) {
          return function (...args: any[]) {
            if (this.renderComponent) {
              this.renderComponent.unload();
              this.dom = null;
              this.queue = null;
              this.renderComponent = null;
              this._children = null;
              this.containerEl = null;
            }

            const result = old.call(this, ...args);
            return result;
          };
        },
        onload(old: any) {
          return function (...args: any[]) {
            try {
              if (!this.renderComponent) {
                this.renderComponent = new Component();
                this.renderComponent.load();
              }
              this.dom.parent = this;
              let defaultHeaderEl = this.containerEl.parentElement.querySelector(
                ".internal-query-header"
              ) as HTMLElement;
              let matches = this.query.matchAll(
                /^(?<key>collapsed|context|hideTitle|renderMarkdown|hideResults|sort|title):\s*(?<value>.+?)$/gm
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
                .replace(/^((collapsed|context|hideTitle|renderMarkdown|hideResults|sort|title):.+?)$/gm, "")
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
    this.patchSearchResultDOM(SearchResult);
  }

  patchBacklinksView(backlinks: BacklinksClass) {
    const plugin = this;
    const Backlink = backlinks.constructor as typeof EmbeddedSearchClass;
    const BacklinkDOM = backlinks.backlinkDom.constructor as typeof BacklinkDOMClass;

    this.register(
      around(Backlink.prototype, {
        onunload(old: any) {
          return function (...args: any[]) {
            if (this.renderComponent) {
              this.renderComponent.unload();
              this.dom = null;
              this.queue = null;
              this.renderComponent = null;
              this._children = null;
              this.containerEl = null;
            }

            const result = old.call(this, ...args);
            return result;
          };
        },
        onload(old: any) {
          return function (...args: any[]) {
            try {
              if (!this.renderComponent) {
                this.renderComponent = new Component();
                this.renderComponent.load();
              }
              this.backlinkDom.parent = this;
              this.unlinkedDom.parent = this;

              let settings: Record<string, string> = {};

              this.dom.settings = settings;
            } catch {}
            const result = old.call(this, ...args);
            return result;
          };
        },
      })
    );
    this.patchSearchResultDOM(BacklinkDOM);
  }
}

function handleBacklinks(
  instance: BacklinkDOMClass,
  plugin: EmbeddedQueryControlPlugin,
  containerEl: HTMLElement,
  backlinksInstance: BacklinksClass
) {
  if (backlinksInstance) {
    backlinksInstance.patched = true;
    let defaultHeaderEl =
      containerEl.querySelector(".internal-query-header") || containerEl.querySelector(".nav-header");
    instance.setRenderMarkdown = function (value: boolean) {
      const doms = [backlinksInstance.backlinkDom, backlinksInstance.unlinkedDom];
      doms.forEach(dom => {
        dom.renderMarkdown = value;
        const _children = isFifteenPlus ? dom.vChildren?._children : dom.children;
        _children.forEach((child: any) => {
          child.renderContentMatches();
        });
        dom.infinityScroll.invalidateAll();
        dom.childrenEl.toggleClass("cm-preview-code-block", value);
        dom.childrenEl.toggleClass("is-rendered", value);
      });
      this.renderMarkdownButtonEl.toggleClass("is-active", value);
    };
    instance.onCopyResultsClick = (event: MouseEvent) => {
      event.preventDefault();
      new plugin.SearchResultsExport(instance.app, instance).open();
    };
    instance.renderMarkdownButtonEl = backlinksInstance.headerDom.addNavButton(
      "reading-glasses",
      "Render Markdown",
      () => {
        return instance.setRenderMarkdown(!instance.renderMarkdown);
      }
    );
    backlinksInstance.headerDom.addNavButton("documents", "Copy results", instance.onCopyResultsClick.bind(instance));
    let allSettings = {
      title: plugin.settings.defaultHideResults,
      collapsed: plugin.settings.defaultCollapse,
      context: plugin.settings.defaultShowContext,
      hideTitle: plugin.settings.defaultHideTitle,
      hideResults: plugin.settings.defaultHideResults,
      renderMarkdown: plugin.settings.defaultRenderMarkdown,
      sort: plugin.settings.defaultSortOrder,
    };
    if (!instance.settings) instance.settings = {};
    Object.entries(allSettings).forEach(([setting, defaultValue]) => {
      if (!instance.settings.hasOwnProperty(setting)) {
        instance.settings[setting] = defaultValue;
      } else if (setting === "sort" && !sortOptions.hasOwnProperty(instance.settings.sort)) {
        instance.settings[setting] = defaultValue;
      }
    });
    backlinksInstance.setExtraContext(instance.settings.context);
    backlinksInstance.sortOrder = instance.settings.sort;
    backlinksInstance.setCollapseAll(instance.settings.collapsed);
    instance.setRenderMarkdown(instance.settings.renderMarkdown);
  } else {
  }
}
