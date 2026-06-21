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
exports.ScopeHelper = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Variable_1 = require("../../model/Variable");
const VarInfo_1 = require("../../model/VarInfo");
const FixUtils_1 = require("./FixUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ScopeHelper');
class ScopeHelper {
    gFilePath = '';
    firstBlock;
    finishBlockSet;
    isSwitchLastCase = false;
    gFinishIfStmtLines = [];
    gTernaryConditionLines = new Set();
    buildScope(scene) {
        let scopeMap = new Map();
        for (const file of scene.getFiles()) {
            this.gFilePath = file.getFilePath();
            const firstScope = new Index_1.Scope(null, new Array(), 0);
            scopeMap.set(this.gFilePath, firstScope);
            for (const clazz of file.getClasses()) {
                this.createScopeInClass(clazz, firstScope);
            }
        }
        Index_1.CheckerStorage.getInstance().setScopeMap(scopeMap);
    }
    createScopeInClass(clazz, firstScope) {
        for (let method of clazz.getMethods()) {
            this.gFinishIfStmtLines = [];
            this.gTernaryConditionLines.clear();
            this.finishBlockSet = new Set();
            this.firstBlock = method.getBody()?.getCfg()?.getStartingBlock();
            if (!this.firstBlock) {
                logger.debug(`${clazz.getName()}::${method.getName()} has no body.`);
                continue;
            }
            let curScope = firstScope;
            if (method.getName() !== arkanalyzer_1.DEFAULT_ARK_METHOD_NAME) {
                curScope = new Index_1.Scope(firstScope, new Array(), 1);
                firstScope.setChildScope(curScope);
            }
            this.blockProcess(this.firstBlock, curScope);
        }
    }
    blockProcess(block, parentScope) {
        let curScope = parentScope;
        let stmts = block.getStmts();
        if (stmts.length === 0) {
            return;
        }
        if (this.isFirstThisBlock(block)) {
            const succBlocks = block.getSuccessors();
            if (succBlocks.length > 0) {
                this.blockProcess(block.getSuccessors()[0], curScope);
                return;
            }
        }
        let isSwitchBlock = false;
        let nextScopeType = Index_1.CheckerUtils.getScopeType(stmts[stmts.length - 1]);
        curScope.blocks.add(block);
        this.finishBlockSet.add(block);
        for (let i = 0; i < stmts.length; i++) {
            const stmt = stmts[i];
            if ((i === stmts.length - 1) && (this.isForStmtDefinedPart(stmts[stmts.length - 1], nextScopeType))) {
                curScope = this.genChildScope(curScope, Index_1.ScopeType.FOR_CONDITION_TYPE);
                nextScopeType = Index_1.ScopeType.UNKNOWN_TYPE;
            }
            if (!FixUtils_1.FixUtils.hasOwnPropertyOwn(stmt, 'scope')) {
                Object.defineProperty(stmt, 'scope', { value: curScope });
            }
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt && !this.assignStmtProcess(stmt, curScope)) {
                continue;
            }
            else if (stmt instanceof arkanalyzer_1.ArkIfStmt) {
                this.gFinishIfStmtLines.push(stmt.getOriginPositionInfo().getLineNo());
                if (/^.*\?.*:.*$/.test(stmt.getOriginalText() ?? '')) {
                    this.gTernaryConditionLines.add(stmt.getOriginPositionInfo().getLineNo());
                }
            }
        }
        if (isSwitchBlock) {
            this.switchBlockPreProcess(block, curScope);
        }
        else {
            this.nextBlockPreProcess(block, curScope, nextScopeType);
        }
    }
    isFirstThisBlock(block) {
        if (block.getPredecessors().length === 0) {
            const stmts = block.getStmts();
            if (stmts.length === 1) {
                if (stmts[0] instanceof arkanalyzer_1.ArkAssignStmt &&
                    stmts[0].getRightOp() instanceof arkanalyzer_1.ArkThisRef) {
                    return true;
                }
            }
        }
        return false;
    }
    isForStmtDefinedPart(stmt, nextScopeType) {
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt && nextScopeType === Index_1.ScopeType.FOR_CONDITION_TYPE &&
            !this.gFinishIfStmtLines.includes(stmt.getOriginPositionInfo().getLineNo())) {
            return true;
        }
        return false;
    }
    genChildScope(curScope, scopeType) {
        let newScope = new Index_1.Scope(curScope, new Array(), curScope.scopeLevel + 1, scopeType);
        curScope.setChildScope(newScope);
        return newScope;
    }
    assignStmtProcess(stmt, curScope) {
        let def = stmt.getDef();
        if (def instanceof arkanalyzer_1.Local) {
            if (def.getName() === 'this') {
                return false;
            }
            const isForStmtThirdPart = (Index_1.CheckerUtils.getScopeType(stmt) === Index_1.ScopeType.FOR_CONDITION_TYPE &&
                this.gFinishIfStmtLines.includes(stmt.getOriginPositionInfo().getLineNo()));
            if (Index_1.CheckerUtils.wherIsTemp(stmt) === Index_1.TempLocation.LEFT ||
                (!isForStmtThirdPart && Index_1.CheckerUtils.isDeclaringStmt(def.getName(), stmt))) {
                curScope.addVariable(new Variable_1.Variable(stmt));
            }
            else {
                this.getDefAndSetRedef(def.getName(), curScope, curScope, stmt, SetDefMode.REDEF);
            }
        }
        else if (def instanceof arkanalyzer_1.ArkArrayRef) {
            let base = def.getBase();
            if (base instanceof arkanalyzer_1.Local && !base.getName().includes('%')) {
                this.getDefAndSetRedef(base.getName(), curScope, curScope, stmt, SetDefMode.LEFTUSED);
            }
        }
        return true;
    }
    getDefAndSetRedef(name, searchScope, varScope, stmt, mode) {
        let defList = searchScope.defList;
        for (let variable of defList) {
            if (variable.getName() === name) {
                if (mode === SetDefMode.REDEF) {
                    variable.redefInfo.add(new VarInfo_1.VarInfo(stmt, varScope));
                }
                else if (mode === SetDefMode.LEFTUSED) {
                    variable.leftUsedInfo.add(new VarInfo_1.VarInfo(stmt, varScope));
                }
            }
        }
        if (searchScope.parentScope !== null) {
            return this.getDefAndSetRedef(name, searchScope.parentScope, varScope, stmt, mode);
        }
        return false;
    }
    switchBlockPreProcess(block, curScope) {
        const caseBlocks = block.getSuccessors();
        for (let caseBlock of caseBlocks) {
            this.finishBlockSet.add(caseBlock);
        }
        for (let i = 0; i < caseBlocks.length; i++) {
            if (i === caseBlocks.length - 1) {
                this.isSwitchLastCase = true;
            }
            this.blockProcess(caseBlocks[i], this.genChildScope(curScope, Index_1.ScopeType.CASE_TYPE));
        }
        this.isSwitchLastCase = false;
    }
    nextBlockPreProcess(block, curScope, nextScopeType) {
        const succBlocks = block.getSuccessors();
        const proedBlocks = block.getPredecessors();
        for (let i = 0; i < succBlocks.length; i++) {
            if (this.finishBlockSet.has(succBlocks[i])) {
                continue;
            }
            if (this.isTernaryCondition(succBlocks[i], proedBlocks)) {
                this.blockProcess(succBlocks[i], curScope);
                continue;
            }
            this.handleSuccessorBlock(succBlocks[i], curScope, nextScopeType, i);
        }
    }
    handleSuccessorBlock(succBlock, curScope, nextScopeType, index) {
        if (index === 0) {
            if (this.isNeedCreateScope(nextScopeType)) {
                const type = (nextScopeType === Index_1.ScopeType.FOR_CONDITION_TYPE) ? Index_1.ScopeType.FOR_IN_TYPE : nextScopeType;
                this.blockProcess(succBlock, this.genChildScope(curScope, type));
            }
            else {
                if (this.isSwitchLastCase) {
                    this.isSwitchLastCase = false;
                    curScope = curScope.parentScope ?? curScope;
                }
                this.blockProcess(succBlock, this.getReturnScope(succBlock, curScope));
            }
        }
        else {
            if (nextScopeType === Index_1.ScopeType.FOR_CONDITION_TYPE) {
                this.blockProcess(succBlock, this.getReturnScope(succBlock, curScope.parentScope ?? curScope));
            }
            else if (nextScopeType === Index_1.ScopeType.WHILE_TYPE) {
                this.blockProcess(succBlock, this.getReturnScope(succBlock, curScope));
            }
            else {
                this.blockProcess(succBlock, this.genChildScope(curScope, Index_1.ScopeType.ELSE_TYPE));
            }
        }
    }
    isTernaryCondition(succBlock, predBlocks) {
        const succStmts = succBlock.getStmts();
        if (succStmts.length > 0 && this.gTernaryConditionLines.has(succStmts[0].getOriginPositionInfo().getLineNo())) {
            return true;
        }
        else if (predBlocks.length === 1 && this.gTernaryConditionLines.has(predBlocks?.[0].getStmts()?.at(-1)?.getOriginPositionInfo().getLineNo() ?? 0)) {
            return true;
        }
        else {
            return false;
        }
    }
    isNeedCreateScope(nextScopeType) {
        if (nextScopeType === Index_1.ScopeType.IF_TYPE ||
            nextScopeType === Index_1.ScopeType.FOR_CONDITION_TYPE ||
            nextScopeType === Index_1.ScopeType.WHILE_TYPE) {
            return true;
        }
        return false;
    }
    getReturnScope(succBlock, curScope) {
        const stmts = succBlock.getStmts();
        if (stmts.length !== 0) {
            const type = Index_1.CheckerUtils.getScopeType(stmts[0]);
            if ([Index_1.ScopeType.WHILE_TYPE, Index_1.ScopeType.FOR_CONDITION_TYPE].includes(type)) {
                return curScope;
            }
        }
        else {
            return curScope;
        }
        let returnScopeLevel = curScope.scopeLevel - (succBlock.getPredecessors().length - 1);
        let exitNum = curScope.scopeLevel - returnScopeLevel;
        while (exitNum) {
            if (curScope.parentScope !== null) {
                curScope = curScope.parentScope;
                exitNum--;
            }
            else {
                logger.debug('CountExitScopeNum error!');
                break;
            }
        }
        return curScope;
    }
}
exports.ScopeHelper = ScopeHelper;
var SetDefMode;
(function (SetDefMode) {
    SetDefMode[SetDefMode["REDEF"] = 0] = "REDEF";
    SetDefMode[SetDefMode["LEFTUSED"] = 1] = "LEFTUSED";
})(SetDefMode || (SetDefMode = {}));
