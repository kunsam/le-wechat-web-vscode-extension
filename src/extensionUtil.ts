import * as vscode from "vscode";
import { FileImportUtil } from "le-ts-code-tool";
import { ROOT_PATH } from "./config";

/**
 * vscode打开文件[绝对路径]
 *
 * @export
 * @param {string} trueFsPath
 */
export function GotoTextDocument(trueFsPath: string, location?: any) {
  if (!trueFsPath) {
    vscode.window.showInformationMessage(`不存在打开路径`);
  } else {
    try {
      vscode.workspace.openTextDocument(trueFsPath).then(doc => {
        vscode.window.showTextDocument(doc).then(editor => {
          if (location) {
            const newSelection = new vscode.Selection(
              new vscode.Position(
                location.range.start.line,
                location.range.start.character
              ),
              new vscode.Position(
                location.range.end.line,
                location.range.end.character
              )
            );
            editor.selection = newSelection;
            editor.revealRange(newSelection);
          }
        });
      });
    } catch (e) {
      vscode.window.showInformationMessage(`无法打开${trueFsPath}`);
    }
  }
}

/**
 * vscode pick 文件列表并打开选中文件 [绝对路径]
 *
 * @export
 * @param {string[]} files
 */
export function pickFiles2Open(
  files: { label: string; target?: string; location?: any }[],
  isOpenFirst = true,
  placeHolder = "请选择打开的文件"
) {
  if (!files.length) {
    vscode.window.showInformationMessage("暂无结果");
    return;
  }
  if (files.length === 1 && isOpenFirst) {
    if (files[0].location) {
      GotoTextDocument(
        FileImportUtil.getFileAbsolutePath(
          files[0].location.filePath,
          ROOT_PATH,
          false
        ),
        files[0].location
      );
    }
    GotoTextDocument(
      FileImportUtil.getFileAbsolutePath(files[0].target, ROOT_PATH, false)
    );
  } else {
    if (files.length) {
      vscode.window
        .showQuickPick(files, {
          placeHolder
        })
        .then(result => {
          if (result && result.location) {
            GotoTextDocument(
              FileImportUtil.getFileAbsolutePath(
                result.location.filePath,
                ROOT_PATH,
                false
              ),
              result.location
            );
          }
          if (result && result.target) {
            GotoTextDocument(
              FileImportUtil.getFileAbsolutePath(
                result.target,
                ROOT_PATH,
                false
              )
            );
          }
        });
    }
  }
}
