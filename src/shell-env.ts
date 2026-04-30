import { execFile } from "child_process";
import path from "path";
import os from "os";
import util from "util";

const execFileAsync = util.promisify(execFile);

let resolvedEnv: NodeJS.ProcessEnv = { ...process.env };

/** Login + interactive so ~/.zshrc / ~/.bashrc (nvm, etc.) run; stdin must not be inherited or some rc hooks block. */
function getShellArgv(shell: string): string[] {
	const base = path.basename(shell).toLowerCase();
	console.debug(`OSB getting shell argv for: ${base}`);
	switch (base) {
		case "zsh":
			return ["-il", "-c", "echo $PATH"];
		case "bash":
			return ["--login", "-i", "-c", "echo $PATH"];
		case "fish":
			return ["-i", "-l", "-c", "echo $PATH"];
		default:
			return ["-l", "-c", "echo $PATH"];
	}
}

const pathProbeExecOptions = {
	encoding: "utf8" as const,
	timeout: 15_000,
	maxBuffer: 1024 * 1024,
	/** Closed stdin avoids interactive rc blocks on inherited Obsidian stdin. */
	stdio: ["ignore", "pipe", "pipe"] as const,
	env: {
		...process.env,
		TERM: "dumb",
	},
};

async function resolveUnixPath(): Promise<string> {
	const { shell: loginShell } = os.userInfo();
	const shell = typeof loginShell === "string" && loginShell.length > 0
		? loginShell
		: process.env.SHELL && process.env.SHELL.length > 0
		? process.env.SHELL
		: "/bin/zsh";
	const argv = getShellArgv(shell);
	const { stdout } = await execFileAsync(shell, argv, pathProbeExecOptions);
	return typeof stdout === "string" ? stdout.trim() : String(stdout).trim();
}

async function resolveWindowsPath(): Promise<string> {
	const { stdout } = await execFileAsync(
		"powershell.exe",
		[
			"-NoLogo",
			"-NoProfile",
			"-Command",
			'[Environment]::GetEnvironmentVariable("Path","User") + ";" + [Environment]::GetEnvironmentVariable("Path","Machine")',
		],
		{
			...pathProbeExecOptions,
			windowsHide: true,
		},
	);
	return typeof stdout === "string" ? stdout.trim() : String(stdout).trim();
}

async function resolveUserPath(): Promise<string> {
	if (process.platform === "win32") {
		return resolveWindowsPath();
	}
	return resolveUnixPath();
}

export async function initShellEnvironment(): Promise<void> {
	try {
		const userPath = await resolveUserPath();
		console.debug(`OSB resolved user path: ${userPath}`);
		if (!userPath) {
			return;
		}
		resolvedEnv = { ...process.env };
		if (process.platform === "win32") {
			resolvedEnv.Path = userPath;
			resolvedEnv.PATH = userPath;
		} else {
			resolvedEnv.PATH = userPath;
		}
	} catch (err) {
		console.warn(
			"[Shellbridge] Could not resolve user PATH, using process default:",
			err,
		);
		resolvedEnv = { ...process.env };
	}
}

export function getResolvedEnv(): NodeJS.ProcessEnv {
	return resolvedEnv;
}
