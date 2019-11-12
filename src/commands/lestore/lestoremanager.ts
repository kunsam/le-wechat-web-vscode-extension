import * as fs from "fs";
import * as fse from "file-system";
import * as path from "path";
import * as vscode from "vscode";
import { ROOT_PATH, PROJECT_DIR } from "../../config";
import { pickFiles2Open } from "../../extensionUtil";
import { LeActionManager, LeTsCode } from "le-ts-code-tool";

const CACHE_PATH = path.join(
  ROOT_PATH,
  PROJECT_DIR,
  "/data-cache/leactionmanager-cache.json"
);

export default class LeStoreManager {
  loadConfig() {
    const configPath = path.join(ROOT_PATH, PROJECT_DIR, "/store_config.js");
    if (!fs.existsSync(configPath)) {
      vscode.window.showErrorMessage("未找到仓库配置文件");
      return;
    }
    return __non_webpack_require__(`${configPath}`);
  }

  private _leActionManager: LeActionManager;
  public reset() {
    const config = this.loadConfig();
    config.projectDirPath = ROOT_PATH;
    if (!this._leActionManager) {
      this._leActionManager = new LeActionManager(config, {
        useCache: true,
        loadCache: () => {
          if (fs.existsSync(CACHE_PATH)) {
            try {
              const json = __non_webpack_require__(`${CACHE_PATH}`);
              if (json) {
                return {
                  result: json,
                  hasCache: true
                };
              }
            } catch {}
          }
          return {
            result: {
              actionClass: [],
              connectOutStoreFields: []
            },
            hasCache: false
          };
        },
        writeCache: data => {
          fse.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
        }
      });
    } else {
      this._leActionManager.reset();
    }
  }

  loadProvider(actionClasses: LeTsCode.IAction[]) {
    class StoreCompletitionProvider implements vscode.CompletionItemProvider {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
      ): vscode.ProviderResult<
        vscode.CompletionItem[] | vscode.CompletionList
      > {
        return new Promise(resolve => {
          let items = [];
          actionClasses.forEach(action => {
            const item = new vscode.CompletionItem(
              "le_at:" + action.classData.name,
              vscode.CompletionItemKind.Class
            );
            item.detail = "Store-" + action.storeName;
            item.insertText = action.classData.name;
            items.push(item);
          });
          resolve(items);
        });
      }
    }
    return vscode.languages.registerCompletionItemProvider(
      [
        { scheme: "file", language: "typescript" },
        { scheme: "file", language: "javascript" },
        { scheme: "file", language: "javascriptreact" },
        { scheme: "file", language: "typescriptreact" }
      ],
      new StoreCompletitionProvider(),
      "leat"
    );
  }

  public run(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      this.loadProvider(this._leActionManager.actionClass)
    );
  }

  constructor() {
    this.reset();
  }

  public getManageFiledsLabelList() {
    const result = [];
    result.push({ label: "📮注册列表-----" });
    this._leActionManager.regiterStateFields.forEach(data => {
      result.push({
        label: "  " + data.name + "    📮",
        location: data.location
      });
    });
    result.push({ label: "📩入库列表-----" });
    this._leActionManager.enterstoreFields.forEach(data => {
      result.push({
        label: "  " + data.name + "    📩",
        location: data.location
      });
    });
    return result;
  }

  public getOutStoreFiledsLableList() {
    const result = [];
    result.push({ label: "📨出库列表-----" });
    this._leActionManager.connectStoreFields.forEach(data => {
      result.push({
        label: "  " + data.name + "    📨",
        location: data.location
      });
    });
    return result;
  }

  public queryManageFileds() {
    // 查看注册和入库列表
    pickFiles2Open(this.getManageFiledsLabelList(), false, "请输入字段名称");
  }

  public queryOutStoreFileds() {
    pickFiles2Open(this.getOutStoreFiledsLableList(), false, "请输入字段名称");
  }

  public queryAllFields() {
    pickFiles2Open(
      [
        ...this.getManageFiledsLabelList(),
        ...this.getOutStoreFiledsLableList()
      ],
      false,
      "请输入字段名称"
    );
  }
}
