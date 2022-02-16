import { Component, Plugin, ViewCreator, WorkspaceLeaf } from "obsidian";
import { around } from "monkey-around";

export default class EmbeddedQueryControlPlugin extends Plugin {
  SearchHeaderDom: any;

  async onload() {
    // this.app.workspace.onLayoutReady(() => {
    let plugin = this;
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
        plugin.SearchHeaderDom = searchView.headerDom.constructor;
      });
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
    // });
  }

  getSearchHeader() {
    let searchHeader: any | undefined = this.app.workspace.getLeavesOfType("search")?.first()?.view?.headerDom;
    return searchHeader?.constructor;
  }

  onunload(): void {}

  patchSearchView(EmbeddedQuery: any, EmbeddedQueryDOM: any) {
    const plugin = this;
    this.register(
      around(EmbeddedQueryDOM.prototype, {
        startLoader(old: any) {
          return function (...args: any[]) {
            try {
              if (!this.patched) {
                if (!this.el?.parentElement?.parentElement?.hasClass("cm-preview-code-block")) return;
                this.patched = true;
                this.setCollapseAll = function (value: boolean) {
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
                let SearchHeaderDOM = plugin.SearchHeaderDom ? plugin.SearchHeaderDom : plugin.getSearchHeader();
                let headerDom = (this.headerDom = new SearchHeaderDOM(this.app, this.el.parentElement));
                this.el.parentElement.prepend(headerDom.navHeaderEl);
                this.collapseAllButtonEl = headerDom.addNavButton("bullet-list", "Collapse results", () => {
                  return this.setCollapseAll(!this.collapseAll);
                });
                this.extraContextButtonEl = headerDom.addNavButton("expand-vertically", "Show more context", () => {
                  return this.setExtraContext(!this.extraContext);
                });
                headerDom.addSortButton(
                  (sortType: string) => {
                    return this.setSortOrder(sortType);
                  },
                  () => {
                    return this.sortOrder;
                  }
                );
                this.collapseAll = true;
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
