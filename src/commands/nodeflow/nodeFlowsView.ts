import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import NodeFlowsUtil from "./nodeFlowsUtil";
import { KC_Node, KC_NODE_ICON_TYPE } from "../../type";
import { ROOT_PATH, PROJECT_DIR } from "../../config";

const CONFIG_FILE_ABS_PATH = path.join(
  ROOT_PATH,
  PROJECT_DIR,
  "/workflows/index.js"
);

function _getSymbols(
  data: KC_Node,
  symbols: string[],
  currentIndex: number,
  lastResults: vscode.SymbolInformation[],
  results: vscode.SymbolInformation[],
  doc?: vscode.TextDocument
): Promise<vscode.SymbolInformation[]> {
  return new Promise(res => {
    function filterResultsByFilePattern(symbols: vscode.SymbolInformation[]) {
      return (
        (data.filePattern &&
          symbols.filter(r =>
            r.location.uri.path.includes(data.filePattern)
          )) ||
        symbols
      );
    }

    function handleSearchSymbolResult(
      result: vscode.SymbolInformation[]
    ): Promise<vscode.SymbolInformation[]> {
      return new Promise(promiseRes => {
        let filterResult = filterResultsByFilePattern(result).filter(r => {
          // 过滤掉相关符号
          const equivalentName = r.name.replace(/\(|\)|\{|\}|\[|\]/g, "");
          // console.log(r.name, equivalentName, symbols[currentIndex], 'equivalentNameequivalentName')
          return equivalentName === symbols[currentIndex];
        });
        if (symbols[currentIndex + 1]) {
          _getSymbols(
            data,
            symbols,
            currentIndex + 1,
            filterResult,
            results
          ).then(d => promiseRes(d));
        } else {
          results = results.concat(filterResult);
          promiseRes(results);
        }
      });
    }

    if (currentIndex === 0) {
      // executeDocumentSymbolProvider not work
      vscode.commands
        .executeCommand(
          "vscode.executeWorkspaceSymbolProvider",
          symbols[currentIndex]
        )
        .then((result: vscode.SymbolInformation[]) => {
          if (doc) {
            // 筛选filePattern指定的文件来源
            result = result.filter(r => r.location.uri.path === doc.uri.path);
          }
          handleSearchSymbolResult(result).then(r => res(r));
        });
      return;
    } else {
      const lastResultsMap = {};
      lastResults.forEach(s => {
        if (s.name) {
          const equivalentName = s.name.replace(/\(|\)|\{|\}|\[|\]/g, "");
          lastResultsMap[equivalentName] = true;
        }
      });
      lastResults.forEach(() => {
        vscode.commands
          .executeCommand(
            "vscode.executeWorkspaceSymbolProvider",
            symbols[currentIndex]
          )
          .then((result: vscode.SymbolInformation[]) => {
            // console.log(currentIndex, lastResultsMap, result, 'lastResultsMap executeWorkspaceSymbolProvider')
            handleSearchSymbolResult(
              result.filter(r => lastResultsMap[r.containerName])
            ).then(r => res(r));
          });
      });
      return;
    }
  });
}

function getBestMatchingSymbol(
  data: KC_Node,
  doc?: vscode.TextDocument
): Thenable<vscode.SymbolInformation[]> {
  // let onlyResult: vscode.SymbolInformation | undefined = undefined;
  return new Promise(res => {
    if (!data.symbol) {
      res([]);
      return;
    }
    if (data.symbol) {
      const symbols = data.symbol.split(".");
      _getSymbols(data, symbols, 0, [], [], doc).then(symbolResults => {
        if (data.textPattern) {
          const pureText = data.textPattern.split("#")[0];
          const textPatternLineNumber = data.textPattern.split("#")[1];
          const textPatternLine =
            textPatternLineNumber !== undefined
              ? parseInt(textPatternLineNumber)
              : 1;
          symbolResults = symbolResults.filter(async sr => {
            const doc = await vscode.workspace.openTextDocument(
              sr.location.uri
            );
            const startLine = sr.location.range.start.line;
            const endLine = sr.location.range.end.line;
            let count = 1;
            for (let i = startLine; i <= endLine; i++) {
              const text = doc.lineAt(i).text;
              const textIndex = text.indexOf(pureText);
              if (textIndex >= 0) {
                if (count === textPatternLine) {
                  sr.location.range = sr.location.range.with(
                    new vscode.Position(i, textIndex),
                    new vscode.Position(i, textIndex + text.length)
                  );
                  return true;
                } else {
                  count++;
                }
              }
            }
            return false;
          });
          // console.log(data.textPattern, symbolResults, 'data.textPattern symbolResults')
        }
        res(symbolResults);
      });
    }
  });
}

