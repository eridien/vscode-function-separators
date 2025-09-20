import * as vscode from 'vscode';
import * as parse  from './parse';
import * as langs  from './languages';
import {settings}  from './settings';
import * as utils  from './utils';
const { log, start, end } = utils.getLog('cmds');

const NUM_INVIS_DIGITS = 5; // max 4^5 = 1024

const selLimits: [number, number][] = [];

//​​​​​=============================== SET SEL LIMITS ===============================

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

//​​​​​================================ IN SELECTION ================================

function inSelection(lineNum: number) {
  if(selLimits.length === 0) return true;
  for(const lim of selLimits) {
    if(lineNum >= lim[0] && lineNum <= lim[1]) return true;
  }
  return false;
}
let test;

//​​​​​============================= INSERT SEPARATORS ==============================

export async function insertSeparators() {
  const editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  setSelLimits(editor);
  const doc      = editor.document;
  const eol      = doc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
  const fileName = doc.fileName.toLowerCase();
  const sfx      = fileName.slice(fileName.lastIndexOf('.'));
  if (!langs.extensionsSupported.has(sfx)) {
    log('infoerr', `Function Separators: ${sfx} language not supported`);
    return;
  }
  const [_, lang]   = langs.getLangByExt(sfx);
  const lineComment = String(lang.lineComment)
                            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lineCommentRegex = new RegExp(String.raw`^\s*${lineComment}`);
  await removeSeparators();
  type Edit = { range: vscode.Range; text: string };
  const edits: Edit[] = [];
  const funcs = await parse.parseCode(doc);
  for(const func of funcs) {
    if(!settings.includeNested && func.nested) continue;
    const posStart      = doc.positionAt(func.startBody);
    const funcLineStart = posStart.line;
    if(funcLineStart < 1 || !inSelection(funcLineStart)) continue;
    const posEnd      = doc.positionAt(func.endBody);
    const funcLineEnd = posEnd.line;
    log(`func.name ${func.name}  funcLineEnd ${funcLineEnd}  funcLineStart ${funcLineStart
       } settings.minFuncHeight ${settings.minFuncHeight}`);
    if((funcLineEnd - funcLineStart) < settings.minFuncHeight-1) continue;
    const prevLineText = doc.lineAt(funcLineStart-1).text;
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
    let adjName = func.name;
    if(/[a-z][A-Z]/.test(adjName) && settings.case === 'Original') {
      adjName = adjName.charAt(0).toUpperCase() + adjName.slice(1);
    }
    if(settings.splitName) {
      adjName = adjName.replace(/([a-z])([A-Z])/g,      "$1 $2")
                       .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
                       .replace(/[\._]/g, ' ');
    }
    if(     settings.case == 'Uppercase') adjName = adjName.toUpperCase();
    else if(settings.case == 'Lowercase') adjName = adjName.toLowerCase();
    else if(settings.case == 'Capitalize') {
      const words = adjName.split(' ');
      let capWords = [];
      for(const word of words)
        capWords.push(word.charAt(0).toUpperCase() + 
                      word.slice(1) .toLowerCase());
      adjName = capWords.join(' ');
    }
    const startCol    = settings.indent < 0 ? funcStartCol : settings.indent;
    const symbolWidth = lang.lineComment.length;
    const bodyWidth   = symbolWidth + 1 + adjName.length + 1;
    const endCol      = (settings.width >= 0) ? settings.width :
                          Math.max(...(doc.getText().split(/\r?\n/)
                                          .map(line => line.length)));
    const allFillWidth   = Math.max(endCol - startCol - bodyWidth, 0);
    const leftFillWidth  = Math.floor(allFillWidth / 2);
    const rightFillWidth = allFillWidth - leftFillWidth;
    const maxFillStr     = settings.fillString.repeat(1024);
    let commentLineText  = `${' '.repeat(startCol)}${lang.lineComment}${
        utils.numberToInvBase4(numOldBlankLines, NUM_INVIS_DIGITS)}${
        maxFillStr.slice(0, leftFillWidth)} ${adjName} ${
        maxFillStr.slice(0, rightFillWidth)}`;
    const start = new vscode.Position(firstOldBlankLineNum, 0);
    const end   = new vscode.Position(funcLineStart,        0);
    const range = new vscode.Range(start, end);
    let newText = eol.repeat(settings.blankLinesAbove) +
                  commentLineText                  + 
                  eol.repeat(settings.blankLinesBelow + 1);
    edits.push({ range, text: newText });
  }
  await editor.edit(editBuilder => {
    for (const e of edits) editBuilder.replace(e.range, e.text);
  }, { undoStopBefore: true, undoStopAfter: true });
};

