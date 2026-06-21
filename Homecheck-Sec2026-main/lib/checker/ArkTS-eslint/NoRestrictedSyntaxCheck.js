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
exports.NoRestrictedSyntaxCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const compareVal = /^['"]|['"]$/g;
class NoRestrictedSyntaxCheck {
    issues = [];
    rule;
    defects = [];
    defaultOptions = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-restricted-syntax.md',
        description: 'Disallow specified syntax',
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
        this.defaultOptions = this.getDefaultOption();
        if (this.defaultOptions.length > 0) { //不配置option不做检测
            const severity = this.rule.alert ?? this.metaData.severity;
            const filePath = targetField.getFilePath();
            const myInvalidPositions = this.checkRestrictedSyntax(targetField, this.defaultOptions);
            myInvalidPositions.forEach(pos => {
                this.addIssueReport(filePath, pos, severity);
            });
        }
    };
    getDefaultOption() {
        let tmpOption = [];
        if (this.rule && this.rule.option) {
            for (let index = 0; index < this.rule.option.length; index++) {
                const element = this.rule.option[index];
                if (typeof element === 'string') {
                    tmpOption.push(element);
                }
                else {
                    const elem = element;
                    tmpOption.push({ selector: elem.selector, message: elem.message });
                }
            }
        }
        return tmpOption;
    }
    addIssueReport(filePath, pos, severity) {
        let defect = new Index_1.Defects(pos.line, pos.character, pos.endCol, pos.message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    checkRestrictedSyntax(targetField, options) {
        const errors = [];
        const rules = this.normalizeOptions(options);
        const parsedRules = rules.map(rule => this.parseRule(rule));
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        const nodeStack = [];
        const visit = (node) => {
            nodeStack.push(node);
            this.checkArrayLiteralTildeOperator(node, parsedRules, sourceFile, errors);
            this.checkNodeAgainstRules(node, parsedRules, nodeStack, sourceFile, errors);
            arkanalyzer_1.ts.forEachChild(node, visit);
            nodeStack.pop();
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, visit);
        return errors;
    }
    checkArrayLiteralTildeOperator(node, parsedRules, sourceFile, errors) {
        if (!arkanalyzer_1.ts.isArrayLiteralExpression(node)) {
            return;
        }
        const elements = node.elements;
        for (let i = 0; i < elements.length - 1; i++) {
            const currentElement = elements[i];
            const nextElement = elements[i + 1];
            if (!currentElement || !nextElement) {
                continue;
            }
            const matchingRule = this.findTildeOperatorRule(parsedRules);
            if (matchingRule) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(nextElement.getStart());
                this.addErrorForTildeOperator(errors, line, character, node, matchingRule);
            }
        }
    }
    findTildeOperatorRule(parsedRules) {
        return parsedRules.find(rule => rule.type === 'BinaryExpression' &&
            rule.attributes.some(attr => attr.path[0] === 'operatorToken' &&
                attr.path[1] === 'kind' &&
                attr.value === arkanalyzer_1.ts.SyntaxKind.TildeToken));
    }
    addErrorForTildeOperator(errors, line, character, node, rule) {
        errors.push({
            line: line + 1,
            character: character + 1,
            endCol: character + node.getText().length + 1,
            message: rule.message
        });
    }
    checkNodeAgainstRules(node, parsedRules, nodeStack, sourceFile, errors) {
        for (const rule of parsedRules) {
            if (this.shouldSkipNodeCheck(node, rule, nodeStack)) {
                continue;
            }
            if (this.matchRule(node, rule, nodeStack)) {
                this.addErrorForMatchedRule(node, rule, sourceFile, errors);
            }
        }
    }
    shouldSkipNodeCheck(node, rule, nodeStack) {
        if (rule.type === 'VariableDeclaration' &&
            nodeStack.some(n => arkanalyzer_1.ts.isCatchClause(n.parent))) {
            return true;
        }
        return false;
    }
    addErrorForMatchedRule(node, rule, sourceFile, errors) {
        const targetNode = this.getTargetNodeForError(node);
        const startPos = this.getErrorStartPosition(targetNode, rule, sourceFile);
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(startPos);
        errors.push({
            line: line + 1,
            character: character + 1,
            endCol: character + node.getText().length + 1,
            message: rule.message
        });
    }
    getTargetNodeForError(node) {
        if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
            const parent = node.parent;
            if (arkanalyzer_1.ts.isVariableDeclarationList(parent)) {
                return parent;
            }
        }
        return node;
    }
    getErrorStartPosition(node, rule, sourceFile) {
        if (rule.type === 'ClassDeclaration' && arkanalyzer_1.ts.isClassDeclaration(node) && node.name) {
            const fullText = sourceFile.getFullText();
            const classKeywordPos = fullText.indexOf('class', node.getStart());
            if (classKeywordPos !== -1) {
                return classKeywordPos;
            }
        }
        return node.getStart();
    }
    checkAttribute(node, condition) {
        const specialResult = this.checkSpecialCases(node, condition);
        if (specialResult !== undefined) {
            return specialResult;
        }
        let value = this.getValueForAttribute(node, condition);
        if (value === undefined) {
            return false;
        }
        return this.compareValues(value, condition);
    }
    checkSpecialCases(node, condition) {
        if (arkanalyzer_1.ts.isCallExpression(node) && condition.path[0] === 'arguments') {
            if (condition.path[1] === 'length') {
                return this.compareNumericValues(node.arguments.length, condition.value, condition.operator);
            }
        }
        if (arkanalyzer_1.ts.isCallExpression(node) && condition.path[0] === 'expression') {
            if (condition.path[1] === 'text') {
                return node.expression.getText() === condition.value;
            }
        }
        if (arkanalyzer_1.ts.isBreakStatement(node) && condition.path[0] === 'label') {
            return node.label !== undefined;
        }
        if (arkanalyzer_1.ts.isRegularExpressionLiteral(node) && condition.operator === '~=') {
            return condition.value.test(node.getText());
        }
        return undefined;
    }
    getValueForAttribute(node, condition) {
        if (condition.path[0] === 'operator' && arkanalyzer_1.ts.isBinaryExpression(node)) {
            return this.getBinaryExpressionOperator(node);
        }
        if (arkanalyzer_1.ts.isIdentifier(node) && condition.path[0] === 'name') {
            return node.text;
        }
        return this.traversePath(node, condition.path);
    }
    getBinaryExpressionOperator(node) {
        if (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.InKeyword) {
            return 'in';
        }
        return node.operatorToken.getText().trim();
    }
    traversePath(value, path) {
        for (const prop of path) {
            if (!(prop in value)) {
                return undefined;
            }
            value = value[prop];
        }
        return value;
    }
    compareValues(value, condition) {
        const expectedValue = typeof condition.value === 'string'
            ? condition.value.replace(compareVal, '').trim()
            : condition.value;
        const actualValue = typeof value === 'string'
            ? value.trim()
            : value;
        return actualValue === expectedValue;
    }
    compareNumericValues(actual, expected, operator) {
        switch (operator) {
            case '!=': return actual !== expected;
            case '==': return actual === expected;
            case '>': return actual > expected;
            case '>=': return actual >= expected;
            case '<': return actual < expected;
            case '<=': return actual <= expected;
            default: return false;
        }
    }
    matchRule(node, rule, stack) {
        // Handle special cases first
        const specialResult = this.handleSpecialRuleMatching(node, rule, stack);
        if (specialResult !== undefined) {
            return specialResult;
        }
        // Handle function declarations
        if (rule.type === 'FunctionDeclaration') {
            return this.matchRuleForFunctionDeclaration(node, rule, stack);
        }
        return this.matchStandardRule(node, rule, stack);
    }
    handleSpecialRuleMatching(node, rule, stack) {
        // Handle ChainExpression
        if (rule.type === 'ChainExpression') {
            return this.matchChainExpression(node);
        }
        // Handle Node type with special attributes
        if (rule.type === 'Node') {
            return this.matchNodeWithAttributes(node, rule);
        }
        return undefined;
    }
    matchChainExpression(node) {
        const isChain = arkanalyzer_1.ts.isPropertyAccessChain(node) ||
            arkanalyzer_1.ts.isElementAccessChain(node) ||
            arkanalyzer_1.ts.isCallChain(node);
        if (!isChain) {
            return false;
        }
        const parent = node.parent;
        const parentIsChain = parent && (arkanalyzer_1.ts.isPropertyAccessChain(parent) ||
            arkanalyzer_1.ts.isElementAccessChain(parent) ||
            arkanalyzer_1.ts.isCallChain(parent));
        return !parentIsChain;
    }
    matchNodeWithAttributes(node, rule) {
        // Handle :nth-child(n) selector
        if (rule.attributes.some(attr => attr.path[0] === 'index')) {
            return this.matchNthChild(node, rule);
        }
        // Handle optional chain expression
        if (rule.attributes.some(attr => attr.path[0] === 'optional' &&
            attr.value === true)) {
            return this.matchOptionalChain(node);
        }
        return false;
    }
    matchNthChild(node, rule) {
        const sourceFile = node.getSourceFile();
        const statements = sourceFile.statements;
        const targetIndex = rule.attributes.find(attr => attr.path[0] === 'index')?.value || 0;
        return statements[targetIndex] === node;
    }
    matchOptionalChain(node) {
        return arkanalyzer_1.ts.isPropertyAccessChain(node) ||
            arkanalyzer_1.ts.isElementAccessChain(node) ||
            arkanalyzer_1.ts.isCallChain(node);
    }
    matchStandardRule(node, rule, stack) {
        let currentRule = rule;
        let currentDepth = stack.length - 1;
        while (currentRule && currentDepth >= 0) {
            if (!this.matchCurrentNode(stack[currentDepth], currentRule)) {
                return false;
            }
            currentRule = currentRule.parent;
            currentDepth--;
        }
        return currentRule === null;
    }
    matchCurrentNode(currentNode, currentRule) {
        const nodeTypeName = arkanalyzer_1.ts.SyntaxKind[currentNode.kind];
        if (nodeTypeName !== currentRule.type) {
            return false;
        }
        return currentRule.attributes.every(attr => this.checkAttribute(currentNode, attr));
    }
    matchRuleForFunctionDeclaration(node, rule, stack) {
        // Find the deepest rule (first part of the rule chain)
        const firstRule = this.findDeepestRule(rule);
        // Check if the node matches the rule
        return this.checkNodeAgainstFunctionRule(node, firstRule);
    }
    findDeepestRule(rule) {
        let firstRule = rule;
        while (firstRule.parent) {
            firstRule = firstRule.parent;
        }
        return firstRule;
    }
    checkNodeAgainstFunctionRule(node, rule) {
        if (arkanalyzer_1.ts.SyntaxKind[node.kind] !== rule.type) {
            return false;
        }
        if (rule.attributes.length === 0) {
            return true;
        }
        if (arkanalyzer_1.ts.isFunctionDeclaration(node)) {
            return this.checkFunctionParameters(node, rule.attributes[0]);
        }
        return rule.attributes.every(attr => this.checkAttribute(node, attr));
    }
    checkFunctionParameters(node, attr) {
        if (attr.path[0] !== 'params' || attr.path[1] !== 'length') {
            return false;
        }
        const paramsLength = node.parameters.length;
        const expectedValue = parseInt(attr.value);
        return this.compareParameterLength(paramsLength, expectedValue, attr.operator);
    }
    compareParameterLength(actual, expected, operator) {
        switch (operator) {
            case '>':
                return actual > expected;
            case '>=':
                return actual >= expected;
            case '<':
                return actual < expected;
            case '<=':
                return actual <= expected;
            case '=':
            case '==':
                return actual === expected;
            case '!=':
                return actual !== expected;
            default:
                return false;
        }
    }
    // 在 NoRestrictedSyntaxCheck 类中添加映射表
    eslintToTsNodeMap = {
        'ArrowFunctionExpression': 'ArrowFunction',
        'BlockStatement': 'Block',
        'VariableDeclaration': 'VariableDeclaration',
        'FunctionExpression': 'FunctionExpression',
        'WithStatement': 'WithStatement',
        'BinaryExpression': 'BinaryExpression',
        'Identifier': 'Identifier',
        'VariableStatement': 'VariableStatement',
        'CatchClause': 'CatchClause',
        'Property': 'PropertyAssignment',
        'Literal': 'StringLiteral',
        'ChainExpression': 'ChainExpression',
        'BreakStatement': 'BreakStatement'
    };
    // Helper functions
    normalizeOptions(options) {
        return options.map(opt => ({
            selector: typeof opt === 'string' ? opt : opt.selector,
            message: typeof opt === 'string' ? `Using '${opt}' is not allowed.` :
                (opt.message || `Using '${opt.selector}' is not allowed.`)
        }));
    }
    parseRule(rule) {
        // 处理特殊规则
        const specialRule = this.handleSpecialRule(rule);
        if (specialRule) {
            return specialRule;
        }
        // 处理 CallExpression 的参数长度检查
        const callExpressionRule = this.handleCallExpressionRule(rule);
        if (callExpressionRule) {
            return callExpressionRule;
        }
        return this.parseStandardRule(rule);
    }
    // 处理特殊规则
    handleSpecialRule(rule) {
        // 特殊处理通配符语法
        if (rule.selector === '* ~ *') {
            return {
                type: 'BinaryExpression',
                attributes: [{
                        path: ['operatorToken', 'kind'],
                        operator: '=',
                        value: arkanalyzer_1.ts.SyntaxKind.TildeToken
                    }],
                parent: null,
                message: rule.message
            };
        }
        return null;
    }
    // 处理 CallExpression 规则
    handleCallExpressionRule(rule) {
        if (rule.selector.includes('CallExpression') && rule.selector.includes('arguments.length')) {
            const calleeName = rule.selector.match(/callee\.name='([^']+)'/)?.[1];
            const argsCondition = rule.selector.match(/arguments\.length([!<>=]+)(\d+)/);
            if (calleeName && argsCondition) {
                return {
                    type: 'CallExpression',
                    attributes: [
                        {
                            path: ['expression', 'text'],
                            operator: '=',
                            value: calleeName
                        },
                        {
                            path: ['arguments', 'length'],
                            operator: argsCondition[1],
                            value: parseInt(argsCondition[2])
                        }
                    ],
                    parent: null,
                    message: rule.message
                };
            }
        }
        return null;
    }
    // 解析标准规则
    parseStandardRule(rule) {
        // 使用正则表达式分割选择器，排除属性条件中的 '>'
        const parts = rule.selector.split(/(?![^[]*\])\s*>\s*/);
        let parent = null;
        for (let i = 0; i < parts.length; i++) {
            parent = this.processSelectorPart(parts[i], parent, rule.message);
        }
        return parent;
    }
    // 处理选择器的每个部分
    processSelectorPart(part, parent, message) {
        const [type, attributes] = this.parseSelectorPart(part);
        // 特殊处理 ChainExpression
        if (type === 'ChainExpression') {
            return {
                type,
                attributes,
                parent,
                message
            };
        }
        // 特殊处理纯属性选择器返回的 Node 类型
        if (type === 'Node') {
            return {
                type,
                attributes,
                parent,
                message
            };
        }
        return this.createParsedRule(type, attributes, parent, message);
    }
    // 创建解析后的规则
    createParsedRule(type, attributes, parent, message) {
        // 使用映射表获取 TypeScript 类型
        const tsType = this.eslintToTsNodeMap[type] || type;
        // 确保类型名称与 TypeScript AST 节点类型完全匹配
        const validType = Object.values(arkanalyzer_1.ts.SyntaxKind)
            .find(kind => typeof kind === 'string' && kind === tsType);
        if (!validType) {
            throw new Error(`Invalid node type: ${type}`);
        }
        return {
            type: tsType,
            attributes,
            parent,
            message
        };
    }
    parseSelectorPart(selector) {
        // 处理特殊选择器
        const specialResult = this.handleSpecialSelectors(selector);
        if (specialResult) {
            return specialResult;
        }
        // 解析常规选择器
        return this.parseRegularSelector(selector);
    }
    // 处理特殊选择器
    handleSpecialSelectors(selector) {
        // 处理通配符语法
        if (selector === '* ~ *') {
            return ['BinaryExpression', [{
                        path: ['operatorToken', 'kind'],
                        operator: '=',
                        value: arkanalyzer_1.ts.SyntaxKind.TildeToken
                    }]];
        }
        // 处理 :nth-child(n) 选择器
        if (selector.startsWith(':nth-child')) {
            return ['Node', [{
                        path: ['index'],
                        operator: '=',
                        value: parseInt(selector.match(/\((\d+)\)/)?.[1] || '1') - 1
                    }]];
        }
        // 处理纯属性条件的选择器
        if (selector.startsWith('[') && selector.endsWith(']')) {
            return this.parseAttributeOnlySelector(selector);
        }
        return null;
    }
    // 解析纯属性条件的选择器
    parseAttributeOnlySelector(selector) {
        const attrContent = selector.slice(1, -1);
        const [path, value] = attrContent.split('=').map(s => s.trim());
        return ['Node', [{
                    path: path.split('.'),
                    operator: '=',
                    value: value === 'true' ? true : value === 'false' ? false : value
                }]];
    }
    // 解析常规选择器
    parseRegularSelector(selector) {
        const selectorMatch = selector.match(/^([^[]+)(?:\[(.*)\])?/);
        if (!selectorMatch) {
            throw new Error(`Invalid selector: ${selector}`);
        }
        let [_, typePart, attrStr] = selectorMatch;
        const attributes = [];
        typePart = this.normalizeTypePart(typePart.trim());
        if (attrStr) {
            this.parseAttributes(attrStr, attributes);
        }
        return [typePart, attributes];
    }
    // 规范化类型部分
    normalizeTypePart(typePart) {
        if (typePart === 'Literal.key') {
            return 'StringLiteral';
        }
        else if (typePart === 'Property') {
            return 'PropertyAssignment';
        }
        else if (typePart === 'Literal') {
            return 'RegularExpressionLiteral';
        }
        return this.eslintToTsNodeMap[typePart] || typePart;
    }
    // 解析属性
    parseAttributes(attrStr, attributes) {
        // 处理单个属性名的情况
        if (/^[\w.]+$/.test(attrStr)) {
            attributes.push({
                path: attrStr.split('.'),
                operator: 'exists',
                value: true
            });
            return;
        }
        // 处理正则表达式标志
        const regexMatch = attrStr.match(/regex\.flags\s*=\s*\/(.+)\/$/);
        if (regexMatch) {
            attributes.push({
                path: ['text'],
                operator: '~=',
                value: new RegExp(`/${regexMatch[1]}$`)
            });
            return;
        }
        // 处理其他属性
        this.parseRegularAttributes(attrStr, attributes);
    }
    // 解析常规属性
    parseRegularAttributes(attrStr, attributes) {
        const attrRegex = /([\w.]+)\s*(=|!=|>=|<=|>|<|~=|in)\s*(?:'([^']*)'|"([^"]*)"|(\S+))/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
            const [_, path, op, value1, value2, value3] = attrMatch;
            const value = value1 ?? value2 ?? value3;
            attributes.push({
                path: path.split('.'),
                operator: op,
                value: this.parseValue(value, op)
            });
        }
    }
    // 增强的值解析方法
    parseValue(rawValue, operator) {
        // 处理正则表达式
        if (operator === '~=') {
            return new RegExp(rawValue);
        }
        // 处理布尔值
        if (rawValue === 'true') {
            return true;
        }
        if (rawValue === 'false') {
            return false;
        }
        // 处理null/undefined
        if (rawValue === 'null') {
            return null;
        }
        if (rawValue === 'undefined') {
            return undefined;
        }
        // 处理数字
        const numericValue = Number(rawValue);
        if (!isNaN(numericValue)) {
            return numericValue;
        }
        // 默认返回字符串
        return rawValue;
    }
}
exports.NoRestrictedSyntaxCheck = NoRestrictedSyntaxCheck;
