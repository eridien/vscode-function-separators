import * as vscode                 from 'vscode';
import path                        from 'path';
import * as langs                  from './languages';
import { Tree, QueryMatch,
         Parser, Language, Query } from 'web-tree-sitter';
import * as utils                  from './utils';
const {log, start, end} = utils.getLog('lambda');

const PARSE_DUMP_TYPE: string = '';  
const PARSE_DUMP_NAME: string = '';

let context: vscode.ExtensionContext;
type SyntaxNode = NonNullable<ReturnType<Parser['parse']>>['rootNode'];

//​​​​‌********************************* ACTIVATE **********************************

export async function activate(contextIn: vscode.ExtensionContext) {
  context = contextIn;
  await Parser.init();
}

export interface FuncData {
  name:      string;
  startName: number;
  endName:   number;
  startBody: number;
  endBody:   number;
  nested:    boolean;
}

const languageCache: Map<string, Language> = new Map();

//​​​​‌**************************** GET LANG FROM WASM *****************************

async function getLangFromWasm(lang:string) {
  if(languageCache.has(lang)) return languageCache.get(lang);
  const absPath = context?.asAbsolutePath(`wasm/tree-sitter-${lang}.wasm`);
  if(!absPath) {
    log('infoerr', `Function Separators: Language ${lang} not supported.`);
    return null;
  }
  const wasmUri  = vscode.Uri.file(absPath);
  const language = await Language.load(wasmUri.fsPath);
  languageCache.set(lang, language);
  return language;
}

//​​​​‌******************************** PARSE DEBUG ********************************

function parseDebug(rootNode: SyntaxNode) {
  let dumping    = false;
  let depth      = 0;
  let firstDepth = 0;
  let lineCount  = 0;
  let done       = false;

//​​​​​********************************* WALK TREE *********************************

  function walkTree(node: SyntaxNode, visit: (node: SyntaxNode) => void) {
    visit(node);
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && !done) {
        depth++;
        walkTree(child, visit);
        if(--depth < firstDepth) done = true;
      }
    }
  }
  walkTree(rootNode, node => {
    if(!dumping) {
      firstDepth = depth;
      dumping    = true;
    }
    if(dumping && !done) {
      log(`${'    '.repeat(depth-firstDepth)}${node.type} `+
          `(${node.startIndex},${
              node.endIndex}) ${idNodeName(node)}`);
      if(lineCount++ > 1000) done = true;
    }
  });
}

//​​​​‌******************************* ID NODE NAME ********************************

function idNodeName(node: SyntaxNode, 
                    symbolsByType: Map<string, string> | null = null): string {
  if(!node.isNamed) return '';
  let name        = '';
  let grammarType = node.type;
  const symbol    = symbolsByType?.get(grammarType) ?? '?';
  const nameNode = node.childForFieldName('name');
  name = nameNode ? nameNode.text : '';
  return name + "\x02" + symbol + grammarType + "\x01";
}

let lastParseErrFsPath = '';

//​​​​‌******************************** PARSE CODE *********************************

export async function parseCode(doc: vscode.TextDocument, 
                                code = doc.getText(),
                                retrying = false): Promise<FuncData[]> {
  start('parseCode', true);
  const fsPath = doc.uri.fsPath;
  const ext    = path.extname(fsPath);
  const [lang, {sExpr}] = langs.getLangByExt(ext);
  if(lang === null) {
    log('infoerr', `Function Separators: Language ${ext} not supported.`);
    return [];
  }

  const language = await getLangFromWasm(lang);
  if (!language) return [];

  const parser  = new Parser();
  parser.setLanguage(language);
  let tree: Tree | null;
  try {
    tree = parser.parse(code) as Tree | null;
    if(!tree) {
      log('parser.parse returned null tree for', path.basename(fsPath));
      return [];
    }
  }
  catch (e) {
    if(retrying) {
      log('err', 'parser.parse failed again, giving up:', (e as any).message);
      return [];
    }
    const middle = utils.findMiddleOfText(code);
    if(lastParseErrFsPath !== fsPath) // just to avoid a lot of log lines
      log('err', 'parse exception, retrying in two halves split at', middle,
                                 (e as any).message, path.basename(fsPath));
    lastParseErrFsPath = fsPath;
    const firstHalf = code.slice(0, middle);
    const res1 = await parseCode(doc, firstHalf);
    if(!res1) return [];

    const secondHalf = code.slice(middle);
    const res2 = await parseCode(doc, secondHalf);
    if (!res2) return [];

    for (const node of res2) {
      node.startName += middle;
      node.endName   += middle;
      node.startBody += middle;
      node.endBody   += middle;
    }
    return res1.concat(res2);
  }
  if(PARSE_DUMP_NAME !== '' || PARSE_DUMP_TYPE !== '')   
    parseDebug(tree.rootNode);
  let query:   Query;
  let matches: QueryMatch[];
  try {
    query   = new Query(language as any, sExpr);
    matches = query.matches(tree.rootNode as any);
  } catch (e) {
    log('err', 's-expression query failed', (e as any).message);
    return [];
  }
  const nodes: FuncData[] = [];
  let currentRootEnd = -1;
  for(let matchIdx = 0; matchIdx < matches.length; matchIdx++) {
    const match = matches[matchIdx];
    if(match.captures.length !== 2) {
      log('err', `bad capture count ${match.captures.length} in ${lang}`);
      continue;
    }
    const bodyIdx     = match.captures[0].name === 'body' ? 0 : 1;
    const bodyCapture = match.captures[bodyIdx];
    const nameCapture = match.captures[1-bodyIdx];
    const name        = nameCapture.node.text;
    const startName   = nameCapture.node.startIndex;
    const endName     = nameCapture.node.endIndex;
    const startBody   = bodyCapture.node.startIndex;
    const endBody     = bodyCapture.node.endIndex;
    // log('nomod', `match ${matchIdx}, name=${name}, `+
    //                `startName=${startName}`);
    const nested = startBody < currentRootEnd;
    if (!nested) currentRootEnd = endBody;
    nodes.push({name, startName, endName, startBody, endBody, nested});
  }
  // nodes.sort((a, b) => a.startName - b.startName);
  end('parseCode', false);
  return nodes;
}
