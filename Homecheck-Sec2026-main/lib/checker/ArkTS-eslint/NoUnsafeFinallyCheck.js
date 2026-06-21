"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoUnsafeFinallyCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
var MessageType;
(function (MessageType) {
    MessageType["return"] = "return";
    MessageType["break"] = "break";
    MessageType["throw"] = "throw";
    MessageType["continue"] = "continue";
})(MessageType || (MessageType = {}));
class NoUnsafeFinallyCheck {
    issues = [];
    messages = {
        return: 'Unsafe usage of ReturnStatement',
        break: 'Unsafe usage of BreakStatement',
        throw: 'Unsafe usage of ThrowStatement',
        continue: 'Unsafe usage of ContinueStatement',
    };
    rule;
    defects = [];
    sourceFile;
    violations = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-unsafe-finally.md',
        description: 'Unsafe usage of ReturnStatement',
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    check = (target) => {
        if (target instanceof arkanalyzer_1.ArkFile) {
            const myInvalidPositions = this.checkNoUnsafeFinally(target);
            myInvalidPositions.forEach((pos) => {
                pos.filePath = target.getFilePath();
                this.addIssueReport(pos);
            });
        }
    };
    // 判断为函数声明、函数表达式、箭头函数、箭头函数表达式、类声明
    isFunctionOrClassNode(node) {
        return (arkanalyzer_1.ts.isFunctionDeclaration(node) ||
            arkanalyzer_1.ts.isFunctionExpression(node) ||
            arkanalyzer_1.ts.isArrowFunction(node) ||
            arkanalyzer_1.ts.isClassDeclaration(node));
    }
    // 判断为循环节点
    isLoopNode(node) {
        return (arkanalyzer_1.ts.isDoStatement(node) ||
            arkanalyzer_1.ts.isWhileStatement(node) ||
            arkanalyzer_1.ts.isForOfStatement(node) ||
            arkanalyzer_1.ts.isForInStatement(node) ||
            arkanalyzer_1.ts.isForStatement(node));
    }
    // 判断为switch...case节点
    isSwitchNode(node) {
        return arkanalyzer_1.ts.isSwitchStatement(node);
    }
    checkNoUnsafeFinally(target) {
        this.sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.violations = [];
        this.checkNode(this.sourceFile);
        return this.violations;
    }
    // 递归检查代码块
    checkNode(node) {
        if (arkanalyzer_1.ts.isLabeledStatement(node)) {
            this.checkLabeledStatement(node);
        }
        else if (arkanalyzer_1.ts.isTryStatement(node)) {
            this.checkTryStatement(node);
        }
        // 继续递归检查其他节点
        arkanalyzer_1.ts.forEachChild(node, child => this.checkNode(child));
    }
    // 检查带标签的语句
    checkLabeledStatement(node) {
        const label = node.label.text;
        if (arkanalyzer_1.ts.isWhileStatement(node.statement)) {
            this.checkLabeledWhileStatement(node.statement, label);
        }
        else if (arkanalyzer_1.ts.isSwitchStatement(node.statement)) {
            this.checkLabeledSwitchStatement(node.statement, label);
        }
    }
    // 检查带标签的while语句
    checkLabeledWhileStatement(whileStatement, label) {
        if (!arkanalyzer_1.ts.isTryStatement(whileStatement.statement)) {
            return;
        }
        const tryStatement = whileStatement.statement;
        const finallyBlock = tryStatement.finallyBlock;
        if (!finallyBlock) {
            return;
        }
        const switchStatement = finallyBlock.statements.find(stmt => arkanalyzer_1.ts.isSwitchStatement(stmt));
        if (!switchStatement || !switchStatement.caseBlock) {
            return;
        }
        this.checkSwitchCasesForUnsafeBreak(switchStatement.caseBlock, label);
    }
    // 检查带标签的switch语句
    checkLabeledSwitchStatement(switchStatement, label) {
        const caseBlock = switchStatement.caseBlock;
        if (!caseBlock) {
            return;
        }
        // 遍历case子句
        arkanalyzer_1.ts.forEachChild(caseBlock, child => {
            if (!arkanalyzer_1.ts.isCaseClause(child)) {
                return;
            }
            // 遍历case子句中的节点
            arkanalyzer_1.ts.forEachChild(child, childNode => {
                if (!arkanalyzer_1.ts.isTryStatement(childNode)) {
                    return;
                }
                const finallyBlock = childNode.finallyBlock;
                if (!finallyBlock) {
                    return;
                }
                const switchStmt = finallyBlock.statements.find(stmt => arkanalyzer_1.ts.isSwitchStatement(stmt));
                if (!switchStmt || !switchStmt.caseBlock) {
                    return;
                }
                this.checkSwitchCasesForBreak(switchStmt.caseBlock, label);
            });
        });
    }
    // 检查switch case中的break语句(针对while里的switch)
    checkSwitchCasesForUnsafeBreak(caseBlock, label) {
        arkanalyzer_1.ts.forEachChild(caseBlock, child => {
            if (!arkanalyzer_1.ts.isCaseClause(child)) {
                return;
            }
            arkanalyzer_1.ts.forEachChild(child, childNode => {
                this.checkForUnsafeBreakOrContinue(childNode, label);
            });
        });
    }
    // 检查switch case中的break语句(针对switch里的switch)
    checkSwitchCasesForBreak(caseBlock, label) {
        // 获取所有case子句
        const caseClauses = this.getCaseClauses(caseBlock);
        // 检查每个case子句中的break语句
        for (const caseClause of caseClauses) {
            this.checkCaseClauseForLabeledBreak(caseClause, label);
        }
    }
    // 获取switch中的所有case子句
    getCaseClauses(caseBlock) {
        const caseClauses = [];
        arkanalyzer_1.ts.forEachChild(caseBlock, child => {
            if (arkanalyzer_1.ts.isCaseClause(child)) {
                caseClauses.push(child);
            }
        });
        return caseClauses;
    }
    // 检查case子句中的break语句
    checkCaseClauseForLabeledBreak(caseClause, label) {
        arkanalyzer_1.ts.forEachChild(caseClause, childNode => {
            this.checkNodeForLabeledBreak(childNode, label);
        });
    }
    // 检查节点是否是带标签的break语句
    checkNodeForLabeledBreak(node, label) {
        if (!arkanalyzer_1.ts.isBreakStatement(node) || !node.label) {
            return;
        }
        if (node.label.text === label) {
            this.addViolation(node, MessageType.break);
        }
    }
    // 检查unsafe break或continue
    checkForUnsafeBreakOrContinue(node, label) {
        if (arkanalyzer_1.ts.isBreakStatement(node) && node.label) {
            if (node.label.text === label) {
                this.addViolation(node, MessageType.break);
            }
        }
        else if (arkanalyzer_1.ts.isContinueStatement(node)) {
            this.addViolation(node, MessageType.continue);
        }
    }
    // 检查try语句的finally块
    checkTryStatement(node) {
        const finallyBlock = node.finallyBlock;
        if (!finallyBlock) {
            return;
        }
        // 遍历finally块中的语句
        arkanalyzer_1.ts.forEachChild(finallyBlock, child => {
            this.checkFinallyBlockChild(child);
        });
    }
    // 检查finally块中的子节点
    checkFinallyBlockChild(child) {
        // 获取位置信息，用于记录违规
        const position = this.sourceFile.getLineAndCharacterOfPosition(child.getStart());
        let skipCheck = false;
        // 检查return或throw语句
        if (arkanalyzer_1.ts.isReturnStatement(child) || arkanalyzer_1.ts.isThrowStatement(child)) {
            skipCheck = this.isFunctionOrClassNode(child);
            if (!skipCheck) {
                const type = arkanalyzer_1.ts.isReturnStatement(child) ? MessageType.return : MessageType.throw;
                this.addViolation(child, type);
            }
            return;
        }
        // 检查break语句
        if (arkanalyzer_1.ts.isBreakStatement(child)) {
            skipCheck = this.isFunctionOrClassNode(child) || this.isLoopNode(child);
            if (!skipCheck) {
                this.addViolation(child, MessageType.break);
            }
            return;
        }
        // 检查continue语句
        if (arkanalyzer_1.ts.isContinueStatement(child)) {
            skipCheck = this.isFunctionOrClassNode(child) ||
                this.isLoopNode(child) ||
                this.isSwitchNode(child);
            if (!skipCheck) {
                this.addViolation(child, MessageType.continue);
            }
            return;
        }
        // 检查if语句
        if (arkanalyzer_1.ts.isIfStatement(child) && !this.isFunctionOrClassNode(child)) {
            this.checkIfStatement(child);
        }
    }
    // 检查if语句中的return语句
    checkIfStatement(node) {
        // 检查then分支
        this.checkStatementForReturns(node.thenStatement);
        // 检查else分支
        if (node.elseStatement) {
            this.checkStatementForReturns(node.elseStatement);
            // 检查else-if语句
            if (arkanalyzer_1.ts.isIfStatement(node.elseStatement)) {
                const elseIfNode = node.elseStatement;
                this.checkStatementForReturns(elseIfNode.thenStatement);
                if (elseIfNode.elseStatement) {
                    this.checkStatementForReturns(elseIfNode.elseStatement);
                }
            }
        }
    }
    // 检查语句中的return语句
    checkStatementForReturns(statement) {
        if (!statement) {
            return;
        }
        arkanalyzer_1.ts.forEachChild(statement, child => {
            if (arkanalyzer_1.ts.isReturnStatement(child)) {
                this.addViolation(child, MessageType.return);
            }
        });
    }
    // 添加违规记录
    addViolation(node, type) {
        const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(node.getStart());
        this.violations.push({
            line: line + 1,
            character: character + 1,
            type: type
        });
    }
    addIssueReport(pos) {
        this.metaData.description = this.messages[pos.type];
        const severity = this.rule.alert ?? this.metaData.severity;
        if (pos.filePath === undefined) {
            return;
        }
        const defect = new Defects_1.Defects(pos.line, pos.character, pos.character, this.metaData.description, severity, this.rule.ruleId, pos.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoUnsafeFinallyCheck = NoUnsafeFinallyCheck;
