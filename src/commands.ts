import * as vscode from 'vscode';
import * as pars   from './parse';
import { getLog } from './utils';
const { log, start, end } = getLog('cmds');

export async function insertComments() {
  const editor   = vscode.window.activeTextEditor;  
  if(!editor) return;
  const doc      = editor.document;
  const fileName = doc.fileName.toLowerCase();
  if (!(fileName.endsWith(".js") || fileName.endsWith(".ts"))) {
    vscode.window.showInformationMessage("Not a JS/TS file.");
    return;
  }
  const code = doc.getText();
  const funcs = await pars.parseCode(code, editor.document.uri.fsPath, doc);
  
  log(funcs);
};

export async function removeComments() {

}

export async function jumpNext() {

}

export async function jumpPrev() {

}
