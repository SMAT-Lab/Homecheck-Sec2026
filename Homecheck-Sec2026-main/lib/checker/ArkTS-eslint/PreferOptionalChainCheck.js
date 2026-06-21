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
exports.PreferOptionalChainCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const FixUtils_1 = require("../../utils/common/FixUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PreferOptionalChainCheck');
class PreferOptionalChainCheck {
    defaultOptions = [
        {
            checkAny: true,
            checkUnknown: true,
            checkString: true,
            checkNumber: true,
            checkBoolean: true,
            checkBigInt: true,
            requireNullish: false,
            allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing: false,
        },
    ];
    rule;
    defects = [];
    issues = [];
    sourceFile;
    diagnostics = [];
    variableTypes = new Map();
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/prefer-optional-chain.md',
        description: `Prefer using an optional chain expression instead, as it's more concise and easier to read.`,
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    executeNode(node) {
        this.checkNestedLogicalOr(node); // 新增嵌套检查
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            this.checkLogicalExpression(node, this.variableTypes);
        }
        arkanalyzer_1.ts.forEachChild(node, n => {
            this.executeNode(n);
        });
    }
    ;
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (targetField) => {
        this.defaultOptions = this.getOption();
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = targetField.getFilePath();
        const classes = targetField.getClasses();
        let record = new Map();
        classes.forEach(clazz => {
            const methods = clazz.getMethods();
            methods.forEach(method => {
                this.execute(method, record, filePath, severity, targetField);
            });
        });
    };
    execute(method, record, filePath, severity, targetField) {
        const stmts = method?.getBody()?.getCfg().getStmts() ?? [];
        stmts.forEach(stmt => {
            const originText = stmt.getOriginalText() ?? '';
            const position = stmt.getOriginPositionInfo();
            const key = `${position.getLineNo()}:${position.getColNo()}`;
            if (!record.has(key) && originText && (originText.includes('&&') || originText.includes('||'))) {
                this.executeCheck(originText, filePath, severity, stmt, targetField);
                record.set(key, originText);
            }
        });
    }
    executeCheck(code, filePath, severity, stmt, arkFile) {
        const myInvalidPositions = this.checkOptionalChain(code, arkFile);
        this.filterResult(myInvalidPositions, filePath, severity, stmt, arkFile);
    }
    filterResult(myInvalidPositions, filePath, severity, stmt, arkFile) {
        let map = new Map();
        myInvalidPositions.forEach((pos) => {
            const key = `${pos.startLine}:${pos.startColumn}`;
            if (map.has(key)) {
                const fixMessage = map.get(key)?.fixMessage ?? '';
                const currFixMessage = pos.fixMessage ?? '';
                if (currFixMessage.length > fixMessage.length) {
                    map.set(key, pos);
                }
            }
            else {
                map.set(key, pos);
            }
        });
        map.forEach((pos) => {
            pos.fixMessage += pos.suffix ?? '';
            if (pos.errorType === 'always') {
                pos.fixRange = undefined;
                this.addIssueReport(filePath, pos, severity, stmt, arkFile);
            }
            else {
                this.executeReport(pos, filePath, severity, stmt, arkFile);
            }
        });
    }
    executeReport(pos, filePath, severity, stmt, arkFile) {
        const config = this.defaultOptions[0];
        if (!config.requireNullish) {
            if (config.checkAny && pos.errorType === 'any') {
                this.addIssueReport(filePath, pos, severity, stmt, arkFile);
            }
            else if (config.checkString) {
                this.executeOtherReport(pos, config, filePath, severity, stmt, arkFile);
            }
        }
    }
    executeOtherReport(pos, config, filePath, severity, stmt, arkFile) {
        if (pos.errorType === 'string') {
            if (!config.allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing) {
                pos.fixRange = undefined;
            }
            this.addIssueReport(filePath, pos, severity, stmt, arkFile);
        }
        if (config.checkUnknown && pos.errorType === 'unknown') {
            this.addIssueReport(filePath, pos, severity, stmt, arkFile);
        }
        else if (config.checkBigInt && pos.errorType === 'bigint') {
            if (!config.allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing) {
                pos.fixRange = undefined;
            }
            this.addIssueReport(filePath, pos, severity, stmt, arkFile);
        }
        else if (config.checkNumber && pos.errorType === 'number') {
            if (!config.allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing) {
                pos.fixRange = undefined;
            }
            this.addIssueReport(filePath, pos, severity, stmt, arkFile);
        }
    }
    addIssueReport(filePath, pos, severity, stmt, arkFile) {
        const startLine = pos.startLine + stmt.getOriginPositionInfo().getLineNo() - 1;
        const startCol = pos.startColumn + (pos.startLine === 1 ? (stmt.getOriginPositionInfo().getColNo() - 1) : 0);
        const description = `Prefer using an optional chain expression instead, as it's more concise and easier to read.`;
        const ruleFix = this.createFix(pos, stmt, arkFile);
        const fixable = ruleFix !== undefined;
        const defect = new Defects_1.Defects(startLine, startCol, startCol, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, fixable);
        this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    createFix(pos, stmt, arkFile) {
        if (pos.fixRange) {
            const startVerify = FixUtils_1.FixUtils.getRangeStart(arkFile, stmt);
            return { range: [pos.fixRange.start + startVerify, pos.fixRange.end + startVerify], text: pos.fixMessage ?? '' };
        }
        return undefined;
    }
    getOption() {
        let option;
        if (this.rule && this.rule.option) {
            option = this.rule.option;
            if (option[0]) {
                if (option[0]?.allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing === undefined) {
                    option[0].allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing = false;
                }
                if (option[0]?.checkAny === undefined) {
                    option[0].checkAny = true;
                }
                if (option[0]?.checkUnknown === undefined) {
                    option[0].checkUnknown = true;
                }
                if (option[0]?.checkString === undefined) {
                    option[0].checkString = true;
                }
                if (option[0]?.checkNumber === undefined) {
                    option[0].checkNumber = true;
                }
                if (option[0]?.checkBoolean === undefined) {
                    option[0].checkBoolean = true;
                }
                if (option[0]?.checkBigInt === undefined) {
                    option[0].checkBigInt = true;
                }
                if (option[0]?.requireNullish === undefined) {
                    option[0].requireNullish = false;
                }
                return option;
            }
        }
        return this.defaultOptions;
    }
    getTypeText(typeNode, sourceFile) {
        if (arkanalyzer_1.ts.isUnionTypeNode(typeNode)) {
            return typeNode.types[0].getText(sourceFile);
        }
        return typeNode.getText(sourceFile);
    }
    getErrorType(identifier, variableTypes) {
        return variableTypes.get(identifier.text) || 'any';
    }
    addDiagnostic(node, errorType, fixMessage, fixRange, suffix) {
        const start = node.getStart(this.sourceFile);
        const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
        const diagnostic = {
            startLine: line + 1,
            startColumn: character + 1,
            errorType,
        };
        if (fixMessage && fixRange) {
            diagnostic.fixRange = { start: fixRange[0], end: fixRange[1] };
            diagnostic.fixMessage = fixMessage;
            diagnostic.suffix = suffix;
        }
        this.diagnostics.push(diagnostic);
    }
    checkLogicalExpression(node, variableTypes) {
        if (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandToken) {
            this.checkLogicalAnd(node, variableTypes);
        }
        else if (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.BarBarToken) {
            this.checkLogicalOr(node, variableTypes);
            this.checkLogicalOr1(node, variableTypes);
        }
    }
    checkLogicalAnd(node, variableTypes) {
        const chain = this.flattenLogicalAnd(node);
        if (chain.length < 2) {
            return;
        }
        // 检查是否连续的属性访问链
        let isValid = true;
        for (let i = 1; i < chain.length; i++) {
            const prev = chain[i - 1];
            const current = chain[i];
            if (!this.isPropertyAccessChain(prev, current)) {
                isValid = false;
                break;
            }
        }
        if (isValid) {
            const fixMessage = this.buildOptionalChain(chain);
            if (fixMessage) {
                this.addReport(chain, node, fixMessage);
            }
            return;
        }
        // 检查每个单独的 && 表达式
        let current = node;
        while (arkanalyzer_1.ts.isBinaryExpression(current) && current.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandToken) {
            const left = current.left;
            const right = current.right;
            if (this.isReplaceableRight(left, right)) {
                const fixMessage = this.buildRightReplacement(left, right);
                if (fixMessage) {
                    const start = current.getStart(this.sourceFile);
                    const end = current.getEnd();
                    this.addDiagnostic(current, this.getErrorTypeForExpression(left, variableTypes), fixMessage, [start, end]);
                }
            }
            current = current.left;
        }
    }
    addReport(chain, node, fixMessage) {
        const last = chain[chain.length - 1];
        let suffix = '';
        if (arkanalyzer_1.ts.isBinaryExpression(last)) {
            const left = this.buildOptionalChain([last.left]);
            if (left) {
                const right = `${last.operatorToken.getText(this.sourceFile)} ${last.right.getText(this.sourceFile)}`;
                if (this.isNullOrUndefined(right)) {
                    suffix = ` ${last.operatorToken.getText(this.sourceFile)} ${last.right.getText(this.sourceFile)}`;
                }
            }
        }
        const start = node.getStart(this.sourceFile);
        const end = node.getEnd();
        this.addDiagnostic(node, 'any', fixMessage, [start, end], suffix);
    }
    buildRightReplacement1(left, right) {
        // 解包逻辑非表达式
        const unwrappedLeft = this.unwrapLogicalNot(left);
        const unwrappedRight = this.unwrapLogicalNot(right);
        // 生成可选链核心部分
        let coreReplacement;
        if (arkanalyzer_1.ts.isPropertyAccessExpression(unwrappedRight)) {
            coreReplacement = `${unwrappedLeft?.getText(this.sourceFile)}?.${unwrappedRight.name.text}`;
        }
        else if (arkanalyzer_1.ts.isElementAccessExpression(unwrappedRight)) {
            const index = unwrappedRight.argumentExpression.getText(this.sourceFile);
            coreReplacement = `${unwrappedLeft?.getText(this.sourceFile)}?.[${index}]`;
        }
        else if (arkanalyzer_1.ts.isCallExpression(unwrappedRight)) {
            coreReplacement = `${unwrappedLeft?.getText(this.sourceFile)}?.()`;
        }
        // 保留外层的逻辑非
        if (coreReplacement) {
            const hasLeftNot = arkanalyzer_1.ts.isPrefixUnaryExpression(left);
            const hasRightNot = arkanalyzer_1.ts.isPrefixUnaryExpression(right);
            return (hasLeftNot || hasRightNot) ? `!${coreReplacement}` : coreReplacement;
        }
        return undefined;
    }
    isReplaceableRight1(left, right) {
        // 解包逻辑非表达式
        const unwrappedLeft = this.unwrapLogicalNot(left);
        const unwrappedRight = this.unwrapLogicalNot(right);
        // 核心逻辑：检查右侧表达式是否基于左侧表达式的属性链
        if (arkanalyzer_1.ts.isPropertyAccessExpression(unwrappedRight) &&
            this.areEquivalent(unwrappedRight.expression, unwrappedLeft)) {
            return true;
        }
        if (arkanalyzer_1.ts.isElementAccessExpression(unwrappedRight) &&
            this.areEquivalent(unwrappedRight.expression, unwrappedLeft)) {
            return true;
        }
        if (arkanalyzer_1.ts.isCallExpression(unwrappedRight) &&
            this.areEquivalent(unwrappedRight.expression, unwrappedLeft)) {
            return true;
        }
        return false;
    }
    checkLogicalOr1(node, variableTypes) {
        let current = node;
        while (arkanalyzer_1.ts.isBinaryExpression(current) && current.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.BarBarToken) {
            const left = current.left;
            const right = current.right;
            // 关键修改：直接检查左右表达式的关系，不依赖 flatten 链
            if (this.isReplaceableRight1(left, right)) {
                const fixMessage = this.buildRightReplacement1(left, right);
                if (fixMessage) {
                    const start = current.getStart(this.sourceFile);
                    const end = current.getEnd();
                    this.addDiagnostic(current, this.getErrorTypeForExpression(this.unwrapLogicalNot(left), variableTypes), fixMessage, [start, end]);
                }
            }
            current = current.left; // 继续向左侧递归检测
        }
    }
    checkLogicalOr(node, variableTypes) {
        let current = node;
        while (arkanalyzer_1.ts.isBinaryExpression(current) && current.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.BarBarToken) {
            const left = current.left;
            const right = current.right;
            // 关键修改：直接检查左右表达式的关系，不依赖 flatten 链
            if (this.isReplaceableRight(left, right)) {
                const fixMessage = this.buildRightReplacement(left, right);
                if (fixMessage) {
                    const start = current.getStart(this.sourceFile);
                    const end = current.getEnd();
                    this.addDiagnostic(current, this.getErrorTypeForExpression(this.unwrapLogicalNot(left), variableTypes), fixMessage, [start, end]);
                }
            }
            current = current.left; // 继续向左侧递归检测
        }
    }
    getErrorTypeForExpression(expr, variableTypes) {
        if (arkanalyzer_1.ts.isIdentifier(expr)) {
            return this.getErrorType(expr, variableTypes);
        }
        else if (arkanalyzer_1.ts.isPropertyAccessExpression(expr)) {
            return this.getErrorTypeForExpression(expr.expression, variableTypes);
        }
        return 'any';
    }
    buildRightReplacement(left, right) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(right)) {
            return `${left.getText(this.sourceFile)}?.${right.name.text}`;
        }
        else if (arkanalyzer_1.ts.isElementAccessExpression(right)) {
            const index = right.argumentExpression.getText(this.sourceFile);
            return `${left.getText(this.sourceFile)}?.[${index}]`;
        }
        else if (arkanalyzer_1.ts.isCallExpression(right)) {
            const expr = right.expression;
            if (arkanalyzer_1.ts.isPropertyAccessExpression(expr)) {
                return `${left.getText(this.sourceFile)}?.${expr.name.text}()`;
            }
            else if (arkanalyzer_1.ts.isElementAccessExpression(expr)) {
                const index = expr.argumentExpression.getText(this.sourceFile);
                return `${left.getText(this.sourceFile)}?.[${index}]()`;
            }
            else if (this.areEquivalent(expr, left)) {
                return `${left.getText(this.sourceFile)}?.()`;
            }
        }
        else if (arkanalyzer_1.ts.isBinaryExpression(right)) {
            const leftReplacement = this.buildRightReplacement(left, right.left);
            if (leftReplacement) {
                return `${leftReplacement} ${right.operatorToken.getText(this.sourceFile)} ${right.right.getText(this.sourceFile)}`;
            }
        }
        return undefined;
    }
    isReplaceableRight(left, right) {
        // 处理属性访问：a && a.b
        if (arkanalyzer_1.ts.isPropertyAccessExpression(right) && this.areEquivalent(right.expression, left)) {
            return true;
        }
        // 处理元素访问：a && a['b']
        if (arkanalyzer_1.ts.isElementAccessExpression(right) && this.areEquivalent(right.expression, left)) {
            return true;
        }
        // 处理方法调用：a && a.method()
        if (arkanalyzer_1.ts.isCallExpression(right)) {
            const expr = right.expression;
            // 检查调用表达式的主体是否与 left 一致（如 a.method() 中的 a.method）
            if ((arkanalyzer_1.ts.isPropertyAccessExpression(expr) ||
                arkanalyzer_1.ts.isElementAccessExpression(expr)) && this.areEquivalent(expr.expression, left)) {
                return true;
            }
            // 直接调用：a && a()
            if (this.areEquivalent(expr, left)) {
                return true;
            }
        }
        // 处理空值检查：a && a.b != null
        if (arkanalyzer_1.ts.isBinaryExpression(right) && this.isNullCheck(right)) {
            const leftExpr = right.left;
            if ((arkanalyzer_1.ts.isPropertyAccessExpression(leftExpr) ||
                arkanalyzer_1.ts.isElementAccessExpression(leftExpr) ||
                arkanalyzer_1.ts.isCallExpression(leftExpr)) && this.areEquivalent(leftExpr.expression, left)) {
                return true;
            }
        }
        return false;
    }
    isNullCheck(node) {
        const nullUndefined = [arkanalyzer_1.ts.SyntaxKind.NullKeyword, arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword];
        return (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken ||
            node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken ||
            node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken ||
            node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
            (nullUndefined.includes(node.right.kind) || nullUndefined.includes(node.left.kind));
    }
    flattenLogicalAnd(node) {
        const chain = [];
        while (arkanalyzer_1.ts.isBinaryExpression(node) && node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandToken) {
            chain.unshift(node.right);
            node = node.left;
        }
        chain.unshift(node);
        return chain;
    }
    isPropertyAccessChain(prev, current) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(current) && this.areEquivalent(current.expression, prev)) {
            return true;
        }
        if (arkanalyzer_1.ts.isElementAccessExpression(current) && this.areEquivalent(current.expression, prev)) {
            return true;
        }
        if (arkanalyzer_1.ts.isCallExpression(current) && this.areEquivalent(current.expression, prev)) {
            return true;
        }
        const code = current.getText(this.sourceFile).trim();
        if (arkanalyzer_1.ts.isBinaryExpression(current)) {
            // 检查 right.left 是否是 PropertyAccessExpression、ElementAccessExpression 或 CallExpression
            const right = `${current.operatorToken.getText(this.sourceFile)} ${current.right.getText(this.sourceFile)}`;
            if (this.isNullCheckAndCodeCheck(current, code)) {
                if (arkanalyzer_1.ts.isPropertyAccessExpression(current.left) && this.areEquivalent(current.left.expression, prev)) {
                    return true;
                }
                if (arkanalyzer_1.ts.isElementAccessExpression(current.left) && this.areEquivalent(current.left.expression, prev)) {
                    return true;
                }
                if (arkanalyzer_1.ts.isCallExpression(current.left) && this.areEquivalent(current.left.expression, prev)) {
                    return true;
                }
            }
        }
        return false;
    }
    isNullCheckAndCodeCheck(current, code) {
        return this.isNullCheck(current) ||
            code.endsWith('!= undefined') ||
            code.endsWith('!== undefined') ||
            code.endsWith('!= null') ||
            code.endsWith('!== null');
    }
    buildOptionalChain(chain) {
        let result = chain[0].getText(this.sourceFile);
        for (let i = 1; i < chain.length; i++) {
            const expr = chain[i];
            const preExpr = chain[i - 1];
            if (arkanalyzer_1.ts.isPropertyAccessExpression(expr)) {
                const curr = expr.getText(this.sourceFile);
                let pre = chain[i - 1].getText(this.sourceFile);
                if (arkanalyzer_1.ts.isBinaryExpression(preExpr)) {
                    pre = this.buildOptionalChain([preExpr.left]) ?? '';
                }
                const nail = curr.substring(curr.indexOf(pre) + pre.length);
                if (nail) {
                    result += `${nail.startsWith('?') ? '' : '?'}${nail.startsWith('[') ? '.' : ''}${nail}`;
                }
            }
            else if (arkanalyzer_1.ts.isElementAccessExpression(expr)) {
                const index = expr.argumentExpression.getText(this.sourceFile);
                result += `?.[${index}]`;
            }
            else if (arkanalyzer_1.ts.isCallExpression(expr)) {
                const curr = expr.getText(this.sourceFile);
                const pre = chain[i - 1].getText(this.sourceFile);
                const nail = curr.substring(curr.indexOf(pre) + pre.length);
                result += `${nail === '()' ? '?.()' : `${nail.startsWith('?') ? '' : '?'}${nail.startsWith('[') ? '.' : ''}${nail}`}`;
            }
            else if (arkanalyzer_1.ts.isBinaryExpression(expr)) {
                const left = this.buildOptionalChain([expr.left]);
                if (left) {
                    result = this.executeBinaryExpression(expr, left, chain, i, preExpr, result);
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        }
        return result;
    }
    executeBinaryExpression(expr, left, chain, i, preExpr, result) {
        const right = `${expr.operatorToken.getText(this.sourceFile)} ${expr.right.getText(this.sourceFile)}`;
        if (this.isNullOrUndefined(right)) {
            const curr = left;
            let pre = chain[i - 1].getText(this.sourceFile);
            if (arkanalyzer_1.ts.isBinaryExpression(preExpr)) {
                pre = this.buildOptionalChain([preExpr.left]) ?? '';
            }
            const nail = curr.substring(curr.indexOf(pre) + pre.length);
            if (nail) {
                result += `${nail.startsWith('?') ? '' : '?'}${nail.startsWith('[') ? '.' : ''}${nail}`;
            }
        }
        else {
            result = `${left} ${expr.operatorToken.getText(this.sourceFile)} ${expr.right.getText(this.sourceFile)}`;
        }
        return result;
    }
    isNullOrUndefined(right) {
        return right === '!= null' || right === '!== null' || right === '!= undefined' || right === '!== undefined';
    }
    areEquivalent(a, b) {
        const aText = a.getText(this.sourceFile);
        let bText = b.getText(this.sourceFile);
        const aParentText = a.parent.getText(this.sourceFile);
        if (bText.trim().endsWith('!= null')) {
            bText = bText.trim().substring(0, bText.trim().length - 7).trim();
        }
        else if (bText.trim().endsWith('!=null')) {
            bText = bText.trim().substring(0, bText.trim().length - 6).trim();
        }
        else if (bText.trim().endsWith('!== undefined')) {
            bText = bText.trim().substring(0, bText.trim().length - 13).trim();
        }
        else if (bText.trim().endsWith('!==undefined')) {
            bText = bText.trim().substring(0, bText.trim().length - 12).trim();
        }
        return aText.includes(bText) || aParentText === bText;
    }
    unwrapLogicalNot(node) {
        return arkanalyzer_1.ts.isPrefixUnaryExpression(node) &&
            node.operator === arkanalyzer_1.ts.SyntaxKind.ExclamationToken
            ? node.operand
            : node;
    }
    // 新增：检测 (expr || {}).property 模式
    checkLogicalOrWithDefault(node) {
        if (arkanalyzer_1.ts.isParenthesizedExpression(node) &&
            arkanalyzer_1.ts.isBinaryExpression(node.expression) &&
            node.expression.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.BarBarToken) {
            const left = node.expression.left;
            const right = node.expression.right;
            if (arkanalyzer_1.ts.isObjectLiteralExpression(right) &&
                right.properties.length === 0) {
                return left;
            }
        }
        return null;
    }
    // 新增：递归检查嵌套结构
    checkNestedLogicalOr(node) {
        // 处理属性访问和元素访问
        if (arkanalyzer_1.ts.isPropertyAccessExpression(node) || arkanalyzer_1.ts.isElementAccessExpression(node)) {
            const expression = node.expression;
            const convertedExpr = this.checkLogicalOrWithDefault(expression);
            if (convertedExpr) {
                // 生成诊断信息（不提供修复建议）
                this.addDiagnostic(node, 'always', undefined, undefined);
            }
        }
        // 递归检查所有子节点
        arkanalyzer_1.ts.forEachChild(node, n => {
            this.checkNestedLogicalOr(n);
        });
    }
    checkOptionalChain(code, arkFile) {
        this.sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode(arkFile.getName(), code);
        this.diagnostics = [];
        // 收集所有变量声明的类型信息
        this.variableTypes.clear();
        arkanalyzer_1.ts.forEachChild(this.sourceFile, node => {
            if (arkanalyzer_1.ts.isVariableStatement(node)) {
                node.declarationList.declarations.forEach(decl => {
                    this.executeDeclaration(decl, this.variableTypes);
                });
            }
        });
        // 遍历AST
        arkanalyzer_1.ts.forEachChild(this.sourceFile, node => {
            this.executeNode(node);
        });
        return this.diagnostics;
    }
    executeDeclaration(decl, variableTypes) {
        if (arkanalyzer_1.ts.isIdentifier(decl.name)) {
            const varName = decl.name.text;
            let type = 'any';
            if (decl.type) {
                type = this.getTypeText(decl.type, this.sourceFile);
            }
            variableTypes.set(varName, type);
        }
    }
}
exports.PreferOptionalChainCheck = PreferOptionalChainCheck;
