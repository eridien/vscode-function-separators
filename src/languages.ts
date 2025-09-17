
type LangConfig = {
  sExpr:         string;
  suffixes:  Set<string>;
  lineComment:   string;
  openComment?:  string;
  closeComment?: string;
};

export type Langs = {
  [lang: string]: LangConfig;
};

export const langs: Langs = {

///////////////////////////// typescript ///////////////////////////
  typescript: {
    sExpr: `[
      (function_declaration  (identifier)        @name)
      (variable_declarator   (identifier)        @name (arrow_function))
      (assignment_expression (identifier)        @name (arrow_function))
      (assignment_expression (member_expression) @name (arrow_function))
    ] @body`,
    suffixes: new Set(['.js', '.ts', '.tsx', '.jsx']),
    lineComment: '//'
  },

///////////////////////////// python ///////////////////////////
  python: {
    sExpr: `(function_definition name: (identifier) @name ) @body`,
    suffixes: new Set(['.py']),
    lineComment: '#'
  },

///////////////////////////// cpp ///////////////////////////
  cpp: {
    sExpr: `(function_definition 
              (function_declarator (identifier) @name)) @body`,
    suffixes: new Set(['.c','.cpp']),
    lineComment: '//'
  },

///////////////////////////// java ///////////////////////////
  java: {
    sExpr: `(method_declaration (identifier) @name )  @body`,
    suffixes: new Set(['.java']),
    lineComment: '//'
  },

///////////////////////////// c-sharp ///////////////////////////
  "c-sharp": {
    sExpr: `(method_declaration name: (identifier) @name)  @body`,
    suffixes: new Set(['.cs']),
    lineComment: '//'
  },

///////////////////////////// go ///////////////////////////
  go: {
    sExpr: `(function_declaration name: (identifier) @name) @body`,
    suffixes: new Set(['.go']),
    lineComment: '//'
  },

///////////////////////////// rust ///////////////////////////
  rust: {
    sExpr: `(function_item (identifier) @name) @body`,
    suffixes: new Set(['.rs']),
    lineComment: '//'
  },
};

export const extensionsSupported = new Set<string>();
for (const [_, {suffixes}] of Object.entries(langs) as any) {
  for (const suffix of suffixes) {
    extensionsSupported.add(suffix);
  }
}
