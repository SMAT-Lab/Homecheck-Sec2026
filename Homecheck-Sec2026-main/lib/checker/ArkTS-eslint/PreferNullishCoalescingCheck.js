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
exports.PreferNullishCoalescingCheck = void 0;
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
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PreferNullishCoalescing');
class PreferNullishCoalescingCheck {
    processedStatements = new Set();
    rule;
    defects = [];
    issues = [];
    defaultOptions = {
        ignoreConditionalTests: false,
        ignoreTernaryTests: false,
        ignoreMixedLogicalExpressions: false,
        ignorePrimitives: {
            bigint: false,
            boolean: false,
            number: false,
            string: false,
        }
    };
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/prefer-nullish-coalescing.md',
        description: 'Enforce using nullish coalescing operator instead of logical OR',
    };
    options;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchfileBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchfileBuildCb];
    }
    check = (targetField) => {
        this.options = this.rule && this.rule.option[0] ? this.rule.option[0] : this.defaultOptions;
        const classes = targetField.getClasses() ?? [];
        // 使用并行处理类
        classes.forEach(clazz => {
            // 异步处理每个类，避免阻塞主线程
            void Promise.resolve().then(() => this.getStmts(clazz));
        });
    };
    getStmts(clazz) {
        let record = new Map();
        const methods = clazz.getMethods();
        // 减少循环嵌套，使用 for...of 循环替代 forEach
        for (const method of methods) {
            const stmts = method?.getBody()?.getCfg().getStmts() ?? [];
            for (const stmt of stmts) {
                const originText = stmt.getOriginalText() ?? '';
                const position = stmt.getOriginPositionInfo();
                const key = `${position.getLineNo()}:${position.getColNo()}`;
                if (!record.has(key) && originText) {
                    // 缓存 AST 节点，避免重复解析
                    const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('', originText);
                    this.executeCheckWithCachedAST(sourceFile, stmt);
                    record.set(key, originText);
                }
            }
        }
    }
    // 优化思路：1. 提前终止不必要的递归；2. 使用尾递归优化；3. 减少重复判断。
    executeCheckWithCachedAST(sourceFile, stmt) {
        // 提取 options 到局部变量，减少属性访问
        const { ignoreTernaryTests } = this.options;
        const checkNode = (node) => {
            if (ignoreTernaryTests && !(lib_1.ts.isBinaryExpression(node) && node.operatorToken.kind === lib_1.ts.SyntaxKind.BarBarToken)) {
                return;
            }
            if (!ignoreTernaryTests && lib_1.ts.isConditionalExpression(node) && !this.isConditionalExpression(node)) {
                this.checkConditionalExpression(node, stmt);
            }
            if (lib_1.ts.isBinaryExpression(node) && node.operatorToken.kind === lib_1.ts.SyntaxKind.BarBarToken) {
                this.checkLogicalOrExpression(node, stmt);
            }
            // 尾递归优化，使用 forEach 代替递归调用
            lib_1.ts.forEachChild(node, checkNode);
        };
        lib_1.ts.forEachChild(sourceFile, checkNode);
    }
    isConditionalExpression(node) {
        let isConditional = false;
        if (lib_1.ts.isBinaryExpression(node.condition)) {
            const condition = node.condition;
            if (condition.operatorToken.kind === lib_1.ts.SyntaxKind.BarBarToken) {
                const left = condition.left;
                const right = condition.right;
                if (!lib_1.ts.isBinaryExpression(left) && !lib_1.ts.isBinaryExpression(right)) {
                    isConditional = true;
                }
            }
        }
        return isConditional;
    }
    executeCheck(originText, stmt) {
        let sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('', originText);
        const checkNode = (node) => {
            if (!this.options.ignoreTernaryTests && lib_1.ts.isConditionalExpression(node) &&
                !this.isConditionalExpression(node)) {
                this.checkConditionalExpression(node, stmt);
            }
            if (lib_1.ts.isBinaryExpression(node) && node.operatorToken.kind === lib_1.ts.SyntaxKind.BarBarToken) {
                this.checkLogicalOrExpression(node, stmt);
            }
            lib_1.ts.forEachChild(node, checkNode);
        };
        lib_1.ts.forEachChild(sourceFile, checkNode);
    }
    checkConditionalExpression(node, stmt) {
        if (this.options.ignoreTernaryTests) {
            return;
        }
        const { testNodes, operator } = this.checkCondition(node.condition);
        if (!operator) {
            return;
        }
        const { identifier, hasNull, hasUndefined } = this.validateTestNodes(testNodes, node, operator);
        if (this.shouldSkipReport(stmt, operator, identifier, hasNull, hasUndefined)) {
            return;
        }
        this.addIssueReportForTernaryTests(stmt);
    }
    checkCondition(condition) {
        if (lib_1.ts.isBinaryExpression(condition)) {
            switch (condition.operatorToken.kind) {
                case lib_1.ts.SyntaxKind.BarBarToken:
                    return this.handleLogicalOr(condition);
                case lib_1.ts.SyntaxKind.AmpersandAmpersandToken:
                    return this.handleLogicalAnd(condition);
                default:
                    return this.handleBasicBinary(condition);
            }
        }
        return { testNodes: [] };
    }
    handleLogicalOr(condition) {
        const left = condition.left;
        const right = condition.right;
        if (lib_1.ts.isBinaryExpression(left) && lib_1.ts.isBinaryExpression(right)) {
            const sameOperator = left.operatorToken.kind === right.operatorToken.kind;
            const isLeftCheck = this.isNullCheckOperator(left.operatorToken.kind) &&
                (this.isNull(left.right) || this.isUndefinedIdentifier(left.right));
            const isRightCheck = this.isNullCheckOperator(right.operatorToken.kind) &&
                (this.isNull(right.right) || this.isUndefinedIdentifier(right.right));
            if (isLeftCheck && isRightCheck && this.isSameNode(left.left, right.left) && sameOperator) {
                return {
                    testNodes: [left.left, left.right, right.left, right.right],
                    operator: lib_1.ts.SyntaxKind.EqualsEqualsToken
                };
            }
        }
        return { testNodes: [] };
    }
    handleLogicalAnd(condition) {
        const left = condition.left;
        const right = condition.right;
        if (lib_1.ts.isBinaryExpression(left) && lib_1.ts.isBinaryExpression(right)) {
            const isEqualsEqualsEqualsToken = left.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken &&
                right.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken;
            const sameOperator = left.operatorToken.kind === right.operatorToken.kind;
            const isLeftStrict = this.isStrictNullCheck(left);
            const isRightStrict = this.isStrictNullCheck(right);
            if (isLeftStrict && isRightStrict && this.isSameNode(left.left, right.left) &&
                sameOperator && !isEqualsEqualsEqualsToken) {
                const hasNullCheck = this.isNull(left.right) || this.isNull(right.right);
                const hasUndefinedCheck = this.isUndefinedIdentifier(left.right) || this.isUndefinedIdentifier(right.right);
                if (hasNullCheck && hasUndefinedCheck) {
                    return {
                        testNodes: [left.left, left.right, right.left, right.right],
                        operator: lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken
                    };
                }
            }
        }
        return { testNodes: [] };
    }
    handleBasicBinary(condition) {
        const operatorKind = condition.operatorToken.kind;
        return this.isNullCheckOperator(operatorKind) ? {
            testNodes: [condition.left, condition.right],
            operator: operatorKind
        } : { testNodes: [] };
    }
    validateTestNodes(testNodes, node, operator) {
        let identifier;
        let hasNull = false;
        let hasUndefined = false;
        for (const testNode of testNodes) {
            if (this.isNull(testNode)) {
                hasNull = true;
            }
            else if (this.isUndefinedIdentifier(testNode)) {
                hasUndefined = true;
            }
            else if (this.isMatchingIdentifier(testNode, node, operator)) {
                identifier = testNode;
            }
            else {
                break;
            }
        }
        return { identifier, hasNull, hasUndefined };
    }
    isMatchingIdentifier(testNode, node, operator) {
        return (operator === lib_1.ts.SyntaxKind.EqualsEqualsToken && this.isSameNode(testNode, node.whenFalse)) ||
            (operator === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken && this.isSameNode(testNode, node.whenFalse)) ||
            (operator === lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken && this.isSameNode(testNode, node.whenTrue)) ||
            (operator === lib_1.ts.SyntaxKind.ExclamationEqualsToken && this.isSameNode(testNode, node.whenTrue));
    }
    shouldSkipReport(stmt, operator, identifier, hasNull, hasUndefined) {
        if (this.isIncludeundefindOrNull(stmt) &&
            operator !== lib_1.ts.SyntaxKind.ExclamationEqualsToken &&
            operator !== lib_1.ts.SyntaxKind.EqualsEqualsToken &&
            identifier) {
            return (hasNull && !hasUndefined) || (hasUndefined && !hasNull);
        }
        return !identifier || (!(hasNull || hasUndefined) && !(hasNull && hasUndefined));
    }
    isIncludeundefindOrNull(stmt) {
        if (stmt instanceof lib_1.ArkIfStmt) {
            let op1Type = stmt.getConditionExpr().getOp1().getType().getTypeString();
            let op2Type = stmt.getConditionExpr().getOp2().getType().getTypeString();
            if ((op1Type.includes('undefined') && op1Type.includes('null')) ||
                (op2Type.includes('undefined') && op2Type.includes('null'))) {
                return true;
            }
        }
        return false;
    }
    checkLogicalOrExpression(node, stmt) {
        if (this.options.ignoreMixedLogicalExpressions) {
            return;
        }
        if (this.isTernaryExpression(stmt)) {
            return;
        }
        if (this.options.ignoreMixedLogicalExpressions && this.isMixedLogicalExpression(node)) {
            return;
        }
        if (this.options.ignoreConditionalTests && this.isConditionalTest(node)) {
            return;
        }
        const leftType = this.isLogicalNullOrUndefined(stmt);
        const rightType = this.isRightNotNullOrUndefind(stmt);
        if (!leftType) {
            return;
        }
        if (rightType.undefindExpress !== undefined && rightType.includeOther.includes('=')) {
            return;
        }
        this.addIssueReportForConditionalTests(stmt);
    }
    isTernaryExpression(stmt) {
        let text = stmt.getOriginalText() ?? '';
        const ternaryPattern = /^\s*([\s\S]+?)\s*\?\s*([\s\S]+?)\s*:\s*([\s\S]+)\s*$/;
        // 修改后的条件匹配规则，要求必须包含null/undefined检查
        const conditionPattern = /(\b\w+\s*(===|!==|==|!=)\s*(null|undefined)\b)(\s*\|\|\s*(\b\w+\s*(===|!==|==|!=)\s*(null|undefined)\b))+\s*\?/;
        return ternaryPattern.test(text) && conditionPattern.test(text);
    }
    isNullCheckOperator(kind) {
        return kind === lib_1.ts.SyntaxKind.EqualsEqualsToken ||
            kind === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken ||
            kind === lib_1.ts.SyntaxKind.ExclamationEqualsToken ||
            kind === lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken;
    }
    isStrictNullCheck(expr) {
        return expr.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken ||
            expr.operatorToken.kind === lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken;
    }
    isNull(node) {
        return node.kind === lib_1.ts.SyntaxKind.NullKeyword;
    }
    isUndefinedIdentifier(node) {
        return lib_1.ts.isIdentifier(node) && node.text === 'undefined';
    }
    isSameNode(a, b) {
        return a.getText() === b.getText();
    }
    isMixedLogicalExpression(node) {
        let hasOr = false;
        let hasAnd = false;
        const checkNode = (current) => {
            if (lib_1.ts.isParenthesizedExpression(current)) {
                checkNode(current.expression);
                return;
            }
            if (lib_1.ts.isBinaryExpression(current)) {
                if (current.operatorToken.kind === lib_1.ts.SyntaxKind.BarBarToken) {
                    hasOr = true;
                }
                else if (current.operatorToken.kind === lib_1.ts.SyntaxKind.AmpersandAmpersandToken) {
                    hasAnd = true;
                }
                checkNode(current.left);
                checkNode(current.right);
            }
        };
        checkNode(node);
        return hasOr && hasAnd;
    }
    isConditionalTest(node) {
        let current = node;
        const parents = new Set([node]);
        while (current.parent) {
            parents.add(current.parent);
            current = current.parent;
            if (lib_1.ts.isIfStatement(current) ||
                lib_1.ts.isWhileStatement(current) ||
                lib_1.ts.isDoStatement(current) ||
                lib_1.ts.isForStatement(current) ||
                lib_1.ts.isConditionalExpression(current)) {
                return true;
            }
            if (lib_1.ts.isArrowFunction(current) || lib_1.ts.isFunctionExpression(current)) {
                return false;
            }
        }
        return false;
    }
    isLogicalNullOrUndefined(stmt) {
        if (!(stmt instanceof lib_1.ArkAssignStmt)) {
            return false;
        }
        const rightOp = stmt.getRightOp();
        if (!(rightOp instanceof lib_1.AbstractBinopExpr)) {
            return false;
        }
        return this.checkTypesValid(rightOp);
    }
    // 新增方法：类型检查主逻辑
    checkTypesValid(expr) {
        const leftType = expr.getOp1().getType().getTypeString();
        const rightType = expr.getOp2().getType().getTypeString();
        return this.checkTypeIncludesNullUndefined(leftType) ||
            this.checkTypeIncludesNullUndefined(rightType);
    }
    isRightNotNullOrUndefind(stmt) {
        let isNotNullOrUndefind = {
            undefindExpress: '',
            includeOther: ''
        };
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            if (rightOp instanceof lib_1.ArkNormalBinopExpr) {
                let op1 = rightOp.getOp1();
                if (op1 instanceof lib_1.Local) {
                    let op1Declear = op1.getDeclaringStmt();
                    if (op1Declear instanceof lib_1.ArkAssignStmt) {
                        let op1Right = op1Declear.getRightOp();
                        isNotNullOrUndefind = {
                            undefindExpress: op1Right.getType().getTypeString(),
                            includeOther: op1Declear.getOriginalText() ?? ''
                        };
                    }
                }
            }
        }
        return isNotNullOrUndefind;
    }
    // 新增方法：单个类型检查
    checkTypeIncludesNullUndefined(typeString) {
        return !this.shouldIgnoreType(typeString) &&
            (typeString.includes('null') || typeString.includes('undefined'));
    }
    // 提取原有 shouldIgnoreType 逻辑为独立方法
    shouldIgnoreType(type) {
        return ((type.includes('string') && this.options.ignorePrimitives?.string) ||
            (type.includes('number') && this.options.ignorePrimitives?.number) ||
            (type.includes('bigint') && this.options.ignorePrimitives?.bigint) ||
            (type.includes('boolean') && this.options.ignorePrimitives?.boolean));
    }
    addIssueReportForTernaryTests(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let lineAndColLocation = stmt.getOriginPositionInfo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        let textLength = 0;
        if (stmt !== undefined && stmt.getOriginalText() !== undefined) {
            textLength = stmt.getOriginalText()?.length ?? 0;
        }
        let endCol = lineAndColLocation.getColNo() + textLength;
        let message = 'Prefer using nullish coalescing operator (`??`) instead of a ternary expression, as it is simpler to read.';
        let defects = new Defects_1.Defects(lineAndColLocation.getLineNo(), lineAndColLocation.getColNo(), endCol, message, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    addIssueReportForConditionalTests(stmt) {
        const position = stmt.getOriginPositionInfo();
        const stmtHash = `${stmt.getOriginalText()}_${position.getLineNo()}_${position.getColNo()}`;
        if (this.processedStatements.has(stmtHash)) {
            return;
        }
        this.processedStatements.add(stmtHash);
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfos = this.getLineAndColumns(stmt);
        const message = 'Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.';
        warnInfos.forEach(warnInfo => {
            const defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, message, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defect, undefined));
            DefectsList_1.RuleListUtil.push(defect);
        });
    }
    getLineAndColumns(stmt) {
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (!arkFile) {
            return [{ line: -1, startCol: -1, endCol: -1, filePath: '' }];
        }
        const baseLine = stmt.getOriginPositionInfo().getLineNo();
        const originText = stmt.getOriginalText() ?? '';
        return this.processAllLines(originText, baseLine, arkFile.getFilePath());
    }
    // 处理所有行文本
    processAllLines(text, baseLine, filePath) {
        const results = [];
        const lines = text.split('\n');
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const lineResults = this.processLine(lines[lineIndex], lineIndex, baseLine, filePath);
            results.push(...lineResults);
        }
        return results.length > 0 ? results : [{ line: -1, startCol: -1, endCol: -1, filePath: '' }];
    }
    // 处理单行文本
    processLine(lineText, lineIndex, baseLine, filePath) {
        const lineResults = [];
        let searchPos = 0;
        while ((searchPos = lineText.indexOf('||', searchPos)) !== -1) {
            const actualLine = baseLine + lineIndex;
            const startCol = searchPos + 1;
            lineResults.push({
                line: actualLine,
                startCol: startCol,
                endCol: startCol + 1,
                filePath: filePath
            });
            searchPos += 2;
        }
        return lineResults;
    }
}
exports.PreferNullishCoalescingCheck = PreferNullishCoalescingCheck;