export class NodeFlowsView {
  private _view: vscode.TreeView<KC_Node>;
  private _treeDataProvider: KReactCodeTree;

  constructor() {
    this._initNodeFlowsView();
  }

  private async _initNodeFlowsView() {
    let workflows = [];
    if (!fs.existsSync(CONFIG_FILE_ABS_PATH)) {
      workflows = [
        {
          text: `暂无数据`,
          children: [
            {
              text: `按文档格式添加:${path.join(
                PROJECT_DIR,
                "workflows/index.js"
              )}`
            }
          ]
        }
      ];
    } else {
      workflows = __non_webpack_require__(`${CONFIG_FILE_ABS_PATH}`);
      delete __non_webpack_require__.cache[
        __non_webpack_require__.resolve(`${CONFIG_FILE_ABS_PATH}`)
      ];
    }

    this._treeDataProvider = new KReactCodeTree(workflows);

    this._view = vscode.window.createTreeView("kReactCodeTree", {
      treeDataProvider: this._treeDataProvider,
      showCollapseAll: true
    });
    this._view.onDidChangeSelection(e => {
      e.selection.forEach(data => {
        if (data.children && data.children.length) return;
        if (data.location) {
          this._showlocatedDoc(data.location);
          return;
        }
        // 如果有filePattern 先加载这个fileDocument
        if (data.filePattern) {
          vscode.workspace.findFiles(data.filePattern).then(files => {
            // console.log(files, "findFiles");
            if (files.length > 1) {
              vscode.window.showInformationMessage(
                `filePattern对应了多个文件，请确定唯一性`
              );
              return;
            }
            if (!files.length) {
              vscode.window.showErrorMessage(
                `未找到filePattern对应文件 ${data.filePattern}`
              );
              getBestMatchingSymbol(data).then(results => {
                this._showMatchedSymbols(data, results, ROOT_PATH);
              });
            } else {
              const file = files[0];
              vscode.workspace.openTextDocument(file).then(doc => {
                getBestMatchingSymbol(data, doc).then(results => {
                  // 仅有 filepattern结果
                  if (!results.length) {
                    vscode.window.showTextDocument(doc);
                  } else {
                    this._showMatchedSymbols(data, results, ROOT_PATH);
                  }
                });
              });
            }
          });
        } else {
          getBestMatchingSymbol(data).then(results => {
            this._showMatchedSymbols(data, results, ROOT_PATH);
          });
        }
      });
    });
  }

  public get treeDataProvider() {
    return this._treeDataProvider;
  }
  public refresh() {
    this._treeDataProvider.refresh();
  }

  public reset() {
    this._initNodeFlowsView();
  }

  private _showlocatedDoc(location: vscode.Location) {
    vscode.workspace.openTextDocument(location.uri).then(doc => {
      vscode.window.showTextDocument(doc).then(editor => {
        editor.revealRange(location.range);
        // var newPosition = position.with(position.line, 0);
        var newSelection = new vscode.Selection(
          location.range.start,
          location.range.end
        );
        editor.selection = newSelection;
      });
    });
  }

  // 用一种封装的Node
  private _showMatchedSymbols(
    data: KC_Node,
    symbolResults: vscode.SymbolInformation[],
    rootPath: string
  ) {
    // 更新节点
    if (!data.children) data.children = [];
    symbolResults.forEach(sr => {
      // 暂时没封装 addChild
      data.children.push({
        text: `${sr.name} - ${path.relative(rootPath, sr.location.uri.path)}`,
        location: sr.location,
        parent: data,
        iconType: KC_NODE_ICON_TYPE.result
      });
    });
    this._treeDataProvider.refresh();
    this._view.reveal(data.children[0], {
      select: false,
      expand: true,
      focus: true
    });
    if (symbolResults.length === 1) {
      this._showlocatedDoc(symbolResults[0].location);
    }
  }
}

export class KReactCodeTree implements vscode.TreeDataProvider<KC_Node> {
  private _tree: KC_Node[];
  private _onDidChangeTreeData: vscode.EventEmitter<
    KC_Node | undefined
  > = new vscode.EventEmitter<KC_Node | undefined>();
  readonly onDidChangeTreeData: vscode.Event<KC_Node | undefined> = this
    ._onDidChangeTreeData.event;

