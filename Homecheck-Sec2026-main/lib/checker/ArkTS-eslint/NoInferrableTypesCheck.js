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
exports.NoInferrableTypesCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
class NoInferrableTypesCheck {
    issues = [];
    rule;
    defects = [];
    sourceFile;
    defaultOptions = [
        { ignoreParameters: false, ignoreProperties: false },
    ];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-inferrable-types.md',
        description: 'Disallow explicit type declarations for variables or parameters initialized to a number, string, or boolean',
    };
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (targetField) => {
        const targetName = targetField.getName();
        if (targetName && this.getFileExtension(targetName) === ".ets") {
            return;
        }
        this.defaultOptions = this.rule && this.rule.option && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = targetField.getFilePath();
        const myInvalidPositions = this.checkNoInferrableTypes(targetField, this.defaultOptions);
        const myInvalidPositionsNew = this.sortMyInvalidPositions(myInvalidPositions);
        myInvalidPositionsNew.forEach(pos => {
            this.addIssueReport(filePath, pos, severity);
        });
    };
    getFileExtension(filePath) {
        const lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return '';
        }
        return filePath.substring(lastDotIndex);
    }
    // 对错误位置进行排序并去重
    sortMyInvalidPositions(myInvalidPositions) {
        // 1. 先进行排序
        myInvalidPositions.sort((a, b) => a.line - b.line || a.character - b.character);
        // 2. 使用 reduce 进行去重
        const uniqueArrays = myInvalidPositions.reduce((acc, current) => {
            const lastItem = acc[acc.length - 1];
            // 检查是否与最后一个元素的三要素相同
            if (!lastItem ||
                lastItem.line !== current.line ||
                lastItem.character !== current.character ||
                lastItem.message !== current.message) {
                acc.push(current);
            }
            return acc;
        }, []);
        return uniqueArrays;
    }
    checkNoInferrableTypes(targetField, options) {
        this.sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        const errors = [];
        const visit = (node, options) => {
            // 检查变量声明
            if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
                let error1 = this.isVariableDeclarationFun(node, this.sourceFile);
                errors.push(...error1);
            }
            // 检查函数参数默认值
            if (arkanalyzer_1.ts.isParameter(node) && node.type && node.initializer) {
                let error2 = this.isParameterTypeFun(node, options, this.sourceFile);
                errors.push(...error2);
            }
            // 检查类属性
            if (arkanalyzer_1.ts.isPropertyDeclaration(node) && node.type && node.initializer) {
                let error3 = this.isPropertyDeclarationFun(node, options, this.sourceFile);
                errors.push(...error3);
            }
            arkanalyzer_1.ts.forEachChild(node, (child) => visit(child, options));
        };
        visit(this.sourceFile, options);
        return errors;
    }
    isPropertyDeclarationFun(node, options, sourceFile) {
        const errors = [];
        if (arkanalyzer_1.ts.isPropertyDeclaration(node) && node.type && node.initializer) {
            /// 新增：跳过可选属性或 readonly 属性（如 a?: number = 5 或 readonly a = 5）
            if (node.questionToken || node.modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword)) {
                return [];
            }
            if (options && options[0] && options[0].ignoreProperties) {
                return []; // 忽略属性检查
            }
            const inferredType = this.getInferredType(node.initializer);
            if (inferredType && node.type.getText(sourceFile) === inferredType) {
                // 获取属性的真实起始位置（考虑修饰符）
                const propertyStart = node.modifiers && node.modifiers.length > 0
                    ? node.modifiers[0].getStart() // 使用第一个修饰符的起始位置
                    : node.name.getStart(); // 如果没有修饰符，使用属性名的起始位置
                const propertyStartPos = sourceFile.getLineAndCharacterOfPosition(propertyStart);
                errors.push({
                    line: propertyStartPos.line + 1,
                    character: propertyStartPos.character + 1,
                    endCol: propertyStartPos.character + node.getText().length + 1,
                    message: `Type ${inferredType} trivially inferred from a ${inferredType} literal, remove type annotation.`,
                    node: node,
                    optionType: options[0].ignoreProperties
                });
            }
        }
        return errors;
    }
    isParameterTypeFun(node, options, sourceFile) {
        const errors = [];
        // 检查函数参数默认值
        if (arkanalyzer_1.ts.isParameter(node) && node.type && node.initializer) {
            if (options && options[0] && options[0].ignoreParameters) {
                return []; // 忽略参数检查
            }
            const inferredType = this.getInferredType(node.initializer);
            if (inferredType && node.type.getText(sourceFile) === inferredType) {
                // 获取参数名的起始位置
                const parameterNameStart = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
                errors.push({
                    line: parameterNameStart.line + 1,
                    character: parameterNameStart.character + 1,
                    endCol: parameterNameStart.character + node.getText().length + 1,
                    message: `Type ${inferredType} trivially inferred from a ${inferredType} literal, remove type annotation.`,
                    node: node,
                    optionType: options[0].ignoreParameters
                });
            }
        }
        return errors;
    }
    isVariableDeclarationFun(node, sourceFile) {
        const errors = [];
        if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
            const type = node.type;
            const initializer = node.initializer;
            if (type && initializer) {
                // 如果初始值可以直接推断出类型，则提示冗余的类型注解
                const inferredType = this.getInferredType(initializer);
                if (inferredType && type.getText(sourceFile) === inferredType) {
                    // 获取变量名的起始位置
                    const variableNameStart = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
                    errors.push({
                        line: variableNameStart.line + 1,
                        character: variableNameStart.character + 1,
                        endCol: variableNameStart.character + node.getText().length + 1,
                        message: `Type ${inferredType} trivially inferred from a ${inferredType} literal, remove type annotation.`,
                        node: node,
                        optionType: false
                    });
                }
            }
        }
        return errors;
    }
    // 获取初始值的推断类型
    getInferredType(node) {
        let result = this.getInferredFirstType(node);
        if (result) {
            return result;
        }
        else {
            let rerultOther = this.getInferredOtherType(node);
            if (rerultOther) {
                return rerultOther;
            }
            else {
                let rerultFinal = this.getInferredFinalType(node);
                if (rerultFinal) {
                    return rerultFinal;
                }
                else {
                    return null;
                }
            }
        }
    }
    getInferredFirstType(node) {
        // 新增：处理 null 关键字（通过 kind 判断）
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword) {
            return 'null';
        }
        // 新增：处理正则表达式字面量
        if (arkanalyzer_1.ts.isRegularExpressionLiteral(node)) {
            return 'RegExp';
        }
        // 处理 Symbol 构造函数（关键优化）
        if (arkanalyzer_1.ts.isCallExpression(node) && arkanalyzer_1.ts.isIdentifier(node.expression)) {
            if (node.expression.text === 'Symbol') {
                // 检查参数是否存在（如 Symbol('a') 或 Symbol()）
                return 'symbol';
            }
        }
        if (arkanalyzer_1.ts.isNumericLiteral(node)) {
            return 'number';
        }
        if (arkanalyzer_1.ts.isStringLiteral(node) || arkanalyzer_1.ts.isTemplateLiteral(node)) {
            return 'string';
        }
        // 处理 boolean 类型
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword || node.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword) {
            return 'boolean';
        }
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(node) && node.operator === arkanalyzer_1.ts.SyntaxKind.ExclamationToken) {
            return 'boolean'; // 处理 !0、!1 等逻辑非表达式
        }
        if (arkanalyzer_1.ts.isIdentifier(node) && (node.text === 'true' || node.text === 'false')) {
            return 'boolean';
        }
        return null;
    }
    getInferredOtherType(node) {
        // 处理其他类型
        if (arkanalyzer_1.ts.isBigIntLiteral(node)) {
            return 'bigint';
        }
        if (arkanalyzer_1.ts.isIdentifier(node) && node.text === 'null') {
            // 注意：这里只处理作为标识符的 null（如变量名），null字面量已通过 NullKeyword 处理
            return 'null';
        }
        if (arkanalyzer_1.ts.isIdentifier(node) && node.text === 'undefined') {
            return 'undefined';
        }
        if (arkanalyzer_1.ts.isNewExpression(node) && arkanalyzer_1.ts.isIdentifier(node.expression)) {
            if (node.expression.text === 'Boolean') {
                return 'boolean';
            }
            if (node.expression.text === 'RegExp') {
                return 'RegExp';
            }
        }
        return null;
    }
    getInferredFinalType(node) {
        if (arkanalyzer_1.ts.isCallExpression(node) && arkanalyzer_1.ts.isIdentifier(node.expression)) {
            if (node.expression.text === 'BigInt') {
                return 'bigint';
            }
            if (node.expression.text === 'Boolean') {
                return 'boolean';
            }
            if (node.expression.text === 'Number') {
                return 'number';
            }
            if (node.expression.text === 'String') {
                return 'string';
            }
        }
        if (arkanalyzer_1.ts.isIdentifier(node) && (node.text === 'Infinity' || node.text === 'NaN')) {
            return 'number';
        }
        if (arkanalyzer_1.ts.isVoidExpression(node)) {
            return 'undefined';
        }
        // 强制统一返回小写 'symbol'（与代码注解匹配）
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.SymbolKeyword) {
            return 'symbol';
        }
        return null;
    }
    // 创建修复对象 
    ruleFix(pos, end) {
        let textStr = '';
        return { range: [pos, end], text: textStr };
    }
    addIssueReport(filePath, pos, severity) {
        let defect = new Index_1.Defects(pos.line, pos.character, pos.endCol, pos.message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = undefined;
        let stPos;
        let stEnd;
        if (arkanalyzer_1.ts.isVariableDeclaration(pos.node) || arkanalyzer_1.ts.isParameter(pos.node) || arkanalyzer_1.ts.isPropertyDeclaration(pos.node)) {
            stPos = pos.node.name.end; // 变量名后的位置
            stEnd = pos.node.type?.getEnd() ?? stPos; // 等号前的位置
            fix = this.ruleFix(stPos, stEnd);
        }
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoInferrableTypesCheck = NoInferrableTypesCheck;
