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
  interface MarkdownRenderer {
    renderer: MarkdownPreviewRenderer;
    rerender(): void;
  }
  interface MarkdownPreviewRenderer {
    previewEl: HTMLElement;
    onResize(): void;
    set(content: string): void;
    unfoldAllHeadings(): void;
    unfoldAllLists(): void;
    rerender(): void;
    text: string;
  }

  class SearchResultDOM {
    startLoader(): void;
    infinityScroll: InfinityScroll;
    patched: boolean;
    children: SearchResultItem[];
    addResult(): void;
    removeResult(): void;
  }
  class BacklinkDOMClass {
    startLoader(): void;
    infinityScroll: InfinityScroll;
    patched: boolean;
    children: SearchResultItem[];
    addResult(): void;
    removeResult(): void;
  }
  interface VaultSettings {
    foldHeading: boolean;
    foldIndent: boolean;
    rightToLeft: boolean;
    readableLineLength: boolean;
    tabSize: number;
    showFrontmatter: boolean;
  }

  interface Vault {
    config: {};
    getConfig<T extends keyof VaultSettings>(setting: T): VaultSettings[T];
  }

  interface InfinityScroll {
    // on node insert calls queueCompute
    rootEl: RootElements;
    scrollEl: HTMLElement;
    filtered: boolean;
    filter: string;
    compute(): void;
    invalidate(item: SearchResultItemMatch, includeChildren: boolean): void; // calls queueCompute
    invalidateAll(): void; // calls queueCompute
    updateVirtualDisplay(scrollTop?: number): void;
    updateShownSections(): void;
    queueCompute(): void;
    computeSync(): void;
    update(match: SearchResultItemMatch, val1: number, val2: number, val3: number, val4: number): void;
    measure(parent: SearchResultItem, item: SearchResultItemMatch): void;
    scrollIntoView(item: any): void;
    getRootTop(): number;
    findElementTop(a: any, b: any, c: any): void;
    onScroll(): void; // this calls updateVirtualDisplay()
  }
  class SearchResultItem {
    renderContentMatches(): void;
    onResultClick(event: MouseEvent, e?: any): void;
    info: ItemInfo;
    collapsible: boolean;
    collpased: boolean;
    extraContext: boolean;
    showTitle: boolean;
    parent: SearchResultDOM;
    children: SearchResultItemMatch[];
    file: TFile;
    content: string;
    el: HTMLElement;
    pusherEl: HTMLElement;
    containerEl: HTMLElement;
    childrenEl: HTMLElement;
  }
  class SearchResultItemMatch {
    render(truncateLeft: boolean, truncateRight: boolean): void;
    start: number;
    end: number;
    parent: SearchResultItem;
    matches: MatchIndices[];
    info: ItemInfo;
    onMatchRender?: (match: MatchIndices, el: HTMLElement) => any;
  }
  type MatchIndices = number[];
  interface ItemInfo {
    height: number;
    width: number;
    childTop: number;
    computed: boolean;
    queued: boolean;
    hidden: boolean;
  }
  class SearchHeaderDOM {
    constructor(app: App, el: HTMLElement);
    navHeaderEl: HTMLElement;
    addNavButton(icon: string, label: string, onClick: () => any, className?: string): HTMLElement;
    addSortButton(onClick: (sortType: string) => any, callback: () => any): void;
  }
  class EmbeddedSearchClass extends MarkdownRenderChild {
    dom?: SearchResult;
    onunload(): void;
    onload(): void;
  }
  class BacklinksClass extends Component {
    backlinkDom: {el: HTMLElement}
  }
  interface WorkspaceItem {
    tabsInnerEl: HTMLElement;
    view: View;
    type: string;
  }
  interface SearchView extends View {
    onCopyResultsClick(event: MouseEvent): void;
    headerDom: SearchHeaderDOM;
  }
  // interface SearchViewHeader
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
