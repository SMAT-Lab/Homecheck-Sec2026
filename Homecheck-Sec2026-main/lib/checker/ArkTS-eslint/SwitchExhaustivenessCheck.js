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
exports.SwitchExhaustivenessCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
class SwitchExhaustivenessCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/switch-exhaustiveness.md',
        description: 'Enforce exhaustive checks in switch statements'
    };
    defaultOptions = [{
            allowDefaultCaseForExhaustiveSwitch: true,
            requireDefaultForNonUnion: false
        }];
    rule;
    defects = [];
    issues = [];
    registerMatchers() {
        return [{
                matcher: { matcherType: Matchers_1.MatcherTypes.FILE },
                callback: this.check
            }];
    }
    check = (target) => {
        if (!(target instanceof lib_1.ArkFile)) {
            return;
        }
        ;
        const ast = lib_1.AstTreeUtils.getSourceFileFromArkFile(target);
        if (!ast) {
            return;
        }
        this.traverseAST(ast, target);
    };
    traverseAST(node, arkFile) {
        if (lib_1.ts.isSwitchStatement(node)) {
            const metadata = this.analyzeSwitch(node, arkFile);
            this.validateSwitch(node, metadata, arkFile);
        }
        ;
        lib_1.ts.forEachChild(node, child => this.traverseAST(child, arkFile));
    }
    ;
    analyzeSwitch(node, arkFile) {
        const discriminant = node.expression;
        const discriminantName = this.getDiscriminantName(discriminant);
        const possibleValues = this.getPossibleValues(discriminant, arkFile);
        const coveredValues = this.getCoveredValues(node);
        const isUnionType = this.isUnionTypeOrEnum(discriminant, arkFile);
        const isEnumType = this.isEnumType(discriminant, arkFile);
        const isNumericLiteralType = this.isVariableOfNumericLiteralType(discriminant, arkFile);
        // 添加被切换的变量的实际值
        const actualValue = this.getActualValue(discriminant, arkFile);
        if (actualValue && !possibleValues.includes(actualValue)) {
            possibleValues.push(actualValue);
        }
        ;
        // 通过比较可能的值和已覆盖的值来查找缺失的情况
        const missingCases = possibleValues.filter(value => !coveredValues.has(value));
        return {
            missingCases,
            hasDefaultCase: this.hasDefaultCase(node),
            isUnionType,
            isEnumType,
            isNumericLiteralType,
            coveredValues,
            possibleValues,
            discriminantName
        };
    }
    ;
    isVariableOfNumericLiteralType(expr, arkFile) {
        if (!lib_1.ts.isIdentifier(expr)) {
            return false;
        }
        ;
        // 1. 查找变量声明
        const declaration = this.findDeclaration(expr.text, arkFile);
        if (!declaration) {
            return false;
        }
        ;
        // 2. 获取类型注解节点
        const typeNode = this.getTypeNodeFromDeclaration(declaration);
        if (!typeNode) {
            return false;
        }
        ;
        // 3. 递归检查类型节点
        return this.checkIsNumericLiteralType(typeNode, arkFile);
    }
    ;
    checkIsNumericLiteralType(typeNode, arkFile) {
        // 情况1：直接是数字字面量类型（如 : 1）
        if (lib_1.ts.isLiteralTypeNode(typeNode)) {
            return lib_1.ts.isNumericLiteral(typeNode.literal);
        }
        ;
        // 情况2：类型引用（如 type MyNum = 1）
        if (lib_1.ts.isTypeReferenceNode(typeNode)) {
            const typeName = typeNode.typeName.getText();
            const typeAlias = this.findTypeAliasDeclaration(typeName, arkFile);
            return typeAlias ? this.checkIsNumericLiteralType(typeAlias.type, arkFile) : false;
        }
        ;
        // 情况3：联合类型中的字面量（如 : 1 | 2）
        if (lib_1.ts.isUnionTypeNode(typeNode)) {
            return typeNode.types.some(t => this.checkIsNumericLiteralType(t, arkFile));
        }
        ;
        return false;
    }
    ;
    getDiscriminantName(expr) {
        if (lib_1.ts.isIdentifier(expr)) {
            return expr.text;
        }
        ;
        return '';
    }
    ;
    isEnumType(expr, arkFile) {
        if (!lib_1.ts.isIdentifier(expr)) {
            return false;
        }
        ;
        // 1. 找到变量/参数声明
        const varDeclaration = this.findDeclaration(expr.text, arkFile);
        if (!varDeclaration) {
            return false;
        }
        ;
        // 2. 提取声明的类型注解
        const typeNode = this.getTypeNodeFromDeclaration(varDeclaration);
        if (!typeNode) {
            return false;
        }
        ;
        // 3. 深度检查类型节点
        return this.checkTypeIsEnum(typeNode, arkFile);
    }
    ;
    checkTypeIsEnum(typeNode, arkFile) {
        // 情况1：直接是枚举引用（如 Fruit）
        if (lib_1.ts.isTypeReferenceNode(typeNode)) {
            const typeName = typeNode.typeName.getText();
            const enumDecl = this.findEnumDeclaration(typeName, arkFile);
            if (enumDecl) {
                return true;
            }
            ;
            // 处理类型别名（如 type MyFruit = Fruit）
            const typeAlias = this.findTypeAliasDeclaration(typeName, arkFile);
            return typeAlias ? this.checkTypeIsEnum(typeAlias.type, arkFile) : false;
        }
        ;
        // 情况2：类型别名或复杂类型
        if (lib_1.ts.isTypeAliasDeclaration(typeNode)) {
            return this.checkTypeIsEnum(typeNode.type, arkFile);
        }
        ;
        return false;
    }
    ;
    getPossibleValues(expr, arkFile) {
        // 首先，尝试处理枚举
        if (lib_1.ts.isIdentifier(expr)) {
            // 检查直接枚举引用（例如，switch(fruit) 中的 fruit）
            const enumDecl = this.findEnumDeclaration(expr.text, arkFile);
            if (enumDecl) {
                return this.getEnumValues(enumDecl);
            }
            ;
            // 检查带有字符串字面量联合的类型别名
            const typeValues = this.getTypeReferenceValues(expr.text, arkFile);
            if (typeValues.length > 0) {
                return typeValues;
            }
            ;
            // 检查带有类型注解的变量声明
            const declaration = this.findDeclaration(expr.text, arkFile);
            if (declaration) {
                if (this.getDeclarationTypeNodeValues(declaration, arkFile) !== undefined) {
                    return this.getDeclarationTypeNodeValues(declaration, arkFile);
                }
                ;
            }
            ;
        }
        ;
        return [];
    }
    getDeclarationTypeNodeValues(declaration, arkFile) {
        const typeNode = this.getTypeNodeFromDeclaration(declaration);
        if (typeNode) {
            if (lib_1.ts.isUnionTypeNode(typeNode)) {
                return this.getUnionTypeValues(typeNode);
            }
            ;
            if (lib_1.ts.isTypeReferenceNode(typeNode)) {
                const typeName = typeNode.typeName.getText();
                return this.getTypeReferenceValues(typeName, arkFile);
            }
            ;
        }
        ;
        return undefined;
    }
    ;
    getTypeReferenceValues(typeName, arkFile) {
        // 查找类型别名声明
        const typeAlias = this.findTypeAliasDeclaration(typeName, arkFile);
        if (typeAlias) {
            if (lib_1.ts.isUnionTypeNode(typeAlias.type)) {
                return this.getUnionTypeValues(typeAlias.type);
            }
            ;
        }
        ;
        // 检查是否引用了一个枚举
        const enumDecl = this.findEnumDeclaration(typeName, arkFile);
        if (enumDecl) {
            return this.getEnumValues(enumDecl);
        }
        ;
        return [];
    }
    ;
    getTypeNodeFromDeclaration(declaration) {
        if (lib_1.ts.isVariableDeclaration(declaration)) {
            // CASE 1：显式类型注解（如 const a: 1 = 0）
            if (declaration.type) {
                return declaration.type;
            }
            // CASE 2：无类型注解时，通过初始值推断
            else if (declaration.initializer) {
                return this.inferTypeFromInitializer(declaration.initializer);
            }
            ;
        }
        ;
        if (lib_1.ts.isParameter(declaration) && declaration.type) {
            return declaration.type;
        }
        ;
        if (lib_1.ts.isTypeAliasDeclaration(declaration)) {
            return declaration.type;
        }
        ;
        return undefined;
    }
    inferTypeFromInitializer(initializer) {
        // 处理数字字面量（如 const a = 0）
        if (lib_1.ts.isNumericLiteral(initializer)) {
            return lib_1.ts.factory.createLiteralTypeNode(lib_1.ts.factory.createNumericLiteral(initializer.text));
        }
        ;
        // 处理字符串字面量（如 const b = "hello"）
        if (lib_1.ts.isStringLiteral(initializer)) {
            return lib_1.ts.factory.createLiteralTypeNode(lib_1.ts.factory.createStringLiteral(initializer.text));
        }
        ;
        // 处理布尔字面量（如 const c = true）
        if (initializer.kind === lib_1.ts.SyntaxKind.TrueKeyword) {
            return lib_1.ts.factory.createLiteralTypeNode(lib_1.ts.factory.createToken(lib_1.ts.SyntaxKind.TrueKeyword));
        }
        ;
        if (initializer.kind === lib_1.ts.SyntaxKind.FalseKeyword) {
            return lib_1.ts.factory.createLiteralTypeNode(lib_1.ts.factory.createToken(lib_1.ts.SyntaxKind.FalseKeyword));
        }
        ;
        // 其他复杂情况（如对象、函数等）暂不处理
        return undefined;
    }
    getUnionTypeValues(unionNode) {
        const values = [];
        for (const typeNode of unionNode.types) {
            if (lib_1.ts.isLiteralTypeNode(typeNode)) {
                const literal = typeNode.literal;
                if (lib_1.ts.isStringLiteral(literal)) {
                    values.push(`'${literal.text}'`);
                }
                else if (lib_1.ts.isNumericLiteral(literal)) {
                    values.push(literal.text);
                }
                else if (literal.kind === lib_1.ts.SyntaxKind.TrueKeyword ||
                    literal.kind === lib_1.ts.SyntaxKind.FalseKeyword) {
                    values.push(literal.kind === lib_1.ts.SyntaxKind.TrueKeyword ? 'true' : 'false');
                }
                ;
            }
            ;
        }
        ;
        return values;
    }
    ;
    visitDeclarationList = (name, node) => {
        let result;
        const hasDeclareModifier = node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.DeclareKeyword);
        if (hasDeclareModifier) {
            for (const decl of node.declarationList.declarations) {
                if (lib_1.ts.isIdentifier(decl.name) && decl.name.text === name) {
                    result = decl;
                    return result;
                }
                ;
            }
            ;
        }
        ;
        return result;
    };
    findDeclaration(name, arkFile) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        let result;
        const visit = (node) => {
            if (result) {
                return;
            }
            // 变量声明
            if (lib_1.ts.isVariableDeclaration(node) &&
                lib_1.ts.isIdentifier(node.name) &&
                node.name.text === name) {
                result = node;
                return;
            }
            // 参数声明
            if (lib_1.ts.isParameter(node) &&
                lib_1.ts.isIdentifier(node.name) &&
                node.name.text === name) {
                result = node;
                return;
            }
            // 寻找 'declare const' 语句
            if (lib_1.ts.isVariableStatement(node)) {
                result = this.visitDeclarationList(name, node);
            }
            ;
            lib_1.ts.forEachChild(node, visit);
        };
        if (sourceFile) {
            lib_1.ts.forEachChild(sourceFile, visit);
        }
        ;
        return result;
    }
    ;
    findTypeAliasDeclaration(name, arkFile) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        let result;
        const visit = (node) => {
            if (result) {
                return;
            }
            ;
            if (lib_1.ts.isTypeAliasDeclaration(node) && node.name.text === name) {
                result = node;
                return;
            }
            ;
            lib_1.ts.forEachChild(node, visit);
        };
        if (sourceFile) {
            lib_1.ts.forEachChild(sourceFile, visit);
        }
        ;
        return result;
    }
    ;
    findEnumDeclaration(name, arkFile) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        let result;
        const visit = (node) => {
            if (result) {
                return;
            }
            if (lib_1.ts.isEnumDeclaration(node) && node.name.text === name) {
                result = node;
                return;
            }
            ;
            lib_1.ts.forEachChild(node, visit);
        };
        if (sourceFile) {
            lib_1.ts.forEachChild(sourceFile, visit);
        }
        ;
        return result;
    }
    ;
    getEnumValues(enumDecl) {
        const enumName = enumDecl.name.text;
        const values = [];
        // 同时存储枚举.成员和原始值格式
        for (const member of enumDecl.members) {
            const memberName = lib_1.ts.isIdentifier(member.name)
                ? member.name.text
                : lib_1.ts.isStringLiteral(member.name)
                    ? member.name.text
                    : '';
            if (memberName) {
                // 添加枚举.成员格式
                values.push(`${enumName}.${memberName}`);
                // 如果是字符串或数字字面量，也添加原始值
                if (member.initializer && lib_1.ts.isStringLiteral(member.initializer)) {
                    values.push(`'${member.initializer.text}'`);
                }
                else if (member.initializer && lib_1.ts.isNumericLiteral(member.initializer)) {
                    values.push(member.initializer.text);
                }
                else if (!member.initializer) {
                    // 如果没有初始化器，对于数字枚举，使用索引作为值
                    // 例如 enum Fruit { Apple, Banana, Cherry }
                    const index = enumDecl.members.indexOf(member);
                    values.push(index.toString());
                }
                ;
            }
            ;
        }
        ;
        return values;
    }
    ;
    getCoveredValues(node) {
        const values = new Set();
        for (const clause of node.caseBlock.clauses) {
            if (!lib_1.ts.isCaseClause(clause)) {
                continue;
            }
            ;
            const caseValue = this.extractCaseValue(clause.expression);
            if (caseValue) {
                values.add(caseValue);
            }
            ;
        }
        ;
        return values;
    }
    ;
    extractCaseValue(expr) {
        // 处理属性访问表达式（例如，Enum.Member）
        if (lib_1.ts.isPropertyAccessExpression(expr)) {
            return expr.getText();
        }
        ;
        // 处理字符串字面量
        if (lib_1.ts.isStringLiteral(expr)) {
            return `'${expr.text}'`;
        }
        ;
        // 处理数字字面量
        if (lib_1.ts.isNumericLiteral(expr)) {
            return expr.text;
        }
        ;
        // 处理标识符
        if (lib_1.ts.isIdentifier(expr)) {
            return expr.text;
        }
        ;
        // 处理 true/false/null 字面量
        if (expr.kind === lib_1.ts.SyntaxKind.TrueKeyword) {
            return 'true';
        }
        ;
        if (expr.kind === lib_1.ts.SyntaxKind.FalseKeyword) {
            return 'false';
        }
        ;
        if (expr.kind === lib_1.ts.SyntaxKind.NullKeyword) {
            return 'null';
        }
        ;
        return null;
    }
    ;
    isUnionTypeOrEnum(expr, arkFile) {
        // 检查是否为枚举引用
        if (lib_1.ts.isIdentifier(expr)) {
            const enumDecl = this.findEnumDeclaration(expr.text, arkFile);
            if (enumDecl) {
                return true;
            }
            ;
            // 检查联合类型
            const declaration = this.findDeclaration(expr.text, arkFile);
            if (declaration) {
                if (this.checkTypeNodeFromDeclaration(declaration, arkFile) !== undefined) {
                    return this.checkTypeNodeFromDeclaration(declaration, arkFile);
                }
                ;
            }
            ;
            // 检查带有联合类型的类型别名
            const typeAlias = this.findTypeAliasDeclaration(expr.text, arkFile);
            if (typeAlias && lib_1.ts.isUnionTypeNode(typeAlias.type)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkTypeNodeFromDeclaration(declaration, arkFile) {
        const typeNode = this.getTypeNodeFromDeclaration(declaration);
        if (typeNode) {
            if (lib_1.ts.isUnionTypeNode(typeNode)) {
                return true;
            }
            ;
            if (lib_1.ts.isTypeReferenceNode(typeNode)) {
                const typeName = typeNode.typeName.getText();
                const typeAlias = this.findTypeAliasDeclaration(typeName, arkFile);
                return typeAlias ? lib_1.ts.isUnionTypeNode(typeAlias.type) : false;
            }
            ;
        }
        ;
        return undefined;
    }
    ;
    hasDefaultCase(node) {
        return node.caseBlock.clauses.some(clause => lib_1.ts.isDefaultClause(clause));
    }
    ;
    validateSwitch(node, metadata, arkFile) {
        const options = this.getCurrentOptions();
        // 组合检查：非穷尽性 switch 和无效的 case 值
        if (metadata.missingCases.length > 0 && !metadata.hasDefaultCase) {
            if (metadata.missingCases.length === metadata.coveredValues.size &&
                (metadata.missingCases.length + metadata.coveredValues.size === metadata.possibleValues.length)) {
                return;
            }
            ;
            // 报告非穷尽性错误
            let des = '';
            if (metadata.isEnumType) {
                const enumMembers = metadata.possibleValues.filter(value => value.includes('.'));
                des = enumMembers.join(' | ');
            }
            else {
                des = metadata.missingCases.join(' | ');
            }
            ;
            this.reportIssue(node.expression, `Switch is not exhaustive. Cases not matched: ${des}`, arkFile);
            return;
        }
        else if (metadata.missingCases.length > 0 && metadata.hasDefaultCase && metadata.isNumericLiteralType) {
            return;
        }
        else if (metadata.possibleValues.length > 0) {
            // 只有在有可能的值可以检查时才检查无效的 case 值
            const invalidCases = this.parseInvalidCases(metadata);
            if (invalidCases.length > 0) {
                this.reportIssue(node.expression, `Switch is not exhaustive. Cases not matched: ${invalidCases.join(' | ')}`, arkFile);
                return;
            }
            ;
        }
        ;
        // 检查 2：不必要的默认情况
        if (!options.allowDefaultCaseForExhaustiveSwitch && metadata.missingCases.length === 0 && metadata.hasDefaultCase &&
            metadata.isUnionType) {
            const defaultClause = node.caseBlock.clauses.find(lib_1.ts.isDefaultClause);
            if (defaultClause) {
                this.reportIssue(node.expression, 'The switch statement is exhaustive, so the default case is unnecessary.', arkFile);
            }
            ;
        }
        ;
        // 检查 3：非联合类型需要默认情况
        this.processNoNonUnion(node, options, metadata, arkFile);
    }
    ;
    processNoNonUnion(node, options, metadata, arkFile) {
        if (options.requireDefaultForNonUnion && !metadata.isUnionType && !metadata.hasDefaultCase &&
            !(metadata.missingCases.length === 0 && metadata.possibleValues.length === 0 &&
                metadata.coveredValues.size === 1 && metadata.coveredValues.has('true'))) {
            this.reportIssue(node.expression, 'Switch is not exhaustive. Cases not matched: default', arkFile);
        }
        ;
    }
    ;
    parseInvalidCases(metadata) {
        const invalidCases = [];
        for (const value of metadata.coveredValues) {
            if (!metadata.possibleValues.includes(value) && !value.includes('.')) {
                invalidCases.push(value);
            }
            ;
        }
        ;
        return invalidCases;
    }
    ;
    getCurrentOptions() {
        return this.rule?.option?.[0] || this.defaultOptions[0];
    }
    ;
    reportIssue(node, message, arkFile) {
        const sourceFile = node.getSourceFile();
        const start = node.getStart();
        const end = node.getEnd();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
        const endPos = sourceFile.getLineAndCharacterOfPosition(end);
        const defect = new Defects_1.Defects(line + 1, character + 1, endPos.character + 1, message, this.rule?.alert ?? this.metaData.severity, this.rule.ruleId, arkFile.getFilePath() ?? '', this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getActualValue(expr, arkFile) {
        // 处理数字字面量
        if (lib_1.ts.isNumericLiteral(expr)) {
            return expr.text;
        }
        ;
        // 处理字符串字面量
        if (lib_1.ts.isStringLiteral(expr)) {
            return `'${expr.text}'`;
        }
        ;
        // 处理标识符（变量）
        if (lib_1.ts.isIdentifier(expr)) {
            const declaration = this.findDeclaration(expr.text, arkFile);
            // 检查带有初始化器的变量
            if (declaration && lib_1.ts.isVariableDeclaration(declaration) && declaration.initializer) {
                if (lib_1.ts.isNumericLiteral(declaration.initializer)) {
                    return declaration.initializer.text;
                }
                else if (lib_1.ts.isStringLiteral(declaration.initializer)) {
                    return `'${declaration.initializer.text}'`;
                }
                ;
            }
            ;
        }
        ;
        return null;
    }
    ;
}
exports.SwitchExhaustivenessCheck = SwitchExhaustivenessCheck;
