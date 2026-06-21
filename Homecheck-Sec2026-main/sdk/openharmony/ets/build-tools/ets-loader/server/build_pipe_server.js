/*
 * Copyright (c) 2021-2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const WebSocket = require('ws');
const ts = require('typescript');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const _ = require('lodash');

const { processComponentChild } = require('../lib/process_component_build');
const { createWatchCompilerHost } = require('../lib/ets_checker');
const { writeFileSync } = require('../lib/utils');
const { projectConfig } = require('../main');
const { props } = require('../lib/ets_checker');
const {
  isResource,
  processResourceData,
  isAnimateToOrImmediately,
  processAnimateToOrImmediately
} = require('../lib/process_ui_syntax');
const { dollarCollection } = require('../lib/ets_checker');

const WebSocketServer = WebSocket.Server;

let pluginSocket = '';

let supplement = {
  isAcceleratePreview: false,
  line: 0,
  column: 0,
  fileName: ''
};

const pluginCommandChannelMessageHandlers = {
  'compileComponent': handlePluginCompileComponent,
  'default': () => {}
};
let es2abcFilePath = path.join(__dirname, '../bin/ark/build-win/bin/es2abc');

let previewCacheFilePath;
let previewJsFilePath;
let previewAbcFilePath;
const messages = [];
let start = false;
let checkStatus = false;
let compileStatus = false;
let receivedMsg_;
let errorInfo = [];
let compileWithCheck;
let globalVariable = [];
let propertyVariable = [];
let globalDeclaration = new Map();
let connectNum = 0;
const maxConnectNum = 8;
let codeOverMaxlength = false;

let callback = undefined;

function buildPipeServer() {
  return {
    init(cachePath, buildPath, cb) {
      previewCacheFilePath = path.join(cachePath || buildPath, 'preview.ets');
      const rootFileNames = [];
      writeFileSync(previewCacheFilePath, '');
      rootFileNames.push(previewCacheFilePath);
      ts.createWatchProgram(
        createWatchCompilerHost(rootFileNames, resolveDiagnostic, delayPrintLogCount, ()=>{}, true));
      callback = cb;
    },
    compileComponent(jsonData) {
      handlePluginCompileComponent(jsonData);
    }
  };
}

function init(port) {
  previewCacheFilePath =
    path.join(projectConfig.cachePath || projectConfig.buildPath, 'preview.ets');
  previewJsFilePath =
    path.join(projectConfig.cachePath || projectConfig.buildPath, 'preview.js');
  previewAbcFilePath =
    path.join(projectConfig.cachePath || projectConfig.buildPath, 'preview.abc');
  const rootFileNames = [];
  writeFileSync(previewCacheFilePath, '');
  rootFileNames.push(previewCacheFilePath);
  ts.createWatchProgram(
    createWatchCompilerHost(rootFileNames, resolveDiagnostic, delayPrintLogCount, ()=>{}, true));
  const wss = new WebSocketServer({
    port: port,
    host: '127.0.0.1'
  });
  wss.on('connection', function(ws) {
    if (connectNum < maxConnectNum) {
      connectNum++;
      handlePluginConnect(ws);
    } else {
      ws.terminate();
    }
  });
}

function handlePluginConnect(ws) {
  ws.on('message', function(message) {
    pluginSocket = ws;
    try {
      const jsonData = JSON.parse(message);
      handlePluginCommand(jsonData);
    } catch (e) {
    }
  });
}

function handlePluginCommand(jsonData) {
  pluginCommandChannelMessageHandlers[jsonData.command] ?
    pluginCommandChannelMessageHandlers[jsonData.command](jsonData) :
    pluginCommandChannelMessageHandlers['default'](jsonData);
}

function handlePluginCompileComponent(jsonData) {
  if (jsonData) {
    messages.push(jsonData);
    if (receivedMsg_) {
      return;
    }
  } else if (messages.length > 0) {
    jsonData = messages[0];
  } else {
    return;
  }
  start = true;
  const receivedMsg = _.cloneDeep(jsonData);
  const compilerOptions = ts.readConfigFile(
    path.resolve(__dirname, '../tsconfig.json'), ts.sys.readFile).config.compilerOptions;
  Object.assign(compilerOptions, {
    'sourceMap': false
  });
  const sourceNode = ts.createSourceFile('preview.ets',
    'struct preview{build(){' + receivedMsg.data.script.replace(/new\s+\b(Circle|Ellipse|Rect|Path)\b/g,
      (item, item1) => {
        return 'special' + item1 + 'ForPreview';
      }) + '}}',
    ts.ScriptTarget.Latest, true, ts.ScriptKind.ETS, compilerOptions);
  compileWithCheck = jsonData.data.compileWithCheck || 'true';
  receivedMsg.data.variableScript = '';
  checkPreparation(receivedMsg, sourceNode);
  const previewStatements = [];
  const log = [];
  supplement = {
    isAcceleratePreview: true,
    line: parseInt(JSON.parse(receivedMsg.data.offset).line),
    column: parseInt(JSON.parse(receivedMsg.data.offset).column),
    fileName: receivedMsg.data.filePath || ''
  };
  try {
    processComponentChild(sourceNode.statements[0].members[1].body, previewStatements, log, supplement);
  } catch (e) {
    log.push({
      message: e.stack
    });
  }
  supplement.isAcceleratePreview = false;
  const newSource = ts.factory.updateSourceFile(sourceNode, previewStatements);
  const transformedSourceFile = transformResourceNode(newSource, log);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printNode(ts.EmitHint.Unspecified, transformedSourceFile, transformedSourceFile);
  receivedMsg.data.script = ts.transpileModule(result, {}).outputText.replace(
    /\bspecial(Circle|Ellipse|Rect|Path)ForPreview\b/g, (item, item1) => {
      return 'new ' + item1;
    });
  receivedMsg.data.log = log;
  if (receivedMsg.data.viewID) {
    receivedMsg.data.script = receivedMsg.data.variableScript + `function quickPreview(context) {
      const fastPreview = function build(){
        ${receivedMsg.data.script}
      }.bind(context);
      fastPreview();
    }
    quickPreview(GetRootView().findChildByIdForPreview(${receivedMsg.data.viewID}))`;
  }
  callEs2abc(receivedMsg);
}

function transformResourceNode(newSource, log) {
  const transformerFactory = (context) => {
    return (rootNode) => {
      function visit(node) {
        node = ts.visitEachChild(node, visit, context);
        return processResourceNode(node, log);
      }
      return ts.visitNode(rootNode, visit);
    };
  };
  const transformationResult = ts.transform(newSource, [transformerFactory]);
  return transformationResult.transformed[0];
}

function processResourceNode(node, log) {
  if (isResource(node)) {
    return processResourceData(node, '', {isAcceleratePreview: true, log: log});
  } else if (isAnimateToOrImmediately(node)) {
    return processAnimateToOrImmediately(node);
  } else {
    return node;
  }
}

function checkPreparation(receivedMsg, sourceNode) {
  let variableScript = '';
  if (previewCacheFilePath && fs.existsSync(previewCacheFilePath) && compileWithCheck === 'true') {
    globalVariable = receivedMsg.data.globalVariable || globalVariable;
    globalVariable = globalVariable.map((item) => {
      globalDeclaration.set(item.identifier, item.declaration);
      return item.identifier;
    });
    for (const [key, value] of sourceNode.identifiers) {
      if (globalVariable.includes(key)) {
        variableScript += globalDeclaration.get(key) + '\n';
      } else if (key.startsWith('$$') && globalVariable.includes(key.substring(2))) {
        variableScript += globalDeclaration.get(key.substring(2)) + '\n';
      }
    }
    propertyVariable = receivedMsg.data.propertyVariable || propertyVariable;
    receivedMsg.data.variableScript = ts.transpileModule(variableScript, {}).outputText;
    writeFileSync(previewCacheFilePath, variableScript + 'struct preview{build(){' + receivedMsg.data.script + '}}');
  }
}

function callEs2abc(receivedMsg) {
  if (fs.existsSync(es2abcFilePath + '.exe') || fs.existsSync(es2abcFilePath)) {
    es2abc(receivedMsg);
  } else {
    es2abcFilePath = path.join(__dirname, '../bin/ark/build-mac/bin/es2abc');
    if (fs.existsSync(es2abcFilePath)) {
      es2abc(receivedMsg);
    }
  }
}

function es2abc(receivedMsg) {
  try {
    const transCode = spawn(es2abcFilePath,
      ['--base64Input', Buffer.from(receivedMsg.data.script).toString('base64'), '--base64Output'], {windowsHide: true});
    transCode.stdout.on('data', (data) => {
      receivedMsg.data.script = data.toString();
      nextResponse(receivedMsg);
    });
    transCode.stderr.on('data', (data) => {
      receivedMsg.data.script = '';
      nextResponse(receivedMsg);
    });
  } catch (e) {
    if (checkStatus) {
      getOverLengthCode(receivedMsg);
    } else {
      codeOverMaxlength = true;
      receivedMsg_ = receivedMsg;
    }
  }
}

function getOverLengthCode(receivedMsg) {
  writeFileSync(previewJsFilePath, receivedMsg.data.script);
  const cmd = '"' + es2abcFilePath + '" ' + previewJsFilePath + ' --output ' + previewAbcFilePath;
  execSync(cmd, {windowsHide: true});
  if (fs.existsSync(previewAbcFilePath)) {
    receivedMsg.data.script = fs.readFileSync(previewAbcFilePath).toString('base64');
  } else {
    receivedMsg.data.script = '';
  }
  nextResponse(receivedMsg);
}

function nextResponse(receivedMsg) {
  compileStatus = true;
  receivedMsg_ = receivedMsg;
  responseToPlugin();
}

function resolveDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (validateError(message)) {
    if (diagnostic.file) {
      const { line, character } =
        diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      errorInfo.push(
        `ArkTS:ERROR File: ${diagnostic.file.fileName}:${line + 1}:${character + 1}\n ${message}\n`);
    } else {
      errorInfo.push(`ArkTS:ERROR: ${message}`);
    }
  }
}

function delayPrintLogCount() {
  if (start == true) {
    checkStatus = true;
    if (codeOverMaxlength && !errorInfo.length && !receivedMsg_.data.log.length) {
      getOverLengthCode(receivedMsg_);
    } else {
      if (codeOverMaxlength) {
        compileStatus = true;
      }
      responseToPlugin();
    }
  }
}

function responseToPlugin() {
  if ((compileWithCheck !== 'true' && compileStatus == true) ||
    (compileWithCheck === 'true' && compileStatus == true && checkStatus == true)) {
    if (receivedMsg_) {
      if (errorInfo && errorInfo.length) {
        receivedMsg_.data.log =  receivedMsg_.data.log || [];
        receivedMsg_.data.log.push(...errorInfo);
      }
      if (callback) {
        callback(JSON.stringify(receivedMsg_));
        afterResponse();
      } else {
        pluginSocket.send(JSON.stringify(receivedMsg_), (err) => {
          afterResponse();
        });
      }
    }
  }
}

function afterResponse() {
  start = false;
  checkStatus = false;
  compileStatus = false;
  codeOverMaxlength = false;
  errorInfo = [];
  receivedMsg_ = undefined;
  globalDeclaration.clear();
  messages.shift();
  if (messages.length > 0) {
    handlePluginCompileComponent();
  }
}

function validateError(message) {
  const stateInfoReg = /Property\s*'(\$?[_a-zA-Z0-9]+)' does not exist on type/;
  const $$InfoReg = /Cannot find name\s*'(\$\$[_a-zA-Z0-9]+)'/;
  if (matchMessage(message, [...propertyVariable, ...props], stateInfoReg) ||
    matchMessage(message, [...dollarCollection], $$InfoReg)) {
    return false;
  }
  return true;
}

function matchMessage(message, nameArr, reg) {
  if (reg.test(message)) {
    const match = message.match(reg);
    if (match[1] && nameArr.includes(match[1])) {
      return true;
    }
  }
  return false;
}

module.exports = {
  init,
  buildPipeServer
};
