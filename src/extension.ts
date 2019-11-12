"use strict";
import * as vscode from "vscode";
import { selectText } from "./select";
import { toLower, upperFirst } from "lodash";
import RoutersCommand from "./commands/router";
import { ActionClassCoder } from "le-ts-code-tool";
import LeStoreManager from "./commands/lestore/lestoremanager";
import { PluginTreeDataProvider } from "./treeprovider";

export async function activate(context: vscode.ExtensionContext) {
  vscode.window.createTreeView("LeWechatWebPlugin", {
    treeDataProvider: new PluginTreeDataProvider([
      {
        text: "welcome"
      }
    ]),
    showCollapseAll: true
  });

  new RoutersCommand(context);

  // 菜单右键 获取ActionReducerClass
  vscode.commands.registerCommand(
    "LeWechatWebPlugin.store.getActionClass",
    () => {
      const text = selectText({ includeBrack: false });
      if (text) {
        const splited = text
          .replace(/\_/g, ":")
          .split(":")
          .map(t => upperFirst(toLower(t)))
          .concat(["Action"]);
        splited.shift();
        const className = splited.join("");
        vscode.env.clipboard
          .writeText(`export class ${className} extends AppAction {
        static id = '${text}'
        reducer: AppReducer<{ field: any }> = function (state, action) {
          return {
          }
        }
      }
      StoreName.registerAction(${className})
      `);
      }
    }
  );

  // 菜单右键 获取 getActionClassByQueryString
  vscode.commands.registerCommand(
    "LeWechatWebPlugin.store.getActionClassByQueryString",
    () => {
      const qltext = selectText({
        includeBrack: false,
        disableOpenCloseBrack: true
      });
      const text = ActionClassCoder.getActionClassByQueryString(qltext);
      vscode.env.clipboard.writeText(text).then(() => {
        vscode.window.showInformationMessage("成功复制到剪切板");
      });
    }
  );
  vscode.commands.registerCommand(
    "LeWechatWebPlugin.store.getActionClassByQueryStringSimple",
    () => {
      const qltext = selectText({
        includeBrack: false,
        disableOpenCloseBrack: true
      });
      const text = ActionClassCoder.getActionClassSimpleByQueryString(qltext);
      console.log(text, qltext, "text");
      vscode.env.clipboard.writeText(text).then(() => {
        vscode.window.showInformationMessage("成功复制到剪切板");
      });
    }
  );
  class ActionCompletitionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(): vscode.ProviderResult<
      vscode.CompletionItem[] | vscode.CompletionList
    > {
      return new Promise(resolve => {
        const item = new vscode.CompletionItem(
          "le_at_generate: " + "AppAction",
          vscode.CompletionItemKind.Class
        );
        item.detail = "LeTote New Action";
        item.insertText = ActionClassCoder.getActionClassSimpleByQueryString(
          ""
        );
        resolve([item]);
      });
    }
  }
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      [
        { scheme: "file", language: "typescript" },
        { scheme: "file", language: "javascript" },
        { scheme: "file", language: "javascriptreact" },
        { scheme: "file", language: "typescriptreact" }
      ],
      new ActionCompletitionProvider(),
      "leatg"
    )
  );

  let leStoreManager: LeStoreManager | undefined;
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "LeWechatWebPlugin.activeStoreManager",
      () => {
        if (leStoreManager) return;
        try {
          leStoreManager = new LeStoreManager();
          leStoreManager.run(context);
          context.subscriptions.push(
            vscode.commands.registerCommand(
              "LeWechatWebPlugin.queryStoreManagedFields",
              () => {
                leStoreManager.queryManageFileds();
              }
            )
          );
          context.subscriptions.push(
            vscode.commands.registerCommand(
              "LeWechatWebPlugin.queryStoreConnectOutFields",
              () => {
                leStoreManager.queryOutStoreFileds();
              }
            )
          );
          context.subscriptions.push(
            vscode.commands.registerCommand(
              "LeWechatWebPlugin.queryStoreAllFields",
              () => {
                leStoreManager.queryAllFields();
              }
            )
          );
          vscode.window.showInformationMessage("激活Le-Store仓库管理");
        } catch (e) {
          console.log(e, "registedActions");
        }
      }
    )
  );
  vscode.commands.registerCommand(
    "LeWechatWebPlugin.refreshStoreManager",
    () => {
      if (!leStoreManager) {
        vscode.window.showInformationMessage("请先激活Le-Store仓库管理");
        return;
      }
      leStoreManager.reset();
    }
  );
}
