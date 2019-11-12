import * as fs from "fs";
import * as fse from "file-system";
import * as path from "path";
import * as vscode from "vscode";
import { ROOT_PATH, PROJECT_DIR } from "../../config";
import { pickFiles2Open, GotoTextDocument } from "../../extensionUtil";
import { ShowFileParentsInPickDataNode } from "./type";
import {
  KRouterTree,
  LeTsCode,
  LeWechatWebUtil,
  FileImportUtil
} from "le-ts-code-tool";

const AllIMPORTS_CACHE_PATH = path.join(
  ROOT_PATH,
  PROJECT_DIR,
  "/data-cache/all_router_imports.json"
);

export default class RoutersCommand {
  public kRouterTree: KRouterTree;
  private _queryFilesResultCacheMap: Map<
    string,
    { result: ShowFileParentsInPickDataNode[]; lastQueryTime: number }
  > = new Map();

  loadRouters() {
    const results = LeWechatWebUtil.ResolveRouterConfig([
      "/Users/kunsam/Downloads/le-project/wechat-web/src/app/router/routerConfig.tsx"
    ]);
    return results;
  }

  async initKRouterTree() {
    function getCacheAllImports() {
      if (fs.existsSync(AllIMPORTS_CACHE_PATH)) {
        const allImports: LeTsCode.FileImportResultWithClass[] = __non_webpack_require__(
          `${AllIMPORTS_CACHE_PATH}`
        );
        return allImports;
      }
      return undefined;
    }
    const cacheImports = getCacheAllImports();
    this.kRouterTree = new KRouterTree(this.loadRouters(), {
      projectDirPath: ROOT_PATH,
      getCacheAllImports: () => cacheImports,
      writeCacheAllImports: (
        allImports: LeTsCode.FileImportResultWithClass[]
      ) => {
        fse.writeFileSync(
          AllIMPORTS_CACHE_PATH,
          JSON.stringify(allImports, null, 2)
        );
      }
    });
    if (cacheImports) {
      await this.kRouterTree.initQueryMap();
    } else {
      vscode.window
        .withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "首次计算中...",
            cancellable: true
          },
          (_, token) => {
            token.onCancellationRequested(() => {
              console.log("User canceled the long running operation");
            });
            var p = new Promise(resolve => {
              this.kRouterTree.initQueryMap().then(() => {
                resolve();
              });
            });
            return p;
          }
        )
        .then(() => {
          vscode.window.showInformationMessage("激活成功!");
        });
    }
  }

  constructor(context: vscode.ExtensionContext) {
    this.initCommands(context);
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeWechatWebPlugin.activeRouterManager",
        () => {
          if (!ROOT_PATH.includes("/wechat-web")) {
            return;
          }
          if (this.kRouterTree) {
            return;
          }
          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "初始化中..."
            },
            () => {
              return new Promise(resolve => {
                this.initKRouterTree().then(() => {
                  resolve();
                });
              });
            }
          );
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeWechatWebPlugin.refreshRouterManager",
        () => {
          this.kRouterTree = undefined;
          this.initKRouterTree();
        }
      )
    );
  }

  initCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeWechatWebPlugin.showFileParentsInPick",
        async () => {
          if (!this.kRouterTree) {
            await vscode.commands.executeCommand(
              "LeWechatWebPlugin.activeRouterManager"
            );
          }

          const uri = vscode.window.activeTextEditor.document.uri;
          if (!uri) {
            vscode.window.showInformationMessage("不存在打开的文档");
            return;
          }
          const getResults = () => {
            const currentTime = new Date().getTime();
            const cacheResult = this._queryFilesResultCacheMap.get(uri.fsPath);
            if (cacheResult) {
              const deltaMinute =
                (currentTime - cacheResult.lastQueryTime) / (1000 * 60);
              if (deltaMinute < 30) {
                this._queryFilesResultCacheMap.delete(uri.fsPath);
              } else {
                if (cacheResult.result.length) {
                  return cacheResult.result;
                }
              }
            }
            const result = this.getFilesParentsResultShowInPick(uri);
            this._queryFilesResultCacheMap.set(uri.fsPath, {
              result,
              lastQueryTime: new Date().getTime()
            });
            return result;
          };
          const result = getResults();
          pickFiles2Open(
            result.map(r =>
              r.labelOnly
                ? { label: r.label, target: path.join(ROOT_PATH, r.path) }
                : {
                    target: path.join(ROOT_PATH, r.path),
                    label: `${new Array(r.depth).fill("    ").join("")}➡️${
                      r.path
                    }`
                  }
            ),
            false
          );
        }
      )
    );
    // 右键菜单 getFileAppUrl
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeWechatWebPlugin.getFileAppUrl",
        async (uri: vscode.Uri) => {
          if (!this.kRouterTree) {
            await vscode.commands.executeCommand(
              "LeWechatWebPlugin.activeRouterManager"
            );
          }
          const routers = this.kRouterTree.queryFileAppUrl(uri.fsPath);
          if (routers) {
            vscode.env.clipboard.writeText(
              routers.map(r => "https://localhost:3000" + r).join("\n")
            );
            vscode.window.showInformationMessage("复制成功");
          } else {
            vscode.window.showInformationMessage("暂无结果");
          }
        }
      )
    );
    // 快捷键搜索
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "LeWechatWebPlugin.SearchRouter",
        async () => {
          if (!this.kRouterTree) {
            await vscode.commands.executeCommand(
              "LeWechatWebPlugin.activeRouterManager"
            );
          }
          const result: any = await vscode.window.showQuickPick(
            this.kRouterTree
              .getFlatternRouters()
              .map((r: LeTsCode.KRouter) => ({
                label: r.path
              })),
            {
              placeHolder: "请输入 pathname"
            }
          );
          if (result && result.label) {
            const componentRelativePath = this.kRouterTree.queryComponentRelativePathByPath(
              result.label
            );
            if (componentRelativePath) {
              const filePath = FileImportUtil.getFileAbsolutePath(
                componentRelativePath,
                ROOT_PATH,
                true
              );
              GotoTextDocument(filePath);
            }
          }
        }
      )
    );
  }

  getFilesParentsResultShowInPick(uri: vscode.Uri) {
    const parents = this.kRouterTree.getFileNodeParentsFlow(uri.fsPath);
    const validFlows = parents.filter(p => p.length > 1);
    let result: ShowFileParentsInPickDataNode[] = [];
    validFlows.forEach((flow, index) => {
      flow.forEach((parent, pindex) => {
        if (pindex === 0) {
          result.push({
            depth: 0,
            labelOnly: true,
            path: "/" + parent.relativePath,
            label: `${index + 1}. -----------`
          });
        } else {
          result.push({
            depth: pindex,
            path: parent.relativePath
          });
        }
      });
    });
    return result;
  }
}
