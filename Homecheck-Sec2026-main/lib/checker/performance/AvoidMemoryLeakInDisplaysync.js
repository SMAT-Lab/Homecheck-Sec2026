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
exports.AvoidMemoryLeakInDisplaysync = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AvoidMemoryLeakInDisplaysync');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/avoid-memory-leak-in-displaysync.md',
    description: 'The DisplaySync needs to be stopped and set to null to avoid memory leaks.'
};
const createSignature = `@ohosSdk/api/@ohos.graphics.displaySync.d.ts: displaySync.${lib_1.DEFAULT_ARK_CLASS_NAME}.create()`;
const startSignature = `@ohosSdk/api/@ohos.graphics.displaySync.d.ts: displaySync.DisplaySync.start()`;
const stopSignature = `@ohosSdk/api/@ohos.graphics.displaySync.d.ts: displaySync.DisplaySync.stop()`;
let displaySyncMap = new Map();
class AvoidMemoryLeakInDisplaysync {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    classMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS
    };
    registerMatchers() {
        const matchClassCb = {
            matcher: this.classMatcher,
            callback: this.check
        };
        return [matchClassCb];
    }
    check = (arkClass) => {
        for (const method of arkClass.getMethods()) {
            let fieldSignature = this.getCreateFieldSignature(method);
            if (!fieldSignature) {
                continue;
            }
            let fieldUsedInStartMethod = this.isFieldUsedInStartMethod(arkClass, fieldSignature.toString());
            if (!fieldUsedInStartMethod) {
                continue;
            }
            let field = arkClass.getField(fieldSignature);
            if (!field) {
                continue;
            }
            let disappearMethod = arkClass.getMethodWithName('aboutToDisappear');
            if (!disappearMethod) {
                return;
            }
            let stmts = disappearMethod.getCfg()?.getStmts();
            if (!stmts) {
                return;
            }
            this.getStopSigna(stmts, field);
            if (displaySyncMap.get(field.getName())?.length !== 2) {
                this.reportIssue(field);
            }
            displaySyncMap.clear();
        }
    };
    getCreateFieldSignature(method) {
        for (const stmt of method.getCfg()?.getStmts() ?? []) {
            let invoke = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invoke) {
                continue;
            }
            if (invoke.getMethodSignature().toString() !== createSignature) {
                continue;
            }
            if (!(stmt instanceof lib_1.ArkAssignStmt)) {
                continue;
            }
            let leftOp = stmt.getLeftOp();
            if (!(leftOp instanceof lib_1.Local)) {
                continue;
            }
            let usedStmt = leftOp.getUsedStmts()[0];
            if (!(usedStmt instanceof lib_1.ArkAssignStmt)) {
                continue;
            }
            let useLeftOp = usedStmt.getLeftOp();
            if (useLeftOp instanceof lib_1.ArkInstanceFieldRef) {
                return useLeftOp.getFieldSignature();
            }
        }
        return null;
    }
    isFieldUsedInStartMethod(clazz, fieldSignature) {
        for (let method of clazz.getMethods()) {
            for (const stmt of method.getCfg()?.getStmts() ?? []) {
                let invoke = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
                if (!invoke) {
                    continue;
                }
                let signa = invoke.getMethodSignature().toString();
                if (signa !== startSignature) {
                    continue;
                }
                let startFieldSigna = this.getDisplaysyncFieldSignature(invoke);
                if (startFieldSigna && fieldSignature.toString() === startFieldSigna) {
                    return true;
                }
            }
        }
        return false;
    }
    getDisplaysyncFieldSignature(invoke) {
        if (!(invoke instanceof lib_1.ArkInstanceInvokeExpr)) {
            return null;
        }
        let base = invoke.getBase();
        let decStmt = base.getDeclaringStmt();
        if (decStmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = decStmt.getRightOp();
            if (rightOp instanceof lib_1.ArkInstanceFieldRef) {
                return rightOp.getFieldSignature().toString();
            }
        }
        return null;
    }
    getStopSigna(stmts, field) {
        let fieldStmt = [];
        for (const stmt of stmts) {
            if (fieldStmt.length === 0) {
                if (!(stmt instanceof lib_1.ArkInvokeStmt)) {
                    continue;
                }
                this.handleArkInvokeStmt(stmt, field, fieldStmt);
            }
            if (stmt instanceof lib_1.ArkAssignStmt) {
                this.handleArkAssignStmt(stmt, field, fieldStmt);
            }
        }
        if (displaySyncMap.get(field.getName())?.length !== 2) {
            displaySyncMap.set(field.getName(), fieldStmt);
        }
    }
    handleArkInvokeStmt(stmt, field, fieldStmt) {
        let invoker = stmt.getInvokeExpr();
        if (invoker.getMethodSignature().toString() === stopSignature) {
            if (this.getDisplaysyncFieldSignature(invoker) === field.getSignature().toString()) {
                fieldStmt.push(stmt);
            }
            return;
        }
        else {
            let subMethod = stmt.getCfg().getDeclaringMethod().getDeclaringArkClass().getMethod(invoker.getMethodSignature());
            if (!subMethod) {
                return;
            }
            this.getStopSigna(subMethod.getCfg()?.getStmts() ?? [], field);
        }
    }
    handleArkAssignStmt(stmt, field, fieldStmt) {
        let leftOp = stmt.getLeftOp();
        let rightOp = stmt.getRightOp();
        if (!(leftOp instanceof lib_1.ArkInstanceFieldRef)) {
            return;
        }
        if (!(rightOp instanceof Constant_1.UndefinedConstant)) {
            return;
        }
        if (leftOp.getFieldSignature().toString() === field.getSignature().toString() && rightOp.getValue() === 'undefined') {
            fieldStmt.push(stmt);
        }
    }
    reportIssue(field) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = field.getDeclaringArkClass().getDeclaringArkFile().getFilePath();
        const positionInfo = field.getOriginPosition();
        const lineNum = positionInfo.getLineNo();
        const fieldName = field.getName();
        const lineCode = field.getCode();
        const startColumn = positionInfo.getColNo() + lineCode.indexOf(fieldName);
        const endColunm = startColumn + fieldName.length;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.AvoidMemoryLeakInDisplaysync = AvoidMemoryLeakInDisplaysync;
