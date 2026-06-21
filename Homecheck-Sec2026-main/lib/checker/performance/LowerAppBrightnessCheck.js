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
exports.LowerAppBrightnessCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'LowerAppBrightnessCheck');
const SIGNATURES = [
    '@ohosSdk/api/@ohos.power.d.ts: power.DevicePowerMode.[static]MODE_POWER_SAVE',
    '@ohosSdk/api/@ohos.app.ability.ConfigurationConstant.d.ts: ConfigurationConstant.ColorMode.[static]COLOR_MODE_DARK'
];
const signatureStrs = [
    'setWindowBrightness(number, @ohosSdk/api/@ohos.base.d.ts: AsyncCallback<void,void>)',
    'setWindowBrightness(number)'
];
const keyword = 'if';
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/lower-app-brightness-check.md',
    description: 'Add the function of actively reducing the brightness of the application in night mode.'
};
class LowerAppBrightnessCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    mtdMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
    };
    registerMatchers() {
        const matchClazzCb = {
            matcher: this.mtdMatcher,
            callback: this.check
        };
        return [matchClazzCb];
    }
    check = (target) => {
        const stmts = target.getBody()?.getCfg()?.getStmts() ?? [];
        for (let i = 0; i < stmts.length; i++) {
            const stmt = stmts[i];
            if (!(stmt instanceof lib_1.ArkIfStmt)) {
                continue;
            }
            if (!this.processIfStmt(target, stmt)) {
                continue;
            }
            let myArray = stmts.slice(i + 1);
            if (!this.processMyArray(myArray)) {
                this.addIssueReport(stmt);
            }
        }
    };
    processIfStmt(target, stmt) {
        const conditionExpr = stmt.getConditionExpr();
        if (!(conditionExpr instanceof lib_1.ArkConditionExpr)) {
            return false;
        }
        const op1 = conditionExpr.getOp1();
        const op2 = conditionExpr.getOp2();
        const operator = conditionExpr.getOperator().toString();
        if ((this.isItExpected(target, op1) || this.isItExpected(target, op2)) && (operator === '===' || operator === '==')) {
            return true;
        }
        return false;
    }
    isItExpected(method, op) {
        if (!(op instanceof lib_1.Local)) {
            return false;
        }
        const stmt = op.getDeclaringStmt();
        if (!stmt) {
            return this.isStmtUndefined(method, op);
        }
        else {
            if (!(stmt instanceof lib_1.ArkAssignStmt)) {
                return false;
            }
            const rightOp = stmt.getRightOp();
            if (!(rightOp instanceof lib_1.AbstractFieldRef)) {
                return false;
            }
            return this.isAbstractFieldRef(method, rightOp);
        }
    }
    isAbstractFieldRef(method, rightOp) {
        const fieldSignatureStr = rightOp.getFieldSignature().toString();
        if (SIGNATURES.includes(fieldSignatureStr)) {
            return true;
        }
        const field = method.getDeclaringArkClass().getField(rightOp.getFieldSignature());
        const initializers = field?.getInitializer() ?? [];
        const initializer = initializers[initializers.length - 1];
        if (!(initializer instanceof lib_1.ArkAssignStmt)) {
            return false;
        }
        const rightOp2 = initializer.getRightOp();
        return this.isItExpected(method, rightOp2);
    }
    isStmtUndefined(method, op) {
        const arkFile = method.getDeclaringArkFile();
        const defaultClass = arkFile.getDefaultClass();
        const mtd = defaultClass.getMethods()[0];
        const locals = mtd.getBody()?.getLocals();
        if (locals === undefined) {
            return false;
        }
        for (let [key, value] of locals) {
            if (key !== op.getName()) {
                continue;
            }
            if (!this.isItExpected(method, value)) {
                continue;
            }
            return true;
        }
        return false;
    }
    processMyArray(stmts) {
        for (let stmt of stmts) {
            if (!(stmt instanceof lib_1.ArkInvokeStmt)) {
                continue;
            }
            const invokeExpr = stmt.getInvokeExpr();
            if (invokeExpr instanceof lib_1.ArkInstanceInvokeExpr) {
                if (!this.processArkInstanceInvokeExpr(stmt, invokeExpr)) {
                    continue;
                }
                return true;
            }
            if (invokeExpr instanceof lib_1.ArkStaticInvokeExpr) {
                const method = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile().getScene().getMethod(invokeExpr.getMethodSignature());
                const newStmts = method?.getBody()?.getCfg().getStmts() ?? [];
                return this.processMyArray(newStmts);
            }
        }
        return false;
    }
    processArkInstanceInvokeExpr(stmt, invokeExpr) {
        const base = invokeExpr.getBase();
        const methodSignatureStr = invokeExpr.getMethodSignature().getMethodSubSignature().toString();
        if (signatureStrs.includes(methodSignatureStr)) {
            return true;
        }
        else {
            if (base.getName().includes('%')) {
                const declaringStmt = base.getDeclaringStmt();
                if (!(declaringStmt instanceof lib_1.ArkAssignStmt)) {
                    return false;
                }
                const rightOp = declaringStmt.getRightOp();
                if (rightOp instanceof lib_1.ArkInstanceInvokeExpr) {
                    return this.processArkInstanceInvokeExpr(declaringStmt, rightOp);
                }
            }
            else {
                const method = stmt.getCfg().getDeclaringMethod().getDeclaringArkClass().getMethod(invokeExpr.getMethodSignature());
                const stmts = method?.getBody()?.getCfg().getStmts() ?? [];
                return this.processMyArray(stmts);
            }
        }
        return false;
    }
    addIssueReport(stmt) {
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        const severity = this.rule.alert ?? this.metaData.severity;
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const startCol = originalPosition.getColNo() + text.indexOf(keyword);
        const endCol = startCol + keyword.length - 1;
        const filePath = arkFile.getFilePath();
        let defects = new Index_1.Defects(lineNum, startCol, endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.LowerAppBrightnessCheck = LowerAppBrightnessCheck;
