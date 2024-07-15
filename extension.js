const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand("alt-delete.alt-backspace", (editor, editBuilder) => {
			const delta = getDelta(editor, "backward");
			deleteDelta(editBuilder, editor.selection.active, delta);
		}),
		vscode.commands.registerTextEditorCommand("alt-delete.alt-delete", (editor, editBuilder) => {
			const delta = getDelta(editor, "forward");
			deleteDelta(editBuilder, editor.selection.active, delta);
		}),
		vscode.commands.registerTextEditorCommand("alt-delete.alt--", (editor) => {
			const delta = getDelta(editor, "backward");
			moveDelta(editor, delta);
		}),
		vscode.commands.registerTextEditorCommand("alt-delete.alt++", (editor) => {
			const delta = getDelta(editor, "forward");
			moveDelta(editor, delta);
		}),
		vscode.commands.registerTextEditorCommand("alt-delete.alt-shift--", (editor) => {
			const delta = getDelta(editor, "backward");
			moveDelta(editor, delta, true);
		}),
		vscode.commands.registerTextEditorCommand("alt-delete.alt-shift++", (editor) => {
			const delta = getDelta(editor, "forward");
			moveDelta(editor, delta, true);
		}),
	);
}

/**
 * get delta for alt-functions shift distance
 * @param {vscode.TextEditor} editor
 * @param {"backward" | "forward"} mode
 * @returns {Delta}
 */
function getDelta(editor, mode) {
	const backward = mode === "backward";

	const document = editor.document;
	const currPos = editor.selection.active;
	const currLine = currPos.line;
	const currLineRange = document.lineAt(currLine).range;

	const editRange = new vscode.Range(currPos, backward ? currLineRange.start : currLineRange.end);
	const tmp = document.getText(editRange);
	if (tmp.length === 0) {
		if (backward && currLine > 0) return new Delta(document.lineAt(currLine - 1).text.length, -1);
		if (!backward && currLine < document.lineCount - 1)
			return new Delta(-document.lineAt(currLine).text.length, 1);
	}

	const text = backward ? tmp.trimEnd() : tmp.trimStart();
	if (!text) {
		if (backward) return new Delta(editRange.start.character - editRange.end.character);
		return new Delta(editRange.end.character - editRange.start.character);
	}

	const extraSpaceCnt = tmp.length - text.length;
	if (getCharClass(text.at(backward ? -1 : 0)) === CharClass.UPPER) {
		if (backward) return new Delta(-1 - extraSpaceCnt);
		if (getCharClass(text[1]) === CharClass.UPPER) return new Delta(1 + extraSpaceCnt);
	}

	if (backward) {
		let i = 1;
		while (getCharClass(text.at(-i - 1)) === getCharClass(text.at(-i)) && i < text.length) i++;
		if (getCharClass(text.at(-i - 1)) === CharClass.UPPER && getCharClass(text.at(-i)) === CharClass.LOWER)
			i++;
		return new Delta(-i - extraSpaceCnt);
	} else {
		let i = getCharClass(text[0]) === CharClass.UPPER ? 1 : 0;
		while (getCharClass(text[i + 1]) === getCharClass(text[i]) && i < text.length - 1) i++;
		return new Delta(i + extraSpaceCnt + 1);
	}
}

// enum character classes
const CharClass = Object.freeze({
	UPPER: "A",
	LOWER: "a",
	DIGIT: "0",
	SPACE: " ",
	SYMBOL: "@",
});
/**
 * @param {string} char single character
 * @returns {*} corresponding character class enumerated in {@link CharClass}
 */
function getCharClass(char) {
	if (/[A-Z]/.test(char)) return CharClass.UPPER;
	if (/[a-z]/.test(char)) return CharClass.LOWER;
	if (/\d/.test(char)) return CharClass.DIGIT;
	if (/\s/.test(char)) return CharClass.SPACE;
	return CharClass.SYMBOL;
}

class Delta {
	/**
	 * @param {number} charDelta
	 * @param {number} lineDelta
	 */
	constructor(charDelta, lineDelta = 0) {
		this.charDelta = charDelta;
		this.lineDelta = lineDelta;
	}
}
/**
 * delete content from current position according to delta
 * @param {vscode.TextEditorEdit} editBuilder
 * @param {vscode.Position} currPos
 * @param {Delta} delta
 */
function deleteDelta(editBuilder, currPos, delta) {
	editBuilder.delete(new vscode.Range(currPos, currPos.translate(delta.lineDelta, delta.charDelta)));
}
/**
 * move current position in document with delta
 * @param {vscode.TextEditor} editor
 * @param {vscode.Position} currPos
 * @param {Delta} delta
 */
function moveDelta(editor, delta, anchor = false) {
	const currPos = editor.selection.active;
	const newPos = new vscode.Position(currPos.line + delta.lineDelta, currPos.character + delta.charDelta);
	editor.selection = new vscode.Selection(anchor ? editor.selection.anchor : newPos, newPos);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate,
};
