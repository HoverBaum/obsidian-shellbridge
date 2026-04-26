import React, { useEffect, useRef, useState } from "react";
import { ShellbridgeCommand } from "./settings";

type SettingsViewProps = {
	initialCommands: ShellbridgeCommand[];
	onSave: (commands: ShellbridgeCommand[]) => Promise<void>;
};

export function CommandSettingsView({ initialCommands, onSave }: SettingsViewProps) {
	const [commands, setCommands] = useState<ShellbridgeCommand[]>(initialCommands);
	const [error, setError] = useState<string | null>(null);
	const hasMountedRef = useRef(false);
	const saveCounterRef = useRef(0);

	const styles = {
		root: {
			display: "flex",
			flexDirection: "column",
			gap: "16px",
		} as const,
		commandGroup: {
			borderRadius: "8px",
			padding: "16px",
			backgroundColor: "var(--background-secondary)",
			display: "flex",
			flexDirection: "column",
		} as const,
		commandHeader: {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: "16px",
		} as const,
		commandTitle: {
			margin: 0,
			fontSize: "var(--font-ui-medium)",
			fontWeight: 600,
			color: "var(--text-muted)",
		},
		fieldRow: {
			padding: "0 12px",
		},
		input: {
			minWidth: "260px",
		},
		monoInput: {
			fontFamily: "var(--font-monospace)",
		},
		buttonRow: {
			display: "flex",
			gap: "8px",
			flexWrap: "wrap",
			paddingTop: "8px",
		} as const,
		message: {
			margin: "2px 0 0",
			fontSize: "var(--font-ui-small)",
			color: "var(--text-muted)",
		},
		errorText: {
			margin: "2px 0 0",
			color: "var(--text-error)",
			fontSize: "var(--font-ui-small)",
		},
	} as const;

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
		<div style={styles.root}>
			<div>
				<div className="setting-item-info">
					<div className="setting-item-name">Shellbridge commands</div>
					<div className="setting-item-description">
						Manage reusable shell actions saved to <code>.shellbridge/shellbridge.yml</code>.
					</div>
				</div>
			</div>
			{commands.map((item, index) => (
				<section key={`${item.id}-${index}`} style={styles.commandGroup}>
					<div style={styles.commandHeader}>
						<h3 style={styles.commandTitle}>Command {index + 1}</h3>
						<button className="mod-warning" type="button" onClick={() => removeRow(index)}>
							Remove
						</button>
					</div>
					<div style={styles.fieldRow}>
						<div className="setting-item">
							<div className="setting-item-info">
								<div className="setting-item-name">Name</div>
							</div>
							<div className="setting-item-control">
								<input
									type="text"
									value={item.name}
									onChange={(event) => update(index, { name: event.target.value })}
									style={styles.input}
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
									style={{ ...styles.input, ...styles.monoInput }}
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
									style={{ ...styles.input, ...styles.monoInput }}
								/>
							</div>
						</div>
					</div>
				</section>
			))}
			<div style={styles.buttonRow}>
				<button type="button" onClick={addRow}>
					Add command
				</button>
			</div>
			{error ? <p style={styles.errorText}>{error}</p> : null}
		</div>
	);
}
