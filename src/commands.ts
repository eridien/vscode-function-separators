import * as vscode from 'vscode';
import * as parse  from './parse';
import * as langs  from './languages';
import {sett}      from './settings';
import * as utils  from './utils';
const { log, start, end } = utils.getLog('cmds');

const NUM_INVIS_DIGITS = 5; // max 4^5 = 1024

const selLimits: [number, number][] = [];
function setSelLimits (editor: vscode.TextEditor) {
  selLimits.length = 0;
  const selections = editor.selections;
  for(const sel of selections) {
    if(sel.isEmpty) continue;
    const startLine = sel.start.line;
    let   endLine   = sel.end.line;
    if(sel.end.character === 0) endLine--;
    selLimits.push([startLine, endLine]);
  }
}
function inSelection(lineNum: number) {
  if(selLimits.length === 0) return true;
  for(const lim of selLimits) {
    if(lineNum >= lim[0] && lineNum <= lim[1]) return true;
  }
  return false;
}

export async function insertComments() {
  const editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  setSelLimits(editor);
  const doc      = editor.document;
  const eol      = doc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
  const fileName = doc.fileName.toLowerCase();
  const sfx      = fileName.slice(fileName.lastIndexOf('.'));
  if (!langs.extensionsSupported.has(sfx)) {
    log('info', `Function Separators: ${sfx} language not supported`);
    return;
  }
  await removeComments();
  type Edit = { range: vscode.Range; text: string };
  const edits: Edit[] = [];
  const funcs = await parse.parseCode(doc);
  for(const func of funcs) {
    const posStart      = doc.positionAt(func.startBody);
    const funcLineStart = posStart.line;
    if(funcLineStart < 1 || !inSelection(funcLineStart)) continue;
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
    const numOldBlankLines     = funcLineStart - firstOldBlankLineNum;
    const commentLineNum       = funcLineStart - sett.blankLinesBelow - 1;
    log(`Inserting ${func.name} comment at line ${
                     commentLineNum+1} for func line ${funcLineStart+1}`);
    const funcLineText = doc.lineAt(funcLineStart).text;
    const funcStartCol = funcLineText.search(/\S/);
    let adjName        = func.name;
    if(sett.splitCamel)
      adjName = adjName.replace(/([a-z])([A-Z])/g,      "$1 $2")
                       .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
    if(sett.splitSeparators) adjName = adjName.replace(/[\._]/g, ' ');
    if(sett.uppercase) adjName = adjName.toUpperCase();

    /*
      iiiiSSvvvvv-llll-adjname-rrrr          (lineWidth)
      SSvvvvv-llll-adjname-rrrr              (commWidth)
      SSvvvvv--adjname-                      (bodyWidth)
      -       space                          (1)
      iiii:   indent spaces                  (indentWidth)
      SS:     line comment symbol, // or #   (symbolWidth)
      vvvvv:  invisible old blank line count (NUM_INVIS_DIGITS)
      llll:   left fill string               (leftFillWidth)
      name:   adjusted name                  (adjName.length)
      rrrr:   right fill string              (rightFillWidth)
    */
    const indentWidth = sett.indent < 0 ? funcStartCol : sett.indent;
    const symbolWidth = lang.lineComment.length;
    const bodyWidth   = symbolWidth + NUM_INVIS_DIGITS + adjName.length + 3;
    let commWidth;
    switch(sett.widthOption) {  
      case 'fixed': 
        commWidth = NUM_INVIS_DIGITS + sett.fixedWidth; 
        break;
      case 'func':  
        commWidth = funcLineText.trimEnd().length - funcStartCol + NUM_INVIS_DIGITS; 
        break;
      case 'max': {
        const maxDocWidth  = Math.max(...(doc.getText().split(/\r?\n/)
                                             .map(line => line.length)));
        let lineEndCol = maxDocWidth;
        if (sett.fixedWidth > 0)
          lineEndCol = Math.min(maxDocWidth, indentWidth + sett.fixedWidth);
        commWidth = lineEndCol - indentWidth;
        break;
      }
    }
    const allFillWidth   = Math.max(commWidth - bodyWidth, 0);
    const leftFillWidth  = Math.floor(allFillWidth / 2);
    const rightFillWidth = allFillWidth - leftFillWidth;
    const maxFillStr = sett.fillStr.repeat(1024);
    let commentLineText = `${' '.repeat(indentWidth)}${lang.lineComment}${
        utils.numberToInvBase4(numOldBlankLines, NUM_INVIS_DIGITS)} ${
        maxFillStr.slice(0, leftFillWidth)} ${adjName} ${
        maxFillStr.slice(0, rightFillWidth)}`;
    const start = new vscode.Position(firstOldBlankLineNum, 0);
    const end   = new vscode.Position(funcLineStart,        0);
    const range = new vscode.Range(start, end);
    let newText = eol.repeat(sett.blankLinesAbove) +
                  commentLineText                  + 
                  eol.repeat(sett.blankLinesBelow + 1);
    edits.push({ range, text: newText });
  }
  await editor.edit(editBuilder => {
    for (const e of edits) editBuilder.replace(e.range, e.text);
  }, { undoStopBefore: true, undoStopAfter: true });
};

//​​​​⁠ ----------------------------- WS ONMESSAGE -----------------------------
//​​​​⁠  WS ONMESSAGE 
//  symbolWidth + NUM_INVIS_DIGITS + adjName.length + 3;
export async function removeComments() {

}

export async function jumpNext() {

}

export async function jumpPrev() {

}
