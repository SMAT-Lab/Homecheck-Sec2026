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
exports.EffectkitBlurCheck = void 0;
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'EffectkitBlurCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/effectkit-blur-check.md',
    description: 'We recommend that you use effectKit.createEffect to achieve the blur effect.'
};
const blurStr = 'blur';
const imageStr = 'Image';
const backdropBlurStr = 'backdropBlur';
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
class EffectkitBlurCheck {
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
        this.traverseViewTree(rootTreeNode, targetCla);
    };
    traverseViewTree(viewTreeRoot, arkClass) {
        if (viewTreeRoot === null) {
            return;
        }
        for (let [key, vals] of viewTreeRoot.attributes) {
            if (key === blurStr && viewTreeRoot.name === imageStr) {
                this.reportIssue(arkClass.getDeclaringArkFile(), vals[0], key);
            }
            else if (key === backdropBlurStr) {
                this.reportIssue(arkClass.getDeclaringArkFile(), vals[0], key);
            }
        }
        if (viewTreeRoot.children.length > 0) {
            for (let child of viewTreeRoot.children) {
                let classSignature = child.signature;
                if (classSignature && child.isCustomComponent()) {
                    continue;
                }
                this.traverseViewTree(child, arkClass);
            }
        }
    }
    reportIssue(arkFile, stmt, keyword) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        if (!stmt) {
            return;
        }
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNo = originalPosition.getLineNo();
        const orgStmtStr = stmt.getOriginalText();
        let startColumn = -1;
        let endColunm = -1;
        if (!orgStmtStr || orgStmtStr.length === 0) {
            return;
        }
        let originalTexts = orgStmtStr.split('\n');
        let lineCount = -1;
        for (let [index, originalText] of originalTexts.entries()) {
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
        endColunm = startColumn + keyword.length - 1;
        if (startColumn === -1) {
            return;
        }
        let lineNum = lineNo + lineCount;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.EffectkitBlurCheck = EffectkitBlurCheck;
