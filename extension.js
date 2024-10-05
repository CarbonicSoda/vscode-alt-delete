const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand("alt-delete.alt-backspace", await deleteFactory("backward")),
		vscode.commands.registerTextEditorCommand("alt-delete.alt-delete", await deleteFactory("forward")),
		vscode.commands.registerTextEditorCommand("alt-delete.alt-left", await moveFactory("backward")),
		vscode.commands.registerTextEditorCommand("alt-delete.alt-right", await moveFactory("forward")),
		vscode.commands.registerTextEditorCommand("alt-delete.alt-shift-left", await moveFactory("backward", true)),
		vscode.commands.registerTextEditorCommand("alt-delete.alt-shift-right", await moveFactory("forward", true)),
	);
}

/**
 * @param {"backward" | "forward"} mode
 * @returns {Promise<(editor: vscode.TextEditor) => Promise<void>>}
 */
async function deleteFactory(mode) {
	return async (/** @type {vscode.TextEditor} */ editor) => {
		const deleteRanges = [];
		for (let i = 0; i < editor.selections.length; i++) {
			const delta = await getDelta(editor, i, mode);
			deleteRanges[i] = await getDeleteRange(editor, i, delta);
		}
		await editor.edit(async (editBuilder) => {
			for (const deleteRange of deleteRanges) editBuilder.delete(deleteRange);
		});
	};
}

/**
 * @param {"backward" | "forward"} mode
 * @param {boolean} [anchor=false]
 * @returns {Promise<(editor: vscode.TextEditor) => Promise<void>>}
 */
async function moveFactory(mode, anchor = false) {
	return async (/** @type {vscode.TextEditor} */ editor) => {
		const selections = [];
		for (let i = 0; i < editor.selections.length; i++) {
			const delta = await getDelta(editor, i, mode);
			selections[i] = await getMovedSelection(editor, i, delta, anchor);
		}
		editor.selections = selections;
	};
}

/**
 * get delta for alt-functions shift distance
 * @param {vscode.TextEditor} editor
 * @param {number} selectionIndex
 * @param {"backward" | "forward"} mode
 * @returns {Promise<Delta>}
 */
async function getDelta(editor, selectionIndex, mode) {
	const backward = mode === "backward";

	const document = editor.document;
	const currPos = editor.selections[selectionIndex].active;
	const currLine = currPos.line;
	const currLineRange = document.lineAt(currLine).range;

	const editRange = new vscode.Range(currPos, backward ? currLineRange.start : currLineRange.end);
	const tmp = document.getText(editRange);
	if (tmp.length === 0) {
		if (backward && currLine > 0) return new Delta(document.lineAt(currLine - 1).text.length, -1);
		if (!backward && currLine < document.lineCount - 1) return new Delta(-document.lineAt(currLine).text.length, 1);
	}

	const text = backward ? tmp.trimEnd() : tmp.trimStart();
	if (!text) {
		if (backward) return new Delta(editRange.start.character - editRange.end.character);
		return new Delta(editRange.end.character - editRange.start.character);
	}

	const extraSpaceCnt = tmp.length - text.length;
	if ((await getCharClass(text.at(backward ? -1 : 0))) === CharClass.UPPER) {
		if (backward) return new Delta(-1 - extraSpaceCnt);
		if ((await getCharClass(text[1])) === CharClass.UPPER) return new Delta(1 + extraSpaceCnt);
	}

	if (backward) {
		let i = 1;
		while ((await getCharClass(text.at(-i - 1))) === (await getCharClass(text.at(-i))) && i < text.length) i++;
		if (
			(await getCharClass(text.at(-i - 1))) === CharClass.UPPER &&
			(await getCharClass(text.at(-i))) === CharClass.LOWER
		)
			i++;
		return new Delta(-i - extraSpaceCnt);
	} else {
		let i = (await getCharClass(text[0])) === CharClass.UPPER ? 1 : 0;
		while ((await getCharClass(text[i + 1])) === (await getCharClass(text[i])) && i < text.length - 1) i++;
		return new Delta(i + extraSpaceCnt + 1);
	}
}

// enum character classes
const CharClass = Object.freeze({
	UPPER: 0,
	LOWER: 1,
	DIGIT: 2,
	SPACE: 3,
	SYMBOL: 4,
});

/**
 * @param {string} char single character
 * @returns {Promise<any>} corresponding character class enumerated in {@link CharClass}
 */
async function getCharClass(char) {
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
 * returns delete range with original position of selectionIndex
 * @param {vscode.TextEditor} editor
 * @param {number} selectionIndex
 * @param {Delta} delta
 * @returns {Promise<vscode.Range>}
 */
async function getDeleteRange(editor, selectionIndex, delta) {
	const currPos = editor.selections[selectionIndex].active;
	return new vscode.Range(currPos, currPos.translate(delta.lineDelta, delta.charDelta));
}

/**
 * returns moved selection of selectionIndex
 * @param {vscode.TextEditor} editor
 * @param {number} selectionIndex
 * @param {Delta} delta
 * @param {boolean} [anchor=false]
 * @returns {Promise<vscode.Selection>}
 */
async function getMovedSelection(editor, selectionIndex, delta, anchor = false) {
	const currPos = editor.selections[selectionIndex].active;
	const newPos = new vscode.Position(currPos.line + delta.lineDelta, currPos.character + delta.charDelta);
	return new vscode.Selection(anchor ? editor.selection.anchor : newPos, newPos);
}

module.exports = {
	activate,
};
