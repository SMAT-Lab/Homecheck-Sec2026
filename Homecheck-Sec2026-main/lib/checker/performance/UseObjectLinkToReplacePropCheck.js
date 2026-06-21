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
exports.UseObjectLinkToReplacePropCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'UseObjectLinkToReplacePropCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/use-object-link-to-replace-prop-check.md',
    description: 'It is recommended to use @ObjectLink instead @Prop reduce unnecessary deep copies.'
};
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
class UseObjectLinkToReplacePropCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        category: [ArkClass_1.ClassCategory.STRUCT],
        hasViewTree: true
    };
    registerMatchers() {
        const matchClassCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClassCb];
    }
    check = (targetCla) => {
        if (viewTreeTool.hasTraverse(targetCla)) {
            return;
        }
        let rootTreeNode = targetCla.getViewTree()?.getRoot();
        if (!rootTreeNode) {
            return;
        }
        for (let arkField of targetCla.getFields()) {
            if (!arkField.hasDecorator('Prop')) {
                continue;
            }
            if (this.isPrimitiveType(arkField)) {
                continue;
            }
            if (!this.isObservedType(targetCla.getDeclaringArkFile(), arkField)) {
                continue;
            }
            if (!this.isModifiedByCurrentClass(targetCla, arkField)) {
                this.reportIssue(targetCla.getDeclaringArkFile(), arkField);
            }
        }
    };
    isPrimitiveType(arkField) {
        let type = arkField.getType();
        if (type instanceof lib_1.PrimitiveType) {
            return true;
        }
        return false;
    }
    isObservedType(arkFile, arkField) {
        let type = arkField.getType();
        if (!(type instanceof lib_1.ClassType)) {
            return false;
        }
        let dataClass = arkFile.getClass(type.getClassSignature());
        if (!dataClass) {
            return false;
        }
        if (dataClass.hasDecorator('Observed')) {
            return true;
        }
        return false;
    }
    isModifiedByCurrentClass(arkClass, arkField) {
        let fieldType = arkField.getType();
        if (!(fieldType instanceof lib_1.ClassType)) {
            return false;
        }
        let fieldClassName = fieldType.getClassSignature().getClassName();
        for (let method of arkClass.getMethods()) {
            let stmts = method.getCfg()?.getStmts();
            if (!stmts) {
                continue;
            }
            return this.traverseStmts(stmts, fieldClassName);
        }
        return false;
    }
    traverseStmts(stmts, fieldClassName) {
        for (let stmt of stmts) {
            if (stmt instanceof lib_1.ArkAssignStmt) {
                let leftOp = stmt.getLeftOp();
                if (!(leftOp instanceof lib_1.AbstractFieldRef)) {
                    continue;
                }
                let declaringSignature = leftOp.getFieldSignature().getDeclaringSignature();
                if (!(declaringSignature instanceof lib_1.ClassSignature)) {
                    continue;
                }
                let leftFieldClassName = declaringSignature.getClassName();
                if (leftFieldClassName === fieldClassName) {
                    return true;
                }
            }
            let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invoker) {
                continue;
            }
            let invokerClassName = invoker.getMethodSignature().getDeclaringClassSignature().getClassName();
            if (invokerClassName === fieldClassName) {
                return true;
            }
            let args = invoker.getArgs();
            for (let arg of args) {
                if (!(arg instanceof lib_1.Local)) {
                    continue;
                }
                let argType = arg.getType();
                if (!(argType instanceof lib_1.ClassType)) {
                    continue;
                }
                if (argType.getClassSignature().getClassName() === fieldClassName) {
                    return true;
                }
            }
        }
        return false;
    }
    reportIssue(arkFile, arkField) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const positionInfo = arkField.getOriginPosition();
        const lineNum = positionInfo.getLineNo();
        const fieldName = arkField.getName();
        const lineCode = arkField.getCode();
        const startColumn = positionInfo.getColNo() + lineCode.indexOf(fieldName);
        const endColunm = startColumn + fieldName.length;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.UseObjectLinkToReplacePropCheck = UseObjectLinkToReplacePropCheck;
