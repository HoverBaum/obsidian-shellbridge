import { App, PluginSettingTab } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import MyPlugin from "./main";
import React from "react";
import { CommandSettingsView } from "./SettingsView";

export type ShellbridgeCommand = {
	id: string;
	name: string;
	command: string;
};

export interface MyPluginSettings {
	commands: ShellbridgeCommand[];
}

export const DEFAULT_COMMANDS: ShellbridgeCommand[] = [
	{ id: "list-all", name: "List files (including hidden)", command: "ls -a" },
	{ id: "print-working-directory", name: "Print working directory", command: "pwd" },
];

export const DEFAULT_SETTINGS: MyPluginSettings = {
	commands: DEFAULT_COMMANDS,
};

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;
	root: Root | null = null;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		this.root?.unmount();
		this.root = null;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.root?.unmount();
		this.root = createRoot(containerEl);
		this.root.render(
			React.createElement(CommandSettingsView, {
				initialCommands: this.plugin.settings.commands,
				onSave: async (commands) => {
					await this.plugin.updateCommands(commands);
				},
			}),
		);
	}
}
