"use strict";
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
exports.MultipleAssociationsStateVarCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const ArkField_1 = require("arkanalyzer/lib/core/model/ArkField");
const Ref_1 = require("arkanalyzer/lib/core/base/Ref");
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'MultipleAssociationsStateVarCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/multiple-associations-state-var-check.md',
    description: 'This data is associated with multiple components, you are advised to use the @Watch decorator to add update conditions to avoid unnecessary component update.'
};
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const listComponent = ['ForEach', 'LazyForEach', 'Repeat'];
class MultipleAssociationsStateVarCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (arkFile) => {
        for (let clazz of arkFile.getClasses()) {
            if (clazz.hasViewTree() && !viewTreeTool.hasTraverse(clazz)) {
                this.processViewTreeClass(clazz);
            }
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (let clazz of namespace.getClasses()) {
                if (clazz.hasViewTree() && !viewTreeTool.hasTraverse(clazz)) {
                    this.processViewTreeClass(clazz);
                }
            }
        }
    };
    processViewTreeClass(clazz) {
        let stateVarList = [];
        for (let arkField of clazz.getFields()) {
            if (!arkField.hasDecorator('State')) {
                continue;
            }
            let associateViewCount = this.getAssociateViewCount(clazz, arkField);
            if (associateViewCount >= 2) {
                stateVarList.push(arkField);
            }
        }
        let viewRoot = clazz.getViewTree()?.getRoot();
        if (!viewRoot) {
            return;
        }
        this.traverseViewTree(viewRoot, stateVarList);
    }
    traverseViewTree(treeNode, stateVarList) {
        if (treeNode === undefined || treeNode === null) {
            return;
        }
        if (treeNode.isCustomComponent()) {
            let valuesTransferMap = treeNode.stateValuesTransfer;
            if (!valuesTransferMap) {
                return;
            }
            for (let [key, value] of valuesTransferMap) {
                if (!(value instanceof ArkField_1.ArkField)) {
                    continue;
                }
                if (!stateVarList.includes(value)) {
                    continue;
                }
                if (key.hasDecorator('Watch')) {
                    continue;
                }
                let declaringArkFile = key.getDeclaringArkClass().getDeclaringArkFile();
                let positionInfo = key.getOriginPosition();
                let lineNum = positionInfo.getLineNo();
                let fieldName = key.getName();
                let lineCode = key.getCode();
                let startColumn = positionInfo.getColNo() + lineCode.indexOf(fieldName);
                let endColumn = startColumn + fieldName.length - 1;
                if (startColumn !== -1) {
                    this.reportIssue(declaringArkFile, lineNum, startColumn, endColumn);
                }
            }
        }
        else {
            for (let children of treeNode.children) {
                this.traverseViewTree(children, stateVarList);
            }
        }
    }
    getAssociateViewCount(clazz, arkField) {
        let viewTree = clazz.getViewTree();
        if (!viewTree) {
            return 0;
        }
        let count = 0;
        let values = viewTree.getStateValues();
        for (let [key, value] of values.entries()) {
            let signature = key.getSignature();
            if (signature !== arkField.getSignature()) {
                continue;
            }
            let tempSet = new Set(value);
            count = this.getRealAttachViewCount(key, tempSet);
            if (count === 1 && this.isParentIsListComponent(tempSet)) {
                count += 2;
            }
            break;
        }
        return count;
    }
    getRealAttachViewCount(field, viewNodes) {
        if (viewNodes.size === 0) {
            return 0;
        }
        let size = viewNodes.size;
        for (let attachNode of viewNodes) {
            if (!this.isNodeRealAttach(field, attachNode)) {
                size--;
                viewNodes.delete(attachNode);
            }
        }
        return size;
    }
    isNodeRealAttach(field, attachNode) {
        let statesValuesTransfer = attachNode.stateValuesTransfer;
        if (attachNode.isCustomComponent() && statesValuesTransfer) {
            for (let [key, value] of statesValuesTransfer) {
                if (value.getSignature() === field.getSignature()) {
                    return true;
                }
            }
        }
        let attributes = attachNode.attributes;
        for (let [key, stmt2Value] of attributes) {
            if (key.startsWith('on') || key === 'pop') {
                continue;
            }
            let values = stmt2Value[1];
            for (let value of values) {
                if (value instanceof Ref_1.ArkInstanceFieldRef && value.getFieldSignature() === field.getSignature()) {
                    return true;
                }
            }
        }
        return false;
    }
    isParentIsListComponent(viewNodes) {
        if (viewNodes.size === 0) {
            return false;
        }
        for (let treeNode of viewNodes) {
            let treeNodeParent = treeNode.parent;
            while (treeNodeParent) {
                if (listComponent.includes(treeNodeParent.name)) {
                    return true;
                }
                treeNodeParent = treeNodeParent.parent;
            }
        }
        return false;
    }
    reportIssue(issueArkFile, lineNum, startColumn, endColumn) {
        let filePath = issueArkFile.getFilePath();
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.MultipleAssociationsStateVarCheck = MultipleAssociationsStateVarCheck;
