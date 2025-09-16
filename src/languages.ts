
type LangConfig = {
  sExpr:    string;
  suffixes: Set<string>;
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
    suffixes: new Set(['.js', '.ts', '.tsx', '.jsx'])
  },

///////////////////////////// python ///////////////////////////
  python: {
    sExpr: `(function_definition name: (identifier) @name ) @body`,
    suffixes: new Set(['.py'])
  },

///////////////////////////// cpp ///////////////////////////
  cpp: {
    sExpr: `(function_definition 
              (function_declarator (identifier) @name)) @body`,
    suffixes: new Set(['.c','.cpp'])
  },

///////////////////////////// java ///////////////////////////
  java: {
    sExpr: `(method_declaration (identifier) @name )  @body`,
    suffixes: new Set(['.java'])
  },

///////////////////////////// c-sharp ///////////////////////////
  "c-sharp": {
    sExpr: `(method_declaration name: (identifier) @name)  @body`,
    suffixes: new Set(['.cs'])
  },

///////////////////////////// go ///////////////////////////
  go: {
    sExpr: `(function_declaration name: (identifier) @name) @body`,
    suffixes: new Set(['.go'])
  },

///////////////////////////// rust ///////////////////////////
  rust: {
    sExpr: `(function_item (identifier) @name) @body`,
    suffixes: new Set(['.rs'])
  },
};

export const extensionsSupported = new Set<string>();
for (const [_, {suffixes}] of Object.entries(langs) as any) {
  for (const suffix of suffixes) {
    extensionsSupported.add(suffix);
  }
}
