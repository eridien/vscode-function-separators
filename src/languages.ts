
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

const langs: Langs = {

///////////////////////////// typescript ///////////////////////////
  typescript: {
    sExpr: `[
      (function_declaration  (identifier)        @name)
      (variable_declarator   (identifier)        @name (arrow_function))
      (assignment_expression (identifier)        @name (arrow_function))
      (assignment_expression (member_expression) @name (arrow_function))
      (class_declaration     (type_identifier)             @name)
      (method_definition     (property_identifier)   @name)
    ] @body`,
    suffixes: new Set(['.js', '.ts', '.tsx', '.jsx']),
    lineComment:  '//',
    openComment:  '/*',
    closeComment: '*/',
  },

///////////////////////////// python ///////////////////////////
  python: {
    sExpr: `[
      (function_definition name: (identifier) @name ) 
      (class_definition    name: (identifier) @name ) 
    
    ] @body`,
    suffixes: new Set(['.py']),
    lineComment:    '#',
    openComment:  '###',
    closeComment: '###',
  },

///////////////////////////// cpp ///////////////////////////
  cpp: {
    sExpr: `(function_definition 
              (function_declarator (identifier) @name)) @body`,
    suffixes: new Set(['.c','.cpp']),
    lineComment:  '//',
    openComment:  '/*',
    closeComment: '*/',
  },

///////////////////////////// java ///////////////////////////
  java: {
    sExpr: `[
      (method_declaration (identifier) @name )  
      (class_declaration  (identifier) @name)
    ] @body`,
    suffixes: new Set(['.java']),
    lineComment:  '//',
    openComment:  '/*',
    closeComment: '*/',
  },

///////////////////////////// c-sharp ///////////////////////////
  "c-sharp": {
    sExpr: `[
      (method_declaration (identifier) @name )  
      (class_declaration  (identifier) @name)
    ] @body`,
    suffixes: new Set(['.cs']),
    lineComment: '//',
    openComment:  '/*',
    closeComment: '*/',
  },

///////////////////////////// go ///////////////////////////
  go: {
    sExpr: `[
      (function_declaration name: (identifier)       @name) 
      (method_declaration   name: (field_identifier) @name)
    ] @body`,
    suffixes: new Set(['.go']),
    lineComment:  '//',
    openComment:  '/*',
    closeComment: '*/',
  },

///////////////////////////// rust ///////////////////////////
  rust: {
    sExpr: `(function_item (identifier) @name) @body`,
    suffixes: new Set(['.rs']),
    lineComment:  '//',
    openComment:  '/*',
    closeComment: '*/',
  },
};

export function getLangByExt(ext: string) {
  for (const entry of Object.entries(langs) as any) {
    const [_, {suffixes}] = entry;
    if(suffixes.has(ext)) return entry;
  }
  return [null, null];
}

export const extensionsSupported = new Set<string>();
for (const [_, {suffixes}] of Object.entries(langs) as any) {
  for (const suffix of suffixes) {
    extensionsSupported.add(suffix);
  }
}
