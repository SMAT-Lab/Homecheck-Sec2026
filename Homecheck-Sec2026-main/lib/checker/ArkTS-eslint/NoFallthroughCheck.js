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
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoFallthroughCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
;
class NoFallthroughCheck {
    defects = [];
    issues = [];
    rule;
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-fallthrough.md',
        description: 'Disallow unintended fallthrough cases in switch statements.',
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    ;
    defaultOptions = [{}];
    sourceFile;
    check = (target) => {
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        if (target instanceof arkanalyzer_1.ArkFile) {
            const myInvalidPositions = this.checkAction(target);
            myInvalidPositions.forEach((violation) => {
                violation.filePath = target.getFilePath();
                this.addIssueReport(violation);
            });
        }
    };
    checkAction(target) {
        this.sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const violations = [];
        this.checkSwitchStatements(this.sourceFile, this.sourceFile, violations);
        return violations;
    }
    ;
    // 检查所有 switch 语句
    checkSwitchStatements(node, sourceFile, violations) {
        if (arkanalyzer_1.ts.isSwitchStatement(node)) {
            this.validateSwitchStatement(node, sourceFile, violations);
        }
        arkanalyzer_1.ts.forEachChild(node, child => this.checkSwitchStatements(child, sourceFile, violations));
    }
    ;
    // 验证单个 switch 语句
    validateSwitchStatement(node, sourceFile, violations) {
        const cases = node.caseBlock.clauses;
        for (let i = 0; i < cases.length; i++) {
            const currentCase = cases[i];
            const nextCase = cases[i + 1];
            if (nextCase) {
                const hasFallsThroughComment = this.checkFallthroughComment(currentCase, sourceFile) ||
                    this.checkFallthroughCommentBetweenCases(currentCase, nextCase, sourceFile.text);
                const hasTerminator = this.hasTerminatorStatement(currentCase);
                // 直接检测case之间有没有空行
                const textBetweenCases = sourceFile.text.slice(currentCase.end, nextCase.getStart());
                const hasEmptyLines = /\n\s*\n/.test(textBetweenCases);
                // 检查其他条件
                const hasOnlyRegularComments = this.hasOnlyRegularComments(currentCase, sourceFile);
                const hasOnlyEmptyStmts = this.hasOnlyEmptyStatements(currentCase);
                const isEmptyCase = this.isEmptyCase(currentCase);
                const allowEmptyCase = this.defaultOptions[0].allowEmptyCase === true;
                // 如果设置了allowEmptyCase，且当前case是空的，不需要考虑case之间的空行
                const isMergedCase = this.isMergedCase(currentCase, nextCase, allowEmptyCase);
                // 特别处理default前的case
                const isNextDefault = nextCase && arkanalyzer_1.ts.isDefaultClause(nextCase);
                // 确保空行被检测到
                if ((hasEmptyLines || hasOnlyRegularComments || hasOnlyEmptyStmts ||
                    (isNextDefault && !isEmptyCase && !hasTerminator)) && !hasFallsThroughComment) {
                    this.validateCase(currentCase, false, hasTerminator, isEmptyCase, isMergedCase, sourceFile, nextCase, violations);
                }
                else {
                    this.validateCase(currentCase, hasFallsThroughComment, hasTerminator, isEmptyCase, isMergedCase, sourceFile, nextCase, violations);
                }
            }
        }
    }
    ;
    checkAllPathsTerminate = (node) => {
        if (arkanalyzer_1.ts.isIfStatement(node)) {
            const ifBranchTerminates = this.checkAllPathsTerminate(node.thenStatement);
            const elseBranchTerminates = node.elseStatement ? this.checkAllPathsTerminate(node.elseStatement) : false;
            if (!node.elseStatement) {
                return ifBranchTerminates && this.checkAllPathsTerminate(node.parent);
            }
            return ifBranchTerminates && elseBranchTerminates;
        }
        else if (arkanalyzer_1.ts.isTryStatement(node)) {
            if (node.tryBlock) {
                const tryBlockHasBreak = node.tryBlock.statements.some(arkanalyzer_1.ts.isBreakStatement);
                const tryBlockHasThrow = node.tryBlock.statements.some(arkanalyzer_1.ts.isThrowStatement);
                if (tryBlockHasBreak) {
                    return true;
                }
                else if (tryBlockHasThrow) {
                    if (node.catchClause) {
                        const catchBlockHasBreak = node.catchClause.block.statements.some(arkanalyzer_1.ts.isBreakStatement);
                        const catchBlockHasThrow = node.catchClause.block.statements.some(arkanalyzer_1.ts.isThrowStatement);
                        return catchBlockHasBreak || catchBlockHasThrow;
                    }
                    else {
                        return false;
                    }
                }
                else {
                    if (node.finallyBlock) {
                        const finallyBlockHasBreak = node.finallyBlock.statements.some(arkanalyzer_1.ts.isBreakStatement);
                        const finallyBlockHasThrow = node.finallyBlock.statements.some(arkanalyzer_1.ts.isThrowStatement);
                        return finallyBlockHasBreak || finallyBlockHasThrow;
                    }
                    else {
                        return false;
                    }
                }
            }
            else {
                return true;
            }
        }
        else if (arkanalyzer_1.ts.isDoStatement(node)) {
            if (!node.statement || !node.expression) {
                return false;
            }
            const doBlockHasBreakOrThrow = arkanalyzer_1.ts.isBlock(node.statement) && node.statement.statements.some(stmt => arkanalyzer_1.ts.isBreakStatement(stmt) || arkanalyzer_1.ts.isThrowStatement(stmt));
            if (doBlockHasBreakOrThrow) {
                return true;
            }
            else {
                const whileBlockHasThrow = arkanalyzer_1.ts.isBlock(node.statement) && node.statement.statements.some(arkanalyzer_1.ts.isThrowStatement);
                return whileBlockHasThrow;
            }
        }
        else if (arkanalyzer_1.ts.isBlock(node)) {
            return node.statements.every(stmt => this.checkAllPathsTerminate(stmt));
        }
        else {
            return arkanalyzer_1.ts.isBreakStatement(node) ||
                arkanalyzer_1.ts.isReturnStatement(node) ||
                arkanalyzer_1.ts.isThrowStatement(node) ||
                arkanalyzer_1.ts.isContinueStatement(node);
        }
    };
    checkFallthroughComment(node, sourceFile) {
        // 更严格的fallthrough注释模式，确保只匹配标准格式
        const commentPattern = this.defaultOptions[0]?.commentPattern || 'falls?\\s*through|fallthrough';
        const regex = new RegExp(commentPattern, 'i');
        // 空case不需要fallthrough注释
        if (this.isEmptyCase(node)) {
            return false;
        }
        const statements = node.statements;
        if (statements.length === 0) {
            return false;
        }
        const lastStmt = statements[statements.length - 1];
        // 如果最后一个语句是终止语句(return, throw等)，无需fallthrough注释
        if (arkanalyzer_1.ts.isReturnStatement(lastStmt) || arkanalyzer_1.ts.isThrowStatement(lastStmt) ||
            arkanalyzer_1.ts.isBreakStatement(lastStmt) || arkanalyzer_1.ts.isContinueStatement(lastStmt)) {
            return true;
        }
        // 检查尾部注释
        const trailingComments = arkanalyzer_1.ts.getTrailingCommentRanges(sourceFile.text, lastStmt.end);
        if (trailingComments) {
            for (const comment of trailingComments) {
                const text = sourceFile.text.substring(comment.pos, comment.end);
                if (regex.test(text)) {
                    return true;
                }
            }
        }
        return false;
    }
    ;
    checkFallthroughCommentBetweenCases(currentCase, nextCase, sourceCode) {
        const commentPattern = this.defaultOptions[0]?.commentPattern || 'falls?\\s*through|fallthrough';
        const textBetweenCases = sourceCode.slice(currentCase.end, nextCase.getStart());
        return new RegExp(commentPattern, 'i').test(textBetweenCases);
    }
    ;
    hasTerminatorStatement(node) {
        const isTerminator = (stmt) => {
            return arkanalyzer_1.ts.isBreakStatement(stmt) ||
                arkanalyzer_1.ts.isReturnStatement(stmt) ||
                arkanalyzer_1.ts.isThrowStatement(stmt) ||
                arkanalyzer_1.ts.isContinueStatement(stmt);
        };
        // 直接检查最后一个语句，如果是终止语句则返回true
        if (node.statements.length > 0) {
            const lastStmt = node.statements[node.statements.length - 1];
            if (isTerminator(lastStmt)) {
                return true;
            }
        }
        // 递归检查块语句内部的终止语句
        const checkBlock = (block) => {
            if (block.statements.length > 0) {
                const lastBlockStmt = block.statements[block.statements.length - 1];
                if (isTerminator(lastBlockStmt)) {
                    return true;
                }
            }
            return block.statements.some(stmt => {
                if (arkanalyzer_1.ts.isBlock(stmt)) {
                    return checkBlock(stmt);
                }
                return isTerminator(stmt);
            });
        };
        return node.statements.some(stmt => {
            // 如果是块语句，检查它内部是否有终止语句
            if (arkanalyzer_1.ts.isBlock(stmt)) {
                return checkBlock(stmt);
            }
            return isTerminator(stmt);
        });
    }
    ;
    isEmptyCase(node) {
        // 只有当case没有任何语句时才认为是空case
        return node.statements.length === 0;
    }
    ;
    isMergedCase(currentCase, nextCase, allowEmptyCase = false) {
        // 只有完全空的case才被视为合并case
        if (this.isEmptyCase(currentCase)) {
            // 如果设置了allowEmptyCase，直接返回true表示这是一个可接受的空case
            if (allowEmptyCase) {
                return true;
            }
            // 否则，检查case之间是否有注释或空行
            const textBetweenCases = this.sourceFile.text.slice(currentCase.end, nextCase.getStart());
            const hasCommentsBetween = /(\/\/.*|\/\*[\s\S]*?\*\/)/.test(textBetweenCases);
            const hasEmptyLinesBetween = /\n\s*\n/.test(textBetweenCases);
            // 如果是空case且case之间既没有注释也没有空行，则是合并case
            return !(hasCommentsBetween || hasEmptyLinesBetween);
        }
        return false;
    }
    ;
    validateCase(currentCase, hasFallsThroughComment, hasTerminator, isEmptyCase, isMergedCase, sourceFile, nextCase, violations) {
        const endCharacter = nextCase.getEnd();
        const endPosition = sourceFile.getLineAndCharacterOfPosition(endCharacter);
        if (this.defaultOptions[0].reportUnusedFallthroughComment) {
            this.validateUnusedFallthroughComment(currentCase, hasFallsThroughComment, sourceFile, endPosition, nextCase, violations);
        }
        // 如果允许空case并且当前case是真正的空case（没有任何语句），则不添加违规
        const allowEmptyCase = this.defaultOptions[0].allowEmptyCase === true;
        // 只有注释的case视为空case
        const hasOnlyComments = this.hasOnlyRegularComments(currentCase, sourceFile);
        if ((allowEmptyCase && (isEmptyCase || hasOnlyComments)) ||
            hasTerminator ||
            hasFallsThroughComment ||
            isMergedCase) {
            return;
        }
        const { line: nextLine, character: nextChar } = sourceFile.getLineAndCharacterOfPosition(nextCase.getStart());
        const isNextDefault = nextCase && nextCase.kind === arkanalyzer_1.ts.SyntaxKind.DefaultClause;
        const nextClauseType = isNextDefault ? 'default' : 'case';
        violations.push({
            message: `Expected a 'break' statement before '${nextClauseType}'`,
            line: nextLine + 1,
            character: nextChar + 1,
            endCharacter: endPosition.character + 1
        });
    }
    ;
    validateUnusedFallthroughComment(currentCase, hasFallsThroughComment, sourceFile, endPosition, nextCase, violations) {
        const commentPattern = this.defaultOptions[0].commentPattern || 'falls?\\s*through|fallthrough';
        if (hasFallsThroughComment) {
            this.checkBlockScopedFallthroughComment(currentCase, sourceFile, endPosition, commentPattern, violations);
            const isBlockScopedss = currentCase.statements.some(stmt => {
                if (arkanalyzer_1.ts.isReturnStatement(stmt) ||
                    arkanalyzer_1.ts.isBreakStatement(stmt) ||
                    arkanalyzer_1.ts.isThrowStatement(stmt) ||
                    arkanalyzer_1.ts.isContinueStatement(stmt)) {
                    return true;
                }
                if (arkanalyzer_1.ts.isIfStatement(stmt)) {
                    const ifBranchTerminates = this.checkAllPathsTerminate(stmt.thenStatement);
                    const elseBranchTerminates = stmt.elseStatement ? this.checkAllPathsTerminate(stmt.elseStatement) : false;
                    return ifBranchTerminates && elseBranchTerminates;
                }
                return false;
            });
            const nextCaseStart = nextCase ? nextCase.getStart() : sourceFile.text.length;
            const textUntilNextCase = sourceFile.text.slice(currentCase.end, nextCaseStart);
            const commentMatch = textUntilNextCase.match(new RegExp(commentPattern, 'i'));
            if (commentMatch && isBlockScopedss) {
                const commentStart = currentCase.end + textUntilNextCase.indexOf(commentMatch[0]);
                const { line: commentLine, character: commentChar } = sourceFile.getLineAndCharacterOfPosition(commentStart);
                violations.push({
                    message: `Found a comment that would permit fallthrough, but case cannot fall through`,
                    line: commentLine + 1,
                    character: commentChar - 2,
                    endCharacter: endPosition.character + 1
                });
            }
        }
    }
    ;
    // 检查块级作用域内是否存在有效的 fallthrough 注释
    checkBlockScopedFallthroughComment(currentCase, sourceFile, endPosition, commentPattern, violations) {
        const isBlockScoped = currentCase.statements.some(arkanalyzer_1.ts.isBlock);
        if (isBlockScoped) {
            const block = currentCase.statements.find(arkanalyzer_1.ts.isBlock);
            const blockText = sourceFile.text.slice(block.getStart(), block.end);
            const hasComment = /(?:\/\/.*|\/\*[\s\S]*?\*\/)/.test(blockText);
            if (hasComment) {
                this.checkHasComment(block, blockText, violations, endPosition, sourceFile, commentPattern);
            }
        }
    }
    ;
    checkHasComment(block, blockText, violations, endPosition, sourceFile, commentPattern) {
        const hasValidCommentInBlock = blockText.match(new RegExp(commentPattern, 'i')) ?? '';
        if (hasValidCommentInBlock) {
            const commentStart = block.getStart() + hasValidCommentInBlock.index;
            const { line: commentLine, character: commentChar } = sourceFile.getLineAndCharacterOfPosition(commentStart);
            violations.push({
                message: `Found a comment that would permit fallthrough, but case cannot fall through`,
                line: commentLine + 1,
                character: commentChar - 2,
                endCharacter: endPosition.character + 1
            });
        }
    }
    ;
    addIssueReport(violation) {
        this.metaData.description = violation.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Index_1.Defects(violation.line, violation.character, violation.endCharacter, this.metaData.description, severity, this.rule.ruleId, violation.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    hasOnlyRegularComments(node, sourceFile) {
        const commentPattern = this.defaultOptions[0]?.commentPattern || 'falls?\\s*through|fallthrough';
        const regex = new RegExp(commentPattern, 'i');
        // 如果case中有实际语句(非空语句)，则不是只有注释的case
        if (node.statements.length > 0 && node.statements.some(stmt => !arkanalyzer_1.ts.isEmptyStatement(stmt))) {
            return false;
        }
        // 获取case的完整文本
        const caseStart = node.getStart();
        const caseEnd = node.end;
        const caseText = sourceFile.text.slice(caseStart, caseEnd);
        // 检查是否有注释
        const hasComment = /(\/\/.*|\/\*[\s\S]*?\*\/)/.test(caseText);
        // 检查是否有fallthrough注释
        const hasFallthroughComment = regex.test(caseText);
        // 如果有注释但不是fallthrough注释，且没有实际语句，则返回true
        return hasComment && !hasFallthroughComment && node.statements.length === 0;
    }
    ;
    // 新增：检查是否只有空语句
    hasOnlyEmptyStatements(node) {
        if (node.statements.length === 0) {
            return false;
        }
        // 检查是否只有空语句(;)
        return node.statements.every(stmt => arkanalyzer_1.ts.isEmptyStatement(stmt));
    }
    ;
}
exports.NoFallthroughCheck = NoFallthroughCheck;
