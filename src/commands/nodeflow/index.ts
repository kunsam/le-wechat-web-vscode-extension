
import * as fs from 'fs'
import * as vscode from "vscode";
import { KC_Node } from "../../type";
import NodeFlowsUtil from "./nodeFlowsUtil";
import { NodeFlowsView } from "./nodeFlowsView";



export default class NodeFlowCommands {

	constructor(context: vscode.ExtensionContext) {
		this.init(context)
	}

	init(context) {
		const nodeFlowsView = new NodeFlowsView();
		vscode.commands.registerCommand("kReactCodeTree.refresh", () => {
			vscode.window.showInformationMessage(`kReactCodeTree called refresh.`);
			nodeFlowsView.reset();
		});

		// 需要左边 kReactCodeTree 面板打开才执行
		context.subscriptions.push(vscode.commands.registerCommand(
			"extension.getKReactNodeCode",
			async () => {
				const editor = vscode.window.activeTextEditor;
				const node = await NodeFlowsUtil.getEditorCursorKReactFlowNode(editor)
				if (node) {
					vscode.env.clipboard.writeText(JSON.stringify({ ...node, filePattern: node.filePattern }, null, 2))
					vscode.window.showInformationMessage(`Successfully wrote into clipboard.`)
				} else {
					vscode.window.showErrorMessage(`Get KReact Node Code failed`)
				}
			}
		));

		// kReactCodeTree.editNode
		context.subscriptions.push(vscode.commands.registerCommand("kReactCodeTree.editNode", async (selectedNode: KC_Node) => {
			if (!selectedNode) {
				return
			}
			const data = nodeFlowsView.treeDataProvider.topRequirePath(selectedNode);
			vscode.workspace.openTextDocument(data.requirePath).then(doc => {
				vscode.window.showTextDocument(doc).then(editor => {
					const line = NodeFlowsUtil.findNodeLine(selectedNode, doc);
					if (line !== null) {
						var newSelection = new vscode.Selection(new vscode.Position(line, 0), new vscode.Position(line, 0));
						editor.selection = newSelection;
						editor.revealRange(new vscode.Range(newSelection.anchor, newSelection.active))
					}
				})
			})
		}));

		context.subscriptions.push(vscode.commands.registerCommand("kReactCodeTree.insertIn", async (selectedNode: KC_Node) => {
			const editor = vscode.window.activeTextEditor;
			const node = await NodeFlowsUtil.getEditorCursorKReactFlowNode(editor)
			if (!selectedNode) {
				return
			}
			if (!node) {
				vscode.window.showInformationMessage(`当前光标位置无效，请在文档中选择一个位置`)
				return;
			}
			if (!selectedNode.children) {
				selectedNode.children = []
			}
			selectedNode.children.push(node)
			const data = nodeFlowsView.treeDataProvider.topRequirePath(selectedNode);
			try {
				let text = `\nmodule.exports = ${JSON.stringify(data.nodes.map(n => NodeFlowsUtil.dump(n)), null, 2)}`
				fs.writeFile(data.requirePath, text, () => {
					nodeFlowsView.refresh()
					vscode.window.showInformationMessage('更新成功')
				})
			} catch (e) {
				console.log(e, 'errrrr')
			}
		}));

		context.subscriptions.push(vscode.commands.registerCommand("kReactCodeTree.insertAfter", async (selectedNode: KC_Node) => {
			const editor = vscode.window.activeTextEditor;
			const node = await NodeFlowsUtil.getEditorCursorKReactFlowNode(editor)
			if (!selectedNode) {
				return
			}
			if (!node) {
				vscode.window.showInformationMessage(`当前光标位置无效，请在文档中选择一个位置`)
				return;
			}
			nodeFlowsView.treeDataProvider.addChild(node, selectedNode);
			const data = nodeFlowsView.treeDataProvider.topRequirePath(selectedNode);
			try {
				let text = `\nmodule.exports = ${JSON.stringify(data.nodes.map(n => NodeFlowsUtil.dump(n)), null, 2)}`
				fs.writeFile(data.requirePath, text, () => {
					nodeFlowsView.refresh()
					vscode.window.showInformationMessage('更新成功')
				})
			} catch (e) {
				console.log(e, 'errrrr')
			}

		}));
	}

}