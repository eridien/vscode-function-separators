import * as vscode from 'vscode';
import * as parse  from './parse';
import * as lang   from './languages';
import {sett}      from './settings';
import { getLog }  from './utils';
const { log, start, end } = getLog('cmds');

export async function insertComments() {
  const editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  const doc      = editor.document;
  const fileName = doc.fileName.toLowerCase();
  const sfx      = fileName.slice(fileName.lastIndexOf('.'));
  if (!lang.extensionsSupported.has(sfx)) {
    log('info', `Function Separators: ${sfx} language not supported`);
    return;
  }
  await removeComments();
  const funcs = await parse.parseCode(doc);
  for(const func of funcs) {
    const posStart      = doc.positionAt(func.startBody);
    const funcLineStart = posStart.line;
    if(funcLineStart < 1) continue;
    const posEnd      = doc.positionAt(func.endBody);
    const funcLineEnd = posEnd.line;
    if(funcLineEnd < (funcLineStart + sett.minFuncHeight)) continue;
    log(`checking ${func.name} for comment at line ${funcLineStart+1}`);
    const prevLineText = doc.lineAt(funcLineStart-1).text;
    function escapeRegex(str: unknown): string {
      return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    const lineComment = escapeRegex(lang.langs.lineComment);
    const lineCommentRegex = new RegExp(String.raw`^\s*${lineComment}`);
    const openComment = escapeRegex(lang.langs.openComment);
    const openCommentRegex = new RegExp(String.raw`^(?=.*\\\*)(?!.*${openComment}).*`);
    const closeComment = escapeRegex(lang.langs.closeComment);
    const closeCommentRegex = new RegExp(String.raw`^\s*${closeComment}`);
    if(/^\s*\/\//               .test(prevLineText) || // has // comment
       /^(?=.*\\\*)(?!.*\*\/).*/.test(prevLineText) || // has /* comment
       /^(?!.*\/\*).*?\*\/.*/   .test(prevLineText))   // has */ comment
      continue;
    let lineNum;
    for(lineNum = funcLineStart - 1; lineNum >= 0; lineNum--) {
      const lineText = doc.lineAt(lineNum).text.trim();
      if(lineText.length > 0) break;
    }
    const firstOldBlankLineNum = lineNum + 1;
    const commentLineNum       = funcLineStart - sett.blankLinesBelow - 1;
    log(`Inserting ${func.name} comment at line ${
                     commentLineNum+1} for func at line ${funcLineStart+1}`);

    let commentLineText = `// === ${func.name} ===`;

    const start = new vscode.Position(firstOldBlankLineNum, 0);
    const end   = new vscode.Position(funcLineStart,        0);
    const range = new vscode.Range(start, end);
    const eol   = doc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    let commentText = eol.repeat(sett.blankLinesAbove) +
                      commentLineText                  + 
                      eol.repeat(sett.blankLinesBelow+1);
    await editor.edit(edit => edit.replace(range, commentText));
  }
};

export async function removeComments() {

}

export async function jumpNext() {

}

export async function jumpPrev() {

}
