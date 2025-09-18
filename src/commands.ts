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

export async function removeComments() {
  const editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  setSelLimits(editor);
  const doc = editor.document;
  const docText = doc.getText();
  const rangesToDelete: [vscode.Range, number][] = [];
  let match;
  utils.tokenRegExG.lastIndex = 0;
  while ((match = utils.tokenRegExG.exec(docText)) !== null) {
    const commentLineNum = doc.positionAt(match.index).line;
    const tokenStr = match[0];
    const oldBlankLineCount = utils.invBase4ToNumber(tokenStr);
    if(tokenStr.length !== NUM_INVIS_DIGITS ||
       oldBlankLineCount === null) {
      log('err', `invalid oldBlankLineCount at line ${commentLineNum
               }\nLine: ${utils.tokenToStr(doc.lineAt(commentLineNum).text)}`);
      rangesToDelete.push(
         [new vscode.Range(commentLineNum, 0, commentLineNum + 1, 0), 0]);
      continue;
    }
    if(!inSelection(commentLineNum)) continue;
    let topBlankLine;
    for(topBlankLine = commentLineNum-1;
        doc.lineAt(topBlankLine).text.trim() === '';
        topBlankLine--) {
    }
    topBlankLine++;
    let botBlankLine;
    for(botBlankLine = commentLineNum+1;
        doc.lineAt(botBlankLine).text.trim() === '';
        botBlankLine++) {
    }
    botBlankLine--;
    rangesToDelete.push(
      [new vscode.Range(topBlankLine, 0, botBlankLine+1, 0), oldBlankLineCount]);
  }
  const eol = (doc.eol === vscode.EndOfLine.LF) ? "\n" : "\r\n";
  await editor.edit(editBuilder => {
    let lastRangeEndLine = -1;
    for (const rangeToDelete of rangesToDelete) {
      const range = rangeToDelete[0];
      if(range.start.line <= lastRangeEndLine) continue;
      lastRangeEndLine = range.end.line;
      const blankLines = eol.repeat(rangeToDelete[1]);
      editBuilder.replace(range, blankLines);
    }
  }, { undoStopBefore: true, undoStopAfter: true });
}

export async function jumpNext() {

}

export async function jumpPrev() {

}
