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
exports.SymbolUsageCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = require("fs-extra");
const path_1 = __importDefault(require("path"));
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const FileUtils_1 = require("../../utils/common/FileUtils");
const Matchers_1 = require("../../matcher/Matchers");
const CheckerUtils_1 = require("../../utils/checker/CheckerUtils");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'SymbolUsageCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/specified-interface-call-chain-check.md',
    description: ''
};
const DEFAULT_CLASS_STR = arkanalyzer_1.DEFAULT_ARK_CLASS_NAME;
const DEFAULT_METHOD_STR = arkanalyzer_1.DEFAULT_ARK_METHOD_NAME;
const OUTPUT_FILE_NAME = 'specified-interface-call-chain-check_result.txt';
const DEFAULT_MAX_CHAINS = 5000;
let gChainsTotalNum = 0;
let gConfig = { outputDirPath: '', callChainMaxLen: 0 };
let gFinishedMapList = [];
let gFinishedMap;
let gFinishedEmptySetList = [];
let gFinishedEmptySet = new Set();
let gTargetInfoList = [];
let gTargetInfo;
let isParseConfig = false;
let isMaxPrint = false;
class CallInfo {
    callerPath = '';
    caller = '';
    calleePath = '';
    callee = '';
    lineNo = -1;
}
class SymbolUsageCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    excutedFunc;
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (arkFile) => {
        this.getTargetInfo([arkFile], this.rule.option);
        if (this.isExceededTheMaxNum()) {
            return [];
        }
        for (let i = 0; i < gTargetInfoList.length; i++) {
            gTargetInfo = gTargetInfoList[i];
            gFinishedMap = gFinishedMapList[i];
            gFinishedEmptySet = gFinishedEmptySetList[i];
            if (!this.checkTargetInfo(gTargetInfo, arkFile)) {
                continue;
            }
            this.findTargetInFiles(arkFile.getScene(), [arkFile]);
            gFinishedMapList[i].clear();
        }
    };
    checkTargetInfo(targetInfo, reportArkFile) {
        const targetFilePath = targetInfo.filePath;
        if (!targetInfo.enable) {
            return false;
        }
        if (!fs_1.default.existsSync(targetFilePath)) {
            // 目标api的路径不存在时，构建异常issue返回，且后续文件中不再扫描该api
            this.genErrorIssue(reportArkFile, 'The filePath of target is not exist: ' + targetFilePath);
            targetInfo.enable = false;
            return false;
        }
        if (gTargetInfo.selector === 'class' || gTargetInfo.selector === 'namespace' || gTargetInfo.selector === 'function' ||
            gTargetInfo.selector === 'property' || gTargetInfo.selector === 'type') {
            if (!gTargetInfo[gTargetInfo.selector] || gTargetInfo[gTargetInfo.selector].length === 0) {
                gTargetInfo.enable = false;
            }
        }
        else {
            logger.warn('Invalid selector, ' + gTargetInfo.selector);
            targetInfo.enable = false;
        }
        // 查找type时，屏蔽class和function的影响
        if (gTargetInfo.selector === 'type') {
            gTargetInfo.class = '';
            gTargetInfo.function = '';
        }
        return true;
    }
    getTargetInfo(arkFiles, otherObjs) {
        if (!otherObjs || isParseConfig) {
            return;
        }
        isParseConfig = true;
        for (let obj of otherObjs) {
            Object.entries(obj).forEach(([k, v]) => {
                if (k === 'outputDirPath' || k == 'callChainMaxLen') {
                    const config = obj;
                    gConfig.outputDirPath = config.outputDirPath ?? '';
                    gConfig.callChainMaxLen = config.callChainMaxLen ?? 0;
                    (0, fs_extra_1.removeSync)(path_1.default.join(gConfig.outputDirPath, OUTPUT_FILE_NAME));
                }
                if (k === 'selector' && v.length !== 0) {
                    let targetInfo = obj;
                    this.handleSelector(targetInfo, arkFiles, this.genErrorIssue.bind(this));
                }
            });
        }
    }
    handleSelector(targetInfo, arkFiles, genErrorIssue) {
        if (typeof targetInfo.namespace !== 'object') {
            logger.warn('Invalid namespace input, skip!');
            genErrorIssue(arkFiles[0], 'The value of namespace in code-linter.json5 must be of the array type.');
            return;
        }
        targetInfo.enable = true;
        targetInfo.namespace.reverse();
        gTargetInfoList.push(targetInfo);
        gFinishedMapList.push(new Map());
        gFinishedEmptySetList.push(new Set());
    }
    findTargetInFiles(scene, arkFiles) {
        for (const arkFile of arkFiles) {
            for (const arkClass of arkFile.getClasses()) {
                if (!arkClass.isAnonymousClass()) {
                    this.findTargetInClass(arkClass, scene, []);
                }
            }
            this.processClassesInNamespaces(arkFile, scene);
        }
        this.genIssueAndWriteFile(arkFiles);
    }
    // 处理单个 ArkFile 中命名空间下的类
    processClassesInNamespaces(arkFile, scene) {
        const namespaces = arkFile.getAllNamespacesUnderThisFile();
        for (const namespace of namespaces) {
            const classes = namespace.getClasses();
            for (const arkClass of classes) {
                if (!arkClass.isAnonymousClass()) {
                    this.findTargetInClass(arkClass, scene, []);
                }
            }
        }
    }
    findTargetInClass(arkClass, scene, busyNode) {
        let warnInfoList = [];
        const curSign = arkClass.getSignature();
        if (busyNode.includes(curSign)) {
            return [];
        }
        if (gFinishedEmptySet.has(curSign)) {
            return [];
        }
        const storage = gFinishedMap.get(curSign);
        if (storage) {
            return storage;
        }
        busyNode.push(curSign);
        if (['namespace', 'class'].includes(gTargetInfo.selector)) {
            const superWarnInfo = this.findClassOrNsInSuper(arkClass, scene);
            if (superWarnInfo.length !== 0) {
                warnInfoList = warnInfoList.concat(superWarnInfo);
            }
            else {
                warnInfoList = warnInfoList.concat(this.findInterfaceInimplements(arkClass, scene));
            }
        }
        warnInfoList = warnInfoList.concat(this.arkFieldProcess(arkClass.getFields(), scene, busyNode));
        for (const arkMethod of arkClass.getMethods()) {
            const warnInfo = this.findTargetInMethod(arkMethod, scene, busyNode);
            // struct之外的传统类不深度遍历，不缓存结果
            if (arkClass.getCategory() === ArkClass_1.ClassCategory.STRUCT) {
                warnInfoList = warnInfoList.concat(warnInfo);
            }
        }
        if (warnInfoList.length > 0) {
            gFinishedMap.set(curSign, warnInfoList);
        }
        else {
            gFinishedEmptySet.add(curSign);
        }
        busyNode.pop();
        return warnInfoList;
    }
    getExcutedFunc() {
        switch (gTargetInfo.selector) {
            case 'function':
                return this.findFuncInStmt;
            case 'class':
            case 'namespace':
                return this.findClassOrNsInStmt;
            case 'property':
                return this.findPropertyInStmt;
            case 'type':
                return this.findTypeInStmt;
            default:
                return null;
        }
    }
    arkFieldProcess(arkFields, scene, busyNode) {
        if (gConfig.callChainMaxLen !== 0 && this.getChainsLen(busyNode) >= gConfig.callChainMaxLen) {
            return [];
        }
        let warnInfoList = [];
        this.excutedFunc = this.getExcutedFunc();
        if (!this.excutedFunc) {
            return [];
        }
        for (const arkField of arkFields) {
            const stmts = arkField.getInitializer();
            for (const stmt of stmts) {
                const retList = this.excutedFunc(stmt, scene, busyNode, arkField);
                warnInfoList = warnInfoList.concat(retList);
            }
        }
        return warnInfoList;
    }
    genErrorIssue(reportFile, errMsg) {
        const description = errMsg;
        const filePath = reportFile.getFilePath();
        let defects = new Index_1.Defects(0, 0, 0, description, this.rule.alert ?? this.metaData.severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
    isExceededTheMaxNum() {
        if (gChainsTotalNum >= DEFAULT_MAX_CHAINS) {
            if (!isMaxPrint) {
                logger.warn('The number of call chains has exceeded ' + DEFAULT_MAX_CHAINS + ', skip!');
                isMaxPrint = true;
            }
            return true;
        }
        return false;
    }
    genIssueAndWriteFile(arkFiles) {
        let batchContent = '';
        gFinishedMap.forEach((warnInfoList, signature) => {
            if (this.isExceededTheMaxNum()) {
                return;
            }
            if (this.filterSign(signature, arkFiles[0])) {
                batchContent = this.processWarnInfoList(warnInfoList, arkFiles);
            }
        });
        if (gConfig.outputDirPath.length > 0 && batchContent.length > 0) {
            try {
                FileUtils_1.FileUtils.writeToFile(path_1.default.join(gConfig.outputDirPath, OUTPUT_FILE_NAME), batchContent);
                batchContent = '';
            }
            catch (error) {
                logger.warn(error);
            }
        }
    }
    processWarnInfoList(warnInfoList, arkFiles) {
        let batchContent = '';
        warnInfoList.forEach((warnInfo) => {
            if (this.isExceededTheMaxNum() || warnInfo.line === -1 || warnInfo.startCol === -1) {
                return;
            }
            const description = 'The call chain of the specified interface as follows: ' +
                warnInfo.usedChain?.slice(0, -3);
            const filePath = path_1.default.join(arkFiles[0].getScene().getRealProjectDir(), this.getFilePathInUsedChain(warnInfo.usedChain ?? ''));
            let defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, description, this.rule.alert ?? this.metaData.severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
            gChainsTotalNum++;
            if (gConfig.outputDirPath.length === 0) {
                return;
            }
            batchContent = this.convertUsedChain(warnInfo.usedChain, arkFiles[0].getScene().getRealProjectDir()) + '\n';
            if (gChainsTotalNum % 1000 === 0) {
                try {
                    FileUtils_1.FileUtils.writeToFile(path_1.default.join(gConfig.outputDirPath, OUTPUT_FILE_NAME), batchContent);
                    batchContent = '';
                }
                catch (error) {
                    logger.warn(error);
                }
            }
        });
        return batchContent;
    }
    filterSign(signature, arkFile) {
        if (signature instanceof arkanalyzer_1.MethodSignature) {
            const classSign = signature.getDeclaringClassSignature();
            const classType = arkFile.getScene().getClass(classSign)?.getCategory();
            if (classType === ArkClass_1.ClassCategory.STRUCT && gFinishedMap.has(classSign)) {
                return false;
            }
            const fileName = signature.getDeclaringClassSignature().getDeclaringFileSignature().getFileName();
            return (fileName === arkFile.getName());
        }
        else if (signature instanceof arkanalyzer_1.ClassSignature) {
            const arkClass = arkFile.getScene().getClass(signature);
            if (arkClass && !arkClass.isAnonymousClass()) {
                return (signature.getDeclaringFileSignature().getFileName() === arkFile.getName());
            }
        }
        return false;
    }
    convertUsedChain(usedChain, rootPath) {
        const nodes = usedChain.split('\n>>');
        let callInfoList = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            const node = nodes[i];
            const warnInfos = node.split(':');
            let callInfo = new CallInfo();
            callInfoList.push(callInfo);
            let filePathIndex = 0;
            if (warnInfos.length === 4) {
                callInfo.callerPath = warnInfos[0] + ':' + warnInfos[1];
                filePathIndex = 1;
            }
            else {
                callInfo.callerPath = warnInfos[0];
            }
            callInfo.callee = warnInfos[filePathIndex + 2];
            if (i > 0) {
                callInfo.caller = callInfoList[i - 1].callee;
                callInfoList[i - 1].calleePath = callInfo.callerPath;
            }
            callInfo.lineNo = parseInt(warnInfos[filePathIndex + 1]);
            // 最后一个callPath一定为目标filePath，直接填入
            if (i === nodes.length - 2) {
                callInfoList[i].calleePath = path_1.default.relative(rootPath, gTargetInfo.filePath);
            }
        }
        return JSON.stringify(callInfoList);
    }
    getFilePathInUsedChain(usedChain) {
        let warnInfo = usedChain.split('\n>>')[0].split(':');
        if (warnInfo.length === 4) {
            return warnInfo[0] + ':' + warnInfo[1];
        }
        else if (warnInfo.length === 3) {
            return warnInfo[0];
        }
        return '';
    }
    genNsList(module) {
        let nsList = [];
        if (module instanceof arkanalyzer_1.ArkClass) {
            let ns = module.getDeclaringArkNamespace() ?? null;
            while (ns) {
                nsList.push(ns.getName());
                ns = ns.getDeclaringArkNamespace();
            }
        }
        else if (module instanceof arkanalyzer_1.ClassSignature) {
            let nsSign = module.getDeclaringNamespaceSignature();
            while (nsSign) {
                nsList.push(nsSign.getNamespaceName());
                nsSign = nsSign.getDeclaringNamespaceSignature();
            }
        }
        else if (module instanceof arkanalyzer_1.MethodSignature) {
            let nsSign = module.getDeclaringClassSignature().getDeclaringNamespaceSignature();
            while (nsSign) {
                nsList.push(nsSign.getNamespaceName());
                nsSign = nsSign.getDeclaringNamespaceSignature();
            }
        }
        else if (module instanceof arkanalyzer_1.NamespaceSignature) {
            nsList.push(module.getNamespaceName());
            let nsSign = module.getDeclaringNamespaceSignature();
            while (nsSign) {
                nsList.push(nsSign.getNamespaceName());
                nsSign = nsSign.getDeclaringNamespaceSignature();
            }
        }
        return nsList;
    }
    findClassOrNsInSuper(arkClass, scene) {
        let targetSign = arkClass.getSuperClass()?.getSignature();
        if (gTargetInfo.selector === 'namespace') {
            targetSign = targetSign?.getDeclaringNamespaceSignature();
        }
        if (this.isTargetClassOrNs(targetSign, scene)) {
            const relativePath = arkClass.getDeclaringArkFile().getName();
            const line = arkClass.getLine();
            let startCol = arkClass.getColumn();
            const originText = arkClass.getCode()?.split('\n')[0];
            let targetName = gTargetInfo.class;
            const targetNameSpaceName = gTargetInfo.namespace.slice().reverse().join('.');
            // 加上extends去精确匹配
            if (targetNameSpaceName.length > 0) {
                if (gTargetInfo.selector === 'namespace') {
                    targetName = targetNameSpaceName;
                }
                else {
                    targetName = targetNameSpaceName + '.' + targetName;
                }
            }
            let pos = originText?.indexOf('extends ' + targetName);
            if (!pos || pos === -1) {
                return [];
            }
            // 匹配后，需要还原关键字计算列号
            if (gTargetInfo.selector === 'class' && targetNameSpaceName.length > 0) {
                startCol += pos + 'extends '.length + targetNameSpaceName.length + 1;
                targetName = gTargetInfo.class;
            }
            else {
                startCol += pos + 'extends '.length;
            }
            const endCol = startCol + targetName.length - 1;
            const useChain = relativePath + ':' + line + ':' + targetName + '\n>>';
            return [{ line: line, startCol: startCol, endCol: endCol, usedChain: useChain }];
        }
        return [];
    }
    findInterfaceInimplements(arkClass, scene) {
        const interfaceNames = arkClass.getImplementedInterfaceNames();
        let targetName = gTargetInfo.class;
        const targetNameSpaceName = gTargetInfo.namespace.slice().reverse().join('.');
        if (gTargetInfo.selector === 'namespace') {
            targetName = targetNameSpaceName;
        }
        else if (targetNameSpaceName.length > 0) {
            targetName = targetNameSpaceName + '.' + gTargetInfo.class;
        }
        const matchInterfaceName = interfaceNames.filter(name => name.includes(targetName));
        if (matchInterfaceName.length !== 0) {
            const interfaceIns = arkClass.getImplementedInterface(matchInterfaceName[0]);
            if (!(interfaceIns instanceof arkanalyzer_1.ArkClass)) {
                return [];
            }
            let targetSign = interfaceIns.getSignature();
            if (gTargetInfo.selector === 'namespace') {
                targetSign = targetSign.getDeclaringNamespaceSignature();
            }
            if (this.isTargetClassOrNs(targetSign, scene)) {
                const relativePath = arkClass.getDeclaringArkFile().getName();
                const line = arkClass.getLine();
                let startCol = arkClass.getColumn();
                const originText = arkClass.getCode()?.split('\n')[0];
                let pos = originText?.indexOf('implements ' + targetName);
                if (!pos || pos === -1) {
                    return [];
                }
                // 匹配后，需要还原关键字计算列号
                if (gTargetInfo.selector === 'class' && targetNameSpaceName.length > 0) {
                    startCol += pos + 'implements '.length + targetNameSpaceName.length + 1;
                    targetName = gTargetInfo.class;
                }
                else {
                    startCol += pos + 'implements '.length;
                }
                const endCol = startCol + targetName.length - 1;
                const useChain = relativePath + ':' + line + ':' + targetName + '\n>>';
                return [{ line: line, startCol: startCol, endCol: endCol, usedChain: useChain }];
            }
        }
        return [];
    }
    findFuncInArgs(invokeExpr, scene, busyNode) {
        let invokeArgvs = invokeExpr.getArgs();
        let warnInfoList = [];
        for (let argv of invokeArgvs) {
            let type = argv.getType();
            if (type instanceof arkanalyzer_1.FunctionType) {
                let anonymousMethod = scene.getMethod(type.getMethodSignature());
                if (anonymousMethod === null) {
                    logger.debug('Find FunctionType method error!');
                    continue;
                }
                if (busyNode.includes(anonymousMethod.getSignature())) {
                    continue;
                }
                warnInfoList.concat(this.findTargetInMethod(anonymousMethod, scene, busyNode));
            }
        }
        return warnInfoList;
    }
    getChainsLen(busyNode) {
        let len = 0;
        busyNode.forEach((node) => {
            len = node instanceof arkanalyzer_1.MethodSignature ? len + 1 : len;
        });
        return len;
    }
    /**
     * Search the symbol api in deeply.
     *
     * @param method Method to be checked.
     * @param scene Scene
     * @param busyNode the set of busy methods.
     * @returns return all of the matched usedChain.
     */
    findTargetInMethod(method, scene, busyNode) {
        const stmts = method.getBody()?.getCfg()?.getStmts();
        const chainsLen = this.getChainsLen(busyNode);
        if (!stmts || (gConfig.callChainMaxLen !== 0 && chainsLen >= gConfig.callChainMaxLen)) {
            return [];
        }
        let warnInfoList = [];
        const curMethodSignature = method.getSignature();
        if (gFinishedEmptySet.has(curMethodSignature)) {
            return [];
        }
        const matchWarnInfoList = gFinishedMap.get(curMethodSignature);
        if (matchWarnInfoList) { // 已遍历过的方法直接从map缓存中获取结果
            return gConfig.callChainMaxLen === 0 ? matchWarnInfoList :
                this.getChainsInWithLen(matchWarnInfoList, gConfig.callChainMaxLen - chainsLen);
        }
        this.excutedFunc = this.getExcutedFunc();
        if (!this.excutedFunc) {
            return [];
        }
        busyNode.push(curMethodSignature);
        // 处理方法体中所有stmt
        for (const stmt of stmts) {
            warnInfoList = warnInfoList.concat(this.excutedFunc(stmt, scene, busyNode));
        }
        // 处理方法体中所有的type定义
        warnInfoList = warnInfoList.concat(this.findTargetInTypeMap(scene, method.getBody()?.getAliasTypeMap()));
        // 处理泛型方法
        warnInfoList = warnInfoList.concat(this.findTargetInGeneric(method, method.getGenericTypes()));
        busyNode.pop();
        // 有调用链放进map，无调用链放进遍历过的空集合，不再重复遍历
        if (warnInfoList.length > 0) {
            gFinishedMap.set(curMethodSignature, warnInfoList);
        }
        else {
            gFinishedEmptySet.add(curMethodSignature);
        }
        return warnInfoList;
    }
    findTargetInGeneric(method, genericTypes) {
        let warnList = [];
        if (!genericTypes) {
            return [];
        }
        for (const genericType of genericTypes) {
            const constraint = genericType.getConstraint();
            if (!(constraint instanceof arkanalyzer_1.AliasType)) {
                continue;
            }
            const typeName = this.isTargetWithAliasType(constraint, method.getDeclaringArkFile().getScene());
            if (typeName.length !== 0) {
                const warnInfo = this.getLineColFromGeneric(method, typeName);
                if (warnInfo.startCol !== -1 || warnInfo.line !== -1) {
                    warnList.push(warnInfo);
                }
            }
        }
        return warnList;
    }
    getChainsInWithLen(warnList, chainsLen) {
        return warnList.filter((warnInfo) => {
            return warnInfo.usedChain?.split('\n>>').length - 1 <= chainsLen;
        });
    }
    findTargetInTypeMap(scene, typeMap) {
        let warnInfoList = [];
        if (!typeMap) {
            return warnInfoList;
        }
        for (const [, val] of typeMap) {
            const originType = val[0].getOriginalType();
            let targetName = '';
            if (originType instanceof arkanalyzer_1.FunctionType) {
                targetName = this.isTargetWithMethodSign(originType.getMethodSignature(), scene);
            }
            else if (originType instanceof arkanalyzer_1.ClassType) {
                targetName = this.isTargetWithClassSign(originType.getClassSignature(), scene);
            }
            else if (originType instanceof arkanalyzer_1.AliasType) {
                targetName = this.isTargetWithAliasType(originType, scene);
            }
            if (targetName.length === 0) {
                continue;
            }
            const warnInfo = this.getLineColFromStmt(val[1], targetName);
            if (warnInfo.line !== -1 && warnInfo.startCol !== -1) {
                warnInfoList.push(warnInfo);
            }
        }
        return warnInfoList;
    }
    isTargetWithMethodSign(methodSign, scene) {
        const methodName = methodSign.getMethodSubSignature().getMethodName();
        const className = methodSign.getDeclaringClassSignature().getClassName();
        if (gTargetInfo.selector === 'function') {
            return this.isTargetMethod(methodName, className, methodSign, scene) ? gTargetInfo.function : '';
        }
        else if (gTargetInfo.selector === 'class') {
            return this.isTargetClassOrNs(methodSign.getDeclaringClassSignature(), scene) ? gTargetInfo.class : '';
        }
        else if (gTargetInfo.selector === 'namespace') {
            const nsSign = methodSign.getDeclaringClassSignature().getDeclaringNamespaceSignature();
            return this.isTargetClassOrNs(nsSign, scene) ? gTargetInfo.namespace.slice().reverse().join('.') : '';
        }
        return '';
    }
    isTargetWithClassSign(classSign, scene) {
        if (gTargetInfo.selector === 'class') {
            return this.isTargetClassOrNs(classSign, scene) ? gTargetInfo.class : '';
        }
        else if (gTargetInfo.selector === 'namespace') {
            const nsSign = classSign.getDeclaringNamespaceSignature();
            return this.isTargetClassOrNs(nsSign, scene) ? gTargetInfo.namespace.slice().reverse().join('.') : '';
        }
        return '';
    }
    isTargetWithAliasType(aliasType, scene) {
        if (gTargetInfo.selector === 'type') {
            return this.isTargetType(aliasType, scene) ? gTargetInfo.type : '';
        }
        else if (gTargetInfo.selector === 'namespace') {
            const nsSign = aliasType.getSignature().getDeclaringMethodSignature().getDeclaringClassSignature()
                .getDeclaringNamespaceSignature();
            return this.isTargetClassOrNs(nsSign, scene) ? gTargetInfo.namespace.slice().reverse().join('.') : '';
        }
        return '';
    }
    getLineColFromGeneric(arkMethod, targetName) {
        let warnInfo = { line: -1, startCol: -1, endCol: -1, usedChain: '' };
        let line = arkMethod.getLine() ?? (arkMethod.getDeclareLines() ?? [-1])[0];
        if (line === -1) {
            return warnInfo;
        }
        let startCol = -1;
        const originText = arkMethod.getCode() ?? '';
        const lineTextArray = originText.split('\n');
        for (let i = 0; i < lineTextArray.length; i++) {
            let col = lineTextArray[i].indexOf(targetName);
            if (col !== -1) {
                let tempCol = arkMethod.getColumn() ?? (arkMethod.getDeclareColumns() ?? [-1])[0];
                if (tempCol === -1) {
                    startCol = -1;
                    break;
                }
                col = (i === 0) ? col + tempCol : col;
                line += i;
                startCol = col;
                break;
            }
        }
        const originPath = arkMethod.getDeclaringArkFile().getFilePath();
        const relativePath = path_1.default.relative(arkMethod.getDeclaringArkFile().getScene().getRealProjectDir(), originPath);
        if (startCol !== -1) {
            warnInfo.line = line;
            warnInfo.startCol = startCol;
            warnInfo.endCol = startCol + targetName.length - 1;
            warnInfo.usedChain = relativePath + ':' + warnInfo.line + ':' + targetName + '\n>>';
        }
        return warnInfo;
    }
    findFuncInStmt(stmt, scene, busyNode, arkField) {
        let warnInfoList = [];
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            if ((this.isMethodInOp(stmt.getLeftOp(), scene) || this.isMethodInOp(stmt.getRightOp(), scene))) {
                const warnInfo = this.getLineColFromStmt(stmt, gTargetInfo.function, arkField);
                if (warnInfo.line !== -1 && warnInfo.startCol !== -1) {
                    warnInfoList.push(warnInfo);
                }
                return warnInfoList;
            }
            else if (stmt.getRightOp() instanceof arkanalyzer_1.ArkNewExpr && stmt.getRightOp().getType() instanceof arkanalyzer_1.ClassType) {
                return this.findDeeplyClass(stmt, scene, busyNode, arkField);
            }
        }
        const invokeExpr = CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invokeExpr) {
            return warnInfoList;
        }
        const invokeSignature = invokeExpr.getMethodSignature();
        if (busyNode.includes(invokeSignature)) {
            return warnInfoList;
        }
        const className = this.getClassName(invokeExpr);
        const methodName = invokeSignature.getMethodSubSignature().getMethodName();
        const invokeName = (className.length === 0) ? methodName : className + '.' + methodName;
        const curNodeInfo = this.getLineColFromStmt(stmt, invokeName, arkField);
        if (this.isTargetMethod(methodName, this.getClassType(invokeExpr), invokeSignature, scene)) {
            if (curNodeInfo.line !== -1 && curNodeInfo.startCol !== -1) {
                warnInfoList.push(curNodeInfo);
            }
        }
        else {
            warnInfoList = this.concatDeeplyResult(curNodeInfo, stmt, scene, busyNode);
        }
        return warnInfoList;
    }
    concatDeeplyResult(curNodeInfo, stmt, scene, busyNode) {
        let warnInfoList = [];
        const deepWarnInfoList = this.findDeeplyFunc(stmt, scene, busyNode);
        for (const warnInfo of deepWarnInfoList) {
            warnInfoList.push({
                line: curNodeInfo.line, startCol: curNodeInfo.startCol, endCol: curNodeInfo.endCol,
                usedChain: curNodeInfo.usedChain + warnInfo.usedChain
            });
        }
        return warnInfoList;
    }
    // 深度遍历new class
    findDeeplyClass(stmt, scene, busyNode, field) {
        let warnInfoList = [];
        const tempClass = scene.getClass(stmt.getRightOp().getType().getClassSignature());
        if (!tempClass) {
            return warnInfoList;
        }
        if (tempClass.isAnonymousClass()) {
            return this.findTargetInClass(tempClass, scene, busyNode);
        }
        else if (tempClass.getCategory() === ArkClass_1.ClassCategory.STRUCT) {
            const tempInfo = this.getLineColFromStmt(stmt, tempClass.getName(), field);
            if (tempInfo.line === -1 || tempInfo.startCol === -1) {
                return warnInfoList;
            }
            const deepWarnList = this.findTargetInClass(tempClass, scene, busyNode);
            for (const warnInfo of deepWarnList) {
                warnInfoList.push({
                    line: tempInfo.line, startCol: tempInfo.startCol, endCol: tempInfo.endCol,
                    usedChain: tempInfo.usedChain + warnInfo.usedChain
                });
            }
        }
        return warnInfoList;
    }
    findClassOrNsInStmt(stmt, scene, busyNode, arkField) {
        let warnInfoList = [];
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            if (this.isClassOrNsInAssign(stmt, scene, arkField)) {
                let targetName = gTargetInfo.class;
                if (gTargetInfo.selector === 'namespace') {
                    targetName = gTargetInfo.namespace.slice().reverse().join('.');
                }
                const warnInfo = this.getLineColFromStmt(stmt, targetName, arkField);
                if (warnInfo.line !== -1 && warnInfo.startCol !== -1) {
                    warnInfoList.push(warnInfo);
                }
                return warnInfoList;
            }
            else if (stmt.getRightOp() instanceof arkanalyzer_1.ArkNewExpr && stmt.getRightOp().getType() instanceof arkanalyzer_1.ClassType) {
                return this.findDeeplyClass(stmt, scene, busyNode, arkField);
            }
        }
        const invokeExpr = CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (invokeExpr && !busyNode.includes(invokeExpr.getMethodSignature())) { // 方法忙碌，为递归调用，跳过
            let targetSign = invokeExpr.getMethodSignature().getDeclaringClassSignature();
            let targetName = gTargetInfo.class;
            if (gTargetInfo.selector === 'namespace') {
                targetSign = targetSign.getDeclaringNamespaceSignature();
                targetName = gTargetInfo.namespace.slice().reverse().join('.');
            }
            if (invokeExpr instanceof arkanalyzer_1.ArkStaticInvokeExpr && this.isTargetClassOrNs(targetSign, scene)) { // 仅考虑静态调用，实例调用未使用目标类名
                const warnInfo = this.getLineColFromStmt(stmt, targetName, arkField);
                if (warnInfo.line !== -1 && warnInfo.startCol !== -1) {
                    warnInfoList.push(warnInfo);
                }
                return warnInfoList;
            }
            const className = this.getClassName(invokeExpr);
            const methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            const invokeName = (className.length === 0) ? methodName : className + '.' + methodName;
            const curNodeInfo = this.getLineColFromStmt(stmt, invokeName, arkField);
            if (curNodeInfo.line !== -1 && curNodeInfo.startCol !== -1) {
                warnInfoList = this.concatDeeplyResult(curNodeInfo, stmt, scene, busyNode);
            }
        }
        return warnInfoList;
    }
    findPropertyInStmt(stmt, scene, busyNode, arkField) {
        let warnInfoList = [];
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            if (this.isPropertyInOp(stmt.getLeftOp(), scene) || this.isPropertyInOp(stmt.getRightOp(), scene)) {
                const warnInfo = this.getLineColFromStmt(stmt, gTargetInfo.property, arkField);
                if (warnInfo.line !== -1 && warnInfo.startCol !== -1) {
                    warnInfoList.push(warnInfo);
                }
                return warnInfoList;
            }
            else if (stmt.getRightOp() instanceof arkanalyzer_1.ArkNewExpr && stmt.getRightOp().getType() instanceof arkanalyzer_1.ClassType) {
                return this.findDeeplyClass(stmt, scene, busyNode, arkField);
            }
        }
        const invokeExpr = CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (invokeExpr && !busyNode.includes(invokeExpr.getMethodSignature())) { // 方法忙碌，为递归调用，跳过
            const className = this.getClassName(invokeExpr);
            const methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            const invokeName = (className.length === 0) ? methodName : className + '.' + methodName;
            const curNodeInfo = this.getLineColFromStmt(stmt, invokeName, arkField);
            if (curNodeInfo.line === -1 || curNodeInfo.startCol === -1) {
                return warnInfoList;
            }
            warnInfoList = this.concatDeeplyResult(curNodeInfo, stmt, scene, busyNode);
        }
        return warnInfoList;
    }
    findTypeInStmt(stmt, scene, busyNode, arkField) {
        let warnInfoList = [];
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            if (this.isTargetType(stmt.getLeftOp().getType(), scene)) {
                const warnInfo = this.getLineColFromStmt(stmt, gTargetInfo.type, arkField);
                if (warnInfo.line !== -1 && warnInfo.startCol !== -1) {
                    warnInfoList.push(warnInfo);
                }
                return warnInfoList;
            }
            else if (stmt.getRightOp() instanceof arkanalyzer_1.ArkNewExpr && stmt.getRightOp().getType() instanceof arkanalyzer_1.ClassType) {
                return this.findDeeplyClass(stmt, scene, busyNode, arkField);
            }
        }
        const invokeExpr = CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (invokeExpr && !busyNode.includes(invokeExpr.getMethodSignature())) { // 方法忙碌，为递归调用，跳过
            const className = this.getClassName(invokeExpr);
            const methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            const invokeName = (className.length === 0) ? methodName : className + '.' + methodName;
            const curNodeInfo = this.getLineColFromStmt(stmt, invokeName, arkField);
            if (curNodeInfo.line !== -1 && curNodeInfo.startCol !== -1) {
                warnInfoList = this.concatDeeplyResult(curNodeInfo, stmt, scene, busyNode);
            }
        }
        return warnInfoList;
    }
    isTargetType(aliasType, scene) {
        if (aliasType instanceof arkanalyzer_1.AliasType && aliasType.getName() === gTargetInfo.type) {
            const methodSign = aliasType.getSignature().getDeclaringMethodSignature();
            const methodName = methodSign.getMethodSubSignature().getMethodName();
            const className = methodSign.getDeclaringClassSignature().getClassName();
            if (this.isTargetMethod(methodName === DEFAULT_METHOD_STR ? '' : methodName, className, methodSign, scene)) {
                return true;
            }
        }
        return false;
    }
    isPropertyInOp(op, scene) {
        if (!(op instanceof arkanalyzer_1.AbstractFieldRef)) {
            return false;
        }
        const sign = op.getFieldSignature().getDeclaringSignature();
        // 寻找类字段仅需判断declaringSign为class即可
        if (sign instanceof arkanalyzer_1.ClassSignature) {
            const nsList = this.genNsList(sign);
            if (gTargetInfo.namespace.length > 0) {
                if (nsList.length === 0 || nsList.toString() !== gTargetInfo.namespace.toString()) {
                    return false;
                }
                return this.isTargetProperty(op, sign, scene);
            }
            else {
                if (nsList.length === 0 && this.isTargetProperty(op, sign, scene)) {
                    return true;
                }
            }
        }
        return false;
    }
    isTargetProperty(op, classSign, scene) {
        if (op.getFieldName() === gTargetInfo.property &&
            classSign.getClassName() === gTargetInfo.class) {
            const file = scene.getFile(classSign.getDeclaringFileSignature());
            if (file && file.getFilePath() === gTargetInfo.filePath) {
                return true;
            }
        }
        return false;
    }
    isUselessTemp(stmt) {
        const def = stmt.getDef();
        if (!(def instanceof arkanalyzer_1.Local) || !def.getName().includes('%')) {
            return false;
        }
        let isUseless = true;
        for (const useStmt of def.getUsedStmts()) {
            for (const use of useStmt.getUses()) {
                if (use === def) {
                    isUseless = false;
                }
            }
        }
        return isUseless;
    }
    isClassOrNsInAssign(stmt, scene, arkField) {
        if (this.isUselessTemp(stmt)) {
            return false;
        }
        // 判断右值
        if (this.isTargetClassOrNs(this.getSignInRightOP(stmt.getRightOp()), scene)) {
            return true;
        }
        // 判断左值
        const leftOp = stmt.getLeftOp();
        if (leftOp instanceof arkanalyzer_1.ArkStaticFieldRef) {
            // 左值中有目标类引用
            let sign = leftOp.getFieldSignature().getDeclaringSignature();
            if (gTargetInfo.selector === 'namespace' && sign instanceof arkanalyzer_1.ClassSignature) {
                sign = sign?.getDeclaringNamespaceSignature();
            }
            return this.isTargetClassOrNs(sign, scene);
        }
        else if (leftOp instanceof arkanalyzer_1.Local) {
            // 左值中显式类型定义为目标类
            const type = leftOp.getType();
            let sign = null;
            let targetName = '';
            if (type instanceof arkanalyzer_1.ClassType) {
                sign = type.getClassSignature();
                const nsName = gTargetInfo.namespace.slice().reverse().join('.');
                targetName = nsName.length > 0 ? nsName + '.' + gTargetInfo.class : gTargetInfo.class;
                if (gTargetInfo.selector === 'namespace') {
                    sign = sign.getDeclaringNamespaceSignature();
                    targetName = nsName;
                }
            }
            if (this.isTargetClassOrNs(sign, scene)) {
                return this.isExplicitsType(stmt, targetName, arkField);
            }
        }
        return false;
    }
    isExplicitsType(stmt, typeStr, arkField) {
        let originText = '';
        if (arkField) {
            originText = arkField.getCode();
        }
        else {
            originText = stmt.getOriginalText() ?? '';
        }
        // 截取冒号和等号之间的内容
        const pos = originText.indexOf(':');
        if (pos === -1) {
            return false;
        }
        const endPos = originText.indexOf('=');
        if (endPos === -1 || endPos <= pos + 1) {
            return false;
        }
        return originText.substring(pos + 1, endPos).trim().includes(typeStr);
    }
    isTargetClassOrNs(sign, scene) {
        if (!sign) {
            return false;
        }
        const nsList = this.genNsList(sign);
        const targetNamespaces = gTargetInfo.namespace;
        const targetClass = gTargetInfo.class;
        const targetFilePath = gTargetInfo.filePath;
        if (targetNamespaces.length > 0) {
            if (nsList.length === 0 || !nsList.toString().endsWith(targetNamespaces.toString())) {
                return false;
            }
        }
        else if (nsList.length !== 0) {
            return false;
        }
        if ((sign instanceof arkanalyzer_1.ClassSignature && sign.getClassName() !== targetClass)) {
            return false;
        }
        const newFile = scene.getFile(sign.getDeclaringFileSignature());
        if (!newFile || newFile.getFilePath() !== targetFilePath) {
            return false;
        }
        return true;
    }
    getSignInRightOP(rightOp) {
        const type = rightOp.getType();
        let baseSign = null;
        if (rightOp instanceof arkanalyzer_1.ArkNewExpr && type instanceof arkanalyzer_1.ClassType) { // 类字段右值为new class场景
            baseSign = type.getClassSignature();
        }
        else if (rightOp instanceof arkanalyzer_1.ArkStaticFieldRef) {
            // 静态引用：类字段右值为目标类静态引用 class.staticFeild/func、ns.class/globalFunc/globalVar
            const fieldType = rightOp.getType();
            if (fieldType instanceof arkanalyzer_1.ClassType) {
                baseSign = fieldType.getClassSignature();
            }
            else if (fieldType instanceof arkanalyzer_1.AnnotationNamespaceType) {
                baseSign = fieldType.getNamespaceSignature();
            }
            else {
                baseSign = rightOp.getFieldSignature().getDeclaringSignature();
            }
        }
        else if (rightOp instanceof arkanalyzer_1.ArkStaticInvokeExpr) { // 类字段右值为目标类方法调用
            baseSign = rightOp.getMethodSignature().getDeclaringClassSignature();
        }
        else if (rightOp instanceof arkanalyzer_1.ArkCastExpr) {
            const type = rightOp.getType();
            if (type instanceof arkanalyzer_1.ClassType) {
                baseSign = type.getClassSignature();
            }
        }
        if (gTargetInfo.selector === 'namespace' && baseSign instanceof arkanalyzer_1.ClassSignature) {
            baseSign = baseSign?.getDeclaringNamespaceSignature();
        }
        return baseSign;
    }
    getClassType(invokeExpr) {
        let classType = '';
        const classSign = invokeExpr.getMethodSignature().getDeclaringClassSignature();
        classType = classSign.getClassName();
        return classType;
    }
    isMethodInOp(op, scene) {
        const leftOpType = op.getType();
        let name = '';
        if (op instanceof arkanalyzer_1.Local) {
            name = op.getName();
        }
        else if (op instanceof arkanalyzer_1.ArkStaticFieldRef) {
            name = op.getFieldName();
        }
        if (name !== gTargetInfo.function) {
            return false;
        }
        if (leftOpType instanceof arkanalyzer_1.FunctionType) {
            const sign = leftOpType.getMethodSignature();
            const methodName = sign.getMethodSubSignature().getMethodName();
            const className = sign.getDeclaringClassSignature().getClassName();
            return this.isTargetMethod(methodName, className, sign, scene);
        }
    }
    isTargetMethod(methodName, className, methodSign, scene) {
        const nsList = this.genNsList(methodSign);
        if (gTargetInfo.namespace.length > 0) {
            if (nsList.length === 0 || nsList.toString() !== gTargetInfo.namespace.toString()) {
                return false;
            }
            return this.isTargetMethodInner(methodName, className, methodSign, scene);
        }
        else {
            if (nsList.length === 0 && this.isTargetMethodInner(methodName, className, methodSign, scene)) {
                return true;
            }
        }
        return false;
    }
    isTargetMethodInner(methodName, className, methodSign, scene) {
        if (methodName === gTargetInfo.function) {
            if (className === gTargetInfo.class ||
                (gTargetInfo.class === '' && className === DEFAULT_CLASS_STR)) {
                const fileSign = methodSign.getDeclaringClassSignature().getDeclaringFileSignature();
                const file = scene.getFile(fileSign);
                if (file) {
                    return (file.getFilePath() === gTargetInfo.filePath);
                }
            }
        }
        return false;
    }
    findDeeplyFunc(stmt, scene, busyNode) {
        const invokeExpr = CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (invokeExpr) {
            // 1、参数函数中搜索： 当前方法 + 已匹配的后续调用链
            let warnInfoList = this.findFuncInArgs(invokeExpr, scene, busyNode);
            let invokeMethod = scene.getMethod(invokeExpr.getMethodSignature());
            if (invokeMethod === null || invokeMethod.isGenerated()) {
                return warnInfoList;
            }
            // 2、方法体中搜索： 当前方法 + 已匹配的后续调用链
            return warnInfoList.concat(this.findTargetInMethod(invokeMethod, scene, busyNode));
        }
        return [];
    }
    getClassName(invokeExpr) {
        let className = '';
        if (invokeExpr instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            const classSign = invokeExpr.getMethodSignature().getDeclaringClassSignature();
            className = classSign.getClassName();
            if (className === DEFAULT_CLASS_STR) {
                className = classSign.getDeclaringNamespaceSignature()?.getNamespaceName() ?? '';
            }
        }
        else if (invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            className = invokeExpr.getBase().getName();
            if (className.includes('%')) {
                className = this.getRealClassName(invokeExpr, className);
                if (className.length === 0) {
                    className = invokeExpr.getMethodSignature().getDeclaringClassSignature().getClassName();
                }
            }
        }
        else {
            logger.warn('UnSupported expr type was found!');
        }
        return className;
    }
    getRealClassName(invokeExpr, tempClassName) {
        const tempDef = invokeExpr.getBase().getDeclaringStmt()?.getDef();
        if (!(tempDef instanceof arkanalyzer_1.Local)) {
            return '';
        }
        const usedStmts = tempDef.getUsedStmts();
        for (let stmt of usedStmts) {
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            const rightOp = stmt.getRightOp();
            if (rightOp instanceof arkanalyzer_1.Local && (rightOp.getName() === tempClassName)) {
                const leftOp = stmt.getLeftOp();
                if (leftOp instanceof arkanalyzer_1.Local) {
                    return leftOp.getName();
                }
            }
        }
        return '';
    }
    getLineColFromStmt(stmt, invokeName, arkField) {
        let warnInfo = { line: -1, startCol: -1, endCol: -1, usedChain: '' };
        let originalPosition = stmt.getOriginPositionInfo();
        let arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        let originText = stmt.getOriginalText() ?? '';
        if (arkField) {
            arkFile = arkField.getDeclaringArkClass().getDeclaringArkFile();
            originText = arkField.getCode();
            originalPosition = arkField.getOriginPosition();
        }
        if (originText && arkFile) {
            if (invokeName.includes('.constructor')) { // 构造函数名原文中没有直接调用，直接匹配对象名
                invokeName = invokeName.split('.')[0];
            }
            let pos = originText.indexOf(invokeName);
            if (pos === -1 && invokeName.includes('.')) {
                invokeName = invokeName.split('.')[1];
                pos = originText.indexOf(invokeName);
            }
            if (pos !== -1) {
                const relativePath = path_1.default.relative(arkFile.getScene().getRealProjectDir(), arkFile.getFilePath());
                warnInfo.line = originalPosition.getLineNo();
                warnInfo.startCol = originalPosition.getColNo() + pos;
                warnInfo.endCol = warnInfo.startCol + invokeName.length - 1;
                warnInfo.usedChain = relativePath + ':' + warnInfo.line + ':' + invokeName + '\n>>';
            }
        }
        else {
            logger.debug('Get originStmt failed.');
        }
        return warnInfo;
    }
}
exports.SymbolUsageCheck = SymbolUsageCheck;
