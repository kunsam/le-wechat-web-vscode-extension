

import * as vscode from "vscode";
import * as path from "path";
import { selectText } from "../select";
import { getFileAbsolutePath, GotoTextDocument } from "../extensionUtil";

export default class KeybindingCommands {

	constructor(_: vscode.ExtensionContext) {
		this.init()
	}

	init() {
		// 选中括号/引号内
		vscode.commands.registerCommand("extension.selectBracket", () => {
			selectText({ includeBrack: false });
		})
		// 跳转相对路径
		vscode.commands.registerCommand("kReactCodeTree.gotoRelative", () => {
			const text = selectText({ includeBrack: false })
			const trueFsPath = getFileAbsolutePath(text)
			GotoTextDocument(trueFsPath)
		})



	}
}