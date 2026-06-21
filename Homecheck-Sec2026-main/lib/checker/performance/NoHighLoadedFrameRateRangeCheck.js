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
exports.NoHighLoadedFrameRateRangeCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const VarInfo_1 = require("../../model/VarInfo");
const NumberUtils_1 = require("../../utils/checker/NumberUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoHighLoadedFrameRateRangeCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/no-high-loaded-frame-rate-range.md',
    description: 'Do not set the expected, min, and max values of ExpectedFrameRateRange all to 120.'
};
const setExpectedFrameRateRangeSignature = [
    '@ohosSdk/api/@ohos.graphics.displaySync.d.ts: displaySync.DisplaySync.setExpectedFrameRateRange(ExpectedFrameRateRange)',
    '@ohosSdk/api/@ohos.graphics.displaySync.d.ts: displaySync.DisplaySync.setExpectedFrameRateRange(@ohosSdk/component/common.d.ts: ExpectedFrameRateRange)'
];
const animateToSiganture = `@ohosSdk/component/common.d.ts: ${lib_1.DEFAULT_ARK_CLASS_NAME}.animateTo(@ohosSdk/component/common.d.ts: AnimateParam, @ohosSdk/component/common.d.ts: ${lib_1.DEFAULT_ARK_CLASS_NAME}.%AM0())`;
const setFrameRateRangeSignature = [
    '@ohosSdk/api/@ohos.arkui.UIContext.d.ts: DynamicSyncScene.setFrameRateRange(ExpectedFrameRateRange)',
    '@ohosSdk/api/@ohos.arkui.UIContext.d.ts: DynamicSyncScene.setFrameRateRange(@ohosSdk/component/common.d.ts: ExpectedFrameRateRange)'
];
class NoHighLoadedFrameRateRangeCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    methodMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.methodMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (arkMethod) => {
        let stmts = arkMethod.getBody()?.getCfg().getStmts();
        if (!stmts) {
            return;
        }
        for (const stmt of stmts) {
            let invoke = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invoke) {
                continue;
            }
            if (!(setExpectedFrameRateRangeSignature.includes(invoke.getMethodSignature().toString()) ||
                invoke.getMethodSignature().toString() === animateToSiganture ||
                setFrameRateRangeSignature.includes(invoke.getMethodSignature().toString()))) {
                continue;
            }
            let arg = invoke.getArg(0);
            if (!(arg instanceof lib_1.Local)) {
                continue;
            }
            let fieldValue = this.getFieldNum(stmt, arg, arg.getName());
            if (fieldValue.length === 3) {
                this.reportIssue(arkMethod.getDeclaringArkFile(), stmt, invoke.getMethodSignature().getMethodSubSignature().getMethodName());
            }
        }
    };
    getFieldNum(stmt, arg, name) {
        let fieldValue = [];
        let arkFile = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile();
        let declaringStmt = arg.getDeclaringStmt();
        if (declaringStmt) {
            // 场景一：局部变量
            fieldValue = this.traversalLocals(declaringStmt);
            if (fieldValue.length !== 0) {
                return fieldValue;
            }
        }
        else {
            // 场景二：全局变量
            fieldValue = this.traversalDefaultClass(arkFile, name);
            if (fieldValue.length !== 0) {
                return fieldValue;
            }
        }
        // 场景三：import模块
        let imports = arkFile.getImportInfos();
        for (let subImport of imports) {
            if (subImport.getImportClauseName() !== name) {
                continue;
            }
            let arkFile = subImport.getLazyExportInfo()?.getDeclaringArkFile();
            if (!arkFile) {
                continue;
            }
            fieldValue = this.traversalDefaultClass(arkFile, name);
        }
        return fieldValue;
    }
    traversalLocals(declaringStmt) {
        if (!(declaringStmt instanceof lib_1.ArkAssignStmt)) {
            return [];
        }
        let method = declaringStmt.getCfg().getDeclaringMethod();
        let rightOp = declaringStmt.getRightOp();
        if (rightOp instanceof lib_1.Local || rightOp instanceof lib_1.ArkNewExpr) {
            let type = rightOp.getType();
            if (!(type instanceof lib_1.ClassType)) {
                return [];
            }
            let arkClass = method.getDeclaringArkFile().getScene().getClass(type.getClassSignature());
            let fields = arkClass?.getFields();
            if (!fields) {
                return [];
            }
            return this.getReasonableFieldValues(fields);
        }
        else if (rightOp instanceof lib_1.ArkInstanceFieldRef) {
            let field = method.getDeclaringArkClass().getField(rightOp.getFieldSignature());
            if (!field) {
                return [];
            }
            let initializer = field.getInitializer()[0];
            return this.traversalLocals(initializer);
        }
        else if (rightOp instanceof lib_1.ArkStaticFieldRef) {
            let fieldSignature = rightOp.getFieldSignature();
            let declareSignature = fieldSignature.getDeclaringSignature();
            if (!(declareSignature instanceof lib_1.ClassSignature)) {
                return [];
            }
            let declareClass = method.getDeclaringArkFile().getScene().getClass(declareSignature);
            let field = declareClass?.getStaticFieldWithName(rightOp.getFieldName());
            if (!field) {
                return [];
            }
            let initializer = field.getInitializer()[0];
            return this.traversalLocals(initializer);
        }
        return [];
    }
    traversalDefaultClass(arkFile, name) {
        let defaultClass = arkFile.getDefaultClass();
        let method = defaultClass.getMethods()[0];
        let locals = method.getBody()?.getLocals();
        if (!locals) {
            return [];
        }
        for (let [key, value] of locals) {
            if (!(value instanceof lib_1.Local)) {
                continue;
            }
            if (key !== name) {
                continue;
            }
            let declaringStmt = value.getDeclaringStmt();
            if (!declaringStmt) {
                return [];
            }
            return this.traversalLocals(declaringStmt);
        }
        return [];
    }
    getReasonableFieldValues(fields) {
        let fieldValue = [];
        for (const field of fields) {
            let arkFile = field.getDeclaringArkClass().getDeclaringArkFile();
            if (field.getName() === 'expectedFrameRateRange') {
                return this.traversalLocals(field.getInitializer()[0]);
            }
            if (!['expected', 'min', 'max'].includes(field.getName())) {
                continue;
            }
            let initializer = field.getInitializer()[0];
            if (!(initializer instanceof lib_1.ArkAssignStmt)) {
                continue;
            }
            let rightOp = initializer.getRightOp();
            let scope = Index_1.CheckerStorage.getInstance().getScope(arkFile.getFilePath());
            if (!scope) {
                continue;
            }
            let val = this.processScope(scope, initializer, arkFile, rightOp);
            if (!val) {
                continue;
            }
            if (val >= 120) {
                fieldValue.push(val);
            }
        }
        return fieldValue;
    }
    processScope(scope, initializer, arkFile, rightOp) {
        let varInfo = new VarInfo_1.VarInfo(initializer, scope);
        let reDefValue = NumberUtils_1.NumberUtils.getNumberByScope(arkFile, varInfo, rightOp);
        if (reDefValue.type === 0) {
            return reDefValue.value;
        }
        if (scope.childScopeList.length !== 0) {
            for (let childScope of scope.childScopeList) {
                let result = this.processScope(childScope, initializer, arkFile, rightOp);
                if (result !== null) {
                    return result;
                }
            }
        }
        return null;
    }
    reportIssue(arkFile, stmt, methodName) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const startColumn = originPositionInfo.getColNo() + text.lastIndexOf(methodName);
        const endColunm = startColumn + methodName.length;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.NoHighLoadedFrameRateRangeCheck = NoHighLoadedFrameRateRangeCheck;
