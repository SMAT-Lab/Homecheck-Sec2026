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
exports.AvoidEmptyCallbackCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AvoidEmptyCallbackCheck');
const STMTSLENGTH = 2;
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/avoid-empty-callback-check.md',
    description: 'Do not set empty system callback listeners.'
};
const eventSet = new Set(['onTouch', 'onItemDragMove', 'onDragMove', 'onMouse',
    'onVisibleAreaChange', 'onAreaChange', 'onDidScroll', 'onActionUpdate', 'onClick']);
class AvoidEmptyCallbackCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        hasViewTree: true
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (arkClass) => {
        if (viewTreeTool.hasTraverse(arkClass)) {
            return;
        }
        const viewtreeRoot = arkClass.getViewTree()?.getRoot();
        if (!viewtreeRoot) {
            return;
        }
        this.traverseViewTree(viewtreeRoot, arkClass);
    };
    traverseViewTree(viewtreeRoot, arkClass) {
        if (viewtreeRoot === undefined) {
            return;
        }
        this.onClickOperation(viewtreeRoot, arkClass);
        if (viewtreeRoot.children.length > 0) {
            for (let child of viewtreeRoot.children) {
                let classSignature = child.signature;
                if (classSignature && child.isCustomComponent()) {
                    continue;
                }
                this.traverseViewTree(child, arkClass);
            }
        }
    }
    onClickOperation(viewtreeRoot, arkClass) {
        for (let [key, vals] of viewtreeRoot.attributes) {
            if (eventSet.has(key)) {
                this.onClickCheck(key, vals, arkClass);
            }
        }
    }
    onClickCheck(key, stmts, arkClass) {
        let stmt = stmts[0];
        const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invokeExpr || !this.isReport(invokeExpr, arkClass.getDeclaringArkFile().getScene())) {
            return;
        }
        this.reportIssue(stmt, key, invokeExpr);
        return;
    }
    isReport(invokeExpr, scene) {
        let arg = invokeExpr.getArg(0);
        let type = arg.getType();
        if (!(type instanceof arkanalyzer_1.FunctionType)) {
            return false;
        }
        let methodSignature = type.getMethodSignature();
        let method = scene.getMethod(methodSignature);
        if (method === null) {
            return false;
        }
        let methodStmts = method.getBody()?.getCfg()?.getStmts();
        if (!methodStmts || methodStmts.length !== STMTSLENGTH) {
            return false;
        }
        return true;
    }
    reportIssue(stmt, keyword, invokeExpr) {
        if (!(invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
            return;
        }
        const filePath = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile().getFilePath();
        let originalPosition = stmt.getOriginPositionInfo();
        let startColumn = -1;
        let endColumn = -1;
        let orgStmtStr = stmt.getOriginalText();
        if (!orgStmtStr || orgStmtStr.length === 0) {
            return;
        }
        let originalTexts = orgStmtStr.split('\n');
        let position = stmt.getOperandOriginalPosition(invokeExpr.getBase());
        if (!position) {
            return;
        }
        let baseLastLine = position.getLastLine();
        let diffNum = baseLastLine - position.getFirstLine();
        let originalTextsSlice = originalTexts.slice(diffNum);
        let lineCount = -1;
        for (let [index, originalText] of originalTextsSlice.entries()) {
            lineCount++;
            if (!originalText.includes(keyword)) {
                continue;
            }
            if (index === 0) {
                startColumn = originalText.indexOf(keyword) + originalPosition.getColNo();
            }
            else {
                startColumn = originalText.indexOf(keyword) + 1;
            }
            break;
        }
        endColumn = startColumn + keyword.length - 1;
        if (startColumn === -1) {
            return;
        }
        let lineNum = baseLastLine + lineCount;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.AvoidEmptyCallbackCheck = AvoidEmptyCallbackCheck;
