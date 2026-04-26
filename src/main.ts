import { Plugin } from "obsidian";
import { openCommandSelect } from "./CommandSelect";
import {
	DEFAULT_COMMANDS,
	DEFAULT_SETTINGS,
	ShellbridgeCommand,
	ShellbridgeSettings,
	ShellbridgeSettingTab,
} from "./settings";
import { readCommandsFromTaskfile, writeCommandsToTaskfile } from "./taskfile";

export default class ShellbridgePlugin extends Plugin {
	settings: ShellbridgeSettings;

	async onload() {
		await this.loadSettings();
		await this.loadCommandRegistry();

		this.addCommand({
			id: "select-commands",
			name: "Select Command",
			callback: () => {
				openCommandSelect(this);
			},
		});

		this.addSettingTab(new ShellbridgeSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		const saved = (await this.loadData()) as
			| Partial<ShellbridgeSettings>
			| null;
		const safeSaved = saved ?? {};
		this.settings = {
			...DEFAULT_SETTINGS,
			...safeSaved,
			commands: safeSaved.commands?.length
				? safeSaved.commands
				: DEFAULT_SETTINGS.commands.map((command) => ({ ...command })),
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async loadCommandRegistry(): Promise<void> {
		const fromTaskfile = await readCommandsFromTaskfile(this.app);
		if (fromTaskfile) {
			this.settings.commands = fromTaskfile;
			await this.saveSettings();
			return;
		}

		if (!this.settings.commands?.length) {
			this.settings.commands = DEFAULT_COMMANDS;
			await writeCommandsToTaskfile(this.app, this.settings.commands);
			await this.saveSettings();
		}
	}

	async updateCommands(commands: ShellbridgeCommand[]): Promise<void> {
		this.settings.commands = commands;
		await writeCommandsToTaskfile(this.app, commands);
		await this.saveSettings();
	}

	getCommands(): ShellbridgeCommand[] {
		return this.settings.commands;
	}
}
