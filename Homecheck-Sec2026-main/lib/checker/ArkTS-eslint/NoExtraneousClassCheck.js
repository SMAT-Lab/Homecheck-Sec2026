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
exports.NoExtraneousClassCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-extraneous-class.md',
    description: 'Disallow classes used as namespaces'
};
const messages = {
    empty: 'Unexpected empty class.',
    onlyConstructor: 'Unexpected class with only a constructor.',
    onlyStatic: 'Unexpected class with only static properties.'
};
class NoExtraneousClassCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    defaultOptions = {
        allowConstructorOnly: false,
        allowEmpty: false,
        allowStaticOnly: false,
        allowWithDecorator: false
    };
    options = { ...this.defaultOptions };
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
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
        this.parseOptions();
        const astRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.visitNode(astRoot, arkFile);
    };
    /** 递归遍历AST节点，查找所有类声明和类表达式*/
    visitNode(node, arkFile) {
        try {
            // 检查类声明
            if (arkanalyzer_1.ts.isClassDeclaration(node)) {
                this.checkClass(node, arkFile);
            }
            // 检查类表达式
            else if (arkanalyzer_1.ts.isClassExpression(node)) {
                this.checkClass(node, arkFile);
            }
            // 递归检查所有子节点
            arkanalyzer_1.ts.forEachChild(node, childNode => this.visitNode(childNode, arkFile));
        }
        catch (error) {
        }
    }
    parseOptions() {
        if (this.rule?.option?.[0]) {
            const ruleOption = this.rule.option[0];
            this.options = {
                allowConstructorOnly: ruleOption.allowConstructorOnly ?? this.defaultOptions.allowConstructorOnly,
                allowEmpty: ruleOption.allowEmpty ?? this.defaultOptions.allowEmpty,
                allowStaticOnly: ruleOption.allowStaticOnly ?? this.defaultOptions.allowStaticOnly,
                allowWithDecorator: ruleOption.allowWithDecorator ?? this.defaultOptions.allowWithDecorator
            };
        }
        ;
    }
    ;
    /** 检查类是否符合规则*/
    checkClass(node, arkFile) {
        try {
            if (this.hasSuperClass(node) || (this.hasDecorators(node) && this.options.allowWithDecorator)) {
                return;
            }
            ;
            const members = node.members;
            if (this.options.allowConstructorOnly && this.areAllMembersConstructors(members)) {
                return;
            }
            ;
            if ((members.length === 0 || this.isEffectivelyEmpty(members))) {
                if (this.options.allowEmpty) {
                    return;
                }
                else {
                    this.report(node, 'empty', arkFile);
                    return;
                }
                ;
            }
            ;
            const { onlyConstructor, onlyStatic } = this.analyzeMembers(members);
            if (onlyConstructor && !this.options.allowConstructorOnly) {
                this.report(node, 'onlyConstructor', arkFile);
                return;
            }
            ;
            if (onlyStatic && !this.options.allowStaticOnly) {
                this.report(node, 'onlyStatic', arkFile);
            }
            ;
        }
        catch (error) { }
    }
    ;
    analyzeMembers(members) {
        let onlyConstructor = true;
        let onlyStatic = true;
        let hasNonStaticNonConstructorMember = false;
        for (const member of members) {
            if (this.isEmptyMember(member)) {
                continue;
            }
            if (this.isStaticBlock(member)) {
                onlyConstructor = false;
                continue;
            }
            ;
            if (arkanalyzer_1.ts.isConstructorDeclaration(member)) {
                if (this.hasParameterProperties(member)) {
                    onlyConstructor = false;
                    onlyStatic = false;
                    hasNonStaticNonConstructorMember = true;
                }
                ;
            }
            else {
                onlyConstructor = false;
                if (!this.isStaticMember(member)) {
                    onlyStatic = false;
                    hasNonStaticNonConstructorMember = true;
                }
                ;
            }
            ;
            if (hasNonStaticNonConstructorMember) {
                break;
            }
        }
        ;
        return { onlyConstructor, onlyStatic: onlyStatic || (!hasNonStaticNonConstructorMember && members.some(m => this.isStaticBlock(m))) };
    }
    ;
    /**检查节点是否有继承关系*/
    hasSuperClass(node) {
        return !!node.heritageClauses?.some(clause => clause.token === arkanalyzer_1.ts.SyntaxKind.ExtendsKeyword && clause.types.length > 0);
    }
    ;
    /***检查节点是否有装饰器*/
    hasDecorators(node) {
        const decorators = arkanalyzer_1.ts.canHaveDecorators(node) ? arkanalyzer_1.ts.getDecorators(node) : undefined;
        return !!decorators && decorators.length > 0;
    }
    /** 检查构造函数是否有参数属性*/
    hasParameterProperties(constructor) {
        return constructor.parameters.some(param => {
            const modifiers = arkanalyzer_1.ts.getModifiers(param);
            return !!modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword ||
                mod.kind === arkanalyzer_1.ts.SyntaxKind.ProtectedKeyword ||
                mod.kind === arkanalyzer_1.ts.SyntaxKind.PublicKeyword ||
                mod.kind === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword);
        });
    }
    ;
    /** 检查成员是否是静态成员*/
    isStaticMember(member) {
        // 检查静态代码块 (static { ... })
        if (typeof arkanalyzer_1.ts.isClassStaticBlockDeclaration === 'function' && arkanalyzer_1.ts.isClassStaticBlockDeclaration(member)) {
            return true;
        }
        // 尝试通过类型判断检测静态块
        if (member.kind === arkanalyzer_1.ts.SyntaxKind.ClassStaticBlockDeclaration) {
            return true;
        }
        // 检查其他常规静态成员
        if (!arkanalyzer_1.ts.canHaveModifiers(member)) {
            return false;
        }
        const modifiers = arkanalyzer_1.ts.getModifiers(member);
        return !!modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
    }
    ;
    /** 检查节点是否是静态代码块*/
    isStaticBlock(node) {
        try {
            if (typeof arkanalyzer_1.ts.isClassStaticBlockDeclaration === 'function' && arkanalyzer_1.ts.isClassStaticBlockDeclaration(node)) {
                return true;
            }
            ;
            if ('ClassStaticBlockDeclaration' in arkanalyzer_1.ts.SyntaxKind && node.kind === arkanalyzer_1.ts.SyntaxKind.ClassStaticBlockDeclaration) {
                return true;
            }
            ;
            const nodeText = node.getText?.()?.trim();
            if (nodeText && this.isStatusClass(nodeText)) {
                return true;
            }
            ;
            const parent = node.parent;
            if (parent && (arkanalyzer_1.ts.isClassDeclaration(parent) || arkanalyzer_1.ts.isClassExpression(parent)) &&
                'body' in node && arkanalyzer_1.ts.isBlock(node.body) && !('name' in node) && !('parameters' in node)) {
                const modifiers = node.modifiers;
                if (Array.isArray(modifiers) && modifiers.some((m) => m.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword)) {
                    return true;
                }
                ;
            }
            ;
            return false;
        }
        catch (error) {
            return false;
        }
        ;
    }
    ;
    isStaticRegular = /^static\s*\{/;
    isStatusClass(nodeText) {
        const isStatic = this.isStaticRegular.test(nodeText);
        return isStatic;
    }
    ;
    /** 检查类成员是否为空（只有分号或注释）对比codelinter空class里面有一个分号可以检测出来*/
    isEmptyMember(member) {
        if (member.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonClassElement) {
            return true;
        }
        ;
        const text = member.getText();
        const strippedText = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
        return strippedText === '' || strippedText === ';';
    }
    ;
    /**检查类是否实际上是空的（只包含分号或注释）对比codelinter空class里面有一个分号可以检测出来 */
    isEffectivelyEmpty(members) {
        return members.every(member => this.isEmptyMember(member));
    }
    ;
    report(node, messageId, arkFile) {
        let reportNode = node.name || node;
        const severity = this.rule.alert ?? this.metaData.severity;
        try {
            // 处理默认导出类 (export default class {})
            if (arkanalyzer_1.ts.isClassDeclaration(node)) {
                // 先检查是否是export default形式
                const isDefaultExport = this.isExportDefaultClass(node);
                // 尝试定位class关键字位置
                const classKeywordInfo = this.findClassKeywordPosition(node);
                if (isDefaultExport && classKeywordInfo) {
                    const location = this.getNodeLocationWithCustomPosition(node, classKeywordInfo.start, classKeywordInfo.end, arkFile);
                    const defect = new Index_1.Defects(location.line, location.startCol, location.endCol, messages[messageId], severity, this.rule.ruleId, location.filePath, this.metaData.ruleDocPath, true, false, false, false);
                    this.issues.push(new Defects_1.IssueReport(defect, undefined));
                    DefectsList_1.RuleListUtil.push(defect);
                    return;
                }
                ;
            }
            ;
        }
        catch (error) {
        }
        ;
        const location = this.getNodeLocation(reportNode, arkFile);
        const defect = new Index_1.Defects(location.line, location.startCol, location.endCol, messages[messageId], severity, this.rule.ruleId, location.filePath, this.metaData.ruleDocPath, true, false, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    /** 检查类是否是export default class*/
    isExportClassRegular = /^\s*export\s+default\s+class\b/;
    isExportDefaultClass(node) {
        try {
            if (!node.parent) {
                return false;
            }
            ;
            if (arkanalyzer_1.ts.isExportAssignment(node.parent)) {
                return node.pos === node.parent.expression.pos &&
                    node.end === node.parent.expression.end;
            }
            ;
            if (node.modifiers) {
                const hasExport = node.modifiers.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword);
                const hasDefault = node.modifiers.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.DefaultKeyword);
                if (hasExport && hasDefault) {
                    return true;
                }
                ;
            }
            ;
            const nodeText = node.getText();
            if (this.isExportClassRegular.test(nodeText)) {
                return true;
            }
            ;
            if (node.parent && arkanalyzer_1.ts.isVariableDeclaration(node.parent) && this.isValidVariableStatement(node.parent)) {
                const variableDecl = node.parent;
                const varStatement = variableDecl.parent.parent;
                if (varStatement.modifiers) {
                    const hasExport = varStatement.modifiers.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword);
                    const hasDefault = varStatement.modifiers.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.DefaultKeyword);
                    return hasExport && hasDefault;
                }
                ;
            }
            ;
        }
        catch (error) {
        }
        ;
        return false;
    }
    ;
    isValidVariableStatement(variableDecl) {
        return variableDecl.parent &&
            arkanalyzer_1.ts.isVariableDeclarationList(variableDecl.parent) &&
            variableDecl.parent.parent &&
            arkanalyzer_1.ts.isVariableStatement(variableDecl.parent.parent);
    }
    ;
    /** 找到class关键字在节点中的位置*/
    findClassKeywordPosition(node) {
        try {
            // 获取原始文本
            const sourceFile = node.getSourceFile();
            const nodeStart = node.getStart();
            const nodeEnd = node.getEnd();
            const nodeText = sourceFile.text.substring(nodeStart, nodeEnd);
            const classMatch = /\bclass\b/.exec(nodeText);
            if (classMatch && classMatch.index !== -1) {
                const classKeywordStart = nodeStart + classMatch.index;
                const classKeywordEnd = classKeywordStart + 'class'.length;
                return {
                    start: classKeywordStart,
                    end: classKeywordEnd
                };
            }
            ;
            const classKeywordIndex = nodeText.indexOf('class');
            if (classKeywordIndex !== -1) {
                const classKeywordStart = nodeStart + classKeywordIndex;
                const classKeywordEnd = classKeywordStart + 'class'.length;
                return {
                    start: classKeywordStart,
                    end: classKeywordEnd
                };
            }
            ;
        }
        catch (error) {
        }
        ;
        return undefined;
    }
    ;
    getNodeLocationWithCustomPosition(node, customStart, customEnd, arkFile) {
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(customStart);
        const endPosition = sourceFile.getLineAndCharacterOfPosition(customEnd);
        return {
            line: line + 1,
            startCol: character + 1,
            endCol: endPosition.character + 1,
            filePath: arkFile.getFilePath()
        };
    }
    ;
    getNodeLocation(node, arkFile) {
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const endCharacter = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).character;
        return {
            line: line + 1,
            startCol: character + 1,
            endCol: endCharacter + 1,
            filePath: arkFile.getFilePath()
        };
    }
    ;
    areAllMembersConstructors(members) {
        const nonEmptyMembers = members.filter(member => !this.isEmptyMember(member));
        if (nonEmptyMembers.length === 0) {
            return false;
        }
        ;
        const allConstructors = nonEmptyMembers.every(member => arkanalyzer_1.ts.isConstructorDeclaration(member));
        return allConstructors;
    }
    ;
}
exports.NoExtraneousClassCheck = NoExtraneousClassCheck;
;
