import { App, FuzzySuggestModal, Notice } from "obsidian";
import path from "path";
import { ChildProcess, spawn } from "child_process";
import ShellbridgePlugin from "./main";
import { ShellbridgeCommand } from "./settings";
import { getResolvedEnv } from "./shell-env";

const RUNNING_NOTICE_TIMEOUT_MS = 2_147_483_647;
const COMMAND_TIMEOUT_MS = 120_000;
const KILL_GRACE_MS = 3_000;
const MAX_OUTPUT_CHARS = 20_000;

type CommandResultStatus =
	| "finished"
	| "failed"
	| "timed out"
	| "cancelled";

function showCommandResultNotice(
	command: ShellbridgeCommand,
	status: CommandResultStatus,
	output: string,
): void {
	const noticeWrapper = document.createElement("div");
	const label = noticeWrapper.createEl("span", {
		text: `Command ${status}: ${command.name}`,
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

function createRunningNotice(
	command: ShellbridgeCommand,
	onStop: () => void,
): Notice {
	const noticeWrapper = document.createElement("div");
	const label = noticeWrapper.createEl("span", {
		text: `Command running: ${command.name}`,
	});
	label.addClass("shellbridge-command-label");

	const stopButton = noticeWrapper.createEl("button", {
		text: "Stop",
	});
	stopButton.type = "button";
	stopButton.addEventListener("click", () => {
		stopButton.disabled = true;
		stopButton.textContent = "Stopping...";
		onStop();
	});

	const noticeFragment = document.createDocumentFragment();
	noticeFragment.appendChild(noticeWrapper);
	return new Notice(noticeFragment, RUNNING_NOTICE_TIMEOUT_MS);
}

function truncateOutput(rawOutput: string): string {
	if (rawOutput.length <= MAX_OUTPUT_CHARS) {
		return rawOutput;
	}
	return `${rawOutput.slice(0, MAX_OUTPUT_CHARS)}\n\n[output truncated]`;
}

function runCommand(app: App, command: ShellbridgeCommand): void {
	console.debug(`OSB running: ${command.command}`);
	showCommandStartedNotice(command);
	const currentFilePath = app.workspace.getActiveFile()?.path;
	// @ts-ignore
	const basePath: string = app.vault.adapter.basePath || "";
	const absoluteCurrentFilePath = currentFilePath
		? path.join(basePath, currentFilePath)
		: "";
	const outputChunks: string[] = [];
	let isSettled = false;
	let stopRequested = false;
	let timeoutTriggered = false;
	let forceKillTimer: NodeJS.Timeout | undefined;
	let childProcess: ChildProcess | null = null;

	const addOutput = (label: "stdout" | "stderr", chunk: Buffer): void => {
		outputChunks.push(`[${label}] ${chunk.toString("utf8")}`);
	};

	const getOutput = (): string => {
		const combinedOutput = outputChunks.join("");
		const safeOutput = combinedOutput.trim() || "(no output)";
		return truncateOutput(safeOutput);
	};

	const sendSignal = (signal: NodeJS.Signals): void => {
		if (!childProcess || childProcess.killed) {
			return;
		}
		childProcess.kill(signal);
	};

	const runningNotice = createRunningNotice(command, () => {
		stopRequested = true;
		sendSignal("SIGTERM");
	});

	const timeoutTimer = window.setTimeout(() => {
		timeoutTriggered = true;
		sendSignal("SIGTERM");
		forceKillTimer = setTimeout(() => {
			sendSignal("SIGKILL");
		}, KILL_GRACE_MS);
	}, COMMAND_TIMEOUT_MS);

	const clearTimers = (): void => {
		window.clearTimeout(timeoutTimer);
		if (forceKillTimer) {
			clearTimeout(forceKillTimer);
		}
	};

	const finish = (status: CommandResultStatus, extraOutput?: string): void => {
		if (isSettled) {
			return;
		}
		isSettled = true;
		if (extraOutput) {
			outputChunks.push(extraOutput);
		}
		clearTimers();
		runningNotice.hide();
		showCommandResultNotice(command, status, getOutput());
	};

	childProcess = spawn(command.command, {
		cwd: basePath,
		env: {
			...getResolvedEnv(),
			OSB_CURRENT_FILE_PATH: absoluteCurrentFilePath,
		},
		shell: true,
		stdio: ["ignore", "pipe", "pipe"],
	});

	childProcess.stdout?.on("data", (chunk: Buffer) => addOutput("stdout", chunk));
	childProcess.stderr?.on("data", (chunk: Buffer) => addOutput("stderr", chunk));

	childProcess.on("error", (error: Error) => {
		finish("failed", `[stderr] Failed to start command: ${error.message}\n`);
	});

	childProcess.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
		if (timeoutTriggered) {
			finish(
				"timed out",
				`[stderr] Command timed out after ${Math.round(COMMAND_TIMEOUT_MS / 1000)} seconds.\n`,
			);
			return;
		}

		if (stopRequested) {
			finish("cancelled", "[stderr] Command stopped by user.\n");
			return;
		}

		if (code === 0) {
			finish("finished");
			return;
		}

		finish(
			"failed",
			`[stderr] Command exited with code ${String(code)}${
				signal ? ` (signal: ${signal})` : ""
			}.\n`,
		);
	});
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
