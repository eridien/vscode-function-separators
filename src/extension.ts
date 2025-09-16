import * as vscode from 'vscode';
import { getLog }  from './utils';
import * as cmds   from './commands';
import * as parse  from './parse';
const { log, start, end } = getLog('extn');

export async function activate(context: vscode.ExtensionContext) {
  log('Extension activated');

  await parse.activate(context);

	const insertComments = vscode.commands.registerCommand(
                        'vscode-function-separators.insertComments', 
    async () => { 
      if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') 
        await cmds.insertComments(); 
    }
  );

  const removeComments = vscode.commands.registerCommand(
                        'vscode-function-separators.removeComments', 
    async () => { 
      if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') 
        await cmds.removeComments();
    }
  );
  const jumpNext = vscode.commands.registerCommand(
                  'vscode-function-separators.jumpNext', 
    async () => { 
      if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') 
        await cmds.jumpNext();
    }
  );

  const jumpPrev = vscode.commands.registerCommand(
                  'vscode-function-separators.jumpPrev', 
    async () => { 
      if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') 
        await cmds.jumpPrev();
    }
  );

context.subscriptions.push(insertComments, removeComments, jumpNext, jumpPrev);
}

export function deactivate() {
  log('Extension deactivated');
}
