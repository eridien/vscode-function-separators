import vscode from 'vscode';
const { log, start, end } = getLog('util');

let context: vscode.ExtensionContext | undefined;

export function activate(contextIn: vscode.ExtensionContext) {
  context = contextIn;
}

// 'err' 'info' 'nomod' 'errmsg'

const outputChannel = vscode.window.createOutputChannel('function-separators');

export function getLog(module: string) : {
  log:   (...args: any[]) => void;
  start: (name: string,     hide?: boolean, msg?: string)     => void;
  end:   (name: string, onlySlow?: boolean, msg?: string) => void;
} {
  const timers: Record<string, number> = {};

  const start = function (name: string, hide = false, msg = ''): void {
    const startTime = Date.now();
    timers[name] = startTime;
    if (hide) return;
    const line = `[${module}] ${name} started${msg ? ', ' + msg : ''}`;
    outputChannel.appendLine(line);
    console.log(line);
  };

  const end = function (name: string, onlySlow = false, msg = ''): void {
    if (!timers[name]) {
      const line = `[${module}] ${name} ended${msg ? ', ' + msg : ''}`;
      outputChannel.appendLine(line);
      console.log(line);
      return;
    }
    const endTime = Date.now();
    const duration = endTime - timers[name];
    if (onlySlow && duration < 100) return;
    // const line = `[${module}] ${name} ended, ${timeInSecs(duration)}s,  ${msg}`;
    const line = `[${module}] ${name} ended, ${duration}ms${msg ? ', ' + msg : ''}`;
    outputChannel.appendLine(line);
    console.log(line);
  };

  const log = function (...args: any[]): void {
    let errFlag    = false;
    let errMsgFlag = false;
    let infoFlag   = false;
    let nomodFlag  = false;

    if (typeof args[0] === 'string') {
      errFlag = args[0].includes('err');
      infoFlag = args[0].includes('info');
      nomodFlag = args[0].includes('nomod');
      errMsgFlag = args[0].includes('errmsg');
    }

    if (errFlag || infoFlag || nomodFlag || errMsgFlag) args = args.slice(1);

    let errMsg: string | undefined;
    if (errMsgFlag) {
      errMsg  = args[0]?.message + ' -> ';
      args    = args.slice(1);
      errFlag = true;
    }

    const par = args.map((a) => {
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a, null, 2);
        } catch (e: any) {
          return JSON.stringify(Object.keys(a)) + e.message;
        }
      } else return a;
    });

    const line = (nomodFlag ? '' : '[' + module + '] ') +
                 (errFlag ? ' error, ' : '') +
                 (errMsg !== undefined ? errMsg : '') +
                 par.join(' ');

    const infoLine = par.join(' ').replace('parse: ','');

    outputChannel.appendLine(line);
    if (errFlag) console.error(line);
    else console.log(line);
    if (infoFlag) vscode.window.showInformationMessage(infoLine);
  };

  return { log, start, end };
}

export function findMiddleOfText(code: string): number {
  const blankLineRegex = /^\s*$(?:\r?\n|$)/gm;
  const middleIdx = Math.floor(code.length / 2);
  let match;
  let minDist = code.length;
  let closest = -1;
  while ((match = blankLineRegex.exec(code)) !== null) {
    const idx  = match.index;
    const dist = Math.abs(idx - middleIdx);
    if (dist < minDist) {
      minDist = dist;
      closest = idx;
    } else if (dist > minDist) break;
  }
  return closest;
}

export function invBase4ToNumber(str: string) {
  const digitMap: Record<string, number> = {
    '\u200B': 0, // Zero Width Space
    '\u200C': 1, // Zero Width Non-Joiner
    '\u200D': 2, // Zero Width Joiner
    '\u2060': 3  // Word Joiner
  };
  let num = 0;
  for (const char of str) {
    const digit = digitMap[char];
    if (digit === undefined)
      throw new Error('Invalid character in zero-width base-4 string');
    num = num * 4 + digit;
  }
  return num;
}

export function numberToInvBase4(num: number) {
  const zeroWidthDigits = ['\u200B', '\u200C', '\u200D', '\u2060'];
  if (num === 0) return zeroWidthDigits[0];
  let result = '';
  while (num > 0) {
    const digit = num % 4;
    result = zeroWidthDigits[digit] + result;
    num = Math.floor(num / 4);
  }
  return result;
}

export function tokenToDigits(token: string) {
  const map: Record<string, string> = {
    '\u200B': '0', // Zero Width Space
    '\u200C': '1', // Zero Width Non-Joiner
    '\u200D': '2', // Zero Width Joiner
    '\u2060': '3'  // Word Joiner
  };
  return [...token.slice(0,-1)]
    .map(c => {
      if (!(c in map)) return null;
      return map[c];
    })
    .filter(c => c !== null)
    .join('').padStart(4, '0');
}

export function tokenToStr(token: string) {
  if(!token) return '';
  return token.replaceAll('\u200B', '0')
              .replaceAll('\u200C', '1')
              .replaceAll('\u200D', '2')
              .replaceAll('\u2060', '3');
}

export function getTokenRegEx() {
  return new RegExp("[\\u200B\\u200C\\u200D\\u2060]+");
}

export function getTokenRegExG() {
  return new RegExp("[\\u200B\\u200C\\u200D\\u2060]+", 'g');
}
