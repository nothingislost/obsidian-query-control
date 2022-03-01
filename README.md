## Obsidian Query Control

This plugin adds additional functionality to Obsidian's [search/query](https://help.obsidian.md/Plugins/Search) feature. The current version will add a control bar to each embedded query with various actions such as: collapse all, show context, sort, hide title, hide results, render markdown, and copy results.

Controls are added to embedded queries in Live Preview and Reading modes.

Each of the controls have defaults which can be defined in the plugin settings tab. So, if you wanted all embedded queries to render collapsed by default, you would go into the settings and change that default.

If you want to configure the controls on a per embedded query basis, this plugin implements an extended query syntax which allows for this. The full syntax looks like this:

````
```query
path: foo tag:#obsidian
title: custom query name
collapsed: true | false
context: true | false
hideTitle: true | false
hideResults: true | false
renderMarkdown: true | false
sort: alphabetical | alphabeticalReverse | byModifiedTime | byModifiedTimeReverse | byCreatedTime | byCreatedTimeReverse
```
````

Each of the extended keys are optional. If a key is not provided, the configured default will be used instead.

### Demo

![embedded-query-control](https://user-images.githubusercontent.com/89109712/154376835-08c1d3ab-b67c-4ca6-8261-abf41c38d7c1.gif)

### Installing via BRAT

Install the BRAT plugin via the Obsidian Plugin Browser and then add the beta repository "nothingislost/obsidian-embedded-query-control"

### Manually installing the plugin

- Copy over `main.js`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-embedded-query-control/`.
