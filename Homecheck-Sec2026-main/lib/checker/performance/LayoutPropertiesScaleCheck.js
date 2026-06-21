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
exports.LayoutPropertiesScaleCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'LayoutPropertiesScaleCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/layout-properties-scale-check.md',
    description: 'Use the property animation scale of graphic transformation when the component layout is changed.'
};
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
let layoutSet = new Set(['width', 'height', 'layoutWeight', 'size']);
class LayoutPropertiesScaleCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        category: [ArkClass_1.ClassCategory.STRUCT],
        hasViewTree: true
    };
    methodMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        class: [this.clsMatcher]
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.methodMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (targetMethod) => {
        const stmts = targetMethod.getBody()?.getCfg().getStmts() ?? [];
        for (let stmt of stmts) {
            if (!(stmt instanceof lib_1.ArkInvokeStmt)) {
                continue;
            }
            const methodSignature = stmt.getInvokeExpr().getMethodSignature();
            const invokeMethodName = methodSignature.getMethodSubSignature().getMethodName();
            if (invokeMethodName === 'animateTo') {
                this.parameterComper(stmt, targetMethod.getDeclaringArkClass());
            }
        }
    };
    parameterComper(stmt, arkClass) {
        let args = stmt.getInvokeExpr().getArgs();
        for (let arg of args) {
            let type = arg.getType();
            if (type instanceof lib_1.FunctionType) {
                let arkMethod = arkClass.getDeclaringArkFile().getScene().getMethod(type.getMethodSignature());
                if (!arkMethod) {
                    continue;
                }
                let arkStmts = arkMethod.getBody()?.getCfg().getStmts() ?? [];
                this.stmtComper(arkStmts, arkClass);
            }
        }
    }
    stmtComper(stmts, arkClass) {
        for (let stmt of stmts) {
            if (!(stmt instanceof lib_1.ArkAssignStmt)) {
                continue;
            }
            let leftOp = stmt.getLeftOp();
            if (leftOp instanceof lib_1.ArkInstanceFieldRef) {
                let fieldName = leftOp.getFieldName();
                if (this.isInViewTree(fieldName, arkClass) && this.isStateVariable(fieldName, arkClass)) {
                    this.reportIssue(arkClass.getDeclaringArkFile(), stmt, fieldName);
                }
            }
        }
    }
    isInViewTree(fieldName, arkClass) {
        const viewTreeRoot = arkClass.getViewTree()?.getRoot();
        if (!viewTreeRoot) {
            return false;
        }
        for (let child of viewTreeRoot.children) {
            if (this.checkChildren(child, fieldName)) {
                return true;
            }
        }
        return false;
    }
    checkChildren(child, fieldName) {
        for (let [key, value] of child.attributes.entries()) {
            if (!layoutSet.has(key)) {
                continue;
            }
            for (let val of value) {
                if (val instanceof Array && this.checkVal(val, fieldName)) {
                    return true;
                }
            }
        }
        return false;
    }
    checkVal(val, fieldName) {
        for (let instanFileRef of val) {
            if (!(instanFileRef instanceof lib_1.ArkInstanceFieldRef)) {
                continue;
            }
            let name = instanFileRef.getFieldName();
            if (name === fieldName) {
                return true;
            }
        }
        return false;
    }
    isStateVariable(fieldName, arkClass) {
        if (!arkClass.getFields()) {
            return false;
        }
        for (let arkField of arkClass.getFields()) {
            if (arkField.getName() === fieldName) {
                return arkField.hasDecorator(new Set(['State', 'Link', 'Prop', 'Provide', 'Consume', 'Observed', 'ObjectLink']));
            }
        }
        return false;
    }
    reportIssue(arkFile, stmt, keyword) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        let startColumn = -1;
        let endColunm = -1;
        const orgStmtStr = stmt.getOriginalText();
        if (orgStmtStr && orgStmtStr.length !== 0) {
            startColumn = originalPosition.getColNo() + orgStmtStr.indexOf(keyword);
            endColunm = startColumn + keyword.length - 1;
        }
        if (startColumn === -1) {
            return;
        }
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.LayoutPropertiesScaleCheck = LayoutPropertiesScaleCheck;