//​​​‌​============================= REMOVE SEPARATORS ==============================

export async function removeSeparators() {
  const editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  setSelLimits(editor);
  const doc = editor.document;
  const docText = doc.getText();
  const rangesToDelete: [vscode.Range, number][] = [];
  let match;
  utils.invRegExG.lastIndex = 0;
  while ((match = utils.invRegExG.exec(docText)) !== null) {
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
    let botBlankLine;
    for(botBlankLine = commentLineNum+1;
        doc.lineAt(botBlankLine).text.trim() === '';
        botBlankLine++) {
    }
    if(!inSelection(commentLineNum) && 
       !inSelection(botBlankLine)) continue;
    botBlankLine--;
    let topBlankLine;
    for(topBlankLine = commentLineNum-1;
        doc.lineAt(topBlankLine).text.trim() === '';
        topBlankLine--) {
    }
    topBlankLine++;
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

//​​​​⁠=============================== JUMP PREV NEXT ===============================

export async function jumpPrevNext(next = true, jumpNextEditor = false) {
  let editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  if(settings.fileWrap && jumpNextEditor) {
    editor = await utils.getAdjacentEditor(editor, next ? "next" : "prev");
    if(!editor) return;
  }
  const doc = editor.document;
  const docText = doc.getText();
  let lineNum = 0;
  if(!jumpNextEditor) {
    const firstRange = editor.visibleRanges[0];
    if(!firstRange) { 
      await jumpPrevNext(next, true); 
      return; 
    }
    lineNum = firstRange.start.line;
  } 
  else
    lineNum = next ? 0 : doc.lineCount - 1;
  const startLineNum = lineNum;
  let firstNonBlankLine = -1;
  let firstNonBlankText = '';
  for(; lineNum < doc.lineCount && 
        lineNum < (startLineNum + settings.blankLinesAbove 
                                + settings.blankLinesBelow); 
        lineNum++) {
    const lineText = doc.lineAt(lineNum).text;
    if(lineText.trim().length === 0) continue;
    firstNonBlankLine = lineNum;
    firstNonBlankText = lineText;
    break;
  }
  if(firstNonBlankLine == -1) firstNonBlankLine = lineNum;
  const newCommentLineNum = utils.getNextMarkedLine(
                             docText, firstNonBlankLine, next ? "down" : "up");
  if(newCommentLineNum == undefined) {
    if(!jumpNextEditor) await jumpPrevNext(next, true);
    return;
  }
  utils.invRegExG.lastIndex =
               doc.offsetAt(new vscode.Position(firstNonBlankLine, 0));
  let match;
  while ((match = utils.invRegExG.exec(docText)) !== null) {
    const tokenStr = match[0];
    const oldBlankLineCount = utils.invBase4ToNumber(tokenStr);
    if(tokenStr.length !== NUM_INVIS_DIGITS ||
        oldBlankLineCount === null) {
      log('err', `invalid oldBlankLineCount at line ${newCommentLineNum
                }\nLine: ${utils.tokenToStr(doc.lineAt(newCommentLineNum).text)}`);
      continue;
    }
  }
  let topLineNumber = doc.lineAt(newCommentLineNum).range.start.line;
  topLineNumber -= settings.blankLinesAbove;
  topLineNumber  = Math.max(topLineNumber, 0);
  const range = new vscode.Range(topLineNumber, 0, topLineNumber, 0);
  editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
}

export async function jumpPrev() { await jumpPrevNext(false); }
export async function jumpNext() { await jumpPrevNext(true); }
