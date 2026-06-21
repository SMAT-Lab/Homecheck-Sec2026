"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferReduceTypeParameterCheck = void 0;
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
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/prefer-reduce-type-parameter.md',
    description: 'Unnecessary cast: Array#reduce accepts a type parameter for the default value.',
    defaultOptions: [],
};
class PreferReduceTypeParameterCheck {
    issues = [];
    metaData = gMetaData;
    rule;
    defects = [];
    sourceFile;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    check = (target) => {
        if (target instanceof lib_1.ArkFile) {
            this.sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        }
        const classes = target.getClasses() ?? [];
        classes.forEach(clazz => {
            const methods = clazz.getMethods();
            this.getStmts(methods, target);
        });
    };
    getStmts(methods, target) {
        let record = new Map();
        methods.forEach(method => {
            const stmts = method?.getBody()?.getCfg().getStmts() ?? [];
            stmts.forEach(stmt => {
                const originText = stmt.getOriginalText() ?? '';
                const position = stmt.getOriginPositionInfo();
                const key = `${position.getLineNo()}:${position.getColNo()}`;
                if (!record.has(key) && originText) {
                    this.checkForReduceTypeParameter(originText, target, stmt);
                    record.set(key, originText);
                }
            });
        });
    }
    checkForReduceTypeParameter(originText, target, stmt) {
        let sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('', originText);
        const visit = (node) => {
            if (lib_1.ts.isCallExpression(node)) {
                const { isReduceMethod, targetExpression } = this.checkIsReduceMethod(node);
                if (isReduceMethod && targetExpression) {
                    this.processReduceArguments(node, originText, stmt);
                }
            }
            lib_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    checkIsReduceMethod(node) {
        let isReduceMethod = false;
        let targetExpression;
        const checkPropertyAccess = (expr) => {
            const methodName = expr.name.text;
            return methodName === 'reduce';
        };
        const checkElementAccess = (expr) => {
            const arg = expr.argumentExpression;
            return lib_1.ts.isStringLiteral(arg) && (arg.text === 'reduce');
        };
        if (lib_1.ts.isPropertyAccessExpression(node.expression)) {
            isReduceMethod = checkPropertyAccess(node.expression);
            targetExpression = node.expression.expression;
        }
        else if (lib_1.ts.isElementAccessExpression(node.expression)) {
            isReduceMethod = checkElementAccess(node.expression);
            targetExpression = node.expression.expression;
        }
        return { isReduceMethod, targetExpression };
    }
    processReduceArguments(node, originText, stmt) {
        const args = node.arguments;
        if (args.length < 2) {
            return;
        }
        const secondArg = args[1];
        if (secondArg.getChildCount() <= 1) {
            return;
        }
        let secondArgText = '';
        let secondArgTextFull = secondArg.getText();
        if (secondArgTextFull.startsWith('<')) {
            if (!lib_1.ts.isAsExpression(secondArg) && !lib_1.ts.isTypeAssertionExpression(secondArg)) {
                return;
            }
            secondArgText = secondArg.getChildren()[1].getText();
            if (this.isArrayType(stmt)) {
                const firstArg = args[0].getText();
                const warnInfo = this.getWarnInfo(secondArg.getText(), stmt);
                const pureInitialValue = secondArg.getChildren()[secondArg.getChildCount() - 1].getText();
                this.addIssueReportNodeFix(this.sourceFile, warnInfo, stmt, node, secondArgText, firstArg, pureInitialValue);
            }
        }
        else {
            if (!lib_1.ts.isAsExpression(secondArg) && !lib_1.ts.isTypeAssertionExpression(secondArg)) {
                return;
            }
            secondArgText = secondArg.getChildren()[secondArg.getChildCount() - 1].getText();
            const firstArg = args[0].getText();
            const initialValueText = originText.slice(secondArg.getStart(), secondArg.getEnd());
            const pureInitialValue = initialValueText.replace(/\s+as\s+.+$/, '');
            if (this.isArrayType(stmt)) {
                const warnInfo = this.getWarnInfo(secondArg.getText(), stmt);
                this.addIssueReportNodeFix(this.sourceFile, warnInfo, stmt, node, secondArgText, firstArg, pureInitialValue);
            }
        }
    }
    getReduceInfo(checkText, stmt) {
        const text = stmt.getOriginalText();
        if (text === undefined) {
            return { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        const arrayLentgth = this.getRedueceTextForArray(text);
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (!arkFile || !text || text.length === 0) {
            return { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        const normalize = (str) => str
            .replace(/\r\n/g, '\n')
            .replace(/\s+/g, ' ');
        const normalizedText = normalize(text);
        const normalizedCheck = normalize(checkText);
        const startIndex = normalizedText.indexOf(normalizedCheck);
        if (startIndex === -1) {
            return { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        const rawLines = text.split(/\r?\n/);
        let currentPos = 0;
        let targetLine = -1;
        let targetColumn = -1;
        for (let lineNum = 0; lineNum < rawLines.length; lineNum++) {
            const lineLength = rawLines[lineNum].length + 1;
            if (currentPos <= startIndex && startIndex < currentPos + lineLength) {
                targetLine = lineNum;
                targetColumn = startIndex - currentPos;
                break;
            }
            currentPos += lineLength;
        }
        const originalPosition = stmt.getOriginPositionInfo();
        stmt.getOriginalText();
        originalPosition.getColNo();
        return {
            line: originalPosition.getLineNo() + targetLine,
            startCol: originalPosition.getColNo() + arrayLentgth,
            endCol: checkText.length,
            filePath: arkFile.getFilePath(),
            argString: checkText
        };
    }
    getRedueceTextForArray(arrayText) {
        const parts = arrayText.split(/\.reduce(?:Right)?\(/);
        return parts.length > 1 ? parts[0].length : 0;
    }
    getWarnInfo(checkText, stmt) {
        const text = stmt.getOriginalText();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (!arkFile || !text || text.length === 0) {
            return { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        let lineCount = -1;
        let startColum = -1;
        let originalPosition = stmt.getOriginPositionInfo();
        const sparse = originalPosition.getColNo();
        const originalTexts = text.split('\n');
        for (let originalText of originalTexts) {
            lineCount++;
            if (originalText.includes(checkText)) {
                if (lineCount === 0) {
                    startColum = originalText.indexOf(checkText) + sparse;
                }
                else {
                    startColum = originalText.indexOf(checkText) + 1;
                }
                break;
            }
        }
        if (startColum === -1) {
            return { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        let lineNo = originalPosition.getLineNo() + lineCount;
        const endColumn = startColum + checkText.length - 1;
        const filePath = arkFile.getFilePath();
        return { line: lineNo, startCol: startColum, endCol: endColumn, filePath: filePath, argString: checkText };
    }
    isArrayType(stmt) {
        let isArray = false;
        let retuenType = this.getTypeForReduce(stmt);
        if (retuenType.includes('[') && retuenType.includes('[]') && retuenType.includes(']') && !retuenType.includes('|')) {
            isArray = true;
        }
        return isArray;
    }
    getTypeForReduce(stmt) {
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let leftOp = stmt.getLeftOp();
            return this.getType(leftOp);
        }
        return 'unknown';
    }
    getType(stmt) {
        if (!(stmt instanceof lib_1.Local)) {
            return 'unknown';
        }
        for (const used of stmt.getUsedStmts()) {
            const type = this.getTypeFromUsedStmt(used);
            if (type !== 'unknown') {
                return type;
            }
        }
        return 'unknown';
    }
    getTypeFromUsedStmt(used) {
        if (used instanceof lib_1.ArkInvokeStmt) {
            return this.getTypeFromInvokeStmt(used);
        }
        if (used instanceof lib_1.ArkAssignStmt) {
            return this.getTypeFromAssignStmt(used);
        }
        return 'unknown';
    }
    getTypeFromInvokeStmt(invokeStmt) {
        const invokeExpr = invokeStmt.getInvokeExpr();
        if (invokeExpr instanceof lib_1.ArkInstanceInvokeExpr) {
            const type = invokeExpr.getBase().getType().getTypeString();
            if (!type.startsWith('@')) {
                return type;
            }
        }
        return 'unknown';
    }
    getTypeFromAssignStmt(assignStmt) {
        const usedRightOp = assignStmt.getRightOp();
        if (usedRightOp instanceof lib_1.ArkInstanceInvokeExpr) {
            const invokeExpr = usedRightOp.getBase();
            if (invokeExpr instanceof lib_1.Local) {
                return invokeExpr.getType().getTypeString();
            }
        }
        const usedLeftOp = assignStmt.getLeftOp();
        return this.getType(usedLeftOp);
    }
    reduceruleFix(sourceFile, loc, secondArgText, firstText, repleaseText, pureInitialValue) {
        // 获取原始调用特征
        const originalCall = repleaseText;
        const typeParam = secondArgText.replace(/^as\s+/, '');
        // 分析原始参数格式特征
        const paramStartIndex = originalCall.indexOf('(');
        const paramEndIndex = originalCall.lastIndexOf(')');
        const originalParams = originalCall.slice(paramStartIndex + 1, paramEndIndex);
        // 判断原始格式类型（单行/多行）
        const isMultiline = originalParams.includes('\n');
        const indent = isMultiline ? '\n  ' : '';
        const lineEnd = isMultiline ? '\n' : '';
        // 构建符合原始格式的新参数
        const newParams = `${indent}${firstText},${indent}${pureInitialValue}${lineEnd}`;
        const newReduceCall = `${originalCall.split('.reduce')[0]}.reduce<${typeParam}>(${newParams})`;
        const startPos = this.sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.startCol - 1);
        return {
            range: [startPos, startPos + loc.endCol],
            text: newReduceCall
        };
    }
    addIssueReportNodeFix(sourceFile, loc, stmt, node, secondArgText, firstText, pureInitialValue) {
        let repleaseText = this.getRedueceText(node);
        stmt.getOriginPositionInfo().getColNo();
        let locs = this.getReduceInfo(this.getRedueceText(node), stmt);
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(loc.line, loc.startCol, loc.endCol, this.metaData.description, severity, this.rule.ruleId, loc.filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = this.reduceruleFix(sourceFile, locs, secondArgText, firstText, repleaseText, pureInitialValue);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getRedueceText(node) {
        if (lib_1.ts.isCallExpression(node)) {
            const fullText = node.getText();
            // 使用正则匹配 .reduce 或 .reduceRight 及其参数部分
            const match = fullText.match(/\.reduce(?:Right)?\([^]*\)/);
            return match ? match[0] : fullText;
        }
        return node.getText();
    }
}
exports.PreferReduceTypeParameterCheck = PreferReduceTypeParameterCheck;
