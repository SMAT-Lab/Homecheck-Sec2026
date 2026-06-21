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
exports.NoUnexpectedMultilineCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnexpectedMultilineCheck');
class NoUnexpectedMultilineCheck {
    rule;
    defects = [];
    issues = [];
    sourceFile;
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-unexpected-multiline.md',
        description: 'Disallow confusing multiline expressions.',
    };
    // 添加静态缓存
    static sourceFileCache = new Map();
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE,
    };
    registerMatchers() {
        const methodMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [methodMatcherCb];
    }
    // 在对象名和紧随其后的左方括号[之间（用于属性访问）是否有换行符
    checkNewlineBeforePropertyAccess(code) {
        // 使用正则表达式查找属性访问，并检查对象名和左方括号之间是否存在换行符
        const regex = /[^;\s]\r\n\s*[\(\[\+\-\*\/]/; // 匹配对象名、换行符和左方括号
        if (regex.test(code)) {
            // 检查是否包含可选链操作符
            const lines = code.split('\n');
            for (let i = 0; i < lines.length - 1; i++) {
                if (lines[i].trim().endsWith('?.')) {
                    return true;
                }
            }
            return false;
        }
        else {
            return true;
        }
    }
    testAfterThreeFun(stmt, code, fileName) {
        const warnInfo = this.getLineAndColumn(stmt);
        const severity = this.rule.alert ?? this.metaData.severity;
        const objResult = this.checkNewlineBeforePropertyAccess(code);
        const result2 = this.checkNewlineBetweenObjectAndBracket(code, fileName);
        if (!objResult && result2.length > 0) {
            result2.forEach(pos => {
                pos.line = warnInfo.line + pos.line - 1;
                pos.character = pos.character;
                this.addIssueReport(warnInfo.filePath, pos, severity);
            });
        }
        const templateResult = this.checkNewlineBetweenTagAndTemplateLiteral(code, fileName);
        if (templateResult.length > 0) {
            templateResult.forEach(pos => {
                pos.line = warnInfo.line + pos.line - 1;
                pos.character = warnInfo.startCol;
                this.addIssueReport(warnInfo.filePath, pos, severity);
            });
        }
        const divisionResult = this.checkNewlineBetweenNumeratorAndDivisionOperator(code, fileName);
        if (divisionResult.length > 0) {
            divisionResult.forEach(pos => {
                pos.line = warnInfo.line + pos.line - 1;
                this.addIssueReport(warnInfo.filePath, pos, severity);
            });
        }
    }
    addIssueReport(filePath, pos, severity) {
        let defect = new Index_1.Defects(pos.line, pos.character, pos.endCol, pos.message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getLineAndColumn(stmt) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            let startCol = originPosition.getColNo();
            const filePath = arkFile.getFilePath();
            return { line, startCol, filePath };
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
        return { line: -1, startCol: -1, filePath: '' };
    }
    getSourceFile(code, fileName) {
        // 检查静态缓存
        let sourceFile = NoUnexpectedMultilineCheck.sourceFileCache.get(code);
        if (!sourceFile) {
            sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode(fileName, code);
            NoUnexpectedMultilineCheck.sourceFileCache.set(code, sourceFile);
        }
        return sourceFile;
    }
    // 检查对象名和左方括号之间是否存在换行符
    checkNewlineBetweenObjectAndBracket(code, fileName) {
        const errors = [];
        this.sourceFile = this.getSourceFile(code, fileName);
        const checkForBreakAfter = (node) => {
            if (arkanalyzer_1.ts.isElementAccessExpression(node)) {
                const expressionEnd = node.expression.getEnd();
                const openBracketStart = node.argumentExpression.getStart(this.sourceFile, true);
                const expressionEndLine = this.sourceFile.getLineAndCharacterOfPosition(expressionEnd).line;
                const openBracketStartLine = this.sourceFile.getLineAndCharacterOfPosition(openBracketStart).line;
                errors.push(...this.checkNewlineBetweenObjectAndBracketBody(node, expressionEndLine, openBracketStartLine, openBracketStart));
            }
            arkanalyzer_1.ts.forEachChild(node, checkForBreakAfter);
        };
        arkanalyzer_1.ts.forEachChild(this.sourceFile, checkForBreakAfter);
        return errors;
    }
    checkNewlineBetweenObjectAndBracketBody(node, expressionEndLine, openBracketStartLine, openBracketStart) {
        const errors = [];
        if (expressionEndLine !== openBracketStartLine) {
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(openBracketStart);
            errors.push({
                line: line + 1,
                character: character,
                endCol: character + 1 + node.getText().length,
                message: 'Unexpected newline between object and [ of property access'
            });
        }
        return errors;
    }
    // 检查模板标签和模板字面量之间是否存在换行符
    checkNewlineBetweenTagAndTemplateLiteral(code, fileName) {
        const errors = [];
        this.sourceFile = this.getSourceFile(code, fileName);
        const checkForBreakAfter = (node) => {
            if (arkanalyzer_1.ts.isTaggedTemplateExpression(node)) {
                const tagEnd = node.tag.getEnd();
                const templateStart = node.template.getStart(this.sourceFile, true);
                const tagEndLine = this.sourceFile.getLineAndCharacterOfPosition(tagEnd).line;
                const templateStartLine = this.sourceFile.getLineAndCharacterOfPosition(templateStart).line;
                errors.push(...this.checkNewlineBetweenTagAndTemplateLiteralBody(node, tagEndLine, templateStartLine, templateStart));
            }
            arkanalyzer_1.ts.forEachChild(node, checkForBreakAfter);
        };
        arkanalyzer_1.ts.forEachChild(this.sourceFile, checkForBreakAfter);
        return errors;
    }
    checkNewlineBetweenTagAndTemplateLiteralBody(node, tagEndLine, templateStartLine, templateStart) {
        const errors = [];
        if (tagEndLine !== templateStartLine) {
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(templateStart);
            errors.push({
                line: line + 1,
                character: character + 1,
                endCol: character + 1 + node.getText().length,
                message: 'Unexpected newline between template tag and template literal'
            });
        }
        return errors;
    }
    // 检查分子和除法运算符之间是否存在换行符
    checkNewlineBetweenNumeratorAndDivisionOperator(code, fileName) {
        const errors = [];
        this.sourceFile = this.getSourceFile(code, fileName);
        const checkForBreakAfter = (node) => {
            if (arkanalyzer_1.ts.isBinaryExpression(node) && node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.SlashToken) {
                const numeratorEnd = node.left.getEnd();
                const divisionOperatorStart = node.operatorToken.getStart(this.sourceFile, true);
                const numeratorEndLine = this.sourceFile.getLineAndCharacterOfPosition(numeratorEnd).line;
                const divisionOperatorStartLine = this.sourceFile.getLineAndCharacterOfPosition(divisionOperatorStart).line;
                if (numeratorEndLine !== divisionOperatorStartLine) {
                    const fullText = this.sourceFile.getFullText();
                    const rightStart = node.right.getStart();
                    const nextLine = fullText.slice(rightStart).split('\n')[0].trim();
                    errors.push(...this.checkNewlineBetweenNumeratorAndDivisionOperatorBody(nextLine, divisionOperatorStart, node));
                }
            }
            arkanalyzer_1.ts.forEachChild(node, checkForBreakAfter);
        };
        arkanalyzer_1.ts.forEachChild(this.sourceFile, checkForBreakAfter);
        return errors;
    }
    checkNewlineBetweenNumeratorAndDivisionOperatorBody(nextLine, divisionOperatorStart, node) {
        const errors = [];
        // 检查是否是正则表达式的标志或调用
        const isRegexFlag = /^bar\s*\/[gims]+(?:\.test\([^)]*\))?$/.test(nextLine) || // 匹配 bar /g 或 bar /g.test(baz)
            /^bar\s*\/[a-z]+(?:\.test\([^)]*\))?$/.test(nextLine) || // 匹配其他字母标志
            /^bar\/[gims]+(?:\.test\([^)]*\))?$/.test(nextLine) || // 匹配无空格的情况
            /^bar\/[a-z]+(?:\.test\([^)]*\))?$/.test(nextLine) || // 匹配其他无空格的情况
            /^regex\/g\.test\([^)]*\)$/.test(nextLine); // 匹配 regex/g.test(bar) 的情况
        if (isRegexFlag) {
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(divisionOperatorStart);
            errors.push({
                line: line + 1,
                character: character + 1,
                endCol: character + 1 + node.getText().length,
                message: 'Unexpected newline between numerator and division operator'
            });
        }
        return errors;
    }
    checkNewlineBeforeParen(codeStr, stmt) {
        const errors = [];
        const lines = codeStr.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
            const currentLine = lines[i].trim();
            const nextLine = lines[i + 1].trim();
            // 检查是否是变量声明且下一行以括号开始
            if ((currentLine.startsWith('var ') || currentLine.startsWith('let ') ||
                currentLine.startsWith('const ')) && nextLine.startsWith('(')) {
                // 检查当前行是否包含可选链操作符
                const hasOptionalChaining = currentLine.includes('?.');
                // 只有在不包含可选链操作符时才报错
                if (!hasOptionalChaining) {
                    // 计算错误位置
                    const line = i + 2;
                    const currentLineIndent = lines[i].length - lines[i].trimStart().length;
                    const parenIndexInNextLine = nextLine.indexOf('(');
                    const character = currentLineIndent + parenIndexInNextLine + 1;
                    errors.push({
                        line: line,
                        character: character,
                        endCol: character + 1 + codeStr.length,
                        message: 'Unexpected newline between function and ( of function call'
                    });
                }
            }
        }
        return errors;
    }
    checkFunAndC(stmt, mtdNameOriginText) {
        const warnInfo = this.getLineAndColumn(stmt);
        if (mtdNameOriginText.length > 1) {
            let funRuleParen = this.checkNewlineBeforeParen(mtdNameOriginText, stmt);
            if (funRuleParen?.length > 0) {
                for (let index = 0; index < funRuleParen.length; index++) {
                    const pos = funRuleParen[index];
                    pos.line = warnInfo.line + pos.line - 1;
                    pos.character = warnInfo.startCol;
                    const severity = this.rule.alert ?? this.metaData.severity;
                    this.addIssueReport(warnInfo.filePath, {
                        line: pos.line, character: pos.character,
                        endCol: pos.character + mtdNameOriginText.length, message: pos.message
                    }, severity);
                }
            }
        }
    }
    checkArkAssignStmt(stmts, fileName) {
        for (const stmt of stmts) {
            const text = stmt.getOriginalText() ?? '';
            if (text.length <= 0) {
                continue;
            }
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                const leftOp = stmt.getLeftOp();
                if (!(leftOp instanceof arkanalyzer_1.Local)) {
                    continue;
                }
                const rightOp = stmt.getRightOp();
                if (rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
                    this.checkFunAndC(stmt, text);
                }
                if (rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr ||
                    rightOp instanceof arkanalyzer_1.Local ||
                    rightOp instanceof arkanalyzer_1.ArkInstanceFieldRef ||
                    rightOp instanceof arkanalyzer_1.ArkPtrInvokeExpr ||
                    rightOp instanceof arkanalyzer_1.ArkNewArrayExpr ||
                    rightOp instanceof arkanalyzer_1.ArkNormalBinopExpr) {
                    this.testAfterThreeFun(stmt, text, fileName);
                }
            }
        }
    }
    checkMethodsInClass(methods, fileName) {
        for (let method of methods) {
            const stmts = method.getBody()?.getCfg()?.getStmts() ?? [];
            this.checkArkAssignStmt(stmts, fileName);
        }
    }
    check = (target) => {
        let classes = target.getClasses();
        const severity = this.rule.alert ?? this.metaData.severity;
        let fileName = target.getName();
        for (let classDemo of classes) {
            classDemo.getFields().forEach(field => {
                let code = field.getCode();
                if (code.length > 0) {
                    let line = field.getOriginPosition().getLineNo();
                    const objResult = this.checkNewlineBeforePropertyAccess(code);
                    const result2 = this.checkNewlineBetweenObjectAndBracket(code, fileName);
                    if (!objResult && result2.length > 0) {
                        result2.forEach(pos => {
                            pos.line = line + 1;
                            pos.character = 1;
                            this.addIssueReport(target.getFilePath(), pos, severity);
                        });
                    }
                }
            });
            this.checkMethodsInClass(classDemo.getMethods(), fileName);
        }
    };
}
exports.NoUnexpectedMultilineCheck = NoUnexpectedMultilineCheck;
