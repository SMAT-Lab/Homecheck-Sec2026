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
exports.SpaceInfixOpsCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
class SpaceInfixOpsCheck {
    issues = [];
    rule;
    defects = [];
    sourceFile;
    firstDealFlag = false;
    countTypeColumnFlag = 0;
    firstEqualsFlag = false;
    isConditionalTypeFlag = false;
    specialTypeAliasDeclarationFlag = false;
    defaultOptions = [
        { int32Hint: false },
    ];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/space-infix-ops.md',
        description: 'Require spacing around infix operators',
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
    /**
     * 检测代码中的 space-infix-ops 规则错误
     * @param code 需要检测的代码字符串
     * @param int32Hint 是否强制要求 |0 操作符周围有空格
     */
    checkSpaceInfixOps(targetField, int32Hint) {
        let code = targetField.getCode();
        this.sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        const errors = [];
        // 保存 this 引用，方便在内部函数中使用
        const self = this;
        arkanalyzer_1.ts.forEachChild(this.sourceFile, visitNode);
        function visitNode(node) {
            // 使用提取出的方法处理不同类型的节点
            if (self.processExpressionNodes(code, node, errors, int32Hint)) {
            }
            else if (self.processDeclarationNodes(code, node, errors, int32Hint)) {
            }
            else if (self.processTypeNodes(code, node, errors, int32Hint, visitNode)) {
            }
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        }
        return errors;
    }
    // 处理二元表达式、条件表达式和属性赋值相关节点
    processExpressionNodes(code, node, errors, int32Hint) {
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            if (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.BarToken &&
                arkanalyzer_1.ts.isNumericLiteral(node.right) && node.right.text === '0') {
                this.checkOperatorSpacing(code, '|', node.operatorToken.getStart(), node.operatorToken.getEnd(), node, true, false, errors, int32Hint);
            }
            else {
                if (node.operatorToken.kind !== arkanalyzer_1.ts.SyntaxKind.CommaToken) {
                    this.checkOperatorSpacing(code, node.operatorToken.getText(), node.operatorToken.getStart(), node.operatorToken.getEnd(), node, false, false, errors, int32Hint);
                }
            }
            return true;
        }
        else if (arkanalyzer_1.ts.isConditionalExpression(node)) {
            this.checkOperatorSpacing(code, '?', node.questionToken.getStart(), node.questionToken.getEnd(), node, false, false, errors, int32Hint);
            this.checkOperatorSpacing(code, ':', node.colonToken.getStart(), node.colonToken.getEnd(), node, false, false, errors, int32Hint);
            return true;
        }
        else if (arkanalyzer_1.ts.isBinaryExpression(node) && node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            this.checkOperatorSpacing(code, '=', node.operatorToken.getStart(), node.operatorToken.getEnd(), node, false, false, errors, int32Hint);
            return true;
        }
        else if (arkanalyzer_1.ts.isParameter(node) && node.initializer) {
            const equalsRange = code.slice(node.name.end, node.initializer.getStart());
            const equalsPos = equalsRange.indexOf('=');
            if (equalsPos !== -1) {
                const equalsStart = node.name.end + equalsPos;
                this.checkOperatorSpacing(code, '=', equalsStart, equalsStart + 1, node, false, false, errors, int32Hint);
            }
            return true;
        }
        else if (arkanalyzer_1.ts.isVariableDeclaration(node) && node.initializer) {
            const typeEnd = node.type ? node.type.getEnd() : node.name.end;
            const operatorRange = code.slice(typeEnd, node.initializer.getStart());
            const operatorPos = operatorRange.search(/=(?!>)/); // 排除=>
            if (operatorPos !== -1) {
                const equalsStart = typeEnd + operatorPos;
                this.checkOperatorSpacing(code, '=', equalsStart, equalsStart + 1, node, false, false, errors, int32Hint);
            }
            return true;
        }
        return false;
    }
    // 处理绑定元素、枚举成员、属性声明、属性签名等
    processDeclarationNodes(code, node, errors, int32Hint) {
        if (arkanalyzer_1.ts.isBindingElement(node) && node.initializer) {
            const equalsRange = code.slice(node.name.end, node.initializer.getStart());
            const equalsPos = equalsRange.indexOf('=');
            if (equalsPos !== -1) {
                const equalsStart = node.name.end + equalsPos;
                this.checkOperatorSpacing(code, '=', equalsStart, equalsStart + 1, node, false, true, errors, int32Hint); // 允许左侧换行
            }
            return true;
        }
        else if (arkanalyzer_1.ts.isEnumMember(node) && node.initializer) {
            const operatorRange = code.slice(node.name.end, node.initializer.getStart());
            const operatorPos = operatorRange.indexOf('=');
            if (operatorPos !== -1) {
                const equalsStart = node.name.end + operatorPos;
                this.checkOperatorSpacing(code, '=', equalsStart, equalsStart + 1, node, false, false, errors, int32Hint);
            }
            return true;
        }
        else if (arkanalyzer_1.ts.isPropertyDeclaration(node) && node.initializer) {
            const typeEnd = node.type ? node.type.getEnd() : node.name.end;
            const operatorRange = code.slice(typeEnd, node.initializer.getStart());
            const operatorPos = operatorRange.search(/=(?!>)/);
            if (operatorPos !== -1) {
                const equalsStart = typeEnd + operatorPos;
                this.checkOperatorSpacing(code, '=', equalsStart, equalsStart + 1, node, false, false, errors, int32Hint);
            }
            return true;
        }
        else if (arkanalyzer_1.ts.isPropertySignature(node) && node.initializer) {
            this.checkOperatorSpacing(code, '=', node.name.end, node.initializer.getStart(), node, false, false, errors, int32Hint);
            return true;
        }
        else if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
            this.handleTypeAliasDeclaration(code, node, int32Hint, errors, int32Hint);
            return true;
        }
        else if (arkanalyzer_1.ts.isConditionalTypeNode(node)) {
            const afterExtends = node.extendsType.getEnd(); // 处理条件类型中的 ? 和 :
            const questionPos = code.indexOf('?', afterExtends);
            if (questionPos !== -1) {
                this.checkOperatorSpacing(code, '?', questionPos, questionPos + 1, node, false, false, errors, int32Hint);
            }
            const afterTrueType = node.trueType.getEnd();
            const colonPos = code.indexOf(':', afterTrueType);
            if (colonPos !== -1) {
                this.checkOperatorSpacing(code, ':', colonPos, colonPos + 1, node, false, false, errors, int32Hint);
            }
            return true;
        }
        return false;
    }
    // 处理类型相关节点
    processTypeNodes(code, node, errors, int32Hint, visitNodeFn) {
        if (arkanalyzer_1.ts.isUnionTypeNode(node) || arkanalyzer_1.ts.isIntersectionTypeNode(node)) { // 对交叉类型节点的直接处理
            this.handleUnionOrIntersectionType(code, node, node, int32Hint, errors, int32Hint);
            return true;
        }
        else if (arkanalyzer_1.ts.isParenthesizedTypeNode(node)) { // 增强括号类型处理
            visitNodeFn(node.type);
            // 检查括号内可能存在的操作符（如 (A&B) 中的 &）
            this.handleParenthesizedOperators(code, node, errors, int32Hint);
            return true;
        }
        else if (arkanalyzer_1.ts.isInterfaceDeclaration(node)) { // 新增接口声明处理
            node.members.forEach(member => {
                if (arkanalyzer_1.ts.isPropertySignature(member) && member.type) {
                    this.checkNestedType(code, member.type, node, int32Hint, true, errors, int32Hint); // 特殊标记接口属性上下文
                }
            });
            return true;
        }
        return false;
    }
    // 检查操作符间距的函数
    checkOperatorSpacing(code, operator, start, end, node, isInt32Hint = false, allowLeftNewline = false, errors, int32Hint) {
        // 处理特殊情况：bar2| 0（左侧无空格，右侧有空格）
        if (isInt32Hint && operator === '|') {
            this.handleInt32HintOperator(code, start, end, node, allowLeftNewline, errors, int32Hint, operator);
            // 如果启用int32Hint并且是|0操作，则允许无空格
            if (int32Hint) {
                return;
            }
        }
        // 排除箭头函数的等号（=>）
        if (operator === '=' && code.slice(end, end + 1) === '>') {
            return;
        }
        const textBefore = code.slice(Math.max(0, start - 1), start);
        const textAfter = code.slice(end, end + 1);
        const validBefore = allowLeftNewline ?
            /[\s\r\n]/.test(textBefore) :
            /^[ \t]$/.test(textBefore);
        // 增加特殊字符过滤
        const validAfter = operator === ':' ? /[\s\r\n]/.test(textAfter) :
            /[\s\r\n]/.test(textAfter) && !/[.,;)]/.test(textAfter);
        if (!validBefore || !validAfter) {
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
            errors.push({
                line: line + 1,
                character: character + 1,
                endCol: character + node.getText().length + 1,
                message: `Operator '${operator}' must be spaced.`,
                node: node,
                optionValue: int32Hint
            });
        }
    }
    // 处理int32Hint操作符的特殊情况
    handleInt32HintOperator(code, start, end, node, allowLeftNewline, errors, int32Hint, operator) {
        // 检查是否是 bar| 0 这种模式
        const textBefore = code.slice(Math.max(0, start - 1), start);
        const textAfter = code.slice(end, end + 2); // 获取两个字符，包括可能的空格和0
        // 检测 "| 0" 模式（右侧有空格）
        if (/^\s0/.test(textAfter)) {
            // 如果左侧没有空格但右侧有空格，报错
            const validBefore = allowLeftNewline ?
                /[\s\r\n]/.test(textBefore) :
                /^[ \t]$/.test(textBefore);
            if (!validBefore) {
                const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
                errors.push({
                    line: line + 1,
                    character: character + 1,
                    endCol: character + node.getText().length + 1,
                    message: `Operator '${operator}' must be spaced.`,
                    node: node,
                    optionValue: int32Hint
                });
            }
        }
    }
    // 统一处理联合/交叉类型操作符
    handleUnionOrIntersectionType(code, typeNode, node, optionValue, errors, int32Hint) {
        const operator = arkanalyzer_1.ts.isUnionTypeNode(typeNode) ? '|' : '&';
        // 处理首字符操作符检测
        this.checkFirstTypeOperator(code, typeNode, node, operator, errors, int32Hint);
        // 处理类型之间的操作符
        this.checkBetweenTypesOperators(code, typeNode, node, operator, optionValue, errors);
    }
    // 检查首字符操作符的间距
    checkFirstTypeOperator(code, typeNode, node, operator, errors, int32Hint) {
        if (typeNode.types.length <= 0) {
            return;
        }
        const firstType = typeNode.types[0];
        const startPos = typeNode.getStart();
        const firstTypeStart = firstType.getStart();
        const leadingRange = code.slice(startPos, firstTypeStart);
        if (leadingRange.includes(operator)) {
            const opStart = startPos + leadingRange.indexOf(operator);
            this.checkOperatorSpacing(code, operator, opStart, opStart + 1, node, false, true, errors, int32Hint);
        }
    }
    // 检查类型之间操作符的间距
    checkBetweenTypesOperators(code, typeNode, node, operator, optionValue, errors) {
        for (let index = 1; index < typeNode.types.length; index++) {
            this.checkTypesPairOperator(code, typeNode.types[index - 1], typeNode.types[index], node, operator, optionValue, errors);
        }
    }
    // 检查一对类型之间的操作符
    checkTypesPairOperator(code, prevType, currentType, node, operator, optionValue, errors) {
        const startSearchPos = prevType.getEnd();
        const endSearchPos = currentType.getStart();
        const operatorRange = code.slice(startSearchPos, endSearchPos);
        // 使用正则精准定位操作符
        const match = this.findOperatorMatch(operatorRange, operator);
        if (match) {
            this.validateOperatorSpacing(code, match, startSearchPos, operator, node, optionValue, errors);
        }
    }
    // 查找操作符的匹配
    findOperatorMatch(operatorRange, operator) {
        const operatorRegex = new RegExp(String.raw `(\S*)${operator}(\S*)`);
        return operatorRange.match(operatorRegex);
    }
    // 验证操作符的间距并添加错误
    validateOperatorSpacing(code, match, startSearchPos, operator, node, optionValue, errors) {
        const operatorPos = match.index + match[0].indexOf(operator);
        const opStart = startSearchPos + operatorPos;
        const opEnd = opStart + 1;
        // 检查右侧空格
        const textAfter = code.slice(opEnd, opEnd + 1);
        const validAfter = /[\s\r\n]/.test(textAfter);
        if (!validAfter) {
            this.addOperatorSpacingError(opStart, node, operator, optionValue, errors);
        }
    }
    // 添加操作符间距错误
    addOperatorSpacingError(opStart, node, operator, optionValue, errors) {
        const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(opStart);
        errors.push({
            line: line + 1,
            character: character + 1,
            endCol: character + node.getText().length + 1,
            message: `Operator '${operator}' must be spaced.`,
            node: node,
            optionValue: optionValue
        });
    }
    // 带上下文处理方法
    handleUnionOrIntersectionTypeWithContext(code, typeNode, isInterfaceContext, node, optionValue, errors, int32Hint) {
        const operator = arkanalyzer_1.ts.isUnionTypeNode(typeNode) ? '|' : '&';
        typeNode.types.forEach((type, index) => {
            if (index === 0) {
                return;
            }
            const prevType = typeNode.types[index - 1];
            const startSearchPos = prevType.getEnd();
            const endSearchPos = type.getStart();
            const operatorRange = code.slice(startSearchPos, endSearchPos);
            const operatorPos = operatorRange.indexOf(operator);
            if (operatorPos === -1) {
                return;
            }
            const opStart = startSearchPos + operatorPos;
            const opEnd = opStart + 1;
            // 接口属性特殊规则：左侧必须空格（不允许换行）
            const textBefore = code[opStart - 1] || '';
            const textAfter = code[opEnd] || '';
            const validBefore = isInterfaceContext ? textBefore === ' ' : /[\s\r\n]/.test(textBefore);
            const validAfter = /[\s\r\n]/.test(textAfter);
            if (!validBefore || !validAfter) {
                const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(opStart);
                errors.push({
                    line: line + 1,
                    character: character + 1,
                    endCol: character + node.getText().length + 1,
                    message: `Operator '${operator}' must be spaced.`,
                    node: node,
                    optionValue: int32Hint
                });
            }
        });
    }
    // 处理接口中的联合或交叉类型
    handleUnionOrIntersectionTypeForInterface(code, typeNode, node, optionValue, errors) {
        const operator = arkanalyzer_1.ts.isUnionTypeNode(typeNode) ? '|' : '&';
        // 处理每个类型节点之间的操作符
        typeNode.types.forEach((type, index) => {
            if (index === 0) {
                return;
            }
            const prevType = typeNode.types[index - 1];
            const startSearchPos = prevType.getEnd();
            const endSearchPos = type.getStart();
            const operatorRange = code.slice(startSearchPos, endSearchPos);
            // 精确查找操作符位置
            const operatorPos = operatorRange.indexOf(operator);
            if (operatorPos === -1) {
                return;
            }
            const opStart = startSearchPos + operatorPos;
            const opEnd = opStart + 1;
            // 获取操作符前后字符（包含换行符处理）
            const textBefore = code.slice(opStart - 1, opStart);
            const textAfter = code.slice(opEnd, opEnd + 1);
            // 特殊处理接口属性中的联合类型（强制要求左侧空格）
            const isInterfaceContext = typeNode.parent?.parent?.kind === arkanalyzer_1.ts.SyntaxKind.PropertySignature;
            const allowLeftNewline = !isInterfaceContext; // 接口属性中不允许左侧换行代替空格
            // 验证规则： 1. 左侧：允许换行或空格（接口属性中不允许换行） 2. 右侧：必须空格或换行
            const validBefore = allowLeftNewline ?
                /[\s\r\n]/.test(textBefore) :
                textBefore === ' ';
            const validAfter = /[\s\r\n]/.test(textAfter);
            if (!validBefore || !validAfter) {
                const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(opStart);
                errors.push({
                    line: line + 1,
                    character: character + 1,
                    endCol: character + node.getText().length + 1,
                    message: `Operator '${operator}' must be spaced.`,
                    node: node,
                    optionValue: optionValue
                });
            }
        });
    }
    // 递归检测方法
    checkNestedType(code, typeNode, node, optionValue, isInterfaceContext = false, errors, int32Hint) {
        if (arkanalyzer_1.ts.isUnionTypeNode(typeNode)) {
            this.handleUnionOrIntersectionTypeWithContext(code, typeNode, isInterfaceContext, node, optionValue, errors, int32Hint);
            typeNode.types.forEach(t => this.checkNestedType(code, t, node, optionValue, isInterfaceContext, errors, int32Hint));
        }
        else if (arkanalyzer_1.ts.isIntersectionTypeNode(typeNode)) {
            this.handleUnionOrIntersectionTypeForInterface(code, typeNode, node, optionValue, errors);
            typeNode.types.forEach(t => this.checkNestedType(code, t, node, optionValue, isInterfaceContext, errors, int32Hint));
        }
        else if (arkanalyzer_1.ts.isParenthesizedTypeNode(typeNode)) {
            this.checkNestedType(code, typeNode.type, node, optionValue, isInterfaceContext, errors, int32Hint);
        }
    }
    // 处理类型别名声明
    handleTypeAliasDeclaration(code, node, optionValue, errors, int32Hint) {
        const typeNode = node.type;
        const operatorRange = code.slice(node.name.end, typeNode.getStart());
        const operatorPos = operatorRange.indexOf('=');
        if (operatorPos !== -1) {
            const equalsStart = node.name.end + operatorPos;
            this.checkOperatorSpacing(code, '=', equalsStart, equalsStart + 1, node, false, false, errors, int32Hint);
        }
        // 增强：处理嵌套的联合/交叉类型
        if (arkanalyzer_1.ts.isUnionTypeNode(typeNode) || arkanalyzer_1.ts.isIntersectionTypeNode(typeNode)) {
            this.handleUnionOrIntersectionType(code, typeNode, node, optionValue, errors, int32Hint);
        }
        if (arkanalyzer_1.ts.isUnionTypeNode(typeNode) || arkanalyzer_1.ts.isIntersectionTypeNode(typeNode)) {
            typeNode.types.forEach((type, index) => {
                if (index === 0) {
                    return;
                }
                const prevType = typeNode.types[index - 1];
                const operator = arkanalyzer_1.ts.isUnionTypeNode(typeNode) ? '|' : '&';
                const operatorRange = code.slice(prevType.getEnd(), type.getStart());
                const operatorPos = operatorRange.indexOf(operator);
                if (operatorPos !== -1) {
                    const opStart = prevType.getEnd() + operatorPos;
                    this.checkOperatorSpacing(code, operator, opStart, opStart + 1, node, false, false, errors, int32Hint);
                }
            });
        }
    }
    // 处理括号内的操作符（如 (A&B)）
    handleParenthesizedOperators(code, node, errors, int32Hint) {
        // 跳过已被联合/交叉类型处理的括号
        if (arkanalyzer_1.ts.isUnionTypeNode(node.parent) || arkanalyzer_1.ts.isIntersectionTypeNode(node.parent)) {
            return;
        }
        const fullText = node.getText().slice(1, -1); // 去除外围括号
        const operators = ['|', '&'];
        operators.forEach(op => {
            let pos = -1;
            while ((pos = fullText.indexOf(op, pos + 1)) !== -1) {
                // 计算在源代码中的绝对位置
                const absolutePos = node.getStart() + pos + 1; // +1 跳过开括号
                this.checkOperatorSpacing(code, op, absolutePos, absolutePos + 1, node, false, false, errors, int32Hint);
            }
        });
    }
    check = (targetField) => {
        this.defaultOptions = this.rule && this.rule.option && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = targetField.getFilePath();
        const myInvalidPositions = this.checkSpaceInfixOps(targetField, this.defaultOptions[0].int32Hint);
        const myInvalidPositionsNew = this.sortMyInvalidPositions(myInvalidPositions);
        myInvalidPositionsNew.forEach(pos => {
            this.addIssueReport(filePath, pos, severity);
        });
    };
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
    // 创建修复对象 
    ruleFix(pos, end, optionValue) {
        let textStr = '';
        let textNew = this.sourceFile.getFullText().slice(pos, end);
        textStr = textNew.trim();
        textStr = ' ' + textStr + ' ';
        return { range: [pos, end], text: textStr };
    }
    ruleFixForTypeColumn(pos, end, optionValue) {
        let textStr = '';
        let textNew = this.sourceFile.getFullText().slice(pos, end);
        textStr = textNew.trim();
        textStr = textStr + ' ';
        return { range: [pos, end], text: textStr };
    }
    ruleFixForConditionalTypeNode(pos, end, optionValue) {
        let textStr = '';
        let textNew = this.sourceFile.getFullText().slice(pos, end);
        textStr = textNew.trim();
        textStr = ' ' + textStr;
        return { range: [pos, end], text: textStr };
    }
    addIssueReport(filePath, pos, severity) {
        let defect = new Index_1.Defects(pos.line, pos.character, pos.endCol, pos.message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = this.getFixForNode(pos.node, pos.optionValue);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getFixForNode(node, optionValue) {
        return this.getExpressionFix(node, optionValue) ||
            this.getDeclarationFix(node, optionValue) ||
            this.getTypeFix(node, optionValue);
    }
    getExpressionFix(node, optionValue) {
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            return this.handleBinaryExpressionFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isConditionalExpression(node)) {
            return this.handleConditionalExpressionFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isPropertyAssignment(node)) {
            return this.handlePropertyAssignmentFix(node, optionValue);
        }
        return undefined;
    }
    getDeclarationFix(node, optionValue) {
        if (arkanalyzer_1.ts.isParameter(node) && node.initializer) {
            return this.handleParameterInitializerFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isEnumMember(node) && node.initializer) {
            return this.handleEnumMemberInitializerFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isVariableDeclaration(node) && node.initializer) {
            return this.handleVariableDeclarationFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isBindingElement(node) && node.initializer) {
            return this.handleBindingElementFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isPropertyDeclaration(node) && node.initializer) {
            return this.handlePropertyDeclarationFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isPropertySignature(node) && node.initializer) {
            return this.handlePropertySignatureFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
            return this.handleTypeAliasDeclarationFix(node, optionValue);
        }
        return undefined;
    }
    getTypeFix(node, optionValue) {
        if (arkanalyzer_1.ts.isConditionalTypeNode(node)) {
            return this.handleConditionalTypeNodeFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isUnionTypeNode(node) || arkanalyzer_1.ts.isIntersectionTypeNode(node)) {
            return this.handleUnionOrIntersectionTypeFix(node, optionValue);
        }
        else if (arkanalyzer_1.ts.isInterfaceDeclaration(node)) {
            return this.handleInterfaceDeclarationFix(node, optionValue);
        }
        return undefined;
    }
    handleBinaryExpressionFix(node, optionValue) {
        const stPos = node.left.end;
        const stEnd = node.right.end - node.right.getText().length;
        return this.ruleFix(stPos, stEnd, optionValue);
    }
    handleConditionalExpressionFix(node, optionValue) {
        const stPos = node.condition.end;
        const stEnd = node.whenTrue.end - node.whenTrue.getText().length;
        let qTextStr = this.sourceFile.getFullText().slice(stPos, stEnd);
        let qNewTextStr = ' ' + qTextStr.trim() + ' ';
        let stFenPos = node.whenTrue.end;
        let stFenEnd = node.whenFalse.end - node.whenFalse.getText().length;
        if (qTextStr === qNewTextStr || this.firstDealFlag) {
            this.firstDealFlag = false;
            return this.ruleFix(stFenPos, stFenEnd, optionValue);
        }
        else {
            this.firstDealFlag = true;
            return this.ruleFix(stPos, stEnd, optionValue);
        }
    }
    handlePropertyAssignmentFix(node, optionValue) {
        const stPos = node.name.end;
        const stEnd = node.initializer.end - node.initializer.getText().length;
        return this.ruleFix(stPos, stEnd, optionValue);
    }
    handleParameterInitializerFix(node, optionValue) {
        if (arkanalyzer_1.ts.isParameter(node) && node.initializer) {
            const stPos = node.name.end;
            const stEnd = node.initializer.end - node.initializer.getText().length;
            return this.ruleFix(stPos, stEnd, optionValue);
        }
        return undefined;
    }
    handleEnumMemberInitializerFix(node, optionValue) {
        if (arkanalyzer_1.ts.isEnumMember(node) && node.initializer) {
            const stPos = node.name.end;
            const stEnd = node.initializer.end - node.initializer.getText().length;
            return this.ruleFix(stPos, stEnd, optionValue);
        }
        return undefined;
    }
    handleVariableDeclarationFix(node, optionValue) {
        if (arkanalyzer_1.ts.isVariableDeclaration(node) && node.initializer) {
            const stPos = node.name.end;
            const stEnd = node.initializer.end - node.initializer.getText().length;
            return this.ruleFix(stPos, stEnd, optionValue);
        }
        return undefined;
    }
    handleBindingElementFix(node, optionValue) {
        if (arkanalyzer_1.ts.isBindingElement(node) && node.initializer) {
            const stPos = node.name.end;
            const stEnd = node.initializer.end - node.initializer.getText().length;
            return this.ruleFix(stPos, stEnd, optionValue);
        }
        return undefined;
    }
    handlePropertyDeclarationFix(node, optionValue) {
        if (arkanalyzer_1.ts.isPropertyDeclaration(node) && node.initializer) {
            const stPos = node.type ? node.type.end : node.name.end;
            const stEnd = node.initializer.end - node.initializer.getText().length;
            return this.ruleFix(stPos, stEnd, optionValue);
        }
        return undefined;
    }
    handlePropertySignatureFix(node, optionValue) {
        const stPos = node.name.end;
        const stEnd = node.type ? node.type.pos : node.name.end;
        return this.ruleFix(stPos, stEnd, optionValue);
    }
    handleTypeAliasDeclarationFix(node, optionValue) {
        if (!node.type) {
            return undefined;
        }
        const stPos = node.name.end;
        const stEnd = node.type.end - node.type.getText().length;
        let textStr = this.sourceFile.getFullText().slice(stPos, stEnd);
        let textNewStr = ' ' + textStr.trim() + ' ';
        if (textStr === textNewStr || this.firstEqualsFlag) {
            return this.handleTypeAliasWithEqualSpace(node, optionValue);
        }
        else if (textStr.includes('=\r\n')) {
            return this.handleTypeAliasWithNewline(node, optionValue);
        }
        else {
            return this.handleTypeAliasWithoutEqualSpace(node, optionValue);
        }
    }
    handleTypeAliasWithEqualSpace(node, optionValue) {
        let typeNode = node.type;
        if (!arkanalyzer_1.ts.isUnionTypeNode(typeNode) && !arkanalyzer_1.ts.isIntersectionTypeNode(typeNode)) {
            return undefined;
        }
        if (typeNode.types.length === 2) {
            return this.handleTypeAliasTwoTypes(typeNode, optionValue);
        }
        else if (typeNode.types.length === 3) {
            return this.handleTypeAliasThreeTypes(typeNode, optionValue);
        }
        return undefined;
    }
    handleTypeAliasTwoTypes(typeNode, optionValue) {
        const prevType = typeNode.types[0];
        const nextType = typeNode.types[1];
        const operator = arkanalyzer_1.ts.isUnionTypeNode(typeNode) ? '|' : '&';
        let operatorStrNew = ' ' + operator + ' ';
        let textNew = this.sourceFile.getFullText().slice(prevType.getEnd(), nextType.getStart());
        if (operatorStrNew !== textNew) {
            this.firstEqualsFlag = false;
            return this.ruleFix(prevType.getEnd(), nextType.getStart(), optionValue);
        }
        return undefined;
    }
    handleTypeAliasThreeTypes(typeNode, optionValue) {
        const prevType = typeNode.types[0];
        const nextType = typeNode.types[1];
        const lastType = typeNode.types[2];
        const operator = arkanalyzer_1.ts.isUnionTypeNode(typeNode) ? '|' : '&';
        let operatorStrNew = operator + ' ';
        let firstTextStr = this.sourceFile.getFullText().slice(typeNode.getStart(), prevType.getStart());
        let secondTextStr = this.sourceFile.getFullText().slice(prevType.getEnd(), nextType.getStart());
        let threeTextStr = this.sourceFile.getFullText().slice(nextType.getEnd(), lastType.getStart());
        let operatorStrLastNew = ' ' + operator + ' ';
        if (firstTextStr === '') {
            return this.handleTypeAliasThreeTypesEmptyFirst(prevType, nextType, lastType, secondTextStr, threeTextStr, operatorStrLastNew, optionValue);
        }
        else {
            return this.handleTypeAliasThreeTypesWithFirst(typeNode, prevType, nextType, lastType, firstTextStr, secondTextStr, threeTextStr, operatorStrNew, operatorStrLastNew, optionValue);
        }
    }
    handleTypeAliasThreeTypesEmptyFirst(prevType, nextType, lastType, secondTextStr, threeTextStr, operatorStrLastNew, optionValue) {
        if (this.countTypeColumnFlag === 0 && secondTextStr !== '' && secondTextStr !== operatorStrLastNew) {
            let operatorStart = prevType.getEnd();
            let operatorEnd = nextType.getStart();
            this.countTypeColumnFlag = 2;
            return this.ruleFix(operatorStart, operatorEnd, optionValue);
        }
        else if (this.countTypeColumnFlag === 2 && threeTextStr !== '' && threeTextStr !== operatorStrLastNew) {
            let operatorStart = nextType.getEnd();
            let operatorEnd = lastType.getStart();
            this.countTypeColumnFlag = 0;
            this.firstEqualsFlag = false;
            return this.ruleFix(operatorStart, operatorEnd, optionValue);
        }
        return undefined;
    }
    handleTypeAliasThreeTypesWithFirst(typeNode, prevType, nextType, lastType, firstTextStr, secondTextStr, threeTextStr, operatorStrNew, operatorStrLastNew, optionValue) {
        if (firstTextStr !== operatorStrNew && this.countTypeColumnFlag === 0) {
            this.countTypeColumnFlag = 1;
            return this.ruleFixForTypeColumn(typeNode.getStart(), prevType.getStart(), optionValue);
        }
        else if (this.countTypeColumnFlag === 1 && secondTextStr !== '' && secondTextStr !== operatorStrLastNew) {
            let operatorStart = prevType.getEnd();
            let operatorEnd = nextType.getStart();
            this.countTypeColumnFlag = 2;
            return this.ruleFix(operatorStart, operatorEnd, optionValue);
        }
        else if (this.countTypeColumnFlag === 2 && threeTextStr !== '' && threeTextStr !== operatorStrLastNew) {
            let operatorStart = nextType.getEnd();
            let operatorEnd = lastType.getStart();
            this.countTypeColumnFlag = 0;
            this.firstEqualsFlag = false;
            this.specialTypeAliasDeclarationFlag = false;
            return this.ruleFix(operatorStart, operatorEnd, optionValue);
        }
        return undefined;
    }
    handleTypeAliasWithNewline(node, optionValue) {
        let typeNode = node.type;
        if (arkanalyzer_1.ts.isUnionTypeNode(typeNode) || arkanalyzer_1.ts.isIntersectionTypeNode(typeNode)) {
            if (typeNode.types.length > 0) {
                const firstType = typeNode.types[0];
                const startPos = typeNode.getStart();
                const firstTypeStart = firstType.getStart();
                const leadingRange = this.sourceFile.getFullText().slice(startPos, firstTypeStart);
                let leadingRangeNew = leadingRange.trim() + ' ';
                if (leadingRange !== leadingRangeNew) {
                    return this.ruleFixForTypeColumn(startPos, firstTypeStart, optionValue);
                }
            }
        }
        return undefined;
    }
    handleTypeAliasWithoutEqualSpace(node, optionValue) {
        const typeNode = node.type;
        if (!arkanalyzer_1.ts.isUnionTypeNode(typeNode) && !arkanalyzer_1.ts.isIntersectionTypeNode(typeNode)) {
            return undefined;
        }
        if (typeNode.types.length === 2) {
            return this.handleTypeAliasWithoutEqualSpaceTwoTypes(node, typeNode, optionValue);
        }
        else if (typeNode.types.length > 2) {
            return this.handleTypeAliasWithoutEqualSpaceMultiTypes(node, typeNode, optionValue);
        }
        return undefined;
    }
    handleTypeAliasWithoutEqualSpaceTwoTypes(node, typeNode, optionValue) {
        const prevType = typeNode.types[0];
        const nextType = typeNode.types[1];
        const operator = arkanalyzer_1.ts.isUnionTypeNode(typeNode) ? '|' : '&';
        let operatorStrNew = ' ' + operator + ' ';
        let textNew = this.sourceFile.getFullText().slice(prevType.getEnd(), nextType.getStart());
        if (operatorStrNew !== textNew) {
            this.firstEqualsFlag = true;
            return undefined;
        }
        else {
            this.firstEqualsFlag = false;
            let equTextStr = this.sourceFile.getFullText().slice(node.name.end, typeNode.getStart());
            let equTextNewStr = ' ' + equTextStr.trim() + ' ';
            if (equTextStr !== equTextNewStr) {
                return this.ruleFix(node.name.end, typeNode.getStart(), optionValue);
            }
        }
        return undefined;
    }
    handleTypeAliasWithoutEqualSpaceMultiTypes(node, typeNode, optionValue) {
        if (typeNode.types.length < 3) {
            return undefined;
        }
        const prevType = typeNode.types[0];
        const nextType = typeNode.types[1];
        const lastType = typeNode.types[2];
        let equTextStr = this.sourceFile.getFullText().slice(node.name.end, typeNode.getStart());
        let equTextNewStr = ' ' + equTextStr.trim() + ' ';
        let firstTextStr = this.sourceFile.getFullText().slice(typeNode.getStart(), prevType.getStart());
        let secondTextStr = this.sourceFile.getFullText().slice(prevType.getEnd(), nextType.getStart());
        let threeTextStr = this.sourceFile.getFullText().slice(nextType.getEnd(), lastType.getStart());
        let x = firstTextStr.trim() + ' ';
        let y = ' ' + secondTextStr.trim() + ' ';
        let z = ' ' + threeTextStr.trim() + ' ';
        if (equTextStr !== equTextNewStr && !this.specialTypeAliasDeclarationFlag) {
            return this.handleMultiTypesEqualsCheck(node, typeNode, firstTextStr, secondTextStr, threeTextStr, x, y, z, optionValue);
        }
        else {
            return this.handleMultiTypesSpacingCheck(typeNode, prevType, nextType, lastType, firstTextStr, secondTextStr, threeTextStr, y, z, optionValue);
        }
    }
    handleMultiTypesEqualsCheck(node, typeNode, firstTextStr, secondTextStr, threeTextStr, x, y, z, optionValue) {
        if (firstTextStr !== '') {
            if (firstTextStr !== x || secondTextStr !== y || threeTextStr !== z) {
                this.specialTypeAliasDeclarationFlag = true;
            }
            else {
                this.specialTypeAliasDeclarationFlag = false;
            }
        }
        else {
            if (secondTextStr !== y || threeTextStr !== z) {
                this.specialTypeAliasDeclarationFlag = true;
            }
            else {
                this.specialTypeAliasDeclarationFlag = false;
            }
        }
        return this.ruleFix(node.name.end, typeNode.getStart(), optionValue);
    }
    handleMultiTypesSpacingCheck(typeNode, prevType, nextType, lastType, firstTextStr, secondTextStr, threeTextStr, y, z, optionValue) {
        const operator = arkanalyzer_1.ts.isUnionTypeNode(typeNode) ? '|' : '&';
        let operatorStrNew = ' ' + operator + ' ';
        if (firstTextStr !== '') {
            return this.handleMultiTypesWithFirstText(typeNode, prevType, nextType, lastType, firstTextStr, secondTextStr, threeTextStr, operatorStrNew, optionValue);
        }
        else {
            return this.handleMultiTypesWithEmptyFirst(prevType, nextType, lastType, secondTextStr, threeTextStr, y, z, optionValue);
        }
    }
    handleMultiTypesWithFirstText(typeNode, prevType, nextType, lastType, firstTextStr, secondTextStr, threeTextStr, operatorStrNew, optionValue) {
        if (firstTextStr !== operatorStrNew && this.countTypeColumnFlag === 0) {
            this.countTypeColumnFlag = 1;
            return this.ruleFixForTypeColumn(typeNode.getStart(), prevType.getStart(), optionValue);
        }
        else if (this.countTypeColumnFlag === 1 && secondTextStr !== '' && secondTextStr !== operatorStrNew) {
            let operatorStart = prevType.getEnd();
            let operatorEnd = nextType.getStart();
            this.countTypeColumnFlag = 2;
            return this.ruleFix(operatorStart, operatorEnd, optionValue);
        }
        else if (this.countTypeColumnFlag === 2 && threeTextStr !== '' && threeTextStr !== operatorStrNew) {
            let operatorStart = nextType.getEnd();
            let operatorEnd = lastType.getStart();
            this.countTypeColumnFlag = 0;
            this.firstEqualsFlag = false;
            this.specialTypeAliasDeclarationFlag = false;
            return this.ruleFix(operatorStart, operatorEnd, optionValue);
        }
        return undefined;
    }
    handleMultiTypesWithEmptyFirst(prevType, nextType, lastType, secondTextStr, threeTextStr, y, z, optionValue) {
        if (this.countTypeColumnFlag === 0 && secondTextStr !== '' && secondTextStr !== y) {
            let operatorStart = prevType.getEnd();
            let operatorEnd = nextType.getStart();
            this.countTypeColumnFlag = 2;
            return this.ruleFix(operatorStart, operatorEnd, optionValue);
        }
        else if (this.countTypeColumnFlag === 2 && threeTextStr !== '' && threeTextStr !== z) {
            let operatorStart = nextType.getEnd();
            let operatorEnd = lastType.getStart();
            this.countTypeColumnFlag = 0;
            this.firstEqualsFlag = false;
            this.specialTypeAliasDeclarationFlag = false;
            return this.ruleFix(operatorStart, operatorEnd, optionValue);
        }
        return undefined;
    }
    handleConditionalTypeNodeFix(node, optionValue) {
        const stPos = node.extendsType.getEnd();
        const stEnd = node.trueType.getStart();
        let queStr = this.sourceFile.getFullText().slice(stPos, stEnd);
        if (!queStr.includes('?\r\n') && !queStr.startsWith('\r\n')) {
            return this.handleSimpleConditionalType(node, queStr, optionValue);
        }
        else if (queStr.startsWith('\r\n')) {
            return this.handleNewlineStartConditionalType(node, optionValue);
        }
        else {
            return this.handleMidNewlineConditionalType(node, queStr, optionValue);
        }
    }
    handleSimpleConditionalType(node, queStr, optionValue) {
        let queNewStr = ' ' + queStr.trim() + ' ';
        let stStart = node.trueType.getEnd();
        let stLast = node.falseType.getStart();
        let maoStr = this.sourceFile.getFullText().slice(stStart, stLast);
        let maoNewStr = ' ' + maoStr.trim() + ' ';
        if (queStr !== queNewStr && !this.isConditionalTypeFlag) {
            if (maoStr !== maoNewStr) {
                this.isConditionalTypeFlag = true;
            }
            else {
                this.isConditionalTypeFlag = false;
            }
            return this.ruleFix(node.extendsType.getEnd(), node.trueType.getStart(), optionValue);
        }
        else {
            if (maoStr !== maoNewStr) {
                this.isConditionalTypeFlag = false;
                return this.ruleFix(stStart, stLast, optionValue);
            }
        }
        return undefined;
    }
    handleNewlineStartConditionalType(node, optionValue) {
        let speStartPos = node.extendsType.getEnd();
        let speTrueStart = node.trueType.getStart();
        let speTrueEnd = node.trueType.getEnd();
        let speFalseStart = node.falseType.getStart();
        let aStr = this.sourceFile.getFullText().slice(speStartPos, speTrueStart);
        let bStr = this.sourceFile.getFullText().slice(speTrueEnd, speFalseStart);
        if (aStr.startsWith('\r\n') && aStr.endsWith('?') && !this.isConditionalTypeFlag) {
            this.isConditionalTypeFlag = true;
            return this.ruleFixForTypeColumn(speTrueStart - 1, speTrueStart, optionValue);
        }
        else if (bStr.startsWith(':') && bStr.includes('\r\n')) {
            this.isConditionalTypeFlag = false;
            return this.ruleFixForConditionalTypeNode(speTrueEnd, speTrueEnd + 1, optionValue);
        }
        return undefined;
    }
    handleMidNewlineConditionalType(node, queStr, optionValue) {
        let xPos = node.extendsType.getEnd();
        let stStart = node.trueType.getEnd();
        let stLast = node.falseType.getStart();
        let maoStr = this.sourceFile.getFullText().slice(stStart, stLast);
        if (!queStr.startsWith(' ') && !this.isConditionalTypeFlag) {
            if (maoStr !== ' ' + maoStr.trim() + ' ') {
                this.isConditionalTypeFlag = true;
            }
            else {
                this.isConditionalTypeFlag = false;
            }
            return this.ruleFixForConditionalTypeNode(xPos, xPos + 1, optionValue);
        }
        else {
            return this.handleMidNewlineColonFix(node, maoStr, optionValue);
        }
    }
    handleMidNewlineColonFix(node, maoStr, optionValue) {
        let maoNewStr = ' ' + maoStr.trim() + ' ';
        if (maoStr !== maoNewStr && !maoStr.includes('\r\n')) {
            this.isConditionalTypeFlag = false;
            return this.ruleFix(node.trueType.getEnd(), node.falseType.getStart(), optionValue);
        }
        else {
            let topMaoFlag = maoStr.startsWith(':');
            if (!maoStr.includes('\r\n')) {
                this.isConditionalTypeFlag = false;
                return this.ruleFixForConditionalTypeNode(node.trueType.getEnd(), node.falseType.getStart(), optionValue);
            }
            else {
                if (topMaoFlag) {
                    this.isConditionalTypeFlag = false;
                    return this.ruleFix(node.trueType.getEnd(), node.trueType.getEnd() + 1, optionValue);
                }
                else {
                    this.isConditionalTypeFlag = false;
                    return this.ruleFixForTypeColumn(node.falseType.getStart() - 1, node.falseType.getStart(), optionValue);
                }
            }
        }
    }
    handleUnionOrIntersectionTypeFix(node, optionValue) {
        if (node.types.length > 1) {
            const firstType = node.types[0];
            const nextType = node.types[1];
            const leadingRange = this.sourceFile.getFullText().slice(firstType.getEnd(), nextType.getStart());
            let leadingRangeNew = ' ' + leadingRange.trim() + ' ';
            if (leadingRange !== leadingRangeNew) {
                return this.ruleFix(firstType.getEnd(), nextType.getStart(), optionValue);
            }
        }
        return undefined;
    }
    handleInterfaceDeclarationFix(node, optionValue) {
        for (const member of node.members) {
            if (arkanalyzer_1.ts.isPropertySignature(member) && member.type && arkanalyzer_1.ts.isUnionTypeNode(member.type)) {
                const fix = this.handleInterfacePropertyUnionTypeFix(member.type, optionValue);
                if (fix) {
                    return fix;
                }
            }
        }
        return undefined;
    }
    handleInterfacePropertyUnionTypeFix(typeNode, optionValue) {
        for (let index = 1; index < typeNode.types.length; index++) {
            const prevType = typeNode.types[index - 1];
            const currentType = typeNode.types[index];
            const startPos = prevType.getEnd();
            const endPos = currentType.getStart();
            const operatorRange = this.sourceFile.getFullText().slice(startPos, endPos);
            let operatorRangeNew = ' ' + operatorRange.trim() + ' ';
            let beFlag = operatorRange.startsWith(' ');
            let afFlag = operatorRange.endsWith(' ');
            if (operatorRange !== operatorRangeNew && !beFlag && afFlag) {
                return this.ruleFix(startPos, endPos, optionValue);
            }
            else if (operatorRange !== operatorRangeNew && beFlag && !afFlag) {
                return this.ruleFix(startPos, endPos, optionValue);
            }
        }
        return undefined;
    }
}
exports.SpaceInfixOpsCheck = SpaceInfixOpsCheck;
