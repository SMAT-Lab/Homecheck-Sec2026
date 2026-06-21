"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoDuplicateImportsCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
;
const NAMED_TYPES = ["ImportSpecifier", "ExportSpecifier"];
const NAMESPACE_TYPES = [
    "ImportNamespaceSpecifier",
    "ExportNamespaceSpecifier",
];
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-duplicate-imports.md',
    description: '"module" import is duplicated.'
};
let filePath = '';
function isImportExportSpecifier(importExportType, type) {
    const arrayToCheck = type === 'named' ? NAMED_TYPES : NAMESPACE_TYPES;
    return arrayToCheck.includes(importExportType);
}
;
function getImportExportType(node) {
    if (arkanalyzer_1.ts.isImportDeclaration(node)) {
        const namedBindings = node.importClause?.namedBindings;
        if (namedBindings) {
            if (arkanalyzer_1.ts.isNamespaceImport(namedBindings)) {
                return 'ImportNamespaceSpecifier';
            }
            return 'ImportSpecifier';
        }
        if (node.importClause?.name) {
            return 'ImportDefaultSpecifier';
        }
        return 'SideEffectImport';
    }
    else if (arkanalyzer_1.ts.isExportDeclaration(node)) {
        if (node.exportClause) {
            if (arkanalyzer_1.ts.isNamespaceExport(node.exportClause)) {
                return 'ExportNamespaceSpecifier';
            }
            return 'ExportSpecifier';
        }
        return 'ExportAll';
    }
    return 'SideEffectImport';
}
;
function hasDefaultImport(node) {
    if (arkanalyzer_1.ts.isImportDeclaration(node)) {
        return !!node.importClause?.name;
    }
    ;
    return false;
}
;
function hasNamedImports(node) {
    if (arkanalyzer_1.ts.isImportDeclaration(node)) {
        return arkanalyzer_1.ts.isNamedImports(node.importClause?.namedBindings || {});
    }
    ;
    return false;
}
;
function hasInlineTypeModifier(node) {
    if (arkanalyzer_1.ts.isImportDeclaration(node) && node.importClause?.namedBindings && arkanalyzer_1.ts.isNamedImports(node.importClause.namedBindings)) {
        return node.importClause.namedBindings.elements.some(element => {
            return element.isTypeOnly;
        });
    }
    ;
    return false;
}
;
function isComplementaryTypeImports(node1, node2) {
    if (!arkanalyzer_1.ts.isImportDeclaration(node1) || !arkanalyzer_1.ts.isImportDeclaration(node2)) {
        return false;
    }
    ;
    const node1IsTypeOnly = node1.importClause?.isTypeOnly === true;
    const node2IsTypeOnly = node2.importClause?.isTypeOnly === true;
    const node1HasInlineType = hasInlineTypeModifier(node1);
    const node2HasInlineType = hasInlineTypeModifier(node2);
    if ((node1IsTypeOnly && !node1HasInlineType && !node2IsTypeOnly && node2HasInlineType) ||
        (node2IsTypeOnly && !node2HasInlineType && !node1IsTypeOnly && node1HasInlineType)) {
        return true;
    }
    ;
    return false;
}
;
function isImportExportCanBeMerged(nodeOne, nodeTwo) {
    const importExportTypeOne = getImportExportType(nodeOne);
    const importExportTypeTwo = getImportExportType(nodeTwo);
    const isExportAllConflict = (importExportTypeOne === 'ExportAll' && importExportTypeTwo !== 'ExportAll' && importExportTypeTwo !== 'SideEffectImport') ||
        (importExportTypeOne !== 'ExportAll' && importExportTypeOne !== 'SideEffectImport' && importExportTypeTwo === 'ExportAll');
    if (isExportAllConflict) {
        return false;
    }
    ;
    const isNamespaceNamedConflict = (isImportExportSpecifier(importExportTypeOne, 'namespace') && isImportExportSpecifier(importExportTypeTwo, 'named')) ||
        (isImportExportSpecifier(importExportTypeTwo, 'namespace') && isImportExportSpecifier(importExportTypeOne, 'named'));
    if (arkanalyzer_1.ts.isImportDeclaration(nodeOne) && arkanalyzer_1.ts.isImportDeclaration(nodeTwo)) {
        const bothTypeOnly = nodeOne.importClause?.isTypeOnly && nodeTwo.importClause?.isTypeOnly;
        if (bothTypeOnly &&
            ((hasDefaultImport(nodeOne) && hasNamedImports(nodeTwo)) ||
                (hasDefaultImport(nodeTwo) && hasNamedImports(nodeOne)))) {
            return false;
        }
        ;
        if (isComplementaryTypeImports(nodeOne, nodeTwo)) {
            return false;
        }
        ;
    }
    ;
    if (isNamespaceNamedConflict) {
        return false;
    }
    ;
    return true;
}
;
function shouldReportImportExportDeclarations(node, previousNodes) {
    let j = 0;
    while (j < previousNodes.length) {
        if (isImportExportCanBeMerged(node, previousNodes[j])) {
            return true;
        }
        ;
        j++;
    }
    return false;
}
;
function filterNodesByDeclarationType(nodeEntries, targetType) {
    return nodeEntries
        .filter(({ declarationType }) => declarationType === targetType)
        .map(({ node }) => node);
}
;
function getModule(node) {
    if (arkanalyzer_1.ts.isImportDeclaration(node) || arkanalyzer_1.ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && arkanalyzer_1.ts.isStringLiteral(moduleSpecifier)) {
            return moduleSpecifier.text.trim();
        }
        ;
    }
    ;
    return '';
}
;
/**
 * Returns a boolean if the node is an import type.
 * @param {ASTNode} node A node to check.
 * @returns {boolean} True if the node is an import type, false if it's not.
 */
