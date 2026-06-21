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
exports.LoadOnDemandCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const Matchers_1 = require("../../matcher/Matchers");
const CheckerUtils_1 = require("../../utils/checker/CheckerUtils");
const Defects_1 = require("../../model/Defects");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'LoadOnDemandCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/load-on-demand-check.md',
    description: 'Load as needed LazyForEach.'
};
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const FOREACH_STR = 'ForEach';
class LoadOnDemandCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS,
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
        let viewTreeRoot = targetCla.getViewTree()?.getRoot();
        if (!viewTreeRoot) {
            return;
        }
        this.lookingForEach(targetCla, viewTreeRoot, targetCla.getDeclaringArkFile().getScene());
    };
    lookingForEach(targetCla, viewTreeRoot, scene) {
        if (viewTreeRoot === undefined || viewTreeRoot === null) {
            return;
        }
        if (viewTreeRoot.children.length === 0) {
            return;
        }
        if (viewTreeTool.hasTraverse(viewTreeRoot)) {
            return;
        }
        let childrens = viewTreeRoot.children;
        if (childrens[0].name === FOREACH_STR) {
            let stmts = childrens[0].attributes.get('create');
            if (!stmts) {
                return;
            }
            for (let stmt of stmts) {
                if (!(stmt instanceof lib_1.Stmt)) {
                    continue;
                }
                let invokerExpr = CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(stmt);
                if (!invokerExpr) {
                    continue;
                }
                let methodName = invokerExpr.getMethodSignature().getMethodSubSignature().getMethodName();
                if (methodName !== 'create') {
                    continue;
                }
                let observedSize = invokerExpr.getArg(0);
                let size = this.getForeachInitSize(targetCla, observedSize);
                if (size >= 20) {
                    this.reportIssue(targetCla.getDeclaringArkFile(), stmt, FOREACH_STR);
                }
            }
        }
        else {
            for (let children of childrens) {
                this.lookingForEach(targetCla, children, scene);
            }
        }
    }
    getForeachInitSize(arkClass, observedSize) {
        if (!(observedSize instanceof lib_1.Local)) {
            return 0;
        }
        let observedDeclaringStmt = observedSize.getDeclaringStmt();
        if (!observedDeclaringStmt || !(observedDeclaringStmt instanceof lib_1.ArkAssignStmt)) {
            return 0;
        }
        let arrRightOp = observedDeclaringStmt.getRightOp();
        if (arrRightOp instanceof lib_1.ArkInstanceFieldRef) {
            let fieldSignature = arrRightOp.getFieldSignature();
            return this.getSizeFromArkField(arkClass, fieldSignature);
        }
        return 0;
    }
    getSizeFromArkField(arkClass, fieldSignature) {
        let arkField = arkClass.getField(fieldSignature);
        if (!arkField) {
            return 0;
        }
        let stmts = arkField.getInitializer();
        if (stmts.length === 0) {
            return 0;
        }
        let stmt = stmts[0];
        if (!(stmt instanceof lib_1.ArkAssignStmt)) {
            return 0;
        }
        let value = stmt.getRightOp();
        if (value instanceof lib_1.ArkNewArrayExpr) {
            let size = value.getSize();
            if (size instanceof lib_1.Constant) {
                return Number(size.getValue());
            }
        }
        else if (value instanceof lib_1.ArkStaticInvokeExpr) {
            let argSize = value.getArg(0);
            if (argSize instanceof lib_1.Constant) {
                return Number(argSize.getValue());
            }
        }
        return 0;
    }
    reportIssue(arkFile, stmt, targetName) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPosition = stmt.getOriginPositionInfo();
        const lineNum = originPosition.getLineNo();
        const originText = stmt.getOriginalText();
        if (!originText || originText.length === 0) {
            return;
        }
        const startColumn = originPosition.getColNo() + originText.indexOf(targetName);
        const endColunm = startColumn + targetName.length - 1;
        let defects = new Defects_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defects, undefined));
    }
}
exports.LoadOnDemandCheck = LoadOnDemandCheck;
