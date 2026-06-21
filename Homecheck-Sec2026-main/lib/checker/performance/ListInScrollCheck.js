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
exports.ListInScrollCheck = void 0;
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ListInScrollCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/list-in-scroll-check.md',
    description: 'List needs to set the width and height in Scroll.'
};
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
class ListInScrollCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        category: [ArkClass_1.ClassCategory.STRUCT]
    };
    registerMatchers() {
        const matchClassCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClassCb];
    }
    check = (targetCla) => {
        if (!targetCla.hasViewTree() || viewTreeTool.hasTraverse(targetCla)) {
            return;
        }
        let rootTreeNode = targetCla.getViewTree()?.getRoot();
        if (!rootTreeNode) {
            return;
        }
        this.recursionCheck(rootTreeNode, 0);
    };
    recursionCheck(viewTreeRoot, count) {
        if (viewTreeRoot === undefined || viewTreeTool.hasTraverse(viewTreeRoot)) {
            return;
        }
        let name = viewTreeRoot.name;
        if (name === 'Scroll') {
            count++;
        }
        if (name === 'List' && !this.hasWidthAndHeight(viewTreeRoot) && count > 0) {
            for (let [key, value] of viewTreeRoot.attributes.entries()) {
                if (key !== 'create') {
                    continue;
                }
                this.reportIssue(value[0]);
            }
        }
        for (let child of viewTreeRoot.children) {
            this.recursionCheck(child, count);
        }
        if (name === 'Scroll') {
            count--;
        }
    }
    hasWidthAndHeight(viewTreeRoot) {
        let hasWidth = false;
        let hasHeight = false;
        for (let name of viewTreeRoot.attributes.keys()) {
            if (name === 'width') {
                hasWidth = true;
            }
            if (name === 'height') {
                hasHeight = true;
            }
        }
        return hasWidth && hasHeight;
    }
    reportIssue(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const arkFile = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile();
        if (!arkFile) {
            return;
        }
        const filePath = arkFile.getFilePath();
        const originPosition = stmt.getOriginPositionInfo();
        const lineNum = originPosition.getLineNo();
        const originText = stmt.getOriginalText();
        if (!originText || originText.length === 0) {
            return;
        }
        const key = 'List';
        const startColumn = originPosition.getColNo() + originText.indexOf(key);
        const endColunm = startColumn + key.length - 1;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.ListInScrollCheck = ListInScrollCheck;
