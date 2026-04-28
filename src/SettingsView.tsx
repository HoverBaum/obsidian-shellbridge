import React, { useEffect, useRef, useState } from "react";
import { ShellbridgeCommand } from "./settings";

type SettingsViewProps = {
	initialCommands: ShellbridgeCommand[];
	onSave: (commands: ShellbridgeCommand[]) => Promise<void>;
};

const INPUT_WIDTH = "260px";

export function CommandSettingsView({ initialCommands, onSave }: SettingsViewProps) {
	const [commands, setCommands] = useState<ShellbridgeCommand[]>(initialCommands);
	const [error, setError] = useState<string | null>(null);
	const hasMountedRef = useRef(false);
	const saveCounterRef = useRef(0);

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

	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return;
		}

		const normalizedCommands = commands.map((item) => ({
			id: item.id.trim(),
			name: item.name.trim(),
			command: item.command.trim(),
		}));

		const saveId = saveCounterRef.current + 1;
		saveCounterRef.current = saveId;

		setError(null);

		void onSave(normalizedCommands)
			.catch((saveError) => {
				const message = saveError instanceof Error ? saveError.message : "Failed to save commands.";
				setError(message);
			})
	}, [commands, onSave]);

	return (
		<>
			<div className="setting-group">
				<div className="setting-items">
					<div className="setting-item">
						<div className="setting-item-info">
							<div className="setting-item-name">Shellbridge commands</div>
							<div className="setting-item-description">
								Manage reusable shell actions saved to <code>.shellbridge/shellbridge.yml</code>.
							</div>
						</div>
					</div>
				</div>
			</div>
			{commands.map((item, index) => (
				<section key={index} className="setting-group">


					<div className="setting-item-header setting-item">
						<h3 className="setting-item-name" style={{ marginBottom: 0 }}>{item.name}</h3>
						<div className="setting-item-control">
							<button className="mod-warning" type="button" onClick={() => removeRow(index)}>
								Remove
							</button>
						</div>
					</div>
					<div className="setting-items">
						<div className="setting-item">
							<div className="setting-item-info">
								<div className="setting-item-name">Name</div>
							</div>
							<div className="setting-item-control">
								<input
									type="text"
									value={item.name}
									onChange={(event) => update(index, { name: event.target.value })}
									style={{ width: INPUT_WIDTH }}
								/>

							</div>
						</div>
						<div className="setting-item">
							<div className="setting-item-info">
								<div className="setting-item-name">ID</div>
								<div className="setting-item-description">Unique command identifier</div>
							</div>
							<div className="setting-item-control">
								<input
									type="text"
									value={item.id}
									onChange={(event) => update(index, { id: event.target.value })}
									style={{ fontFamily: "var(--font-monospace)", width: INPUT_WIDTH }}
								/>
							</div>
						</div>
						<div className="setting-item">
							<div className="setting-item-info">
								<div className="setting-item-name">Command</div>
							</div>
							<div className="setting-item-control">
								<input
									type="text"
									value={item.command}
									onChange={(event) => update(index, { command: event.target.value })}
									style={{ fontFamily: "var(--font-monospace)", width: INPUT_WIDTH }}
								/>
							</div>
						</div>
					</div>
				</section >
			))
			}
			<div className="setting-group">
				<button type="button" onClick={addRow}>
					Add command
				</button>
			</div>
			{error ? <p>{error}</p> : null}
		</>
	);
}
