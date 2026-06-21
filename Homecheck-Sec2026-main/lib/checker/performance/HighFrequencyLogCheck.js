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
 * distributed under the License is distlributed on an "AS IS" BASIS,
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
exports.HighFrequencyLogCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const path_1 = __importDefault(require("path"));
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'HighFrequencyLogCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/high-frequency-log-check.md',
    description: 'Avoid printing logs in frequent functions. The call chain here is as follows: '
};
const frequencyMethods = ['onScroll', 'onWillScroll', 'onItemDragMove', 'onTouch', 'onDragMove', 'onMouse', 'onActionUpdate', 'onVisibleAreaChange', 'onAreaChange'];
const hilogNsSignStr = '@ohosSdk/api/@ohos.hilog.d.ts: hilog';
const hilogPrintSignList = [
    hilogNsSignStr + `.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.info(number, string, string, any[])`,
    hilogNsSignStr + `.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.warn(number, string, string, any[])`,
    hilogNsSignStr + `.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.error(number, string, string, any[])`,
    hilogNsSignStr + `.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.fatal(number, string, string, any[])`
];
class HighFrequencyLogCheck {
    metaData = gMetaData;
    gFinishedMethodMap = new Map();
    curFinishedMap = new Map();
    conditionScopeTypes = [Index_1.ScopeType.IF_TYPE, Index_1.ScopeType.ELSE_TYPE, Index_1.ScopeType.CASE_TYPE];
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (arkFile) => {
        this.curFinishedMap.clear();
        let scene = arkFile.getScene();
        for (const arkClass of arkFile.getClasses()) {
            for (const arkMethod of arkClass.getMethods()) {
                this.arkMethodProcess(arkMethod, scene);
            }
        }
        for (const namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (const arkClass of namespace.getClasses()) {
                for (const arkMethod of arkClass.getMethods()) {
                    this.arkMethodProcess(arkMethod, scene);
                }
            }
        }
        this.genIssueReports(scene.getRealProjectDir());
    };
    arkMethodProcess(arkMethod, scene) {
        const stmts = arkMethod.getBody()?.getCfg()?.getStmts() ?? [];
        for (let stmt of stmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (invokeExpr) {
                const methodSignature = invokeExpr.getMethodSignature();
                const invokeMethodName = methodSignature.getMethodSubSignature().getMethodName();
                if (invokeMethodName && frequencyMethods.includes(invokeMethodName)) {
                    let busyMethods = new Set([methodSignature]);
                    let warnInfoList = this.findSymbolInArgs(invokeExpr, scene, busyMethods);
                    this.curFinishedMap.set(methodSignature, warnInfoList);
                    this.gFinishedMethodMap.set(methodSignature, warnInfoList);
                }
            }
        }
    }
    genIssueReports(originDir) {
        this.curFinishedMap.forEach((warnInfoList, methodSignature) => {
            if (frequencyMethods.includes(methodSignature.getMethodSubSignature().getMethodName())) {
                warnInfoList.forEach((warnInfo) => {
                    const severity = this.rule.alert ?? this.metaData.severity;
                    const description = this.metaData.description + warnInfo.usedChain?.slice(0, -3);
                    const filePath = path_1.default.join(originDir, this.getFilePathInUsedChain(warnInfo.usedChain ?? ''));
                    let defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
                    this.issues.push(new Defects_1.IssueReport(defects, undefined));
                });
            }
        });
    }
    getFilePathInUsedChain(usedChain) {
        let warnInfo = usedChain.split('>>')[0].split(':');
        if (warnInfo.length === 4) {
            return warnInfo[0] + ':' + warnInfo[1];
        }
        else if (warnInfo.length === 3) {
            return warnInfo[0];
        }
        return '';
    }
    getCurUsedChain(filePath, line, methodName) {
        return filePath + ':' + line + ':' + methodName + '\n>>';
    }
    findSymbolInArgs(invokeExpr, scene, busyMethods) {
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
                if (busyMethods.has(anonymousMethod.getSignature())) {
                    continue;
                }
                let curArgvWarnInfoList = this.findSymbolInMethod(anonymousMethod, scene, busyMethods);
                this.curFinishedMap.set(type.getMethodSignature(), curArgvWarnInfoList);
                this.gFinishedMethodMap.set(type.getMethodSignature(), curArgvWarnInfoList);
                warnInfoList.push(...curArgvWarnInfoList);
            }
        }
        return warnInfoList;
    }
    findSymbolInMethod(method, scene, busyMethods) {
        const stmts = method.getBody()?.getCfg()?.getStmts() ?? [];
        let warnInfoList = [];
        const curMethodSignature = method.getSignature();
        const matchWarnInfoList = this.gFinishedMethodMap.get(curMethodSignature);
        if (matchWarnInfoList !== undefined) {
            return matchWarnInfoList;
        }
        busyMethods.add(curMethodSignature);
        for (let stmt of stmts) {
            const scopeType = stmt.scope?.scopeType;
            if (!(stmt instanceof arkanalyzer_1.ArkInvokeStmt) || (scopeType === undefined) ||
                (busyMethods.size === 2 && this.conditionScopeTypes.includes(scopeType))) {
                continue;
            }
            const invokeExpr = stmt.getInvokeExpr();
            const invokeSignature = invokeExpr.getMethodSignature();
            if (busyMethods.has(invokeSignature)) {
                continue;
            }
            const className = this.getClassName(invokeExpr);
            const methodName = invokeSignature.getMethodSubSignature().getMethodName();
            const invokeName = (className.length === 0) ? methodName : className + '.' + methodName;
            const tempInfo = this.recordWarnInfo(stmt, invokeName);
            if (hilogPrintSignList.includes(invokeSignature.toString()) || (className === 'console' && methodName !== 'debug')) {
                warnInfoList.push({
                    line: tempInfo.line, startCol: tempInfo.startCol, endCol: tempInfo.endCol,
                    usedChain: tempInfo.usedChain
                });
            }
            else {
                const deepWarnInfoList = this.findDeeply(stmt, scene, busyMethods);
                for (const warnInfo of deepWarnInfoList) {
                    warnInfoList.push({
                        line: tempInfo.line, startCol: tempInfo.startCol, endCol: tempInfo.endCol,
                        usedChain: tempInfo.usedChain + warnInfo.usedChain
                    });
                }
            }
        }
        busyMethods.delete(curMethodSignature);
        this.curFinishedMap.set(curMethodSignature, warnInfoList);
        this.gFinishedMethodMap.set(curMethodSignature, warnInfoList);
        return warnInfoList;
    }
    findDeeply(stmt, scene, busyMethods) {
        const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (invokeExpr) {
            let warnInfoList = this.findSymbolInArgs(invokeExpr, scene, busyMethods);
            const invokeMethod = scene.getMethod(invokeExpr.getMethodSignature());
            if (invokeMethod === null) {
                return warnInfoList;
            }
            let methodWarnInfos = this.findSymbolInMethod(invokeMethod, scene, busyMethods);
            return warnInfoList.concat(methodWarnInfos);
        }
        return [];
    }
    getClassName(invokeExpr) {
        let className = '';
        if (invokeExpr instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            const classSign = invokeExpr.getMethodSignature().getDeclaringClassSignature();
            className = classSign.getClassName();
            if (className === arkanalyzer_1.DEFAULT_ARK_CLASS_NAME) {
                className = classSign.getDeclaringNamespaceSignature()?.getNamespaceName() ?? '';
            }
        }
        else if (invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            className = invokeExpr.getBase().getName();
            if (className.includes('%')) {
                className = this.getRealClassName(invokeExpr, className);
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
    recordWarnInfo(stmt, invokeName) {
        let warnInfo = { line: -1, startCol: -1, endCol: -1, usedChain: '' };
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            if (invokeName.includes('.constructor')) {
                invokeName = invokeName.split('.')[0];
            }
            const pos = originText.indexOf(invokeName);
            if (pos !== -1) {
                const originPath = arkFile.getFilePath();
                const relativePath = path_1.default.relative(arkFile.getScene().getRealProjectDir(), originPath);
                let originalPosition = stmt.getOriginPositionInfo();
                warnInfo.line = originalPosition.getLineNo();
                warnInfo.startCol = originalPosition.getColNo() + pos;
                warnInfo.endCol = warnInfo.startCol + invokeName.length - 1;
                warnInfo.usedChain = this.getCurUsedChain(relativePath, warnInfo.line, invokeName);
            }
        }
        else {
            logger.warn('Get ArkFile failed.');
        }
        return warnInfo;
    }
}
exports.HighFrequencyLogCheck = HighFrequencyLogCheck;
