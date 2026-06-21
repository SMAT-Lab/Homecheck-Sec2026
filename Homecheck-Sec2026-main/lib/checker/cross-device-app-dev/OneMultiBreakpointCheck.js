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
exports.OneMultiBreakpointCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'OneMultiBreakpointCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/one-multi-breakpoint-check.md',
    description: 'Use breakpoints, rather than device type, screen orientation, or foldability, as the basis for responsive layouts for one-time development for multi-device deployment.'
};
const deviceTypeSignature = `@ohosSdk/api/@ohos.deviceInfo.d.ts: deviceInfo.[static]deviceType`;
const displaySignature = [
    `@ohosSdk/api/@ohos.display.d.ts: display.Display.orientation`,
    `@ohosSdk/api/@ohos.display.d.ts: display.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.isFoldable()`
];
const foldStatusSignature = `@ohosSdk/api/@ohos.display.d.ts: display.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.getFoldStatus()`;
const foldDirectionSignature = `@ohosSdk/api/@ohos.display.d.ts: display.FoldStatus.[static]FOLD_STATUS_HALF_FOLDED`;
class OneMultiBreakpointCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        category: [ArkClass_1.ClassCategory.STRUCT],
        hasViewTree: true
    };
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        class: [this.clsMatcher],
        name: ['build']
    };
    builderMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        decorators: ['Builder']
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        const matchBuilderCb = {
            matcher: this.builderMatcher,
            callback: this.check
        };
        return [matchBuildCb, matchBuilderCb];
    }
    check = (targetMtd) => {
        let stmts = targetMtd.getCfg()?.getStmts();
        if (!stmts) {
            return;
        }
        this.processStmt(stmts);
    };
    processStmt(stmts) {
        for (let stmt of stmts) {
            let rightOp = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!rightOp) {
                continue;
            }
            if (rightOp.getMethodSignature().getDeclaringClassSignature().getClassName() !== 'If') {
                continue;
            }
            let arg = rightOp.getArg(0);
            this.processArg(arg);
        }
    }
    processArg(arg1, arg2) {
        if (!(arg1 instanceof arkanalyzer_1.Local)) {
            return;
        }
        let decStmt = arg1.getDeclaringStmt();
        if (decStmt instanceof arkanalyzer_1.ArkConditionExpr) {
            if (this.processConditionExpr(decStmt)) {
                this.reportIssue(decStmt);
            }
        }
        else if (decStmt instanceof arkanalyzer_1.ArkAssignStmt) {
            let defRightOp = decStmt.getRightOp();
            if (defRightOp instanceof arkanalyzer_1.ArkConditionExpr) {
                if (this.processConditionExpr(defRightOp)) {
                    this.reportIssue(decStmt);
                }
            }
            else if (defRightOp instanceof arkanalyzer_1.ArkNormalBinopExpr) {
                this.processArg(defRightOp.getOp1());
            }
            else if (defRightOp instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
                if (displaySignature.includes(defRightOp.getMethodSignature().toString())) {
                    this.reportIssue(decStmt);
                }
            }
        }
        if (arg2) {
            this.processArg(arg2);
        }
    }
    processConditionExpr(expr) {
        let op1 = expr.getOp1();
        let op2 = expr.getOp2();
        let operator = expr.getOperator().toString();
        let fieldSignature = this.getStaticFieldSignature(op1);
        if (!fieldSignature) {
            return false;
        }
        if (fieldSignature === deviceTypeSignature && this.isOp2Valid(op2) && operator === '!==') {
            return true;
        }
        if ((fieldSignature === deviceTypeSignature && !this.isOp2Valid(op2)) ||
            displaySignature.includes(fieldSignature) ||
            (fieldSignature === foldStatusSignature && !this.isOp2Valid(op2))) {
            return true;
        }
        return false;
    }
    getStaticFieldSignature(op1) {
        if (!(op1 instanceof arkanalyzer_1.Local)) {
            return null;
        }
        let opDecStmt = op1.getDeclaringStmt();
        if (!(opDecStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return null;
        }
        let rightOp = opDecStmt.getRightOp();
        if (rightOp instanceof arkanalyzer_1.ArkStaticFieldRef || rightOp instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            return rightOp.getFieldSignature().toString();
        }
        else if (rightOp instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            return rightOp.getMethodSignature().toString();
        }
        else if (rightOp instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            this.processArg(rightOp.getOp1(), rightOp.getOp2());
        }
        return null;
    }
    isOp2Valid(op2) {
        if (op2 instanceof arkanalyzer_1.Local) {
            let op2Signature = this.getStaticFieldSignature(op2);
            if (op2Signature === foldDirectionSignature) {
                return true;
            }
        }
        if (op2 instanceof Constant_1.StringConstant) {
            if (op2.getValue() === '2in1') {
                return true;
            }
        }
        return false;
    }
    reportIssue(stmt) {
        const filePath = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile().getFilePath();
        if (!filePath) {
            return;
        }
        let text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        let originPosition = stmt.getOriginPositionInfo();
        let lineNum = originPosition.getLineNo();
        let startColum = originPosition.getColNo();
        let endColumn = startColum + 2;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(lineNum, startColum, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.OneMultiBreakpointCheck = OneMultiBreakpointCheck;
