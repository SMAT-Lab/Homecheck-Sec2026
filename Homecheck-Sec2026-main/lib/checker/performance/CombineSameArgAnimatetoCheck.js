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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombineSameArgAnimatetoCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
let gFilePath = '';
let gKeyword = 'animateTo';
let curFinishedMap = new Map();
let animateToSignatureStr = `@ohosSdk/component/common.d.ts: ${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.animateTo(@ohosSdk/component/common.d.ts: AnimateParam, @ohosSdk/component/common.d.ts: ${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.${arkanalyzer_1.ANONYMOUS_METHOD_PREFIX}0())`;
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'CombineSameArgAnimatetoCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/combine-same-arg-animateto-check.md',
    description: 'The same animateto is used when the parameters are the same.'
};
class CombineSameArgAnimatetoCheck {
    metaData = gMetaData;
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
        let scene = arkFile.getScene();
        gFilePath = arkFile.getFilePath();
        for (let clazz of arkFile.getClasses()) {
            this.classProcess(clazz, scene);
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (let clazz of namespace.getClasses()) {
                this.classProcess(clazz, scene);
            }
        }
    };
    classProcess(arkClass, scene) {
        if (!arkClass.hasViewTree()) {
            return;
        }
        let viewTreeRoot = arkClass.getViewTree()?.getRoot();
        if (!viewTreeRoot) {
            return;
        }
        for (let child of viewTreeRoot.children) {
            let attributes = child.attributes;
            for (let values of attributes) {
                for (let value of values) {
                    curFinishedMap.clear();
                    this.valueProcess(value, scene);
                    this.getIssueReports();
                }
            }
        }
    }
    valueProcess(value, scene) {
        if (!(value instanceof Array)) {
            return;
        }
        let arrays = value[1];
        for (let array of arrays) {
            if (!(array instanceof arkanalyzer_1.MethodSignature)) {
                continue;
            }
            let method = scene.getMethod(array);
            if (method === null) {
                continue;
            }
            let busyMethods = new Set();
            this.findSymbolInMethod(method, scene, busyMethods);
        }
    }
    findSymbolInMethod(method, scene, busyMethods) {
        const animatetoStmts = method.getBody()?.getCfg().getStmts();
        if (!animatetoStmts) {
            return;
        }
        const curMethodSignature = method.getSignature();
        busyMethods.add(curMethodSignature);
        for (let stmt of animatetoStmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const invokeSignature = invokeExpr.getMethodSignature();
            let invokeSignatureStr = invokeSignature.toString();
            if (busyMethods.has(invokeSignature) || invokeSignatureStr.includes(`@${arkanalyzer_1.UNKNOWN_PROJECT_NAME}/${arkanalyzer_1.UNKNOWN_FILE_NAME}`)) {
                continue;
            }
            let clazz = method.getDeclaringArkClass();
            if (invokeSignatureStr === animateToSignatureStr) {
                this.animateToCheck(stmt, clazz.getDeclaringArkFile(), scene);
            }
            else {
                this.findSymbolInInvokeStmt(stmt, scene, busyMethods);
                let invokeMethod = scene.getMethod(invokeSignature);
                if (invokeMethod === null) {
                    continue;
                }
                this.findSymbolInMethod(invokeMethod, scene, busyMethods);
            }
        }
        busyMethods.delete(curMethodSignature);
    }
    animateToCheck(stmt, file, scene) {
        const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invokeExpr) {
            return;
        }
        let arg = invokeExpr.getArg(0);
        if (!(arg instanceof arkanalyzer_1.Local)) {
            return;
        }
        let type = arg.getType();
        if (!(type instanceof arkanalyzer_1.ClassType)) {
            return;
        }
        let classSignature = type.getClassSignature();
        let code = scene.getClass(classSignature)?.getCode();
        if (!code) {
            return;
        }
        let warnInfoStmt = {
            stmt: stmt,
            arkFile: file
        };
        if (curFinishedMap.has(code)) {
            let warnInfoList = curFinishedMap.get(code);
            if (warnInfoList) {
                warnInfoList.push(warnInfoStmt);
            }
        }
        else {
            curFinishedMap.set(code, [warnInfoStmt]);
        }
    }
    findSymbolInInvokeStmt(stmt, scene, busyMethods) {
        let invokeArgvs = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt)?.getArgs();
        if (invokeArgvs) {
            this.findSymbolInArgs(invokeArgvs, scene, busyMethods);
        }
    }
    findSymbolInArgs(invokeArgvs, scene, busyMethods) {
        for (let argv of invokeArgvs) {
            let type = argv.getType();
            if (!(type instanceof arkanalyzer_1.FunctionType)) {
                continue;
            }
            let methodSignature = type.getMethodSignature();
            let anonymousMethod = scene.getMethod(methodSignature);
            if (anonymousMethod !== null && !busyMethods.has(anonymousMethod.getSignature())) {
                this.findSymbolInMethod(anonymousMethod, scene, busyMethods);
            }
        }
    }
    getIssueReports() {
        curFinishedMap.forEach((warnInfoList) => {
            if (warnInfoList.length > 1) {
                warnInfoList.forEach((warnInfo) => {
                    this.reportIssue(warnInfo.arkFile, warnInfo.stmt);
                });
            }
        });
    }
    reportIssue(arkFile, stmt) {
        let arkFilePath = arkFile.getFilePath();
        if (arkFilePath !== gFilePath || !stmt) {
            return;
        }
        let originPosition = stmt.getOriginPositionInfo();
        let lineNum = originPosition.getLineNo();
        let orgStmtStr = stmt.getOriginalText();
        if (!orgStmtStr || orgStmtStr.length === 0) {
            return;
        }
        let startCol = -1;
        startCol = originPosition.getColNo() + orgStmtStr.indexOf(gKeyword);
        let endCol = startCol + gKeyword.length - 1;
        if (startCol === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(lineNum, startCol, endCol, this.metaData.description, severity, this.rule.ruleId, arkFilePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.CombineSameArgAnimatetoCheck = CombineSameArgAnimatetoCheck;
