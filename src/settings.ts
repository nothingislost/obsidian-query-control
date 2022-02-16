import { App, PluginSettingTab, Setting } from "obsidian";
import EmbeddedQueryControlPlugin from "./main";

export interface EmbeddedQueryControlSettings {
  defaultCollapse: boolean;
  defaultShowContext: boolean;
  defaultSortOrder: string;
}

export const DEFAULT_SETTINGS: EmbeddedQueryControlSettings = {
  defaultCollapse: false,
  defaultShowContext: false,
  defaultSortOrder: "alphabetical",
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

    new Setting(containerEl).setName("Default query result sort order").addDropdown(cb => {
      cb.addOptions({
        alphabetical: Translate("plugins.file-explorer.label-sort-a-to-z"),
        alphabeticalReverse: Translate("plugins.file-explorer.label-sort-z-to-a"),
        byModifiedTime: Translate("plugins.file-explorer.label-sort-new-to-old"),
        byModifiedTimeReverse: Translate("plugins.file-explorer.label-sort-old-to-new"),
        byCreatedTime: Translate("plugins.file-explorer.label-sort-created-new-to-old"),
        byCreatedTimeReverse: Translate("plugins.file-explorer.label-sort-created-old-to-new"),
      });
      cb.setValue(this.plugin.settings.defaultSortOrder);
      cb.onChange(async value => {
        (this.plugin.settings.defaultSortOrder as any) = value;
        await this.plugin.saveSettings();
      });
    });
  }
}

const Translate = i18next.t.bind(i18next);
