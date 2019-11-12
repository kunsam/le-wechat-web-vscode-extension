import * as vscode from "vscode";
import { LeTsCode } from "le-ts-code-tool";

export const PROJECT_DIR = "/.le_wechat_plugin";

export const ROOT_PATH: string = vscode.workspace.workspaceFolders[0].uri.path;

export const STORE_MANAGER_CONFIG: LeTsCode.FileNamesOption = {
  projectDirPath: ROOT_PATH,
  action: {
    folderPath: "src/app/actions/next",
    exclude: []
  },
  reducer: {
    folderPath: "src/app/reducers/next",
    exclude: []
  },
  query: {
    folderPath: "src/app/queries/next",
    exclude: []
  },
  connectComponents: {
    folderPaths: ["src/app/components", "src/app/containers"]
  }
};
