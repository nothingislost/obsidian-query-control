import type { i18n } from "i18next";
import "obsidian";

declare module "obsidian" {
  export interface Workspace extends Events {
    on(name: "status-bar-updated", callback: () => any, ctx?: any): EventRef;
    on(name: "ribbon-bar-updated", callback: () => any, ctx?: any): EventRef;
    on(name: "bartender-workspace-change", callback: () => any, ctx?: any): EventRef;
    on(
      name: "bartender-leaf-split",
      callback: (originLeaf: WorkspaceItem, newLeaf: WorkspaceItem) => any,
      ctx?: any
    ): EventRef;
  }
  interface View {
    actionsEl: HTMLElement;
  }
  interface WorkspaceLeaf {
    tabHeaderEl: HTMLElement;
    parentSplit: WorkspaceSplit;
  }
  interface WorkspaceSplit {
    children: WorkspaceTabs[];
  }
  interface WorkspaceItem {
    tabsInnerEl: HTMLElement;
    view: View;
    type: string;
  }
  interface WorkspaceTabs {
    children: WorkspaceLeaf[];
    component: Component;
    currentTab: number;
    recomputeChildrenDimensions(): void;
    updateDecorativeCurves(): void;
  }
}

declare global {
  const i18next: i18n;
}

declare module "sortablejs" {
  interface SortableEvent extends Event {
    items: HTMLElement[];
  }
}

declare module "obsidian" {
  export interface Workspace extends Events {
    on(name: "view-registered", callback: (type: string, viewCreator: ViewCreator) => any, ctx?: any): EventRef;
    on(name: "file-explorer-load", callback: (fileExplorer: FileExplorerView) => any, ctx?: any): EventRef;
    on(name: "file-explorer-sort-change", callback: (sortMethod: string) => any, ctx?: any): EventRef;
    on(name: "infinity-scroll-compute", callback: (infinityScroll: InfinityScroll) => any, ctx?: any): EventRef;
    on(name: "file-explorer-draggable-change", callback: (dragEnabled: boolean) => any, ctx?: any): EventRef;
    on(name: "file-explorer-filter-change", callback: (filterEnabled: boolean) => any, ctx?: any): EventRef;
  }
  export interface PluginInstance {
    id: string;
  }
  export interface ViewRegistry {
    viewByType: Record<string, (leaf: WorkspaceLeaf) => unknown>;
    isExtensionRegistered(extension: string): boolean;
  }

  export interface App {
    internalPlugins: InternalPlugins;
    viewRegistry: ViewRegistry;
  }
  export interface InstalledPlugin {
    enabled: boolean;
    instance: PluginInstance;
  }

  export interface InternalPlugins {
    plugins: Record<string, InstalledPlugin>;
    getPluginById(id: string): InstalledPlugin;
  }
  export interface FileExplorerView extends View {
    dom: FileExplorerViewDom;
    createFolderDom(folder: TFolder): FileExplorerFolder;
    headerDom: FileExplorerHeader;
    sortOrder: string;
    hasCustomSorter?: boolean;
    dragEnabled: boolean;
  }
  interface FileExplorerHeader {
    addSortButton(sorter: (sortType: string) => void, sortOrder: () => string): void;
    navHeaderEl: HTMLElement;
  }
  interface FileExplorerFolder {}
  export interface FileExplorerViewDom {
    infinityScroll: InfinityScroll;
    navFileContainerEl: HTMLElement;
  }
  export interface InfinityScroll {
    rootEl: RootElements;
    scrollEl: HTMLElement;
    filtered: boolean;
    filter: string;
    compute(): void;
  }
  export interface RootElements {
    childrenEl: HTMLElement;
    children: ChildElement[];
    _children: ChildElement[];
    file: TAbstractFile;
    fileExplorer: FileExplorerView;
  }
  export interface ChildElement {
    el: HTMLElement;
    file: TAbstractFile;
    fileExplorer: FileExplorerView;
    titleEl: HTMLElement;
    titleInnerEl: HTMLElement;
    children?: ChildElement[];
    childrenEl?: HTMLElement;
  }
}
