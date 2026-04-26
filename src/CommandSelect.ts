import { App, FuzzySuggestModal, Notice } from "obsidian";
import MyPlugin from "./main";
import { ShellbridgeCommand } from "./settings";

type ExecFunction = (
	command: string,
	options: { cwd?: string; shell?: string | boolean },
	callback: (error: Error | null, stdout: string, stderr: string) => void,
) => void;

function getExec(): ExecFunction {
	const nodeRequire = (window as Window & { require?: (name: string) => unknown }).require;
	if (!nodeRequire) {
		throw new Error("Node require is unavailable.");
	}
	const childProcess = nodeRequire("child_process") as { exec?: ExecFunction };
	if (!childProcess.exec) {
		throw new Error("child_process.exec is unavailable.");
	}
	return childProcess.exec;
}

function getDefaultShell(): string | boolean {
	const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
	return runtime.process?.env?.SHELL ?? true;
}

function getCommandCwd(app: App): string | undefined {
	const adapter = app.vault.adapter as { getBasePath?: () => string };
	if (typeof adapter.getBasePath === "function") {
		return adapter.getBasePath();
	}

	return undefined;
}

function showCommandFinishedNotice(command: ShellbridgeCommand, output: string): void {
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
	const exec = getExec();
	console.debug("Running shellbridge command:", command.command);
	showCommandStartedNotice(command);

	exec(
		command.command,
		{ cwd: getCommandCwd(app), shell: getDefaultShell() },
		(error, stdout, stderr) => {
			const output = error
				? `Command failed: ${error.message}\n${stderr}`.trim()
				: [stdout, stderr].filter(Boolean).join("\n").trim() || "(no output)";

			showCommandFinishedNotice(command, output);
		},
	);
}

class CommandSelectModal extends FuzzySuggestModal<ShellbridgeCommand> {
	private readonly plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
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

export function openCommandSelect(plugin: MyPlugin): void {
	new CommandSelectModal(plugin.app, plugin).open();
}
