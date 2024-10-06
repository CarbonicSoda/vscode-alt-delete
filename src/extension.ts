import { ExtensionContext, Position, Range, Selection, TextEditor, TextEditorEdit, commands } from "vscode";

export function activate(context: ExtensionContext): void {
	context.subscriptions.push(
		commands.registerTextEditorCommand("alt-delete.alt-backspace", deleteFactory("backward")),
		commands.registerTextEditorCommand("alt-delete.alt-delete", deleteFactory("forward")),
		commands.registerTextEditorCommand("alt-delete.alt-left", moveFactory("backward")),
		commands.registerTextEditorCommand("alt-delete.alt-right", moveFactory("forward")),
		commands.registerTextEditorCommand("alt-delete.alt-shift-left", moveFactory("backward", true)),
		commands.registerTextEditorCommand("alt-delete.alt-shift-right", moveFactory("forward", true)),
	);
}

function deleteFactory(mode: "backward" | "forward"): (editor: TextEditor, edit: TextEditorEdit) => void {
	return (editor: TextEditor, edit: TextEditorEdit) => {
		const deleteRanges = [];
		for (let i = 0; i < editor.selections.length; i++) {
			const delta = getDelta(editor, i, mode);
			deleteRanges[i] = getDeleteRange(editor, i, delta);
		}
		for (const deleteRange of deleteRanges) edit.delete(deleteRange);
	};
}

function moveFactory(mode: "backward" | "forward", anchor = false): (editor: TextEditor) => void {
	return (editor: TextEditor) => {
		const selections = [];
		for (let i = 0; i < editor.selections.length; i++) {
			const delta = getDelta(editor, i, mode);
			selections[i] = getMovedSelection(editor, i, delta, anchor);
		}
		editor.selections = selections;
	};
}

type Delta = {
	char: number;
	line?: number;
};

enum CharClass {
	UPPER,
	LOWER,
	DIGIT,
	SPACE,
	SYMBOL,
}

function getCharClass(char: string) {
	if (/[A-Z]/.test(char)) return CharClass.UPPER;
	if (/[a-z]/.test(char)) return CharClass.LOWER;
	if (/\d/.test(char)) return CharClass.DIGIT;
	if (/\s/.test(char)) return CharClass.SPACE;
	return CharClass.SYMBOL;
}

function getDelta(editor: TextEditor, selectionIndex: number, mode: "backward" | "forward"): Delta {
	const isBackward = mode === "backward";

	const doc = editor.document;
	const currPos = editor.selections[selectionIndex].active;
	const currLine = currPos.line;
	const currLineRange = doc.lineAt(currLine).range;

	const editRange = new Range(currPos, isBackward ? currLineRange.start : currLineRange.end);
	let text = doc.getText(editRange);
	if (text.length === 0) {
		if (isBackward && currLine > 0) return { char: doc.lineAt(currLine - 1).text.length, line: -1 };
		if (!isBackward && currLine < doc.lineCount - 1) return { char: -doc.lineAt(currLine).text.length, line: 1 };
	}

	text = isBackward ? text.trimEnd() : text.trimStart();
	if (!text) {
		if (isBackward) return { char: editRange.start.character - editRange.end.character };
		return { char: editRange.end.character - editRange.start.character };
	}

	const extraSpaceCnt = text.length - text.length;
	if (getCharClass(<string>text.at(isBackward ? -1 : 0)) === CharClass.UPPER) {
		if (isBackward) return { char: -extraSpaceCnt - 1 };
		if (getCharClass(text[1]) === CharClass.UPPER) return { char: extraSpaceCnt + 1 };
	}

	if (isBackward) {
		let i = 1;
		while (getCharClass(<string>text.at(-i - 1)) === getCharClass(<string>text.at(-i)) && i < text.length) i++;
		if (
			getCharClass(<string>text.at(-i - 1)) === CharClass.UPPER &&
			getCharClass(<string>text.at(-i)) === CharClass.LOWER
		)
			i++;
		return { char: -i - extraSpaceCnt };
	} else {
		let i = getCharClass(text[0]) === CharClass.UPPER ? 1 : 0;
		while (getCharClass(text[i + 1]) === getCharClass(text[i]) && i < text.length - 1) i++;
		return { char: i + extraSpaceCnt + 1 };
	}
}

function getDeleteRange(editor: TextEditor, selectionIndex: number, delta: Delta): Range {
	const currPos = editor.selections[selectionIndex].active;
	return new Range(currPos, currPos.translate(delta.line, delta.char));
}

function getMovedSelection(editor: TextEditor, selectionIndex: number, delta: Delta, anchor = false): Selection {
	const currSelection = editor.selections[selectionIndex];
	const newPos = new Position(
		currSelection.active.line + (delta.line ?? 0),
		currSelection.active.character + delta.char,
	);
	return new Selection(anchor ? currSelection.anchor : newPos, newPos);
}
