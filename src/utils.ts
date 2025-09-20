import vscode from 'vscode';
const { log, start, end } = getLog('util');

let context: vscode.ExtensionContext | undefined;

export function activate(contextIn: vscode.ExtensionContext) {
  context = contextIn;
}

// 'err' 'info' 'nomod' 'errmsg'

const outputChannel = vscode.window.createOutputChannel('function-separators');

//​​​​‌************************************ GET LOG *************************************

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

//​​​​‌****************************** FIND MIDDLE OF TEXT *******************************

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

//​​​​‌****************************** NUMBER TO INV BASE4 *******************************

export function numberToInvBase4(num: number, wid: number) {
  const digits    = ['\u200B', '\u200C', '\u200D', '\u2060'];
  const zeroDigit = digits[0];
  if (num === 0) return zeroDigit.repeat(wid);
  let str = '';
  while (num > 0) {
    const digit = num & 3;
    str = digits[digit] + str;
    num >>= 2;
  }
  return str.padStart(wid, zeroDigit);
}

//​​​​‌******************************* INV BASE4TO NUMBER *******************************

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
    if (digit === undefined) {
      log('err', `invBase4ToNumber: invalid char ${char}`);
      return null;
    }
    num = num * 4 + digit;
  }
  return num;
}

//​​​​‌******************************** TOKEN TO DIGITS *********************************

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

//​​​​‌********************************** TOKEN TO STR **********************************

export function tokenToStr(token: string) {
  if(!token) return '';
  return token.replaceAll('\u200B', '~0')
              .replaceAll('\u200C', '~1')
              .replaceAll('\u200D', '~2')
              .replaceAll('\u2060', '~3');
}

export const invRegEx  = new RegExp("[\\u200B\\u200C\\u200D\\u2060]+");
export const invRegExG = new RegExp("[\\u200B\\u200C\\u200D\\u2060]+", 'g');

type TabItem = { uri: vscode.Uri; column: vscode.ViewColumn | undefined };

//​​​​‌***************************** COLLECT FILE TAB ITEMS *****************************

function collectFileTabItems(): TabItem[] {
  const items: TabItem[] = [];
  const seen = new Set<string>();

  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        const uri = tab.input.uri;
        const col = group.viewColumn;
        const key = `${uri.toString()}#${col ?? "?"}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ uri, column: col });
        }
      }
    }
  }
  return items;
}

//​​​​‌********************************** SAME EDITOR ***********************************

function sameEditor(a: vscode.TextEditor, b: TabItem): boolean {
  return (
    a.document.uri.toString() === b.uri.toString() &&
    a.viewColumn === b.column
  );
}

/**
 * Show and return the adjacent editor among those whose text matches invRegExG.
 * - If none match → returns undefined.
 * - If only one matches → returns the current editor if it is that one,
 *      otherwise shows that one.
 */
export async function getAdjacentEditor(
  current: vscode.TextEditor, direction: "next" | "prev" ): 
                        Promise<vscode.TextEditor | undefined> {
  const all = collectFileTabItems();
  if (all.length === 0) return undefined;
  const matching: TabItem[] = [];
  for (const it of all) {
    try {
      const doc = await vscode.workspace.openTextDocument(it.uri);
      const text = doc.getText();
      if (invRegEx.test(text)) matching.push(it);
    } catch (_) {}
  }
  if (matching.length === 0) {
    return undefined;
  }
  if (matching.length === 1) {
    if (sameEditor(current, matching[0])) return current;
    return await vscode.window.showTextDocument(matching[0].uri, {
      viewColumn: matching[0].column ?? vscode.ViewColumn.Active,
      preserveFocus: false,
      preview: true,
    });
  }
  const idx = matching.findIndex(it => sameEditor(current, it));
  let targetIdx = 0;
  if (idx >= 0) targetIdx = direction === "next"
                  ? (idx + 1) % matching.length
                  : (idx - 1 + matching.length) % matching.length;
  const target = matching[targetIdx];
  return await vscode.window.showTextDocument(target.uri, {
    viewColumn: target.column ?? vscode.ViewColumn.Active,
    preserveFocus: false,
    preview: true,
  });
}

export function getNextMarkedLine(
       src: string, line: number, direction:"up"|"down" ): number | undefined {
  const lines = src.split(/\r?\n/);
  const marked: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (invRegEx.test(lines[i])) marked.push(i);
  }
  if (marked.length === 0) return undefined;
  if (direction === "down") {
    for (const m of marked) {
      if (m > line) return m;
    }
    return undefined;
  } 
  else {
    for (let i = marked.length - 1; i >= 0; i--) {
      if (marked[i] < line) return marked[i];
    }
    return undefined;
  }
}

function graphemes(str: string): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return Array.from(seg.segment(str), s => s.segment);
}

export function removeLastGrapheme(str: string): string {
  const g = graphemes(str);
  return g.length > 0 ? g.slice(0, -1).join("") : "";
}
