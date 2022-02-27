import { App, PluginSettingTab, Setting } from "obsidian";
import EmbeddedQueryControlPlugin from "./main";
import { translate } from "./utils";

export interface EmbeddedQueryControlSettings {
  defaultCollapse: boolean;
  defaultShowContext: boolean;
  defaultHideTitle: boolean;
  defaultHideResults: boolean;
  defaultRenderMarkdown: boolean;
  defaultSortOrder: string;
}

export const DEFAULT_SETTINGS: EmbeddedQueryControlSettings = {
  defaultCollapse: false,
  defaultShowContext: false,
  defaultHideTitle: false,
  defaultHideResults: false,
  defaultRenderMarkdown: false,
  defaultSortOrder: "alphabetical",
};
// alphabetical|alphabeticalReverse|byModifiedTime|byModifiedTimeReverse|byCreatedTime|byCreatedTimeReverse
export const sortOptions = {
  alphabetical: translate("plugins.file-explorer.label-sort-a-to-z"),
  alphabeticalReverse: translate("plugins.file-explorer.label-sort-z-to-a"),
  byModifiedTime: translate("plugins.file-explorer.label-sort-new-to-old"),
  byModifiedTimeReverse: translate("plugins.file-explorer.label-sort-old-to-new"),
  byCreatedTime: translate("plugins.file-explorer.label-sort-created-new-to-old"),
  byCreatedTimeReverse: translate("plugins.file-explorer.label-sort-created-old-to-new"),
};

export class SettingTab extends PluginSettingTab {
  plugin: EmbeddedQueryControlPlugin;

  constructor(app: App, plugin: EmbeddedQueryControlPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  hide() {}

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("Collapse query results by default").addToggle(toggle =>
      toggle.setValue(this.plugin.settings.defaultCollapse).onChange(value => {
        this.plugin.settings.defaultCollapse = value;
        this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Show additional query result context by default").addToggle(toggle =>
      toggle.setValue(this.plugin.settings.defaultShowContext).onChange(value => {
        this.plugin.settings.defaultShowContext = value;
        this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Hide query title by default").addToggle(toggle =>
      toggle.setValue(this.plugin.settings.defaultHideTitle).onChange(value => {
        this.plugin.settings.defaultHideTitle = value;
        this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Hide query results by default").addToggle(toggle =>
      toggle.setValue(this.plugin.settings.defaultHideResults).onChange(value => {
        this.plugin.settings.defaultHideResults = value;
        this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Render results as Markdown by default").addToggle(toggle =>
      toggle.setValue(this.plugin.settings.defaultRenderMarkdown).onChange(value => {
        this.plugin.settings.defaultRenderMarkdown = value;
        this.plugin.saveSettings();
      })
    );

    new Setting(containerEl).setName("Default query result sort order").addDropdown(cb => {
      cb.addOptions(sortOptions);
      cb.setValue(this.plugin.settings.defaultSortOrder);
      cb.onChange(async value => {
        (this.plugin.settings.defaultSortOrder as any) = value;
        await this.plugin.saveSettings();
      });
    });
  }
}
