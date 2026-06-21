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
exports.NoFuncAsArgForReusableComponentCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoFuncAsArgForReusableComponentCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/no-func-as-arg-for-reusable-component-check.md',
    description: 'Do not use functions as input parameters for creating reusable components.'
};
const containerComponent = ['List', 'Grid', 'WaterFlow', 'Swiper'];
const containerItem = ['ListItem', 'GridItem', 'FlowItem'];
class NoFuncAsArgForReusableComponentCheck {
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
                this.reportReuseComponentAndContinueTraverse(arkFile, treeNode, parentNodes);
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
            this.reportReuseComponentAndContinueTraverse(arkFile, treeNode, parentNodes);
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
    reportReuseComponentAndContinueTraverse(arkFile, treeNode, parentNodes) {
        // 将treeNode节点下面的所有组件进行上报
        for (let children of treeNode.children) {
            if (children.isCustomComponent() && this.isReuseableComponent(arkFile, children)) {
                let createStmt = children.attributes.get('create');
                if (!createStmt) {
                    continue;
                }
                let stmt = createStmt[0];
                this.checkCustomComponentArgs(arkFile, children, stmt);
            }
        }
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
    checkCustomComponentArgs(arkFile, treeNode, stmt) {
        if (!(stmt instanceof lib_1.ArkAssignStmt)) {
            return;
        }
        let rightOp = stmt.getRightOp();
        if (!(rightOp instanceof lib_1.ArkStaticInvokeExpr)) {
            return;
        }
        let methodName = rightOp.getMethodSignature().getMethodSubSignature().getMethodName();
        if (methodName !== 'create') {
            return;
        }
        let customObj = rightOp.getArg(0);
        if (!(customObj instanceof lib_1.Local)) {
            return;
        }
        let usedStmts = customObj.getUsedStmts();
        if (usedStmts.length === 0) {
            return;
        }
        this.checkUsedStmt(usedStmts, arkFile, treeNode, customObj);
    }
    checkUsedStmt(usedStmts, arkFile, treeNode, customObj) {
        for (let stmt of usedStmts) {
            if (!(stmt instanceof lib_1.ArkInvokeStmt)) {
                continue;
            }
            let invokeExpr = stmt.getInvokeExpr();
            if (!(invokeExpr instanceof lib_1.ArkInstanceInvokeExpr)) {
                continue;
            }
            let invokeMethodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            if (invokeMethodName !== 'constructor') {
                continue;
            }
            if (invokeExpr.getBase() !== customObj) {
                continue;
            }
            let anonymousObj = invokeExpr.getArg(0);
            if (!(anonymousObj instanceof lib_1.Local)) {
                continue;
            }
            let anonymousType = anonymousObj.getType();
            if (!(anonymousType instanceof lib_1.ClassType)) {
                continue;
            }
            let anonymousClass = arkFile.getScene().getClass(anonymousType.getClassSignature());
            if (!anonymousClass) {
                continue;
            }
            for (let arkField of anonymousClass.getFields()) {
                if (this.isArgUseFuncInvoke(arkField)) {
                    this.reportIssue(arkFile, treeNode);
                }
            }
        }
    }
    isArgUseFuncInvoke(arkField) {
        for (let stmt of arkField.getInitializer()) {
            let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (invoker) {
                return true;
            }
        }
        return false;
    }
    reportIssue(arkFile, reportNode) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const createStmts = reportNode.attributes.get('create');
        if (!createStmts) {
            return;
        }
        let signature = reportNode.signature;
        if (!(signature instanceof lib_1.ClassSignature)) {
            return;
        }
        const text = createStmts[0].getOriginalText() ?? '';
        let nodeIndex = text.indexOf(signature.getClassName());
        if (nodeIndex === -1) {
            return;
        }
        const originalPosition = createStmts[0].getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const startColumn = originalPosition.getColNo() + nodeIndex;
        const endColunm = startColumn + signature.getClassName().length - 1;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.NoFuncAsArgForReusableComponentCheck = NoFuncAsArgForReusableComponentCheck;
