import { App, MarkdownRenderer, TFile } from "obsidian";

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
  }

  updateOptions() {
    let readableLineLength = this.app.vault.getConfig("readableLineLength");
    this.renderer.previewEl.toggleClass("is-readable-line-width", readableLineLength);
    let foldHeading = this.app.vault.getConfig("foldHeading");
    this.renderer.previewEl.toggleClass("allow-fold-headings", foldHeading);
    let foldIndent = this.app.vault.getConfig("foldIndent");
    this.renderer.previewEl.toggleClass("allow-fold-lists", foldIndent);
    this.renderer.previewEl.toggleClass("rtl", this.app.vault.getConfig("rightToLeft"));

    if (!foldHeading) {
      this.renderer.unfoldAllHeadings();
    }

    if (!foldIndent) {
      this.renderer.unfoldAllLists();
    }

    this.renderer.previewEl.toggleClass("show-frontmatter", this.app.vault.getConfig("showFrontmatter"));
    let tabSize = this.app.vault.getConfig("tabSize");
    this.renderer.previewEl.style.tabSize = String(tabSize);
    this.renderer.rerender();
  }

  onRenderComplete() {}

  getFile() {
    return this.match.parent.file;
  }

  // onCheckboxClick(event: PointerEvent, e: any, relativeLineNo: number) {
  //   console.log("onCheckboxClick", event, e, relativeLineNo, this);
  //   event.preventDefault();

  //   for (var i = this.renderer.text, r = 0, o = 0; r < relativeLineNo; ) {
  //     if (-1 === (o = i.indexOf("\n", o) + 1)) {
  //       return;
  //     }

  //     r++;
  //   }

  //   var s = i.indexOf("\n", o);

  //   if (-1 === s) {
  //     s = i.length;
  //   }

  //   var a = i.slice(o, s).search(/\[.\]/);

  //   if (-1 !== a) {
  //     var l = o + a + 1;
  //     var c = " " === i.charAt(l) ? "x" : " ";
  //     var u = i.slice(0, l) + c + i.slice(l + 1);
  //     this.edit(u);
  //   }
  // }

  async edit(content: string) {
    this.renderer.set(content);
    let cachedContent = await this.app.vault.cachedRead(this.file);
    let matchContent = cachedContent.slice(this.match.start, this.match.end);
    let leadingSpaces = matchContent.match(/^\s+/g)?.first();
    if (leadingSpaces) {
      content = content.replace(/^/gm, leadingSpaces);
    }
    let before = cachedContent.slice(0, this.match.start);
    let after = cachedContent.slice(this.match.end, this.match.parent.content.length);
    var combinedContent = before + content + after;
    this.app.vault.modify(this.file, combinedContent);
  }
}
