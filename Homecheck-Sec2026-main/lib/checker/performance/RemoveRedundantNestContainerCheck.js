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
exports.RemoveRedundantNestContainerCheck = void 0;
const Index_1 = require("../../Index");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'RemoveRedundantNestContainerCheck');
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/remove-redundant-nest-container-check.md',
    description: 'Found view nesting too deep.'
};
class RemoveRedundantNestContainerCheck {
    metaData = gMetaData;
    rule;
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        hasViewTree: true
    };
    registerMatchers() {
        const matchClazzCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClazzCb];
    }
    check = (target) => {
        let viewRoot = target.getViewTree()?.getRoot();
        if (!viewRoot) {
            return;
        }
        let depth = this.getViewTreeDepth(viewRoot);
        if (depth <= 30) {
            return;
        }
        let stmts = viewRoot.attributes.get('create');
        if (!stmts) {
            return;
        }
        let stmt = stmts[0];
        this.reportIssue(target, viewRoot, stmt);
    };
    getViewTreeDepth(treeNode) {
        if (treeNode === undefined) {
            return 0;
        }
        if (!treeNode.children || treeNode.children.length === 0) {
            return 1;
        }
        if (viewTreeTool.hasTraverse(treeNode)) {
            return 1;
        }
        let depth = 1;
        for (let childNode of treeNode.children) {
            depth = Math.max(depth, (this.getViewTreeDepth(childNode) + 1));
            if (depth > 31) {
                break;
            }
        }
        return depth;
    }
    reportIssue(target, viewRoot, stmt) {
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            logger.debug('Stmt text is empty.');
            return;
        }
        const index = text.indexOf(viewRoot.name);
        if (index === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const startColum = originalPosition.getColNo() + index;
        const endColum = startColum + viewRoot.name.length - 1;
        const filePath = target.getDeclaringArkFile().getFilePath();
        let defects = new Index_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.RemoveRedundantNestContainerCheck = RemoveRedundantNestContainerCheck;
