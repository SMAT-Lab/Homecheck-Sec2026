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
exports.WebResourceForImageComponentCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'WebResourceForImageComponentCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/web-resource-for-image-component-check.md',
    description: 'Avoid online images. Use local images whenever possible.'
};
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
class WebResourceForImageComponentCheck {
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
    check = (arkClass) => {
        if (arkClass.hasViewTree() && !viewTreeTool.hasTraverse(arkClass)) {
            let rootTreeNode = arkClass.getViewTree()?.getRoot();
            if (!rootTreeNode) {
                return;
            }
            this.traverseViewTree(arkClass.getDeclaringArkFile(), rootTreeNode);
        }
    };
    traverseViewTree(arkFile, treeNode) {
        if (treeNode === undefined || treeNode === null) {
            return;
        }
        if (treeNode.children.length === 0) {
            return;
        }
        for (let children of treeNode.children) {
            if (children.isCustomComponent()) {
                continue;
            }
            // 容器组件则继续遍历
            if (children.children.length !== 0) {
                this.traverseViewTree(arkFile, children);
            }
            // 如果是Image组件，则检测其资源类型
            if (children.name !== 'Image') {
                continue;
            }
            let stmts = children.attributes;
            let createStmt = stmts.get('create');
            if (!createStmt) {
                continue;
            }
            let stmt = createStmt[0];
            if (!(stmt instanceof lib_1.ArkAssignStmt)) {
                continue;
            }
            this.checkImageUri(arkFile, stmt);
        }
    }
    checkImageUri(arkFile, stmt) {
        let rightOp = stmt.getRightOp();
        if (!(rightOp instanceof lib_1.ArkStaticInvokeExpr)) {
            return;
        }
        let arg = rightOp.getArg(0);
        // Image组件Uri信息为字符串，则arg为Constant
        if (arg instanceof lib_1.Constant) {
            let uri = arg.getValue();
            let uriLowerCase = uri.toLowerCase();
            if (uriLowerCase.includes('http:') || uriLowerCase.includes('https:') || uriLowerCase.includes('ftp:')) {
                this.reportIssue(arkFile, stmt, uri);
            }
        }
        else if (arg instanceof lib_1.Local) {
            if (!(arg.getType() instanceof lib_1.StringType)) {
                return;
            }
            // 只检测string类型
            let declaringStmt = arg.getDeclaringStmt();
            if (!declaringStmt || !(declaringStmt instanceof lib_1.ArkAssignStmt)) {
                return;
            }
            let rightOp = declaringStmt.getRightOp();
            if (!(rightOp instanceof lib_1.ArkInstanceFieldRef)) {
                return;
            }
            let baseName = rightOp.getBase().getName();
            if (baseName !== 'this') {
                return;
            }
            let baseSigNature = rightOp.getFieldSignature().getDeclaringSignature();
            if (!(baseSigNature instanceof lib_1.ClassSignature)) {
                return;
            }
            let className = baseSigNature.getClassName();
            let arkClass = arkFile.getClassWithName(className);
            if (!arkClass) {
                return;
            }
            let fieldName = rightOp.getFieldName();
            let arkField = arkClass.getFieldWithName(fieldName);
            if (!arkField) {
                return;
            }
            this.checkImageInArkField(arkFile, arkField);
        }
    }
    checkImageInArkField(arkFile, arkField) {
        let stmts = arkField.getInitializer();
        if (stmts.length === 0) {
            return;
        }
        let stmt = stmts[0];
        if (!(stmt instanceof lib_1.ArkAssignStmt)) {
            return;
        }
        let initValue = stmt.getRightOp();
        if (!(initValue instanceof lib_1.Constant)) {
            return;
        }
        let uri = initValue.getValue();
        let uriLowerCase = uri.toLowerCase();
        if (uriLowerCase.includes('http:') || uriLowerCase.includes('https:') || uriLowerCase.includes('ftp:')) {
            this.reportIssue(arkFile, arkField, uri);
        }
    }
    reportIssue(arkFile, stmtLike, uri) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        let lineNum = -1;
        let startColumn = -1;
        let endColunm = -1;
        if (stmtLike instanceof lib_1.ArkField) {
            let lineCode = stmtLike.getCode();
            lineNum = stmtLike.getOriginPosition().getLineNo();
            startColumn = stmtLike.getOriginPosition().getColNo() + lineCode.indexOf(uri);
            endColunm = startColumn + uri.length - 1;
        }
        else if (stmtLike instanceof lib_1.Stmt) {
            const text = stmtLike.getOriginalText();
            if (!text || text.length === 0) {
                return;
            }
            let originalPosition = stmtLike.getOriginPositionInfo();
            lineNum = originalPosition.getLineNo();
            startColumn = originalPosition.getColNo() + text.indexOf(uri);
            endColunm = startColumn + uri.length - 1;
        }
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.WebResourceForImageComponentCheck = WebResourceForImageComponentCheck;
