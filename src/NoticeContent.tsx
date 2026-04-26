import React from "react";

type NoticeContentProps = {
	onPrint: () => void;
};

export const NoticeContent = ({ onPrint }: NoticeContentProps) => {
	return (
		<>
			<span>This is a notice! </span>
			<button type="button" onClick={onPrint}>
				Print
			</button>
		</>
	);
};
