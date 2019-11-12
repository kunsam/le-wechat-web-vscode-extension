import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { ROOT_PATH } from "./config";

/**
 * 获取文件绝对路径
 *
 * @export
 * @param {string} filePath
 * @param {boolean} [isRelative=true]
 * @returns
 */
export function getFileAbsolutePath(filePath: string, isRelative = true) {
  // 没带后缀
  let fsPath = isRelative
    ? path.resolve(path.join(ROOT_PATH, filePath))
    : filePath;
  fsPath = fsPath.replace(/\'|\"/g, "");
  let trueFsPath = "";
  // console.log(fsPath, fs.existsSync(fsPath), "fs.existsSync(fsPath)");
  // /Users/kunsam/Downloads/le-project/wechat-web/src/app/components/customer_photos/customer_photos_in_home/item.jsx
  if (fs.existsSync(fsPath)) {
    if (fs.statSync(fsPath).isDirectory()) {
      let NoneJSIndexes = [];
      fs.readdirSync(fsPath).forEach(f => {
        if (f.includes("index")) {
          if (/\.(jsx?|tsx?)$/g.test(f)) {
            trueFsPath = path.join(fsPath, f);
          } else {
            NoneJSIndexes.push(path.join(fsPath, f));
          }
        }
      });
      if (!trueFsPath && NoneJSIndexes.length) {
        NoneJSIndexes.forEach(indexPath => {
          if (/\.(s?css|less|sass)$/g.test(indexPath)) {
            trueFsPath = indexPath;
          }
        });
      }
    } else {
      trueFsPath = fsPath;
    }
  } else {
    // 可能是由没带后缀引起的
    const dirName = path.dirname(fsPath);
    if (fs.existsSync(dirName)) {
      fs.readdirSync(dirName).every(f => {
        // 只判断这两种类型
        if (/\.(jsx?|tsx?)$/g.test(f)) {
          if (f.split(".")[0] === path.basename(fsPath)) {
            if (!fs.statSync(path.join(dirName, f)).isDirectory()) {
              trueFsPath = path.join(dirName, f);
            }
          }
        }
        return !trueFsPath;
      });
    }
  }
  return trueFsPath;
}
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
        getFileAbsolutePath(files[0].location.filePath, false),
        files[0].location
      );
    }
    GotoTextDocument(getFileAbsolutePath(files[0].target, false));
  } else {
    if (files.length) {
      vscode.window
        .showQuickPick(files, {
          placeHolder
        })
        .then(result => {
          if (result && result.location) {
            GotoTextDocument(
              getFileAbsolutePath(result.location.filePath, false),
              result.location
            );
          }
          if (result && result.target) {
            GotoTextDocument(getFileAbsolutePath(result.target, false));
          }
        });
    }
  }
}
