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
exports.ReplaceNestedReusableComponentByBuilderCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ReplaceNestedReusableComponentByBuilderCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/replace-nested-reusable-component-by-builder-check.md',
    description: 'Prioritize @Builder over nested custom component.'
};
const containerComponent = ['List', 'Grid', 'WaterFlow', 'Swiper'];
const containerItem = ['ListItem', 'GridItem', 'FlowItem'];
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
class ReplaceNestedReusableComponentByBuilderCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
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
        const parentNodes = [];
        this.traverseViewTree(targetCla.getDeclaringArkFile(), rootTreeNode, parentNodes);
    };
    traverseViewTree(arkFile, treeNode, parentNodes) {
        if (!treeNode) {
            return;
        }
        // 防止自定义组件互相嵌套导致max call
        if (treeNode.isCustomComponent() && this.isCustomNodeInParentNodes(treeNode, parentNodes)) {
            return;
        }
        // 记录parent节点
        parentNodes.push(treeNode);
        // 跳过非容器组件
        if (treeNode.children.length === 0) {
            parentNodes.pop();
            return;
        }
        // 当前节点是LazyForEach
        if (treeNode.name === 'LazyForEach') {
            let pNodeName = this.getNearParentName(parentNodes);
            // 如果LazyForEach未找到四大组件类型的父节点，则不会产生复用场景，直接跳过
            if (pNodeName === '') {
                parentNodes.pop();
                return;
            }
            else if (pNodeName === 'Swiper') {
                // Swiper组件LazyForEach下面第一级子组件都要报，还要继续遍历
                this.reportReuseComponentAndContinueTraverse(arkFile, treeNode);
            }
            else {
                // 遍历List,Grid,WaterFlow三种组件的*Item
                for (let children of treeNode.children) {
                    this.traverseViewTree(arkFile, children, parentNodes);
                }
            }
            parentNodes.pop();
            return;
        }
        // 当前节点是*Item
        if (containerItem.includes(treeNode.name)) {
            // 遍历List,Grid,WaterFlow三种组件的*Item
            this.reportReuseComponentAndContinueTraverse(arkFile, treeNode);
            parentNodes.pop();
            return;
        }
        // 跳过自定义控件处理，hp可以解析出自定义控件里面嵌套的组件
        if (treeNode.isCustomComponent()) {
            parentNodes.pop();
            return;
        }
        for (let children of treeNode.children) {
            if (children.isCustomComponent()) {
                continue;
            }
            if (children.children.length === 0) {
                continue;
            }
            this.traverseViewTree(arkFile, children, parentNodes);
        }
        parentNodes.pop();
    }
    isCustomNodeInParentNodes(customNode, parentNodes) {
        for (let pNode of parentNodes) {
            if (pNode.isCustomComponent() && pNode.signature === customNode.signature) {
                return true;
            }
        }
        return false;
    }
    getNearParentName(parentNodes) {
        for (let i = parentNodes.length - 2; i >= 0; i--) {
            let pNode = parentNodes[i];
            if (pNode.name === 'LazyForEach') {
                return '';
            }
            if (containerComponent.includes(pNode.name)) {
                return pNode.name;
            }
        }
        return '';
    }
    reportReuseComponentAndContinueTraverse(arkFile, treeNode) {
        // 将treeNode节点下面的所有组件进行上报
        for (let children of treeNode.children) {
            if (!children.isCustomComponent()) {
                continue;
            }
            let nodeSignature = children.signature;
            if (!nodeSignature) {
                continue;
            }
            if (!(nodeSignature instanceof lib_1.ClassSignature)) {
                continue;
            }
            let customNodeClass = arkFile.getScene().getClass(nodeSignature);
            if (!customNodeClass) {
                continue;
            }
            // 自定义组件有@Reusable注解
            let hasReusable = customNodeClass.hasDecorator('Reusable');
            // 自定义组件实现了aboutToReuse方法
            let aboutToReuseMethod = customNodeClass.getMethodWithName('aboutToReuse');
            if (hasReusable && aboutToReuseMethod) {
                let customNodeFile = customNodeClass.getDeclaringArkFile();
                if (!customNodeClass.hasViewTree()) {
                    continue;
                }
                if (viewTreeTool.hasTraverse(customNodeClass)) {
                    continue;
                }
                let customRoot = customNodeClass.getViewTree()?.getRoot();
                if (!customRoot) {
                    continue;
                }
                this.traverseSubViewTree(customNodeFile, customRoot);
            }
        }
    }
    traverseSubViewTree(arkFile, customRootNode) {
        // 自定义组件内部采用@builder，跳过
        if (customRootNode.name === 'Builder' && customRootNode.signature instanceof lib_1.MethodSignature) {
            return;
        }
        else if (customRootNode.isCustomComponent() && customRootNode.signature instanceof lib_1.ClassSignature) {
            // 自定义组件内部嵌套自定义控件，上报
            this.reportIssue(arkFile, customRootNode);
            return;
        }
        if (customRootNode.children.length === 0) {
            return;
        }
        for (let children of customRootNode.children) {
            this.traverseSubViewTree(arkFile, children);
        }
    }
    reportIssue(arkFile, reportNode) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const createStmts = reportNode.attributes.get('create');
        if (!createStmts) {
            return;
        }
        let stmt = createStmts[0];
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        let nodeSignature = reportNode.signature;
        if (!(nodeSignature instanceof lib_1.ClassSignature)) {
            return;
        }
        let nodeIndex = text.indexOf(nodeSignature.getClassName());
        if (nodeIndex === -1) {
            return;
        }
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const startColumn = originalPosition.getColNo() + nodeIndex;
        const endColunm = startColumn + nodeSignature.getClassName().length - 1;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.ReplaceNestedReusableComponentByBuilderCheck = ReplaceNestedReusableComponentByBuilderCheck;
