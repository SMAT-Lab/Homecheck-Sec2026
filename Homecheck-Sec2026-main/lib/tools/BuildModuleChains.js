"use strict";
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildModuleChains = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const Local_1 = require("arkanalyzer/lib/core/base/Local");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const path_1 = __importDefault(require("path"));
const FileUtils_1 = require("../utils/common/FileUtils");
const OUTPUT_DIR_PATH = './ModuleChains';
const FILE_NAME_CHAINS_JSON = 'ModuleChains.json';
const FILE_NAME_FILE_ID_MAP = 'FileIdMap.json';
const FILE_NAME_CHAINS_TXT = 'ModuleChains.txt';
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.TOOL, 'BuildModuleChains');
const gFinishScanMap = new Map();
const gNodeMap = new Map();
const gModuleIdMap = new Map();
const repeatFilePath = [];
let gOutPutDirPath = OUTPUT_DIR_PATH;
let gIsSkipSdk = true;
let gOutStorage = '';
let gOutNum = 0;
function buildModuleChains(scene, arkFiles, outputDirPath) {
    let fileNameFlag = '';
    if (outputDirPath.length !== 0) {
        gOutPutDirPath = outputDirPath;
    }
    if (arkFiles.length === 0) {
        fileNameFlag = 'allFiles';
        arkFiles = scene.getFiles();
    }
    else {
        fileNameFlag = arkFiles[0].getName();
    }
    let isOutput = false;
    for (const arkFile of arkFiles) {
        const busyArray = new Array();
        fileProcess(arkFile, busyArray);
    }
    logger.debug('Scan completed, start to write file...');
    isOutput = genResultForJson(scene, fileNameFlag);
    clearGlobalMem();
    return isOutput;
}
exports.buildModuleChains = buildModuleChains;
function clearGlobalMem() {
    gFinishScanMap.clear();
    gNodeMap.clear();
    gModuleIdMap.clear();
    repeatFilePath.length = 0;
    gOutStorage = '';
    gOutNum = 0;
}
function genResultForJson(scene, fileName) {
    for (const [module] of gFinishScanMap) {
        if (typeof module === 'string') {
            const uniqueId = genUniqueId();
            genJsonNode(scene, module, uniqueId);
        }
    }
    return outputNodeList(fileName.replace(/[\\/]/g, '_'));
}
function genUniqueId() {
    return Math.random().toString(36).substring(2);
}
function genJsonNode(scene, module, uniqueId) {
    const nodeInfo = genNodeInfo(scene, module);
    if (nodeInfo) {
        gNodeMap.set(uniqueId, { nodeInfo: nodeInfo, nextNodes: [] });
        gModuleIdMap.set(module, uniqueId);
    }
    else {
        logger.warn(`create nodeInfo failed!`);
    }
    let nextNodeList = gFinishScanMap.get(module);
    if (!nextNodeList) {
        return;
    }
    for (const nextNode of nextNodeList) {
        let nextUniqueId = gModuleIdMap.get(nextNode);
        if (nextUniqueId) {
            gNodeMap.get(uniqueId)?.nextNodes.push(nextUniqueId);
        }
        else {
            nextUniqueId = genUniqueId();
            gNodeMap.get(uniqueId)?.nextNodes.push(nextUniqueId);
            genJsonNode(scene, nextNode, nextUniqueId);
        }
    }
}
function classTypeToString(scene, classSign) {
    const type = scene.getClass(classSign)?.getCategory();
    switch (type) {
        case ArkClass_1.ClassCategory.CLASS:
            return 'class';
        case ArkClass_1.ClassCategory.STRUCT:
            return 'struct';
        case ArkClass_1.ClassCategory.INTERFACE:
            return 'interface';
        case ArkClass_1.ClassCategory.ENUM:
            return 'enum';
        case ArkClass_1.ClassCategory.TYPE_LITERAL:
            return 'literal';
        case ArkClass_1.ClassCategory.OBJECT:
            return 'object';
        default:
            return '';
    }
}
var NodeType;
(function (NodeType) {
    NodeType[NodeType["FILE"] = 0] = "FILE";
    NodeType[NodeType["NAMESPACE"] = 1] = "NAMESPACE";
    NodeType[NodeType["CLASS"] = 2] = "CLASS";
    NodeType[NodeType["STRUCT"] = 3] = "STRUCT";
    NodeType[NodeType["INTERFACE"] = 4] = "INTERFACE";
    NodeType[NodeType["ENUM"] = 5] = "ENUM";
    NodeType[NodeType["TYPE_LITERAL"] = 6] = "TYPE_LITERAL";
    NodeType[NodeType["OBJECT"] = 7] = "OBJECT";
    NodeType[NodeType["FUNCTION"] = 8] = "FUNCTION";
    NodeType[NodeType["VARIABLE"] = 9] = "VARIABLE";
})(NodeType || (NodeType = {}));
function genNodeInfo(scene, module) {
    let nodeInfo = null;
    if (module instanceof arkanalyzer_1.ClassSignature) {
        const type = scene.getClass(module)?.getCategory();
        nodeInfo = {
            filePath: module.getDeclaringFileSignature().getFileName(),
            name: module.getClassName(),
            // 底座ArkClass的枚举值差2
            type: (type !== undefined) ? type + 2 : -1,
            line: -1
        };
    }
    else if (module instanceof arkanalyzer_1.MethodSignature) {
        let className = module.getDeclaringClassSignature()?.getClassName();
        if (className === arkanalyzer_1.DEFAULT_ARK_CLASS_NAME) {
            className = module.getDeclaringClassSignature().getDeclaringNamespaceSignature()?.getNamespaceName() ?? '';
        }
        let methodName = module.getMethodSubSignature().getMethodName();
        const methodLine = scene.getMethod(module)?.getLine();
        let curLine = -1;
        if (methodLine) {
            curLine = methodLine;
        }
        methodName = className.length > 0 ? `${className}.${methodName}` : methodName;
        nodeInfo = {
            filePath: module.getDeclaringClassSignature()?.getDeclaringFileSignature().getFileName(),
            name: methodName,
            type: NodeType.FUNCTION,
            line: curLine
        };
    }
    else if (module instanceof arkanalyzer_1.NamespaceSignature) {
        nodeInfo = {
            filePath: module.getDeclaringFileSignature().getFileName(),
            name: module.getNamespaceName(),
            type: NodeType.NAMESPACE,
            line: -1
        };
    }
    else if (module instanceof arkanalyzer_1.LocalSignature) {
        const fileSign = module.getDeclaringMethodSignature().getDeclaringClassSignature().getDeclaringFileSignature();
        const methodLine = scene.getMethod(module.getDeclaringMethodSignature())?.getLine();
        let curLine = -1;
        if (methodLine) {
            curLine = methodLine;
        }
        nodeInfo = {
            filePath: fileSign.getFileName() ?? '',
            name: module.getName(),
            type: NodeType.VARIABLE,
            line: curLine
        };
    }
    else if (typeof module === 'string') {
        nodeInfo = {
            filePath: module,
            name: path_1.default.basename(module),
            type: NodeType.FILE,
            line: -1
        };
    }
    return nodeInfo;
}
function genResultForChains(arkFile) {
    for (const [module] of gFinishScanMap) {
        if (typeof (module) === 'string' && module.includes(arkFile.getFileSignature().getFileName().replace(/\//g, '\\'))) {
            genChain(module);
        }
    }
    if (gOutStorage.length > 0 && outputStorage()) {
        logger.info(gOutStorage.length + ' chains have been written to the file.');
        return true;
    }
    return false;
}
function genChain(module, headChain = '') {
    const nextNodes = gFinishScanMap.get(module);
    if (nextNodes) {
        for (const nextNode of nextNodes) {
            genChain(nextNode, headChain + module.toString().replace(`/${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}./g`, '') + '\n>>');
        }
    }
    else {
        gOutStorage += headChain + module.toString().replace(`/${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}./g`, '') + '\n';
        gOutNum++;
        if (gOutNum >= 1000 && outputStorage()) {
            gOutStorage = '';
            gOutNum = 0;
        }
    }
}
function fileProcess(arkFile, busyArray) {
    const filePath = path_1.default.join('@' + arkFile.getProjectName(), (0, arkanalyzer_1.transfer2UnixPath)(arkFile.getName()));
    if (!busyArray.includes(filePath) && !repeatFilePath.includes(filePath)) {
        repeatFilePath.push(filePath);
        busyArray.push(filePath);
        const importList = arkFile.getImportInfos();
        for (const importModule of importList) {
            const moduleSign = importModule.getLazyExportInfo()?.getArkExport()?.getSignature();
            if (!moduleSign) {
                continue;
            }
            // 添加文件间依赖
            const importFile = importModule.getLazyExportInfo()?.getDeclaringArkFile();
            if (importFile) {
                fileProcess(importFile, busyArray);
            }
            moduleDeeplyProcess(moduleSign, busyArray, arkFile.getScene());
        }
        if (busyArray.length > 1 && typeof (busyArray[busyArray.length - 1]) === 'string') {
            addLastNodeToMap(busyArray);
        }
        // 查找全局调用
        findGlobalDef(arkFile.getDefaultClass().getDefaultArkMethod(), busyArray);
        busyArray.pop();
    }
}
function findGlobalDef(dfltMethod, busyArray) {
    const stmts = dfltMethod?.getBody()?.getCfg().getStmts();
    for (const stmt of stmts ?? []) {
        if (stmt instanceof arkanalyzer_1.ArkInvokeStmt) {
            busyArray.push(stmt.getInvokeExpr().getMethodSignature());
            addLastNodeToMap(busyArray);
            busyArray.pop();
        }
    }
}
function moduleDeeplyProcess(moduleSign, busyArray, scene) {
    if (moduleSign instanceof arkanalyzer_1.ClassSignature) {
        classProcess(scene.getClass(moduleSign), busyArray);
    }
    else if (moduleSign instanceof arkanalyzer_1.MethodSignature) {
        methodProcess(scene.getMethod(moduleSign), busyArray);
    }
    else if (moduleSign instanceof arkanalyzer_1.NamespaceSignature) {
        namespaceProcess(scene.getNamespace(moduleSign), busyArray);
    }
    else if (moduleSign instanceof arkanalyzer_1.LocalSignature) {
        busyArray.push(moduleSign);
        addLastNodeToMap(busyArray);
        busyArray.pop();
    }
}
function namespaceProcess(ns, busyArray) {
    if (!ns || busyArray.includes(ns.getSignature())) {
        return;
    }
    const nsSign = ns.getSignature();
    busyArray.push(nsSign);
    addLastNodeToMap(busyArray);
    // 遍历过的节点不再遍历
    if (gFinishScanMap.has(nsSign)) {
        busyArray.pop();
        return;
    }
    // 处理sdk跳过逻辑
    if (gIsSkipSdk && nsSign.getDeclaringFileSignature().getProjectName() !== ns.getDeclaringArkFile().getScene().getProjectName()) {
        busyArray.pop();
        return;
    }
    // 处理当前层ns的类
    for (const arkClass of ns.getClasses()) {
        classProcess(arkClass, busyArray);
    }
    // 递归处理嵌套ns的类
    for (const innerNs of ns.getNamespaces()) {
        namespaceProcess(innerNs, busyArray);
    }
    busyArray.pop();
}
function classProcess(arkClass, busyArray) {
    if (!arkClass || busyArray.includes(arkClass.getSignature())) {
        return;
    }
    const arkClassSign = arkClass.getSignature();
    busyArray.push(arkClassSign);
    if (!arkClass.isAnonymousClass()) {
        addLastNodeToMap(busyArray);
    }
    // 遍历过的节点不再遍历
    if (gFinishScanMap.has(arkClassSign)) {
        busyArray.pop();
        return;
    }
    // 处理sdk跳过逻辑
    if (gIsSkipSdk && arkClassSign.getDeclaringFileSignature().getProjectName() !== arkClass.getDeclaringArkFile().getScene().getProjectName()) {
        busyArray.pop();
        return;
    }
    // 1、继承类处理
    superClassProcess(arkClass, busyArray);
    // 2、成员变量处理
    arkFieldProcess(arkClass, busyArray);
    // 3、方法内处理
    for (const arkMethod of arkClass.getMethods()) {
        methodProcess(arkMethod, busyArray);
    }
    busyArray.pop();
}
function methodProcess(arkMethod, busyArray) {
    if (!arkMethod || busyArray.includes(arkMethod.getSignature())) {
        return;
    }
    const arkMethodSign = arkMethod.getSignature();
    busyArray.push(arkMethodSign);
    if (!arkMethod.isAnonymousMethod()) {
        addLastNodeToMap(busyArray);
    }
    // 遍历过的节点不再遍历
    if (gFinishScanMap.has(arkMethodSign)) {
        busyArray.pop();
        return;
    }
    // 处理sdk跳过逻辑
    if (gIsSkipSdk && arkMethod.getDeclaringArkFile().getProjectName() !== arkMethod.getDeclaringArkFile().getScene().getProjectName()) {
        busyArray.pop();
        return;
    }
    const stmts = arkMethod.getBody()?.getCfg()?.getStmts() ?? [];
    const arkFile = arkMethod.getDeclaringArkFile();
    for (const stmt of stmts) {
        if (stmt instanceof arkanalyzer_1.ArkInvokeStmt && stmt.getInvokeExpr() instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            // 判断static调用是否为import, 仅考虑静态调用，示例调用场景在new stmt中处理
            staticExprProcess(stmt.getInvokeExpr(), arkFile, busyArray);
        }
        else if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            // 判断右值中1、new class; 2、Local; 3、一元运算；4、二元运算；5、实例调用/实例字段 是否为import导入的模块
            rightOpProcess(stmt.getRightOp(), arkFile, busyArray);
        }
        else if (stmt instanceof arkanalyzer_1.ArkIfStmt) {
            // 判断ifStmt中变量或常量是否为import导入的模块
            ifStmtProcess(stmt, arkFile, busyArray);
        }
    }
    busyArray.pop();
}
function staticExprProcess(invokeExpr, arkFile, busyArray) {
    const methodSignature = invokeExpr.getMethodSignature();
    const classSignature = methodSignature.getDeclaringClassSignature();
    const methodName = methodSignature.getMethodSubSignature().getMethodName();
    let className = classSignature.getClassName();
    if (className === arkanalyzer_1.DEFAULT_ARK_CLASS_NAME) {
        className = classSignature.getDeclaringNamespaceSignature()?.getNamespaceName() ?? '';
    }
    const fileSign = classSignature.getDeclaringFileSignature();
    let invokeFilePath = arkFile.getScene().getFile(fileSign)?.getFilePath();
    if (invokeFilePath && invokeFilePath === arkFile.getFilePath()) {
        // 本文件的模块，深搜
        methodProcess(arkFile.getScene().getMethod(methodSignature), busyArray);
        return;
    }
    // 导入的模块
    for (const importInfo of arkFile.getImportInfos()) {
        const importName = importInfo.getImportClauseName();
        const typeSign = importInfo.getLazyExportInfo()?.getArkExport()?.getSignature();
        if (typeSign && (methodName === importName || className === importName)) {
            moduleDeeplyProcess(typeSign, busyArray, arkFile.getScene());
        }
    }
}
function ifStmtProcess(stmt, curFile, busyArray) {
    const op1 = stmt.getConditionExpr().getOp1();
    const op2 = stmt.getConditionExpr().getOp2();
    if (op1 instanceof Local_1.Local) {
        localProcess(op1, curFile, busyArray);
    }
    if (op2 instanceof Local_1.Local) {
        localProcess(op2, curFile, busyArray);
    }
}
function superClassProcess(arkClass, busyArray) {
    const superName = arkClass.getSuperClass()?.getName();
    if (!superName || busyArray.includes(arkClass.getSuperClass()?.getSignature())) {
        return;
    }
    for (const importInfo of arkClass.getDeclaringArkFile().getImportInfos()) {
        const typeSign = importInfo.getLazyExportInfo()?.getArkExport()?.getSignature();
        if (importInfo.getImportClauseName() === superName && typeSign) {
            moduleDeeplyProcess(typeSign, busyArray, arkClass.getDeclaringArkFile().getScene());
        }
    }
}
function arkFieldProcess(arkClass, busyArray) {
    const arkFields = arkClass.getFields();
    for (const arkField of arkFields) {
        const fieldStmts = arkField.getInitializer();
        for (const stmt of fieldStmts) {
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                rightOpProcess(stmt.getRightOp(), arkClass.getDeclaringArkFile(), busyArray);
            }
        }
    }
}
function rightOpProcess(rightOp, curFile, busyArray) {
    if (rightOp instanceof arkanalyzer_1.ArkNewExpr) {
        // 右值为new class场景
        const type = rightOp.getType();
        if (type instanceof arkanalyzer_1.ClassType) {
            newExprProcess(type, curFile, busyArray);
        }
    }
    else if (rightOp instanceof Local_1.Local) {
        // 右值为Local场景
        localProcess(rightOp, curFile, busyArray);
    }
    else if (rightOp instanceof arkanalyzer_1.ArkUnopExpr) {
        // 右值为一元运算场景
        const ops = rightOp.getUses();
        for (const op of ops) {
            if (op instanceof Local_1.Local) {
                localProcess(op, curFile, busyArray);
            }
        }
    }
    else if (rightOp instanceof arkanalyzer_1.ArkNormalBinopExpr) {
        // 右值为二元运算场景
        const op1 = rightOp.getOp1();
        const op2 = rightOp.getOp2();
        if (op1 instanceof Local_1.Local) {
            localProcess(op1, curFile, busyArray);
        }
        if (op2 instanceof Local_1.Local) {
            localProcess(op2, curFile, busyArray);
        }
    }
    else if (rightOp instanceof arkanalyzer_1.AbstractFieldRef) {
        moduleDeeplyProcess(rightOp.getFieldSignature().getDeclaringSignature(), busyArray, curFile.getScene());
    }
    else if (rightOp instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
        staticExprProcess(rightOp, curFile, busyArray);
    }
}
function newExprProcess(type, arkFile, busyArray) {
    const classSign = type.getClassSignature();
    const className = classSign.getClassName();
    const curFilePath = arkFile.getFilePath();
    const classFilePath = arkFile.getScene().getFile(classSign.getDeclaringFileSignature())?.getFilePath();
    if (!curFilePath || !classFilePath) {
        logger.debug('Get curFilePath or classFilePath failed.');
        return;
    }
    if (curFilePath === classFilePath) {
        // 本文件类
        classProcess(arkFile.getClass(classSign), busyArray);
    }
    else {
        // 非本文件类
        for (const importInfo of arkFile.getImportInfos()) {
            const typeSign = importInfo.getLazyExportInfo()?.getArkExport()?.getSignature();
            if (className === importInfo.getImportClauseName() && typeSign) {
                moduleDeeplyProcess(typeSign, busyArray, arkFile.getScene());
            }
        }
    }
}
function localProcess(rightOp, curFile, busyArray) {
    const type = rightOp.getType();
    // todo: Local变量为方法或者类地址，let a = class1，目前右值type为unknown，走else分支
    if (type instanceof arkanalyzer_1.ClassType) {
        if (rightOp.getName().includes(arkanalyzer_1.TEMP_LOCAL_PREFIX)) {
            return;
        }
        moduleDeeplyProcess(type.getClassSignature(), busyArray, curFile.getScene());
    }
    else if (type instanceof arkanalyzer_1.FunctionType) {
        moduleDeeplyProcess(type.getMethodSignature(), busyArray, curFile.getScene());
    }
    else {
        for (const importInfo of curFile.getImportInfos()) {
            const typeSign = importInfo.getLazyExportInfo()?.getArkExport()?.getSignature();
            if (importInfo.getImportClauseName() === rightOp.getName() && typeSign) {
                moduleDeeplyProcess(typeSign, busyArray, curFile.getScene());
                break;
            }
        }
    }
}
function isAnonymous(module) {
    return module.toString().includes('%A');
}
function addLastNodeToMap(busyArray) {
    let index = busyArray.length - 2;
    let lastModule = busyArray[index];
    while (isAnonymous(lastModule) && index > 0) {
        index--;
        lastModule = busyArray[index];
    }
    let curModule = busyArray[busyArray.length - 1];
    const storage = gFinishScanMap.get(lastModule);
    if (!storage) {
        gFinishScanMap.set(lastModule, [curModule]);
    }
    else if (!storage.includes(curModule)) {
        storage.push(curModule);
    }
}
function outputNodeList(fileName) {
    // 文件和节点编号映射落盘
    try {
        FileUtils_1.FileUtils.writeToFile(path_1.default.join(gOutPutDirPath, fileName + '_' + FILE_NAME_CHAINS_JSON), JSON.stringify(mapToJson(gNodeMap)), FileUtils_1.WriteFileMode.OVERWRITE);
        return true;
    }
    catch (error) {
        logger.error(error.message);
        return false;
    }
}
function outputStorage() {
    try {
        FileUtils_1.FileUtils.writeToFile(path_1.default.join(gOutPutDirPath, FILE_NAME_CHAINS_TXT), gOutStorage);
        return true;
    }
    catch (error) {
        logger.error(error.message);
        return false;
    }
}
function mapToJson(map) {
    const obj = Object.create(null);
    for (const [key, value] of map) {
        if (value instanceof Map) {
            // 递归转换嵌套的Map
            obj[key] = mapToJson(value);
        }
        else {
            obj[key] = value;
        }
    }
    return obj;
}
