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
exports.UseAttributeUpdaterControlRefreshScopeCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'UseAttributeUpdaterControlRefreshScopeCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/use-attribute-updater-control-refresh-scope-check.md',
    description: 'Use attributeUpdater to accurately control the update of component attributes to avoid unnecessary update of component attributes.'
};
const containerComponent = ['List', 'Grid', 'WaterFlow', 'Swiper'];
const containerItem = ['ListItem', 'GridItem', 'FlowItem'];
const aboutToReuseSignature = 'aboutToReuse(Record<string,@ES2015/BuiltinClass: Object>)';
const attributesSizeMax = 6;
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
class UseAttributeUpdaterControlRefreshScopeCheck {
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
                this.reportReuseComponentAndContinueTraverse(arkFile, treeNode, parentNodes, arkFile.getScene());
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
            this.reportReuseComponentAndContinueTraverse(arkFile, treeNode, parentNodes, arkFile.getScene());
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
    reportReuseComponentAndContinueTraverse(arkFile, treeNode, parentNodes, scene) {
        // 将treeNode节点下面的所有组件进行上报
        for (let children of treeNode.children) {
            if (children.isCustomComponent() && this.isReuseableComponent(arkFile, children)) {
                // 复用组件
                let classSignature = children.classSignature;
                if (!(classSignature instanceof lib_1.ClassSignature)) {
                    continue;
                }
                let clazz = scene.getClass(classSignature);
                if (!clazz) {
                    continue;
                }
                this.classProcess(clazz);
            }
            if (children.isCustomComponent()) {
                continue;
            }
            this.traverseViewTree(arkFile, children, parentNodes);
        }
    }
    classProcess(clazz) {
        let method = this.aboutToReuseMethod(clazz);
        if (!method) {
            return;
        }
        for (let arkField of clazz.getFields()) {
            if (!arkField.hasDecorator('State')) {
                continue;
            }
            if (!this.isInAboutToReuse(method, arkField)) {
                continue;
            }
            if (!this.isHasViewtree(clazz, arkField)) {
                continue;
            }
            // 满足3个条件，判断组件属性是否大于5个
            this.attributeCheck(clazz, arkField);
        }
    }
    attributeCheck(clazz, arkField) {
        if (!clazz.hasViewTree()) {
            return false;
        }
        let viewTreeNode = clazz.getViewTree()?.getRoot();
        if (!viewTreeNode) {
            return false;
        }
        let arkFile = clazz.getDeclaringArkFile();
        this.viewTreeProcess(viewTreeNode, arkField, arkFile);
        return false;
    }
    viewTreeProcess(viewTreeNode, arkField, arkFile) {
        if (!viewTreeNode) {
            return;
        }
        for (let field of viewTreeNode.stateValues) {
            if (field.getSignature() !== arkField.getSignature()) {
                continue;
            }
            // 找到字段，开始判断属性
            let attributes = viewTreeNode.attributes;
            if (attributes.size > attributesSizeMax) {
                //需要告警
                this.setIssueReport(viewTreeNode, arkFile);
            }
        }
        if (viewTreeNode.children.length > 0) {
            for (let child of viewTreeNode.children) {
                let classSignature = child.signature;
                // 如果是Component，如果在子节点遍历一遍，入口获取arkClass.getViewTree()的时候还会来一次，会重复
                if (classSignature && child.isCustomComponent()) {
                    continue;
                }
                // 如果找到逐层推出递归，如果没找到继续往子节点深度查找
                this.viewTreeProcess(child, arkField, arkFile);
            }
        }
    }
    setIssueReport(viewTreeNode, arkFile) {
        let createStmt = viewTreeNode.attributes.get('create')?.[0];
        if (!createStmt) {
            return;
        }
        let keyWord = viewTreeNode.name;
        this.reportIssue(arkFile, createStmt, keyWord);
    }
    aboutToReuseMethod(clazz) {
        for (let method of clazz.getMethods()) {
            let methodSignature = method.getSignature().getMethodSubSignature().toString();
            if (methodSignature === aboutToReuseSignature) {
                return method;
            }
        }
        return null;
    }
    isInAboutToReuse(method, arkField) {
        let stmts = method.getCfg()?.getStmts();
        if (!stmts) {
            return false;
        }
        for (let stmt of stmts) {
            if (!(stmt instanceof lib_1.ArkAssignStmt)) {
                continue;
            }
            let leftOp = stmt.getLeftOp();
            if (!(leftOp instanceof lib_1.ArkInstanceFieldRef)) {
                continue;
            }
            if (leftOp.getFieldSignature().toString() === arkField.getSignature().toString()) {
                return true;
            }
        }
        return false;
    }
    isHasViewtree(clazz, arkField) {
        if (!clazz.hasViewTree()) {
            return false;
        }
        if (viewTreeTool.hasTraverse(clazz)) {
            return false;
        }
        let viewTree = clazz.getViewTree();
        if (!viewTree) {
            return false;
        }
        let stateValues = viewTree.getStateValues();
        for (let [key, values] of stateValues.entries()) {
            if (!(key instanceof lib_1.ArkField)) {
                continue;
            }
            if (key.getSignature() === arkField.getSignature()) {
                return true;
            }
        }
        return false;
    }
    isReuseableComponent(arkFile, customNode) {
        let nodeSignature = customNode.signature;
        if (!nodeSignature) {
            return false;
        }
        if (!(nodeSignature instanceof lib_1.ClassSignature)) {
            return false;
        }
        let customNodeClass = arkFile.getScene().getClass(nodeSignature);
        if (!customNodeClass) {
            return false;
        }
        // 自定义组件有@Reusable注解
        let hasReusable = customNodeClass.hasDecorator('Reusable');
        // 自定义组件实现了aboutToReuse方法
        let aboutToReuseMethod = customNodeClass.getMethodWithName('aboutToReuse');
        return hasReusable && aboutToReuseMethod !== null;
    }
    reportIssue(arkFile, stmt, keyWord) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        if (!stmt) {
            return;
        }
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const startColumn = originalPosition.getColNo() + text.indexOf(keyWord);
        const endColunm = startColumn + keyWord.length - 1;
        if (startColumn === -1) {
            return;
        }
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.UseAttributeUpdaterControlRefreshScopeCheck = UseAttributeUpdaterControlRefreshScopeCheck;
