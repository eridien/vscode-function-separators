import * as vscode from 'vscode';
import * as utils  from './utils';
const {log, start, end} = utils.getLog('settings');

interface FunctionSeparatorsSettings {
  minFuncHeight:    number;
  includeNested:   boolean;
  blankLinesAbove:  number;
  blankLinesBelow:  number;
  fillStr:          string;
  indent:           number; // -1: match func indent
  width:            number; // -1: widest line in file
  splitName:       boolean;
  case:           'Original' | 'Capitalize' | 'Uppercase';
  fileWrap:        boolean;
}

export let settings: FunctionSeparatorsSettings = {
  minFuncHeight:      3,
  includeNested:  false,
  blankLinesAbove:    1,
  blankLinesBelow:    1,
  fillStr:          '=',
  indent:             0, // -1: match func indent
  width:             80, // -1: widest line in file
  splitName:       true,
  case:     'Uppercase',
  fileWrap:        false,
};

export function loadSettings() {
  const config = vscode.workspace.getConfiguration('function-separators');
  settings = {
    minFuncHeight:   config.get('minFuncHeight', 3),
    includeNested:   config.get('includeNested', false),
    blankLinesAbove: config.get('blankLinesAbove', 1),
    blankLinesBelow: config.get('blankLinesBelow', 1),
    fillStr:         config.get('fillStr', '='),
    indent:          config.get('indent', 0),
    width:           config.get('width', 80),
    splitName:       config.get('splitName', true),
    case:            config.get('case', 'Uppercase'),
    fileWrap:        config.get('fileWrap', true),
  };
}
