import * as vscode from 'vscode';
import * as parse  from './parse';
import * as langs  from './languages';
import {sett}      from './settings';
import { getLog }  from './utils';
const { log, start, end } = getLog('cmds');

export async function insertComments() {
  const editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  const doc      = editor.document;
  const fileName = doc.fileName.toLowerCase();
  const sfx      = fileName.slice(fileName.lastIndexOf('.'));
  if (!langs.extensionsSupported.has(sfx)) {
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
    log(`checking ${func.name} for comment before func line ${
                    funcLineStart+1}`);
    const prevLineText = doc.lineAt(funcLineStart-1).text;
    const [_, lang]    = langs.getLangByExt(sfx);
    const lineComment  = String(lang.lineComment)
                         .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const lineCommentRegex = new RegExp(String.raw`^\s*${lineComment}`);
    if(lineCommentRegex.test(prevLineText)             || // has //
       prevLineText.includes(String(lang.openComment)) || // has /*
       prevLineText.includes(String(lang.closeComment)))  // has */
      continue;
    let lineNum;
    for(lineNum = funcLineStart - 1; lineNum >= 0; lineNum--) {
      const lineText = doc.lineAt(lineNum).text.trim();
      if(lineText.length > 0) break;
    }
    const firstOldBlankLineNum = lineNum + 1;
    const commentLineNum       = funcLineStart - sett.blankLinesBelow - 1;
    log(`Inserting ${func.name} comment at line ${
                     commentLineNum+1} for func line ${funcLineStart+1}`);

    const maxDocWidth  = Math.max(...(doc.getText().split(/\r?\n/)
                                      .map(line => line.length)));
    const maxLineWidth = sett.fixedWidth == 0 ? maxDocWidth :
                         Math.min(maxDocWidth, sett.fixedWidth);
    let indent = sett.indent;
    let width;
    switch(sett.widthOption) {  
      case 'fixed': width = sett.fixedWidth; break;
      case 'func': {
        const funcLineText = doc.lineAt(funcLineStart).text;
        const funcStartCol = funcLineText.search(/\S/);
        const funcEndCol   = funcLineText.trimEnd().length;
        if(sett.indent >= 0) indent = sett.indent; else indent = funcStartCol;
        width  = funcEndCol - funcStartCol; 
        break;
      }
      case 'max': width = maxLineWidth; break;
    }

    const sideFill = Math.max(1, 70 - func.name.length - sett.indent - 2);



    // let commentLineText = 
    //       `${' '.repeat(sett.indent)}${lang.lineComment} ${
    //         sett.fillStr.repeat(256).slice(0, leftFill)} ${func.name} ${sett.fillStr.repeat(10)}`;

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
