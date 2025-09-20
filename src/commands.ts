import * as vscode from 'vscode';
const selLimits: [number, number][] = [];



//​​​​‍❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌ Set Sel Limits ❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌



function setSelLimits (editor: vscode.TextEditor, fit = 0) {
  selLimits.length = 0;
  const selections = editor.selections;
  for(const sel of selections) {
    if(sel.end.character === 0) fit--;
    selLimits.push([fit, fit]);
  }
}



//​​​​​❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌ Insert Separators ❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌



export async function insertSeparators() {
  const editor = vscode.window.activeTextEditor;  
  if(!editor) return;
  setSelLimits(editor);
  const doc      = editor.document;
  const eol      = doc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
  const fileName = doc.fileName.toLowerCase();
  const sfx      = fileName.slice(fileName.lastIndexOf('.'));
}