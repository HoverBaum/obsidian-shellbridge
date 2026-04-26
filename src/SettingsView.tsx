import React, { useMemo, useState } from "react";
import { ShellbridgeCommand } from "./settings";

type SettingsViewProps = {
	initialCommands: ShellbridgeCommand[];
	onSave: (commands: ShellbridgeCommand[]) => Promise<void>;
};

export function CommandSettingsView({ initialCommands, onSave }: SettingsViewProps) {
	const [commands, setCommands] = useState<ShellbridgeCommand[]>(initialCommands);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const validationError = useMemo(() => {
		const ids = new Set<string>();
		for (const item of commands) {
			if (!item.id.trim() || !item.name.trim() || !item.command.trim()) {
				return "All command fields are required.";
			}
			if (ids.has(item.id.trim())) {
				return `Duplicate id: ${item.id.trim()}`;
			}
			ids.add(item.id.trim());
		}
		return null;
	}, [commands]);

	const update = (index: number, patch: Partial<ShellbridgeCommand>) => {
		setCommands((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	};

	const addRow = () => {
		setCommands((prev) => [
			...prev,
			{
				id: `command-${prev.length + 1}`,
				name: "New command",
				command: "",
			},
		]);
	};

	const removeRow = (index: number) => {
		setCommands((prev) => prev.filter((_, i) => i !== index));
	};

	const save = async () => {
		if (validationError) {
			setError(validationError);
			return;
		}
		setIsSaving(true);
		setError(null);
		try {
			await onSave(
				commands.map((item) => ({
					id: item.id.trim(),
					name: item.name.trim(),
					command: item.command.trim(),
				})),
			);
		} catch (saveError) {
			const message = saveError instanceof Error ? saveError.message : "Failed to save commands.";
			setError(message);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div>
			<h2>Shellbridge Commands</h2>
			<p>Commands are saved in vault root at .shellbridge/shellbridge.yml.</p>
			{commands.map((item, index) => (
				<div
					key={`${item.id}-${index}`}
					style={{
						border: "1px solid var(--background-modifier-border)",
						padding: "8px",
						borderRadius: "6px",
						marginBottom: "8px",
					}}
				>
					<label>
						Name
						<input
							type="text"
							value={item.name}
							onChange={(event) => update(index, { name: event.target.value })}
							style={{ width: "100%" }}
						/>
					</label>
					<label>
						ID
						<input
							type="text"
							value={item.id}
							onChange={(event) => update(index, { id: event.target.value })}
							style={{ width: "100%" }}
						/>
					</label>
					<label>
						Command
						<input
							type="text"
							value={item.command}
							onChange={(event) => update(index, { command: event.target.value })}
							style={{ width: "100%" }}
						/>
					</label>
					<button type="button" onClick={() => removeRow(index)}>
						Remove
					</button>
				</div>
			))}
			<div style={{ display: "flex", gap: "8px" }}>
				<button type="button" onClick={addRow}>
					Add command
				</button>
				<button
					type="button"
					disabled={isSaving}
					onClick={() => {
						void save();
					}}
				>
					{isSaving ? "Saving..." : "Save"}
				</button>
			</div>
			{validationError ? <p style={{ color: "var(--text-error)" }}>{validationError}</p> : null}
			{error ? <p style={{ color: "var(--text-error)" }}>{error}</p> : null}
		</div>
	);
}
