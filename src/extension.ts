import {
	ExtensionContext,
	Position,
	Range,
	Selection,
	TextDocument,
	TextEditor,
	TextEditorEdit,
	commands,
} from "vscode";

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
		for (const selection of editor.selections) {
			const delta = getDelta(editor.document, selection, mode);
			edit.delete(getDeleteRange(selection, delta));
		}
	};
}

function moveFactory(mode: "backward" | "forward", anchor = false): (editor: TextEditor) => void {
	return (editor: TextEditor) => {
		const selections = [];
		for (const selection of editor.selections) {
			const delta = getDelta(editor.document, selection, mode);
			selections.push(getMovedSelection(selection, delta, anchor));
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

function charClassOf(char: string): CharClass {
	if (/[A-Z]/.test(char)) return CharClass.UPPER;
	if (/[a-z]/.test(char)) return CharClass.LOWER;
	if (/\d/.test(char)) return CharClass.DIGIT;
	if (/\s/.test(char)) return CharClass.SPACE;
	return CharClass.SYMBOL;
}

function getDelta(doc: TextDocument, selection: Selection, mode: "backward" | "forward"): Delta {
	const isBackward = mode === "backward";

	const currPos = selection.active;
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
	if (charClassOf(<string>text.at(isBackward ? -1 : 0)) === CharClass.UPPER) {
		if (isBackward) return { char: -extraSpaceCnt - 1 };
		if (charClassOf(text[1]) === CharClass.UPPER) return { char: extraSpaceCnt + 1 };
	}

	if (isBackward) {
		let i = 1;
		while (charClassOf(<string>text.at(-i - 1)) === charClassOf(<string>text.at(-i)) && i < text.length) i++;
		if (
			charClassOf(<string>text.at(-i - 1)) === CharClass.UPPER &&
			charClassOf(<string>text.at(-i)) === CharClass.LOWER
		)
			i++;
		return { char: -i - extraSpaceCnt };
	} else {
		let i = charClassOf(text[0]) === CharClass.UPPER ? 1 : 0;
		while (charClassOf(text[i + 1]) === charClassOf(text[i]) && i < text.length - 1) i++;
		return { char: i + extraSpaceCnt + 1 };
	}
}

function getDeleteRange(selection: Selection, delta: Delta): Range {
	const currPos = selection.active;
	return new Range(currPos, currPos.translate(delta.line, delta.char));
}

function getMovedSelection(selection: Selection, delta: Delta, anchor = false): Selection {
	const newPos = new Position(selection.active.line + (delta.line ?? 0), selection.active.character + delta.char);
	return new Selection(anchor ? selection.anchor : newPos, newPos);
}
