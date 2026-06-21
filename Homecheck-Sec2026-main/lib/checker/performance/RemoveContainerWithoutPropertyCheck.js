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
exports.RemoveContainerWithoutPropertyCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'RemoveContainerWithoutPropertyCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/remove-container-without-property-check.md',
    description: 'view depth should be reduced.'
};
const containerWidgets = ['Row', 'Column', 'Flex', 'Stack', 'Scroll', 'WaterFlow', 'Grid'];
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
class RemoveContainerWithoutPropertyCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS,
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
        if (arkClass.hasViewTree() && !viewTreeTool.hasTraverse(arkClass)) {
            let viewRoot = arkClass.getViewTree()?.getRoot();
            if (!viewRoot) {
                return;
            }
            this.traverseViewTree(arkClass.getDeclaringArkFile(), viewRoot);
        }
    };
    traverseViewTree(arkFile, treeNode) {
        if (treeNode === undefined || treeNode === null) {
            return;
        }
        if (!containerWidgets.includes(treeNode.name)) {
            return;
        }
        let stmts = treeNode.attributes;
        let childrens = treeNode.children;
        if (childrens.length === 1 && stmts.size <= 2) {
            let createStmt = stmts.get('create');
            if (createStmt) {
                let stmt = createStmt[0];
                let fileSignature = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile().getFileSignature();
                // 只上报同文件，跨文件不上报
                if (fileSignature && fileSignature === arkFile.getFileSignature()) {
                    this.reportIssue(arkFile, stmt, treeNode);
                }
            }
        }
        for (let children of childrens) {
            this.traverseViewTree(arkFile, children);
        }
    }
    reportIssue(arkFile, stmt, viewRoot) {
        let arkFilePath = arkFile.getFilePath();
        let originPosition = stmt.getOriginPositionInfo();
        let lineNum = originPosition.getLineNo();
        let orgStmtStr = stmt.getOriginalText();
        if (!orgStmtStr || orgStmtStr.length === 0) {
            return;
        }
        let viewIndex = orgStmtStr.indexOf(viewRoot.name);
        if (viewIndex === -1) {
            return;
        }
        let startColumn = originPosition.getColNo() + viewIndex;
        let endColumn = startColumn + viewRoot.name.length - 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Defects_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, arkFilePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.RemoveContainerWithoutPropertyCheck = RemoveContainerWithoutPropertyCheck;
