import * as vscode   from 'vscode';
import { getLog }    from './utils';
import * as cmds     from './commands';
import * as parse    from './parse';
import * as settings from './settings';
const { log, start, end } = getLog('extn');

//​​​​‌********************************* ACTIVATE **********************************

export async function activate(context: vscode.ExtensionContext) {
  log('Extension activated');

  await parse.activate(context);
  settings.loadSettings();

	const insertSeparators = vscode.commands.registerCommand(
                        'vscode-function-separators.insertSeparators', 
    async () => { 
      if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') 
        await cmds.insertSeparators(); 
    }
  );

  const removeSeparators = vscode.commands.registerCommand(
                        'vscode-function-separators.removeSeparators', 
    async () => { 
      if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') 
        await cmds.removeSeparators();
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

  const loadSettings = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('function-separators')) {
      settings.loadSettings();
    }
  });

  context.subscriptions.push(insertSeparators, removeSeparators, 
                             jumpNext, jumpPrev, loadSettings);
}

export function deactivate() {
  log('Extension deactivated');
}
