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
exports.ConsistentTypeImportsCheck = void 0;
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ConsistentTypeImportsCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/consistent-type-imports.md',
    description: 'Enforce consistent usage of type imports.'
};
var TypeImportsFixStyle;
(function (TypeImportsFixStyle) {
    TypeImportsFixStyle[TypeImportsFixStyle["inline"] = 0] = "inline";
    TypeImportsFixStyle[TypeImportsFixStyle["separate"] = 1] = "separate";
})(TypeImportsFixStyle || (TypeImportsFixStyle = {}));
var TypeImportsPrefer;
(function (TypeImportsPrefer) {
    TypeImportsPrefer[TypeImportsPrefer["noType"] = 0] = "noType";
    TypeImportsPrefer[TypeImportsPrefer["type"] = 1] = "type";
})(TypeImportsPrefer || (TypeImportsPrefer = {}));
var ImportUseType;
(function (ImportUseType) {
    ImportUseType[ImportUseType["all"] = 0] = "all";
    ImportUseType[ImportUseType["some"] = 1] = "some";
    ImportUseType[ImportUseType["none"] = 2] = "none";
})(ImportUseType || (ImportUseType = {}));
class ConsistentTypeImportsCheck {
    metaData = gMetaData;
    rule;
    issues = [];
    issueMap = new Map();
    typeMessage = 'All imports in the declaration are only used as types. Use `import type`.';
    noTypeMessage = 'Use an `import` instead of an `import type`.';
    disallowTypeAnnotationsMessage = '`import()` type annotations are forbidden.';
    ruleOptions = { disallowTypeAnnotations: true, fixStyle: TypeImportsFixStyle.separate, prefer: TypeImportsPrefer.type };
    usedNodeList = [];
    importTypeNodeList = [];
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE
    };
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        if (!targetFile.getFilePath().endsWith('.ts')) {
            return;
        }
        let options = this.rule.option;
        if (options.length > 0) {
            const option = options[0];
            this.ruleOptions.disallowTypeAnnotations = option.disallowTypeAnnotations;
            if (option.fixStyle === 'inline-type-imports') {
                this.ruleOptions.fixStyle = TypeImportsFixStyle.inline;
            }
            else if (option.fixStyle === 'separate-type-imports') {
                this.ruleOptions.fixStyle = TypeImportsFixStyle.separate;
            }
            if (option.prefer === 'no-type-imports') {
                this.ruleOptions.prefer = TypeImportsPrefer.noType;
            }
            else if (option.prefer === 'type-imports') {
                this.ruleOptions.prefer = TypeImportsPrefer.type;
            }
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(sourceFile);
        if (sourceFileObject === undefined) {
            return;
        }
        this.usedNodeList = [];
        this.loopNodeForIssue(targetFile, sourceFile, sourceFileObject);
        this.loopNode(targetFile, sourceFile, sourceFileObject);
        this.reportSortedIssues();
    };
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (arkanalyzer_1.ts.isImportDeclaration(child)) { // prefer 规则
                this.checkImport(sourceFile, child, targetFile);
            }
            else if (arkanalyzer_1.ts.isTypeAliasDeclaration(child)) { // disallowTypeAnnotations 规则：type T = import('Foo').Foo;
                this.checkTypeAlias(sourceFile, child, targetFile);
            }
            else if (arkanalyzer_1.ts.isVariableStatement(child)) { // disallowTypeAnnotations 规则：let foo: import('foo');
                this.checkVariableStatement(sourceFile, child, targetFile);
            }
            else {
                this.loopNode(targetFile, sourceFile, child);
            }
        }
    }
    checkImport(sourceFile, node, targetFile) {
        const nodeList = node.getChildren();
        if (nodeList.length < 3 || this.containsAssert(nodeList)) {
            return;
        }
        ;
        const second = nodeList[1];
        if (!arkanalyzer_1.ts.isImportClause(second)) {
            return;
        }
        ;
        const secondNodeList = second.getChildren();
        if (secondNodeList.length < 1) {
            return;
        }
        ;
        const secondFirst = secondNodeList[0];
        const hasType = secondFirst.kind === arkanalyzer_1.ts.SyntaxKind.TypeKeyword;
        if ((this.ruleOptions.prefer === TypeImportsPrefer.noType && hasType) ||
            (this.ruleOptions.prefer === TypeImportsPrefer.type && !hasType)) {
            const { message, fix } = this.checkImportPreference(hasType, sourceFile, nodeList, second, secondFirst, secondNodeList, targetFile, node);
            if (message) {
                const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
                const defect = this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, message, fix);
                this.issueMap.set(defect.fixKey, { defect, fix });
            }
            ;
        }
        ;
    }
    ;
    checkImportPreference(hasType, sourceFile, nodeList, second, secondFirst, secondNodeList, targetFile, node) {
        let message;
        let fix;
        const first = nodeList[0];
        if (this.ruleOptions.prefer === TypeImportsPrefer.noType && hasType) {
            message = this.noTypeMessage;
            fix = { range: [first.getStart(), secondFirst.getEnd()], text: first.getText() };
        }
        else {
            const msg = this.getImportMessage(secondNodeList);
            if (msg) {
                message = msg;
            }
            else {
                return { message: undefined, fix: undefined };
            }
            ;
            const secondText = second.getText();
            if (secondText.charAt(0) === '{' && this.ruleOptions.fixStyle === TypeImportsFixStyle.inline) {
                const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, second.getStart());
                const position = arkanalyzer_1.ts.getPositionOfLineAndCharacter(sourceFile, startPosition.line, startPosition.character + 1);
                fix = { range: [second.getStart(), position], text: '{ type ' };
            }
            else if (secondText.includes(',') && secondText.charAt(0) !== '{') {
                fix = this.handleComplexImport(nodeList, secondText, node);
            }
            else if (secondText.startsWith('{') && secondText.endsWith('}') && this.importTypeNodeList.length > 0) {
                fix = this.handleNamedImports(nodeList, secondText, node);
            }
            else {
                fix = { range: [first.getStart(), first.getEnd()], text: first.getText() + ' type' };
            }
            ;
        }
        ;
        return { message, fix };
    }
    ;
    processImports(items, sourceText) {
        const typeImports = [];
        const valueImports = [];
        for (const item of items) {
            if (this.importTypeNodeList.includes(item)) {
                typeImports.push(item);
            }
            else {
                valueImports.push(item);
            }
            ;
        }
        ;
        let newText = '';
        if (typeImports.length > 0) {
            newText += `import type { ${typeImports.join(', ')} } from ${sourceText};\n`;
        }
        ;
        if (valueImports.length > 0) {
            newText += `import { ${valueImports.join(', ')} } from ${sourceText};`;
        }
        else if (typeImports.length > 0) {
            newText = newText.substring(0, newText.length - 1);
        }
        ;
        return newText;
    }
    ;
    //处理 import A3, { B3 } from 'foo' 情况的方法
    handleComplexImport(nodeList, secondText, node) {
        const importSourceNode = nodeList[3];
        const sourceText = importSourceNode.getText();
        const commaIndex = secondText.indexOf(',');
        const defaultImport = secondText.substring(0, commaIndex).trim();
        const namedImports = secondText.substring(commaIndex + 1).trim();
        let newText = '';
        if (namedImports) {
            const isEmptyObject = namedImports === '{}' || namedImports.match(/^\{\s*\}$/);
            if (!isEmptyObject) {
                const importItems = namedImports.substring(1, namedImports.length - 1)
                    .split(',')
                    .map(item => item.trim());
                if (this.importTypeNodeList.length > 0) {
                    newText += this.processImports(importItems, sourceText);
                }
                else {
                    newText += `import type ${namedImports} from ${sourceText};`;
                }
                ;
            }
            ;
        }
        ;
        if (defaultImport) {
            if (newText && !newText.endsWith('\n')) {
                newText += '\n';
            }
            ;
            newText += `import type ${defaultImport} from ${sourceText};`;
        }
        ;
        return { range: [node.getStart(), node.getEnd()], text: newText };
    }
    ;
    handleNamedImports(nodeList, secondText, node) {
        const importSourceNode = nodeList[3];
        const sourceText = importSourceNode.getText();
        const namedImportText = secondText.trim();
        // 去掉括号获取实际的导入项列表
        const importItems = namedImportText.substring(1, namedImportText.length - 1)
            .split(',')
            .map(item => item.trim());
        const newText = this.processImports(importItems, sourceText);
        return { range: [node.getStart(), node.getEnd()], text: newText };
    }
    ;
    // 语句中是否包含assert，例如 import * as Type4 from 'foo' assert { type: 'json' };
    containsAssert(nodeList) {
        for (const node of nodeList) {
            if (arkanalyzer_1.ts.isAssertClause(node)) {
                return true;
            }
        }
        return false;
    }
    getImportMessage(nodeList) {
        let message;
        let importNameNodes = [];
        for (const importNameNode of nodeList) {
            const secondFirst = importNameNode;
            const namespaceChildren = secondFirst.getChildren();
            if (arkanalyzer_1.ts.isNamespaceImport(secondFirst) && namespaceChildren.length >= 2) { // import * as A2 from 'foo'; 中的 * as A2
                const lastNode = namespaceChildren[namespaceChildren.length - 1];
                if (namespaceChildren[namespaceChildren.length - 2].kind === arkanalyzer_1.ts.SyntaxKind.AsKeyword && arkanalyzer_1.ts.isIdentifier(lastNode)) {
                    importNameNodes.push(lastNode);
                }
            }
            else if (arkanalyzer_1.ts.isNamedImports(secondFirst) || arkanalyzer_1.ts.isIdentifier(secondFirst)) {
                importNameNodes.push(secondFirst);
            }
        }
        if (importNameNodes.length === 0) {
            return undefined;
        }
        const used = this.getImportNodeUsed(importNameNodes);
        if (used === ImportUseType.all) {
            message = this.typeMessage;
        }
        else if (used === ImportUseType.some) {
            const names = this.getUsedImportNames(importNameNodes);
            message = names + ' only used as types.';
        }
        else if (used === ImportUseType.none) {
            return undefined;
        }
        return message;
    }
    checkTypeAlias(sourceFile, node, targetFile) {
        const nodeList = node.getChildren();
        for (const child of nodeList) {
            let object = child;
            if (arkanalyzer_1.ts.isUnionTypeNode(child)) {
                const node = this.getSpecifyChild(child, arkanalyzer_1.ts.SyntaxKind.ImportType);
                if (node) {
                    object = node;
                }
            }
            if (arkanalyzer_1.ts.isImportTypeNode(object) && this.ruleOptions.disallowTypeAnnotations) {
                const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, object.getStart());
                let startCol = startPosition.character + 1;
                // 如下代码开始列需要去掉typeof: typeof import('foo')
                if (object.getChildren().length > 0 && object.getChildren()[0].kind === arkanalyzer_1.ts.SyntaxKind.TypeOfKeyword) {
                    startCol = startCol + 7;
                }
                this.addIssueReport(targetFile, startPosition.line + 1, startCol, 0, this.disallowTypeAnnotationsMessage, undefined);
                break;
            }
        }
    }
    getSpecifyChild(aNode, kind) {
        for (const child of aNode.getChildren()) {
            if (child.kind === kind) {
                return child;
            }
            let result = this.getSpecifyChild(child, kind);
            if (result) {
                return result;
            }
        }
        return undefined;
    }
    checkVariableStatement(sourceFile, node, targetFile) {
        const nodeList = node.getChildren();
        for (const child of nodeList) {
            if (arkanalyzer_1.ts.isImportTypeNode(child) && this.ruleOptions.disallowTypeAnnotations) {
                const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, child.getStart());
                this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, this.disallowTypeAnnotationsMessage, undefined);
                break;
            }
            else {
                this.checkVariableStatement(sourceFile, child, targetFile);
            }
        }
    }
    addIssueReport(arkFile, line, startCol, endCol, message, fix) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Index_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries())
            .sort(([keyA], [keyB]) => Index_1.Utils.sortByLineAndColumn(keyA, keyB));
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
    loopNodeForIssue(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (arkanalyzer_1.ts.isTypeReferenceNode(child)) {
                this.saveEntityNameNodes(child.typeName);
            }
            else if (arkanalyzer_1.ts.isTypeQueryNode(child)) {
                this.saveEntityNameNodes(child.exprName);
            }
            else {
                this.loopNodeForIssue(targetFile, sourceFile, child);
            }
        }
    }
    // 保存文件内所有使用了的类的节点
    saveEntityNameNodes(nameNode) {
        let typeName;
        if (arkanalyzer_1.ts.isIdentifier(nameNode)) {
            typeName = nameNode.getText();
        }
        else if (arkanalyzer_1.ts.isQualifiedName(nameNode)) {
            typeName = nameNode.left.getText();
        }
        if (typeName) {
            this.usedNodeList.push({ node: nameNode, name: typeName, used: false });
        }
    }
    // import的节点被使用的情况
    getImportNodeUsed(nodes) {
        let usedCount = 0;
        const importNodes = this.getObjectsInImport(nodes);
        for (const importNode of importNodes) {
            if (importNode.used) {
                usedCount++;
            }
        }
        let type;
        if (usedCount === importNodes.length) {
            type = ImportUseType.all;
        }
        else if (usedCount > 0) {
            type = ImportUseType.some;
        }
        else {
            type = ImportUseType.none;
        }
        return type;
    }
    // 获取import内的节点
    getObjectsInImport(nodes) {
        let nodeList = [];
        for (const aNode of nodes) {
            if (arkanalyzer_1.ts.isNamedImports(aNode)) {
                for (const element of aNode.elements) {
                    nodeList.push(element.name);
                }
            }
            else if (arkanalyzer_1.ts.isIdentifier(aNode)) {
                nodeList.push(aNode);
            }
        }
        let memberList = [];
        for (const node of nodeList) {
            const name = node.getText();
            let used = false;
            for (const object of this.usedNodeList) {
                if (object.name === name) {
                    used = true;
                    break;
                }
            }
            memberList.push({ node: node, name: name, used: used });
        }
        return memberList;
    }
    // 获取所有使用了的import节点名称
    getUsedImportNames(nodes) {
        const importNodes = this.getObjectsInImport(nodes);
        let nameList = [];
        for (const node of importNodes) {
            if (node.used) {
                this.importTypeNodeList.push(node.name);
                nameList.push(node.name);
            }
        }
        let message = '';
        if (nameList.length === 1) {
            message = 'Import "' + nameList[0] + '" is';
        }
        else if (nameList.length > 1) {
            message = 'Imports "' + nameList[0] + '"';
            for (let i = 1; i < nameList.length; i++) {
                if (i === nameList.length - 1) {
                    message = message + ' and "' + nameList[i] + '"';
                }
                else {
                    message = message + ', "' + nameList[i] + '"';
                }
            }
            message = message + ' are';
        }
        return message;
    }
}
exports.ConsistentTypeImportsCheck = ConsistentTypeImportsCheck;
