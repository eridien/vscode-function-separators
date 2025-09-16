import * as vscode           from 'vscode';
import * as parse            from './parse';
import {extensionsSupported} from './languages';
import {sett}                from './settings';
import { getLog }            from './utils';
const { log, start, end } = getLog('cmds');

export async function insertComments() {
  const editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  const doc      = editor.document;
  const fileName = doc.fileName.toLowerCase();
  const sfx      = fileName.slice(fileName.lastIndexOf('.'));
  if (!extensionsSupported.has(sfx)) {
    log('info', `Function Separators: Language not supported: ${sfx}`);
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
    const numOldBlankLines     = funcLineStart - firstOldBlankLineNum;
    const commentLineNum       = funcLineStart - sett.blankLinesBelow - 1;
    log(`Inserting ${func.name} comment at line ${
                     commentLineNum+1} for func at line ${funcLineStart+1}`);
    const topBlankLine = commentLineNum - sett.blankLinesAbove;

    
  }
};

export async function removeComments() {

}

export async function jumpNext() {

}

export async function jumpPrev() {

}
