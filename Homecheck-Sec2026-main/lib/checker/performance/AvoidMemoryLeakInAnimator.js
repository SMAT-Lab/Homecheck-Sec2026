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
exports.AvoidMemoryLeakInAnimator = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AvoidMemoryLeakInAnimator');
const stmtMap = new Map();
const CreateSignatures = [
    '@ohosSdk/api/@ohos.animator.d.ts: Animator.[static]create(@ohosSdk/api/@ohos.animator.d.ts: AnimatorOptions)',
    '@ohosSdk/api/@ohos.arkui.UIContext.d.ts: UIContext.createAnimator(@ohosSdk/api/@ohos.animator.d.ts: AnimatorOptions)',
];
const Signatures = [
    '@ohosSdk/api/@ohos.animator.d.ts: AnimatorResult.finish()',
    '@ohosSdk/api/@ohos.animator.d.ts: AnimatorResult.cancel()',
];
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/avoid-memory-leak-in-animator.md',
    description: 'First finish/cancel, then empty it.'
};
class AvoidMemoryLeakInAnimator {
    metaData = gMetaData;
    rule;
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        hasViewTree: true
    };
    registerMatchers() {
        const matchClassCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClassCb];
    }
    check = (target) => {
        stmtMap.clear();
        const methods = target.getMethods();
        this.getCreateStmt(methods);
        for (let [key, value] of stmtMap) {
            const hasFinishOrCancelStmt = this.getFinishOrCancelStmt(methods, key.toString());
            const hasEmptyStmt = this.getEmptyStmt(methods, key.toString());
            const name = target.getField(key)?.getName();
            if (name === undefined) {
                continue;
            }
            if (hasFinishOrCancelStmt && hasEmptyStmt) {
                continue;
            }
            this.reportIssue(value, name);
        }
    };
    getCreateStmt(methods) {
        for (let mtd of methods) {
            const stmts = mtd.getBody()?.getCfg().getStmts() ?? [];
            for (let stmt of stmts) {
                if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                const rightOp = stmt.getRightOp();
                if (!(rightOp instanceof arkanalyzer_1.AbstractInvokeExpr)) {
                    continue;
                }
                const methodSignatureStr = rightOp.getMethodSignature().toString();
                if (!CreateSignatures.includes(methodSignatureStr)) {
                    continue;
                }
                const leftOp = stmt.getLeftOp();
                if (!(leftOp instanceof arkanalyzer_1.Local)) {
                    continue;
                }
                const usedStmt = leftOp.getUsedStmts()[0];
                if (!(usedStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                const leftOp2 = usedStmt.getLeftOp();
                if (!(leftOp2 instanceof arkanalyzer_1.ArkInstanceFieldRef)) {
                    continue;
                }
                const fieldSignature = leftOp2.getFieldSignature();
                stmtMap.set(fieldSignature, stmt);
            }
        }
    }
    getFinishOrCancelStmt(methods, signature) {
        for (let mtd of methods) {
            const stmts = mtd.getBody()?.getCfg().getStmts() ?? [];
            for (let stmt of stmts) {
                const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
                if (!invokeExpr) {
                    continue;
                }
                if (!(invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
                    continue;
                }
                const methodSignatureStr = invokeExpr.getMethodSignature().toString();
                if (!Signatures.includes(methodSignatureStr)) {
                    continue;
                }
                const base = invokeExpr.getBase();
                if (!(base instanceof arkanalyzer_1.Local)) {
                    continue;
                }
                const declaringStmt = base.getDeclaringStmt();
                if (!(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                const rightOp = declaringStmt.getRightOp();
                if (!(rightOp instanceof arkanalyzer_1.ArkInstanceFieldRef)) {
                    continue;
                }
                const fieldSignature = rightOp.getFieldSignature().toString();
                if (fieldSignature !== signature) {
                    continue;
                }
                return true;
            }
        }
        return false;
    }
    getEmptyStmt(methods, signature) {
        for (let mtd of methods) {
            const stmts = mtd.getBody()?.getCfg().getStmts() ?? [];
            for (let stmt of stmts) {
                if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                const rightOp = stmt.getRightOp();
                if (!(rightOp instanceof Constant_1.UndefinedConstant)) {
                    continue;
                }
                const leftOp = stmt.getLeftOp();
                if (!(leftOp instanceof arkanalyzer_1.ArkInstanceFieldRef)) {
                    continue;
                }
                const fieldSignature = leftOp.getFieldSignature().toString();
                if (fieldSignature !== signature) {
                    continue;
                }
                return true;
            }
        }
        return false;
    }
    reportIssue(stmt, name) {
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            logger.debug('Stmt text is empty.');
            return;
        }
        const index = text.indexOf(name);
        if (index === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const startColum = originalPosition.getColNo() + index;
        const endColum = startColum + name.length - 1;
        const filePath = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile().getFilePath();
        let defects = new Defects_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.AvoidMemoryLeakInAnimator = AvoidMemoryLeakInAnimator;
