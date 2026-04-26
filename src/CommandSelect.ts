import { App, FuzzySuggestModal, Notice } from "obsidian";
import { exec } from "child_process";

type AllowedCommand = "ls" | "ls -a" | "cat Welcome.md";

const COMMANDS: AllowedCommand[] = ["ls", "ls -a", "cat Welcome.md"];

function getCommandCwd(app: App): string | undefined {
	const adapter = app.vault.adapter as { getBasePath?: () => string };
	if (typeof adapter.getBasePath === "function") {
		return adapter.getBasePath();
	}

	return undefined;
}

function showCommandFinishedNotice(command: AllowedCommand, output: string): void {
	const noticeWrapper = document.createElement("div");
	const label = noticeWrapper.createEl("span", {
		text: `Command finished: ${command}`,
	});
	label.style.marginRight = "0.5em";

	const button = noticeWrapper.createEl("button", {
		text: "Log output",
	});
	button.type = "button";
	button.addEventListener("click", () => {
		console.log(output);
	});

	const noticeFragment = document.createDocumentFragment();
	noticeFragment.appendChild(noticeWrapper);
	new Notice(noticeFragment, 7000);
}

function runCommand(app: App, command: AllowedCommand): void {
	console.log(command);

	exec(
		command,
		{ cwd: getCommandCwd(app) },
		(error, stdout, stderr) => {
			const output = error
				? `Command failed: ${error.message}\n${stderr}`.trim()
				: [stdout, stderr].filter(Boolean).join("\n").trim() || "(no output)";

			showCommandFinishedNotice(command, output);
		},
	);
}

class CommandSelectModal extends FuzzySuggestModal<AllowedCommand> {
	constructor(app: App) {
		super(app);
	}

	getItems(): AllowedCommand[] {
		return COMMANDS;
	}

	getItemText(item: AllowedCommand): string {
		return item;
	}

	onChooseItem(item: AllowedCommand): void {
		runCommand(this.app, item);
	}
}

export function openCommandSelect(app: App): void {
	new CommandSelectModal(app).open();
}
