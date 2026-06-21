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
exports.NoUnnecessaryQualifierCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnnecessaryQualifierCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-unnecessary-qualifier.md",
    description: "Disallow unnecessary namespace qualifiers.",
};
class NoUnnecessaryQualifierCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (arkFile) => {
        if (arkFile instanceof arkanalyzer_1.ArkFile) {
            const code = arkFile.getCode();
            if (!code) {
                return;
            }
            const filePath = arkFile.getFilePath();
            const asRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
            // 检查命名空间限定符
            const locations = this.checkUnnecessaryQualifiers(asRoot);
            this.filteredLocations(locations).forEach((loc) => {
                this.addIssueReportNodeFix(asRoot, loc, filePath);
            });
        }
    };
    // 检查不必要的限定符
    checkUnnecessaryQualifiers(sourceFile) {
        const results = [];
        // 遍历所有源文件
        const visit = (node, currentNamespace) => {
            // 检查 QualifiedName 和 PropertyAccessExpression
            if (arkanalyzer_1.ts.isQualifiedName(node) || arkanalyzer_1.ts.isPropertyAccessExpression(node)) {
                this.isQualifiedNameAndPropertyAccess(node, sourceFile, results, currentNamespace);
            }
            // 处理命名空间
            if (arkanalyzer_1.ts.isModuleDeclaration(node) || arkanalyzer_1.ts.isEnumDeclaration(node)) {
                const namespaceName = node.name.getText(sourceFile);
                const newNamespace = currentNamespace ? [...currentNamespace, namespaceName] : [namespaceName];
                arkanalyzer_1.ts.forEachChild(node, child => visit(child, newNamespace));
            }
            else {
                arkanalyzer_1.ts.forEachChild(node, child => visit(child, currentNamespace));
            }
        };
        visit(sourceFile);
        return results;
    }
    isQualifiedNameAndPropertyAccess(node, sourceFile, results, currentNamespace) {
        let leftName;
        let rightName;
        if (arkanalyzer_1.ts.isQualifiedName(node)) {
            leftName = node.left.getText(sourceFile);
            rightName = node.right.getText(sourceFile);
        }
        else if (arkanalyzer_1.ts.isPropertyAccessExpression(node)) {
            leftName = node.expression.getText(sourceFile);
            rightName = node.name.getText();
        }
        if (!leftName || !rightName || !currentNamespace) {
            return;
        }
        // 检查 leftName 是否是当前命名空间路径的前缀
        const leftNamespaceParts = leftName.split('.');
        let isPartOfCurrentNamespace = true;
        for (let i = 0; i < leftNamespaceParts.length; i++) {
            if (currentNamespace[i] !== leftNamespaceParts[i]) {
                isPartOfCurrentNamespace = false;
                break;
            }
        }
        if (!isPartOfCurrentNamespace) {
            return;
        }
        if (leftName && rightName) {
            // 获取当前作用域内的所有符号
            const currentScopeSymbols = this.getSymbolsInCurrentScope(node, sourceFile, currentNamespace);
            // 检查右侧符号是否可以在当前作用域直接访问
            if (currentScopeSymbols.has(rightName)) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                const endCharacter = character + leftName.length;
                results.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    startCol: character + 1,
                    endCol: endCharacter + 1,
                    Qualifier: rightName
                });
            }
        }
    }
    getSymbolsInCurrentScope(node, sourceFile, currentNamespace) {
        const symbols = new Set();
        const scopeStack = [];
        let currentNode = node;
        // 构建作用域栈
        while (currentNode) {
            scopeStack.push(currentNode);
            currentNode = currentNode.parent;
        }
        this.getScopeStack(scopeStack, symbols);
        // 添加当前命名空间及其父级命名空间内的符号
        if (currentNamespace) {
            for (let i = 0; i < currentNamespace.length; i++) {
                const nsName = currentNamespace[i];
                const nsNode = this.findNamespace(sourceFile, nsName);
                if (nsNode) {
                    this.collectSymbolsFromNamespace(nsNode, symbols);
                }
            }
        }
        return symbols;
    }
    getScopeStack(scopeStack, symbols) {
        // 遍历作用域栈，收集符号
        scopeStack.reverse().forEach((scopeNode) => {
            if (arkanalyzer_1.ts.isVariableStatement(scopeNode)) {
                this.collectSymbolsFromVariableStatement(scopeNode, symbols);
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(scopeNode) && scopeNode.name) {
                symbols.add(scopeNode.name.text);
            }
            else if (arkanalyzer_1.ts.isTypeAliasDeclaration(scopeNode) && scopeNode.name) {
                symbols.add(scopeNode.name.text);
            }
            else if (arkanalyzer_1.ts.isEnumDeclaration(scopeNode)) {
                symbols.add(scopeNode.name.text);
                this.collectSymbolsFromEnumDeclaration(scopeNode, symbols);
            }
            else if (arkanalyzer_1.ts.isModuleBlock(scopeNode)) {
                this.collectSymbolsFromModuleBlock(scopeNode, symbols);
            }
        });
    }
    collectSymbolsFromVariableStatement(scopeNode, symbols) {
        scopeNode.declarationList.declarations.forEach((declaration) => {
            if (arkanalyzer_1.ts.isIdentifier(declaration.name)) {
                symbols.add(declaration.name.text);
            }
        });
    }
    collectSymbolsFromEnumDeclaration(scopeNode, symbols) {
        scopeNode.members.forEach((member) => {
            if (arkanalyzer_1.ts.isIdentifier(member.name)) {
                symbols.add(member.name.text);
            }
        });
    }
    collectSymbolsFromModuleBlock(scopeNode, symbols) {
        // 处理模块块内的声明
        arkanalyzer_1.ts.forEachChild(scopeNode, (child) => {
            if (arkanalyzer_1.ts.isVariableStatement(child)) {
                this.collectSymbolsFromVariableStatement(child, symbols);
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(child) && child.name) {
                symbols.add(child.name.text);
            }
            else if (arkanalyzer_1.ts.isTypeAliasDeclaration(child) && child.name) {
                symbols.add(child.name.text);
            }
            else if (arkanalyzer_1.ts.isEnumDeclaration(child)) {
                symbols.add(child.name.text);
                this.collectSymbolsFromEnumDeclaration(child, symbols);
            }
        });
    }
    findNamespace(sourceFile, namespaceName) {
        let result = undefined;
        const visit = (node) => {
            if (arkanalyzer_1.ts.isModuleDeclaration(node) && node.name.getText(sourceFile) === namespaceName) {
                result = node;
            }
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return result;
    }
    collectSymbolsFromNamespace(namespaceNode, symbols) {
        const visit = (node) => {
            this.collectSymbolsFromNode(node, symbols);
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(namespaceNode);
    }
    collectSymbolsFromNode(node, symbols) {
        if (arkanalyzer_1.ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach((declaration) => {
                if (arkanalyzer_1.ts.isIdentifier(declaration.name)) {
                    symbols.add(declaration.name.text);
                }
            });
        }
        else if (arkanalyzer_1.ts.isFunctionDeclaration(node) && node.name) {
            symbols.add(node.name.text);
        }
        else if (arkanalyzer_1.ts.isTypeAliasDeclaration(node) && node.name) {
            symbols.add(node.name.text);
        }
        else if (arkanalyzer_1.ts.isEnumDeclaration(node)) {
            symbols.add(node.name.text);
            node.members.forEach((member) => {
                if (arkanalyzer_1.ts.isIdentifier(member.name)) {
                    symbols.add(member.name.text);
                }
            });
        }
    }
    // 遍历过滤后的 locations 并执行 addIssueReportNodeFix
    filteredLocations(locations) {
        // 过滤 locations，保留 line 和 startCol 相同但 endCol 最大的 LocationInfo 对象
        const filteredLocations = [];
        locations.forEach((loc) => {
            let found = this.filteredFound(filteredLocations, loc);
            if (!found) {
                filteredLocations.push(loc); // 添加新记录
            }
        });
        return filteredLocations;
    }
    filteredFound(filteredLocations, loc) {
        let found = false;
        for (let i = 0; i < filteredLocations.length; i++) {
            const existingLoc = filteredLocations[i];
            if (existingLoc.line === loc.line && existingLoc.startCol === loc.startCol) {
                if (loc.endCol > existingLoc.endCol) {
                    filteredLocations[i] = loc; // 更新记录
                }
                found = true;
                break;
            }
        }
        return found;
    }
    // 创建修复对象 
    ruleFix(sourceFile, loc) {
        const [start, end] = this.getFixRange(sourceFile, loc);
        return { range: [start, end], text: '' };
    }
    // 获取起始位置和结束位置
    getFixRange(sourceFile, loc) {
        const startPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.startCol) - 1;
        const endPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.endCol);
        return [startPosition, endPosition];
    }
    addIssueReportNodeFix(sourceFile, loc, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        this.metaData.description = `Qualifier is unnecessary since '${loc.Qualifier}' is in scope.`;
        let defect = new Defects_1.Defects(loc.line, loc.startCol, loc.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = this.ruleFix(sourceFile, loc);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoUnnecessaryQualifierCheck = NoUnnecessaryQualifierCheck;