function isTypeImport(node) {
    if (arkanalyzer_1.ts.isImportDeclaration(node)) {
        return node.importClause?.isTypeOnly === true;
    }
    ;
    return false;
}
;
class NoDuplicateImportsCheck {
    metaData = gMetaData;
    rule;
    issues = [];
    modules = new Map();
    includeExports = false;
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check.bind(this)
        };
        return [matchBuildCb];
    }
    ;
    check = (arkFile) => {
        filePath = arkFile.getFilePath();
        const ruleOption = this.rule.option?.[0];
        this.includeExports = ruleOption?.includeExports !== undefined ? ruleOption.includeExports : false;
        this.modules.clear();
        const astRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        for (let child of astRoot.statements) {
            this.checkImportExportDeclaration(child);
        }
        ;
    };
    checkImportExportDeclaration(node) {
        if (arkanalyzer_1.ts.isImportDeclaration(node)) {
            this.handleImportExports(node, 'import');
        }
        else if (this.includeExports && arkanalyzer_1.ts.isExportDeclaration(node)) {
            this.handleImportExports(node, 'export');
        }
        ;
        arkanalyzer_1.ts.forEachChild(node, this.checkImportExportDeclaration.bind(this));
    }
    ;
    handleImportExports(node, declarationType) {
        const module = getModule(node);
        if (module) {
            this.checkAndReport(node, declarationType);
            const currentNode = { node, declarationType };
            let nodes = [currentNode];
            if (this.modules.has(module)) {
                const previousNodes = this.modules.get(module) || [];
                nodes = [...previousNodes, currentNode];
            }
            ;
            this.modules.set(module, nodes);
        }
        ;
    }
    ;
    checkAndReport(node, declarationType) {
        const module = getModule(node);
        if (!this.modules.has(module)) {
            return;
        }
        ;
        const previousNodes = this.modules.get(module) || [];
        const importNodes = filterNodesByDeclarationType(previousNodes, 'import');
        const exportNodes = this.includeExports ? filterNodesByDeclarationType(previousNodes, 'export') : [];
        const errorMessages = this.collectErrorMessages(node, declarationType, importNodes, exportNodes);
        this.reportErrors(node, errorMessages);
    }
    ;
    collectErrorMessages(node, declarationType, importNodes, exportNodes) {
        const errorMessages = [];
        const module = getModule(node);
        if (declarationType === 'import') {
            this.collectImportErrorMessages(node, module, importNodes, exportNodes, errorMessages);
        }
        else if (declarationType === 'export') {
            this.collectExportErrorMessages(node, module, importNodes, exportNodes, errorMessages);
        }
        ;
        return errorMessages;
    }
    ;
    collectImportErrorMessages(node, module, importNodes, exportNodes, errorMessages) {
        if (shouldReportImportExportDeclarations(node, importNodes)) {
            const message = this.formatImportDuplicateMessage(node, module);
            errorMessages.push(message);
        }
        ;
        if (this.includeExports && shouldReportImportExportDeclarations(node, exportNodes)) {
            const message = this.formatImportExportDuplicateMessage(node, module);
            errorMessages.push(message);
        }
        ;
    }
    ;
    collectExportErrorMessages(node, module, importNodes, exportNodes, errorMessages) {
        if (shouldReportImportExportDeclarations(node, exportNodes)) {
            errorMessages.push(`'${module}' export is duplicated.`);
        }
        ;
        if (shouldReportImportExportDeclarations(node, importNodes)) {
            errorMessages.push(`'${module}' export is duplicated as import.`);
        }
        ;
    }
    ;
    formatImportDuplicateMessage(node, module) {
        const isType = isTypeImport(node);
        return isType ? `${module} type import is duplicated.` : `'${module}' import is duplicated.`;
    }
    ;
    formatImportExportDuplicateMessage(node, module) {
        const isType = isTypeImport(node);
        return isType ? `${module} type import is duplicated as export.` : `'${module}' import is duplicated as export.`;
    }
    ;
    reportErrors(node, errorMessages) {
        const severity = this.rule.alert ?? this.metaData.severity;
        errorMessages.forEach(errorMessage => {
            this.addIssueReport(node, errorMessage, severity);
        });
    }
    ;
    addIssueReport(node, description, severity) {
        const warnInfo = this.getLineAndColumn(node);
        const defect = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    getLineAndColumn(node) {
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const endCharacter = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).character;
        return {
            line: line + 1,
            startCol: character + 1,
            endCol: endCharacter + 1,
            filePath: filePath
        };
    }
    ;
}
exports.NoDuplicateImportsCheck = NoDuplicateImportsCheck;
;
