"use strict";
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
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
exports.NoUnnecessaryTypeArgumentsCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnnecessaryTypeArgumentsCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-unnecessary-type-arguments.md",
    description: "This is the default value for this type parameter, so it can be omitted.",
};
class NoUnnecessaryTypeArgumentsCheck {
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
            // 检查泛型类型
            const locations = this.checkGenericTypes(asRoot);
            locations.forEach((loc) => {
                this.addIssueReportNodeFix(loc, filePath);
            });
        }
    };
    checkGenericTypes(sourceFile) {
        const results = [];
        const typeParameterDefaults = new Map();
        const visit = (node) => {
            // 检查函数声明
            if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isMethodDeclaration(node)) {
                this.checkFunctionDeclaration(node, sourceFile, typeParameterDefaults, results);
            }
            // 检查类声明
            if (arkanalyzer_1.ts.isClassDeclaration(node)) {
                this.checkClassDeclaration(node, sourceFile, typeParameterDefaults, results);
            }
            // 检查接口实现
            if (arkanalyzer_1.ts.isInterfaceDeclaration(node)) {
                this.checkInterfaceDeclaration(node, sourceFile, typeParameterDefaults, results);
            }
            // 检查 CallExpression
            if (arkanalyzer_1.ts.isCallExpression(node)) {
                this.checkCallExpression(node, sourceFile, typeParameterDefaults, results);
            }
            // 检查 NewExpression
            if (arkanalyzer_1.ts.isNewExpression(node)) {
                this.checkNewExpression(node, sourceFile, typeParameterDefaults, results);
            }
            if (arkanalyzer_1.ts.isModuleDeclaration(node)) {
                return;
            }
            // 检查类型别名
            if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
                this.checkTypeAliasDeclaration(node, sourceFile, typeParameterDefaults, results);
            }
            // 检查类型引用
            if (arkanalyzer_1.ts.isTypeReferenceNode(node)) {
                this.checkTypeReference(node, sourceFile, typeParameterDefaults, results);
            }
            // 递归遍历子节点
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return results;
    }
    checkInterfaceDeclaration(node, sourceFile, typeParameterDefaults, results) {
        if (node.typeParameters) {
            const interfaceName = node.name?.getText(sourceFile) || '';
            const defaults = new Map();
            for (const typeParam of node.typeParameters) {
                if (typeParam.default) {
                    const typeParamName = typeParam.name.getText(sourceFile);
                    const defaultTypeText = typeParam.default.getText(sourceFile);
                    defaults.set(typeParamName, defaultTypeText);
                }
            }
            typeParameterDefaults.set(interfaceName, defaults);
        }
    }
    checkTypeAliasDeclaration(node, sourceFile, typeParameterDefaults, results) {
        if (node.typeParameters) {
            const typeName = node.name.getText(sourceFile);
            const defaults = new Map();
            for (const typeParam of node.typeParameters) {
                if (typeParam.default) {
                    const typeParamName = typeParam.name.getText(sourceFile);
                    const defaultTypeText = typeParam.default.getText(sourceFile);
                    defaults.set(typeParamName, defaultTypeText);
                }
            }
            typeParameterDefaults.set(typeName, defaults);
        }
        // 递归检查类型别名的类型
        if (arkanalyzer_1.ts.isTypeReferenceNode(node.type)) {
            this.checkTypeReference(node.type, sourceFile, typeParameterDefaults, results);
        }
    }
    checkFunctionDeclaration(node, sourceFile, typeParameterDefaults, results) {
        if (node.typeParameters) {
            const functionName = node.name?.getText(sourceFile) || '';
            const defaults = new Map();
            for (const typeParam of node.typeParameters) {
                if (typeParam.default) {
                    const typeParamName = typeParam.name.getText(sourceFile);
                    const defaultTypeText = typeParam.default.getText(sourceFile);
                    defaults.set(typeParamName, defaultTypeText);
                }
            }
            typeParameterDefaults.set(functionName, defaults);
        }
    }
    checkClassDeclaration(node, sourceFile, typeParameterDefaults, results) {
        if (node.typeParameters) {
            const className = node.name?.getText(sourceFile) || '';
            const defaults = new Map();
            for (const typeParam of node.typeParameters) {
                if (typeParam.default) {
                    const typeParamName = typeParam.name.getText(sourceFile);
                    const defaultTypeText = typeParam.default.getText(sourceFile);
                    defaults.set(typeParamName, defaultTypeText);
                }
            }
            typeParameterDefaults.set(className, defaults);
        }
        // 检查类继承
        if (!node.heritageClauses) {
            return;
        }
        for (const clause of node.heritageClauses) {
            if (clause.token === arkanalyzer_1.ts.SyntaxKind.ExtendsKeyword ||
                clause.token === arkanalyzer_1.ts.SyntaxKind.ImplementsKeyword) {
                this.checkClassDeclarationClause(clause, sourceFile, typeParameterDefaults, results);
            }
        }
    }
    checkClassDeclarationClause(clause, sourceFile, typeParameterDefaults, results) {
        for (const type of clause.types) {
            if (!arkanalyzer_1.ts.isExpressionWithTypeArguments(type)) {
                continue;
            }
            const expression = type.expression;
            let className = '';
            if (arkanalyzer_1.ts.isIdentifier(expression)) {
                className = expression.text;
            }
            else if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
                className = expression.name.text;
            }
            const typeArguments = type.typeArguments;
            const defaults = typeParameterDefaults.get(className);
            if (!defaults || !typeArguments) {
                continue;
            }
            const lastIndex = typeArguments.length - 1;
            const lastTypeArg = typeArguments[lastIndex];
            const typeParamName = Array.from(defaults.keys())[lastIndex] || `T${lastIndex + 1}`;
            const defaultType = defaults.get(typeParamName) || '';
            const argType = lastTypeArg.getText(sourceFile);
            let start = 0;
            let end = 0;
            if (argType === defaultType) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(lastTypeArg.getStart());
                const endCharacter = character + lastTypeArg.getWidth();
                if (typeArguments.length < 2) {
                    start = this.findLastCommaStartPosition(sourceFile, lastTypeArg);
                    end = this.findLastCommaEndPosition(sourceFile, lastTypeArg);
                }
                else {
                    start = this.findLastCommaStartPosition(sourceFile, lastTypeArg);
                    end = endCharacter;
                }
                results.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    startCol: character + 1,
                    endCol: endCharacter,
                    start: start,
                    end: end,
                    typeParamName: typeParamName,
                    defaultType: defaultType,
                    argType: argType,
                });
            }
        }
    }
    checkCallExpression(node, sourceFile, typeParameterDefaults, results) {
        const expression = node.expression;
        let functionName = '';
        if (arkanalyzer_1.ts.isIdentifier(expression)) {
            functionName = expression.text;
        }
        else if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            functionName = expression.name.text;
        }
        const typeArguments = node.typeArguments;
        const defaults = typeParameterDefaults.get(functionName);
        if (!defaults || !typeArguments) {
            return;
        }
        // 只检查最后一个类型参数
        const lastIndex = typeArguments.length - 1;
        const lastTypeArg = typeArguments[lastIndex];
        const typeParamName = Array.from(defaults.keys())[lastIndex] || `T${lastIndex + 1}`;
        const defaultType = defaults.get(typeParamName) || '';
        const argType = lastTypeArg.getText(sourceFile);
        let start = 0;
        let end = 0;
        if (argType === defaultType) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(lastTypeArg.getStart());
            const endCharacter = character + lastTypeArg.getWidth();
            if (typeArguments.length < 2) {
                start = this.findLastCommaStartPosition(sourceFile, lastTypeArg);
                end = this.findLastCommaEndPosition(sourceFile, lastTypeArg);
            }
            else {
                start = this.findLastCommaStartPosition(sourceFile, lastTypeArg);
                end = this.findLastCommaEndPosition(sourceFile, lastTypeArg) - 1;
            }
            results.push({
                fileName: sourceFile.fileName,
                line: line + 1,
                startCol: character + 1,
                endCol: endCharacter,
                start: start,
                end: end,
                typeParamName: typeParamName,
                defaultType: defaultType,
                argType: argType,
            });
        }
    }
    checkNewExpression(node, sourceFile, typeParameterDefaults, results) {
        const expression = node.expression;
        let className = '';
        if (arkanalyzer_1.ts.isIdentifier(expression)) {
            className = expression.text;
        }
        else if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            className = expression.name.text;
        }
        const typeArguments = node.typeArguments;
        const defaults = typeParameterDefaults.get(className);
        if (defaults && typeArguments) {
            // 只检查最后一个类型参数
            const lastIndex = typeArguments.length - 1;
            const lastTypeArg = typeArguments[lastIndex];
            const typeParamName = Array.from(defaults.keys())[lastIndex] || `T${lastIndex + 1}`;
            const defaultType = defaults.get(typeParamName) || '';
            const argType = lastTypeArg.getText(sourceFile);
            let start = 0;
            let end = 0;
            if (argType === defaultType) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(lastTypeArg.getStart());
                const endCharacter = character + lastTypeArg.getWidth();
                if (typeArguments.length < 2) {
                    start = this.findLastCommaStartPosition(sourceFile, lastTypeArg);
                    end = this.findLastCommaEndPosition(sourceFile, lastTypeArg);
                }
                else {
                    start = this.findLastCommaStartPosition(sourceFile, lastTypeArg);
                    end = this.findLastCommaEndPosition(sourceFile, lastTypeArg) - 1;
                }
                results.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    startCol: character + 1,
                    endCol: endCharacter,
                    start: start,
                    end: end,
                    typeParamName: typeParamName,
                    defaultType: defaultType,
                    argType: argType,
                });
            }
        }
    }
    // 检查类型引用的逻辑
    checkTypeReference(node, sourceFile, typeParameterDefaults, results) {
        const typeName = node.typeName.getText(sourceFile);
        const typeArguments = node.typeArguments;
        const defaults = typeParameterDefaults.get(typeName);
        if (defaults && typeArguments) {
            // 只检查最后一个类型参数
            const lastIndex = typeArguments.length - 1;
            const lastTypeArg = typeArguments[lastIndex];
            const typeParamName = Array.from(defaults.keys())[lastIndex] || `T${lastIndex + 1}`;
            const defaultType = defaults.get(typeParamName) || '';
            const argType = lastTypeArg.getText(sourceFile);
            let start = 0;
            let end = 0;
            if (argType === defaultType) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(lastTypeArg.getStart());
                const endCharacter = character + lastTypeArg.getWidth();
                if (typeArguments.length < 2) {
                    start = this.findLastCommaStartPosition(sourceFile, lastTypeArg);
                    end = this.findLastCommaEndPosition(sourceFile, lastTypeArg);
                }
                else {
                    start = this.findLastCommaStartPosition(sourceFile, lastTypeArg);
                    end = this.findLastCommaEndPosition(sourceFile, lastTypeArg) - 1;
                }
                results.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    startCol: character + 1,
                    endCol: endCharacter,
                    start: start,
                    end: end,
                    typeParamName: typeParamName,
                    defaultType: defaultType,
                    argType: argType,
                });
            }
        }
    }
    // 查找最后一个类型参数前面的逗号或尖括号开始的位置
    findLastCommaStartPosition(sourceFile, lastTypeArg) {
        const text = sourceFile.getFullText();
        const position = lastTypeArg.getStart();
        // 向前查找逗号或尖括号
        for (let i = position - 1; i >= 0; i--) {
            const char = text[i];
            if (char === ',' || char === '<') {
                return i;
            }
        }
        return position;
    }
    // 查找最后一个类型参数前面的逗号或尖括号结束的位置
    findLastCommaEndPosition(sourceFile, lastTypeArg) {
        const text = sourceFile.getFullText();
        const position = lastTypeArg.getEnd(); // 从最后一个类型参数的结束位置开始查找
        // 向后查找尖括号
        for (let i = position; i < text.length; i++) {
            const char = text[i];
            if (char === '>') {
                return i + 1; // 返回尖括号的位置
            }
        }
        return position + 1; // 如果没有找到尖括号，返回最后一个类型参数的结束位置
    }
    // 创建修复对象 
    ruleFix(loc) {
        return { range: [loc.start, loc.end], text: '' };
    }
    addIssueReportNodeFix(loc, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(loc.line, loc.startCol, loc.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = this.ruleFix(loc);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoUnnecessaryTypeArgumentsCheck = NoUnnecessaryTypeArgumentsCheck;