  constructor(tree: KC_Node[]) {
    tree.forEach(ct => {
      this._initTree(ct);
    });
    this._tree = tree;
  }
  private _initTree(element: KC_Node) {
    if (!element.iconType) {
      if (element.children && element.children.length) {
        element.iconType = KC_NODE_ICON_TYPE.node;
      } else {
        if (element.symbol) {
          element.iconType = KC_NODE_ICON_TYPE.node;
        } else {
          if (element.filePattern) {
            element.iconType = KC_NODE_ICON_TYPE.file;
          } else {
            element.iconType = KC_NODE_ICON_TYPE.text;
          }
        }
      }
    }

    if (element.requirePath) {
      // __kReactCodeTree__/workflows
      const truePath = path.join(
        ROOT_PATH,
        PROJECT_DIR,
        "/workflows",
        element.requirePath
      );
      try {
        element.children = __non_webpack_require__(`${truePath}`);
        delete __non_webpack_require__.cache[
          __non_webpack_require__.resolve(`${truePath}`)
        ];
      } catch {
        vscode.window.showErrorMessage(`${truePath}有误`);
      }
    }
    if (element.children && element.children.length) {
      element.children.forEach(c => {
        c.parent = element;
        this._initTree(c);
      });
    }
  }

  public addChild(element: KC_Node, selectedNode?: KC_Node) {
    let queue = this._tree;
    if (selectedNode.parent) {
      if (!selectedNode.parent.children) {
        selectedNode.parent.children = [];
      }
      queue = selectedNode.parent.children;
    }
    const findIndex = queue.findIndex(c =>
      NodeFlowsUtil.isElementEqual(c, selectedNode)
    );
    if (findIndex >= 0) {
      queue.splice(findIndex + 1, 0, element);
    } else {
      queue.push(element);
    }
  }
  public topRequirePath(element: KC_Node) {
    let topParent = element;
    if (!element.parent) {
      return {
        nodes: this._tree,
        requirePath: CONFIG_FILE_ABS_PATH
      };
    }
    while (topParent.parent && !topParent.requirePath) {
      topParent = topParent.parent;
    }
    if (!topParent.parent && topParent.requirePath) {
      return {
        nodes: topParent.children,
        requirePath: topParent.requirePath
      };
    } else {
      return {
        nodes: this._tree,
        requirePath: CONFIG_FILE_ABS_PATH
      };
    }
  }

  public getChildren(element: KC_Node) {
    if (!element) return this._tree;
    return element.children || [];
  }
  public getTreeItem(element: KC_Node): vscode.TreeItem {
    return {
      label: element.text,
      // tooltip: '1',
      ...this._getIconPath(
        element.children && element.children.length
          ? KC_NODE_ICON_TYPE.node
          : element.iconType
      ),
      collapsibleState:
        element.children && element.children.length
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
    };
  }
  public getParent(element: KC_Node) {
    return element.parent;
  }
  public refresh() {
    this._onDidChangeTreeData.fire();
  }
  private _getIconPath(iconType?: KC_NODE_ICON_TYPE) {
    switch (iconType) {
      default: {
        return {};
      }
      case KC_NODE_ICON_TYPE.node: {
        return {
          iconPath: {
            light: `${path.join(
              __filename,
              "..",
              "..",
              "resources",
              "light",
              "node.svg"
            )}`,
            dark: `${path.join(
              __filename,
              "..",
              "..",
              "resources",
              "dark",
              "node.svg"
            )}`
          }
        };
      }
      case KC_NODE_ICON_TYPE.text: {
        return {
          iconPath: {
            light: `${path.join(
              __filename,
              "..",
              "..",
              "resources",
              "light",
              "text.svg"
            )}`,
            dark: `${path.join(
              __filename,
              "..",
              "..",
              "resources",
              "dark",
              "text.svg"
            )}`
          }
        };
      }
      case KC_NODE_ICON_TYPE.result: {
        return {
          iconPath: {
            light: path.join(
              __filename,
              "..",
              "..",
              "resources",
              "light",
              "gou.svg"
            ),
            dark: path.join(
              __filename,
              "..",
              "..",
              "resources",
              "dark",
              "gou.svg"
            )
          }
        };
      }
      case KC_NODE_ICON_TYPE.file: {
        return {
          iconPath: {
            light: path.join(
              __filename,
              "..",
              "..",
              "resources",
              "light",
              "document.svg"
            ),
            dark: path.join(
              __filename,
              "..",
              "..",
              "resources",
              "dark",
              "document.svg"
            )
          }
        };
      }
    }
  }
}

export class KReactCodeTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return `${this.label}-${this.version}`;
  }

  get description(): string {
    return this.version;
  }

  iconPath = {
    light: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "light",
      "dependency.svg"
    ),
    dark: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "dark",
      "dependency.svg"
    )
  };

  contextValue = "dependency";
}
