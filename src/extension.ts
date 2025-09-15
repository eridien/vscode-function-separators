import * as vscode from 'vscode';
import { getLog } from './utils';
const { log, start, end } = getLog('extn');

export function activate(context: vscode.ExtensionContext) {
  log('info', 'Extension activated');

	const disposable = vscode.commands.registerCommand(
                                'vscode-function-separators.helloWorld', () => {
		vscode.window.showInformationMessage('Hello from Function Separators!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
