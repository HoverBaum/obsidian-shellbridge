import { App, normalizePath, parseYaml, stringifyYaml } from "obsidian";
import { ShellbridgeCommand } from "./settings";

const COMMANDS_DIRECTORY = ".shellbridge";
const COMMANDS_FILE = ".shellbridge/shellbridge.yml";

type TaskfileTask = {
	desc?: unknown;
	cmd?: unknown;
	cmds?: unknown;
};

type TaskfileDocument = {
	version?: unknown;
	tasks?: Record<string, TaskfileTask>;
};

function getCommandsFilePath(): string {
	return normalizePath(COMMANDS_FILE);
}

export function getCommandsDirectoryPath(): string {
	return normalizePath(COMMANDS_DIRECTORY);
}

export async function readCommandsFromTaskfile(app: App): Promise<ShellbridgeCommand[] | null> {
	const adapter = app.vault.adapter;
	const filePath = getCommandsFilePath();
	if (!(await adapter.exists(filePath))) {
		return null;
	}

	const raw = await adapter.read(filePath);
	const parsed = parseYaml(raw) as TaskfileDocument | null;
	if (!parsed || typeof parsed !== "object" || !parsed.tasks) {
		return null;
	}

	const commands: ShellbridgeCommand[] = [];
	for (const [id, task] of Object.entries(parsed.tasks)) {
		if (!task || typeof task !== "object") {
			continue;
		}
		const desc = typeof task.desc === "string" ? task.desc : id;
		const cmdFromShort = typeof task.cmd === "string" ? task.cmd : null;
		const cmdFromList =
			Array.isArray(task.cmds) && typeof task.cmds[0] === "string" ? task.cmds[0] : null;
		const command = cmdFromShort ?? cmdFromList;
		if (!command) {
			continue;
		}
		commands.push({ id, name: desc, command });
	}
	return commands.length > 0 ? commands : null;
}

export async function writeCommandsToTaskfile(app: App, commands: ShellbridgeCommand[]): Promise<void> {
	const adapter = app.vault.adapter;
	const directoryPath = getCommandsDirectoryPath();
	if (!(await adapter.exists(directoryPath))) {
		await adapter.mkdir(directoryPath);
	}

	const tasks = Object.fromEntries(
		commands.map((item) => [
			item.id,
			{
				desc: item.name,
				cmds: [item.command],
			},
		]),
	);

	const yaml = stringifyYaml({
		version: "3",
		tasks,
	}).trimEnd() + "\n";

	await adapter.write(getCommandsFilePath(), yaml);
}
