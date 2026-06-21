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
exports.UseGridLayoutOptionsCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'UseGridLayoutOptionsCheck');
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/use-grid-layout-options-check.md',
    description: 'Use GridLayoutOptions when specifying the position in girds.'
};
class UseGridLayoutOptionsCheck {
    metaData = gMetaData;
    GRID_COMPONENT = 'Grid';
    FOREACH_COMPONENT = 'ForEach';
    GRID_ITEM = 'GridItem';
    rule;
    defects = [];
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
        if (viewTreeTool.hasTraverse(target)) {
            return;
        }
        let viewTreeRoot = target.getViewTree()?.getRoot();
        if (!viewTreeRoot) {
            return;
        }
        const parentNodes = [];
        this.traverseViewTree(target, viewTreeRoot, parentNodes);
    };
    traverseViewTree(target, viewTreeRoot, parentNodes) {
        if (viewTreeRoot.isCustomComponent() && this.isCustomNodeInParentNodes(viewTreeRoot, parentNodes)) {
            return;
        }
        parentNodes.push(viewTreeRoot);
        if (viewTreeRoot.children.length === 0) {
            parentNodes.pop();
            return;
        }
        if (viewTreeRoot.isCustomComponent()) {
            parentNodes.pop();
            return;
        }
        if (viewTreeRoot.name === this.GRID_ITEM) {
            if (this.hasGridItemChange(viewTreeRoot)) {
                let nearParentNode = this.getNearParentNode(parentNodes);
                if (!nearParentNode) {
                    parentNodes.pop();
                    return;
                }
                if (!this.hasGridSetLayoutOptions(nearParentNode)) {
                    this.addIssueReport(target, nearParentNode);
                }
            }
        }
        for (let children of viewTreeRoot.children) {
            if (children.isCustomComponent()) {
                continue;
            }
            this.traverseViewTree(target, children, parentNodes);
        }
        parentNodes.pop();
    }
    isCustomNodeInParentNodes(viewTreeRoot, parentNodes) {
        for (let parentNode of parentNodes) {
            if (parentNode.isCustomComponent() && parentNode.signature === viewTreeRoot.signature) {
                return true;
            }
        }
        return false;
    }
    hasGridItemChange(viewTreeRoot) {
        return viewTreeRoot.attributes.has('columnStart') || viewTreeRoot.attributes.has('columnEnd') ||
            viewTreeRoot.attributes.has('rowStart') || viewTreeRoot.attributes.has('rowEnd');
    }
    getNearParentNode(parentNodes) {
        for (let i = parentNodes.length - 2; i >= 0; i--) {
            let parentNode = parentNodes[i];
            if (parentNode.name === this.FOREACH_COMPONENT) {
                return null;
            }
            if (parentNode.name === this.GRID_COMPONENT) {
                return parentNode;
            }
        }
        return null;
    }
    hasGridSetLayoutOptions(nearParentNode) {
        let stmts = nearParentNode.attributes.get('create');
        if (!stmts) {
            return false;
        }
        if (stmts.length < 2) {
            return false;
        }
        if (stmts[1].length < 2) {
            return false;
        }
        return true;
    }
    addIssueReport(target, nearParentNode) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(target, nearParentNode);
        if (warnInfo) {
            let defects = new Index_1.Defects(warnInfo.lineNum, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    getLineAndColumn(target, nearParentNode) {
        const arkFile = target.getDeclaringArkFile();
        if (arkFile) {
            let stmts = nearParentNode.attributes.get('create');
            if (!stmts) {
                return undefined;
            }
            let name = nearParentNode.name;
            if (nearParentNode.isCustomComponent()) {
                let nodeSignature = nearParentNode.signature;
                if (nodeSignature instanceof lib_1.ClassSignature) {
                    name = nodeSignature.getClassName();
                }
            }
            const text = stmts[0].getOriginalText() ?? '';
            const nodeIndex = text.indexOf(name);
            if (nodeIndex === -1) {
                return undefined;
            }
            const originalPosition = stmts[0].getOriginPositionInfo();
            const lineNum = originalPosition.getLineNo();
            const startCol = originalPosition.getColNo() + nodeIndex;
            const endCol = startCol + name.length - 1;
            const originPath = arkFile.getFilePath();
            return { lineNum, startCol, endCol, filePath: originPath };
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.UseGridLayoutOptionsCheck = UseGridLayoutOptionsCheck;
