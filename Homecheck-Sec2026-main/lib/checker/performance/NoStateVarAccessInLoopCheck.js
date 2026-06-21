"use strict";
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
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
exports.NoStateVarAccessInLoopCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoStateVarAccessInLoopCheck');
const loopInvokeMethods = ['forEach', 'map', 'flatMap', 'filter', 'reduce', 'every', 'some', 'find'];
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const visitedBlockSet = new Set();
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/no-state-var-access-in-loop-check.md',
    description: 'Avoid frequently reading state variables in loop logic.'
};
class NoStateVarAccessInLoopCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        hasViewTree: true
    };
    registerMatchers() {
        const matchClazzCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClazzCb];
    }
    check = (target) => {
        if (viewTreeTool.hasTraverse(target)) {
            return;
        }
        for (let arkField of target.getFields()) {
            if (!arkField.hasDecorator(new Set(['State', 'Prop', 'Link', 'ObjectLink']))) {
                continue;
            }
            this.accessInLoopInCurrentClass(target, arkField);
        }
    };
    accessInLoopInCurrentClass(clazz, arkField) {
        for (let method of clazz.getMethods()) {
            if (method.isGenerated()) {
                continue;
            }
            const firstBlock = method.getBody()?.getCfg().getStartingBlock();
            if (!firstBlock) {
                return;
            }
            this.blockProcess(clazz, method, firstBlock, arkField);
            for (let stmt of method.getBody()?.getCfg().getStmts() ?? []) {
                const invokerExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
                if (!invokerExpr) {
                    continue;
                }
                const name = invokerExpr.getMethodSignature().getMethodSubSignature().getMethodName();
                if (!loopInvokeMethods.includes(name)) {
                    continue;
                }
                if (invokerExpr.getArgs().length <= 0) {
                    continue;
                }
                const arg0 = invokerExpr.getArg(0);
                if (!(arg0 instanceof lib_1.Local)) {
                    continue;
                }
                const localType = arg0.getType();
                if (!(localType instanceof lib_1.FunctionType)) {
                    continue;
                }
                const loopMethod = clazz.getMethod(localType.getMethodSignature());
                if (!loopMethod) {
                    continue;
                }
                if (loopMethod.isGenerated()) {
                    continue;
                }
                const stmts = loopMethod.getCfg()?.getStmts();
                if (!stmts) {
                    continue;
                }
                this.loopBlockStmtsProcess(clazz, loopMethod, stmts, arkField);
            }
        }
    }
    blockProcess(clazz, method, block, arkField) {
        const stmts = block.getStmts();
        if (stmts.length === 0) {
            return;
        }
        if (this.isFirstBlock(method, block)) {
            const succBlocks = block.getSuccessors();
            if (succBlocks.length > 0) {
                this.blockProcess(clazz, method, succBlocks[0], arkField);
            }
            return;
        }
        visitedBlockSet.clear();
        visitedBlockSet.add(block);
        if (this.isLoopBlock(block.getId(), block.getSuccessors())) {
            this.loopBlockStmtsProcess(clazz, method, stmts, arkField);
        }
        const blocks = method.getBody()?.getCfg().getBlocks();
        if (!blocks) {
            return;
        }
        if (block.getId() < 0 || block.getId() > blocks.size) {
            return;
        }
        let nextBlock = null;
        for (let value of blocks) {
            if (value.getId() === (block.getId() + 1)) {
                nextBlock = value;
                break;
            }
        }
        if (!nextBlock) {
            return;
        }
        this.blockProcess(clazz, method, nextBlock, arkField);
    }
    loopBlockStmtsProcess(clazz, method, stmts, arkField) {
        for (let stmt of stmts) {
            if (stmt instanceof lib_1.ArkAssignStmt) {
                if (this.isStmtReadStateVar(stmt, arkField)) {
                    const arkFile = method.getDeclaringArkFile();
                    const keyword = 'this.' + arkField.getName();
                    this.addIssueReport(arkFile, stmt, keyword);
                }
            }
            const invokerExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokerExpr) {
                continue;
            }
            const targetMethod = clazz.getMethod(invokerExpr.getMethodSignature());
            if (!targetMethod) {
                continue;
            }
            if (targetMethod.isGenerated()) {
                continue;
            }
            const targetStmts = targetMethod.getCfg()?.getStmts();
            if (!targetStmts) {
                continue;
            }
            this.loopBlockStmtsProcess(clazz, targetMethod, targetStmts, arkField);
        }
    }
    isStmtReadStateVar(stmt, arkField) {
        const leftOp = stmt.getLeftOp();
        if (leftOp instanceof lib_1.ArkInstanceFieldRef) {
            if (leftOp.getBase().getName() === 'this' && leftOp.getFieldSignature().toString() === arkField.getSignature().toString()) {
                return true;
            }
        }
        const rightOp = stmt.getRightOp();
        if (rightOp instanceof lib_1.ArkInstanceFieldRef) {
            if (rightOp.getBase().getName() === 'this' && rightOp.getFieldSignature().toString() === arkField.getSignature().toString()) {
                return true;
            }
        }
        return false;
    }
    isLoopBlock(currentBlockId, successorBlocks) {
        let flag = false;
        for (let succBlock of successorBlocks) {
            if (succBlock.getId() === currentBlockId) {
                flag = true;
                break;
            }
            else if (this.isLastBlock(succBlock)) {
                continue;
            }
            else if (visitedBlockSet.has(succBlock)) {
                continue;
            }
            else {
                visitedBlockSet.add(succBlock);
                if (this.isLoopBlock(currentBlockId, succBlock.getSuccessors())) {
                    flag = true;
                }
            }
        }
        return flag;
    }
    isFirstBlock(method, block) {
        if (block.getPredecessors().length !== 0) {
            return false;
        }
        const stmts = block.getStmts();
        const pCount = method.getParameters().length;
        if (pCount < 0 || pCount > stmts.length) {
            return false;
        }
        const thisRefStmt = stmts[pCount];
        if (thisRefStmt instanceof lib_1.ArkAssignStmt && thisRefStmt.getRightOp() instanceof lib_1.ArkThisRef) {
            return true;
        }
        return false;
    }
    isLastBlock(block) {
        if (block.getPredecessors().length !== 0) {
            return false;
        }
        const stmts = block.getStmts();
        if (stmts.length === 0) {
            return false;
        }
        const returnStmt = stmts[stmts.length - 1];
        if (returnStmt instanceof lib_1.ArkAssignStmt || returnStmt instanceof lib_1.ArkReturnVoidStmt) {
            return true;
        }
        return false;
    }
    addIssueReport(arkFile, stmt, keyword) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(arkFile, stmt, keyword);
        if (warnInfo) {
            let defects = new Index_1.Defects(warnInfo.lineNum, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    getLineAndColumn(arkFile, stmt, keyword) {
        if (arkFile) {
            const originPosition = stmt.getOriginPositionInfo();
            const lineNum = originPosition.getLineNo();
            const text = stmt.getOriginalText();
            if (!text || text.length === 0) {
                return undefined;
            }
            const startCol = originPosition.getColNo() + text.indexOf(keyword);
            const endCol = startCol + keyword.length - 1;
            const originPath = arkFile.getFilePath();
            return { lineNum, startCol, endCol, filePath: originPath };
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.NoStateVarAccessInLoopCheck = NoStateVarAccessInLoopCheck;
