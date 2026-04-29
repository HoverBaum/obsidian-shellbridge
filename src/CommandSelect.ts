import { App, FuzzySuggestModal, Notice } from "obsidian";
import path from "path";
import { exec, execSync } from "child_process";
import ShellbridgePlugin from "./main";
import { ShellbridgeCommand } from "./settings";

function showCommandFinishedNotice(
	command: ShellbridgeCommand,
	output: string,
): void {
	const noticeWrapper = document.createElement("div");
	const label = noticeWrapper.createEl("span", {
		text: `Command finished: ${command.name}`,
	});
	label.addClass("shellbridge-command-label");

	const button = noticeWrapper.createEl("button", {
		text: "Log output",
	});
	button.type = "button";
	button.addEventListener("click", () => {
		console.warn(output);
	});

	const noticeFragment = document.createDocumentFragment();
	noticeFragment.appendChild(noticeWrapper);
	new Notice(noticeFragment, 7000);
}

function showCommandStartedNotice(command: ShellbridgeCommand): void {
	new Notice(`Command started: ${command.name}`, 2500);
}

function runCommand(app: App, command: ShellbridgeCommand): void {
	console.debug("Running shellbridge command:", command.command);
	showCommandStartedNotice(command);
	const currentFilePath = app.workspace.getActiveFile()?.path;
	// @ts-ignore
	const basePath: string = app.vault.adapter.basePath || "";
	const absoluteCurrentFilePath = currentFilePath
		? path.join(basePath, currentFilePath)
		: "";

	console.debug(`OSB running: ${command.command}`);
	exec(
		command.command,
		{
			cwd: basePath,
			env: {
				...process.env,
				PATH: process.env.PATH,
				OSB_CURRENT_FILE_PATH: absoluteCurrentFilePath,
			},
		},
		(error, stdout, stderr) => {
			console.debug(`OSB finished: ${command.command}`);
			console.debug(`OSB error: ${error}`);
			console.debug(`OSB stdout: ${stdout}`);
			console.debug(`OSB stderr: ${stderr}`);
			const output = error
				? `Command failed: ${error.message}\n${stderr}`.trim()
				: [stdout, stderr].filter(Boolean).join("\n").trim() ||
					"(no output)";

			showCommandFinishedNotice(command, output);
		},
	);
}

class CommandSelectModal extends FuzzySuggestModal<ShellbridgeCommand> {
	private readonly plugin: ShellbridgePlugin;

	constructor(app: App, plugin: ShellbridgePlugin) {
		super(app);
		this.plugin = plugin;
	}

	getItems(): ShellbridgeCommand[] {
		return this.plugin.getCommands();
	}

	getItemText(item: ShellbridgeCommand): string {
		return `${item.name} (${item.id})`;
	}

	onChooseItem(item: ShellbridgeCommand): void {
		runCommand(this.app, item);
	}
}

export function openCommandSelect(plugin: ShellbridgePlugin): void {
	new CommandSelectModal(plugin.app, plugin).open();
}
