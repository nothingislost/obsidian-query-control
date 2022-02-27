import { App, MarkdownRenderer, resolveSubpath, TFile } from "obsidian";
import { combineContent } from "./utils";

export class SearchMarkdownRenderer extends MarkdownRenderer {
  app: App;
  subpath: string;
  indent: string;
  file: TFile;
  match: any;
  filePath: string;
  before: string;
  after: string;

  constructor(app: App, containerEl: HTMLElement, match: any) {
    // @ts-ignore
    super(app, containerEl);
    this.app = app;
    this.match = match;
    this.subpath = "";
    this.indent = "";
    this.filePath = this.match.parent.path;
    this.file = this.match.parent.file;
    this.renderer.previewEl.onNodeInserted(() => {
      this.updateOptions();
      return this.renderer.onResize();
    });
    // this.loadFile();
  }

  updateOptions() {
    var readableLineLength = this.app.vault.getConfig("readableLineLength");
    this.renderer.previewEl.toggleClass("is-readable-line-width", readableLineLength);
    var foldHeading = this.app.vault.getConfig("foldHeading");
    this.renderer.previewEl.toggleClass("allow-fold-headings", foldHeading);
    var foldIndent = this.app.vault.getConfig("foldIndent");
    this.renderer.previewEl.toggleClass("allow-fold-lists", foldIndent);
    this.renderer.previewEl.toggleClass("rtl", this.app.vault.getConfig("rightToLeft"));

    if (!foldHeading) {
      this.renderer.unfoldAllHeadings();
    }

    if (!foldIndent) {
      this.renderer.unfoldAllLists();
    }

    this.renderer.previewEl.toggleClass("show-frontmatter", this.app.vault.getConfig("showFrontmatter"));
    var a = this.app.vault.getConfig("tabSize");
    this.renderer.previewEl.style.tabSize = String(a);
    this.renderer.rerender();
  }

  getFile() {
    return this.match.parent.file;
  }

  edit(content: string) {
    this.renderer.set(content);
    let before = this.match.parent.content.slice(0, this.match.start);
    let after = this.match.parent.content.slice(this.match.end, this.match.parent.content.length);
    // TODO: Fix the fact that content has leading spaces trimmed off
    var combinedContent = before + content + after;
    this.app.vault.modify(this.file, combinedContent);
  }

  async loadFile() {
    let fileCache = this.app.metadataCache.getFileCache(this.file);
    let resolvedSubPath = resolveSubpath(fileCache, this.subpath);
    let content = await this.app.vault.cachedRead(this.file);
    let parsed = combineContent(content, fileCache, resolvedSubPath);
    this.before = parsed.before;
    this.after = parsed.after;
    this.indent = parsed.indent;
    this.renderer.set(content);
  }
}
