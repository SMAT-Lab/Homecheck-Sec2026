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
exports.ConstantPropertyReferencingInLoopsCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Stmt_1 = require("arkanalyzer/lib/core/base/Stmt");
const Local_1 = require("arkanalyzer/lib/core/base/Local");
const Ref_1 = require("arkanalyzer/lib/core/base/Ref");
const Expr_1 = require("arkanalyzer/lib/core/base/Expr");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ConstantPropertyReferencingInLoopsCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/constant-property-referencing-check-in-loops.md',
    description: 'This property access occurs within a loop and returns a constant result; you are advised to extract it outside the loop body to reduce the number of property access times.'
};
class ConstantPropertyReferencingInLoopsCheck {
    metaData = gMetaData;
    rule;
    valueStr = '';
    indexStr = '';
    isArrayStaticField = false;
    isIndexConstant = true;
    isStaticFieldConstant = false;
    isRecursiveStart = false;
    recursiveTime = 0;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (arkFile) => {
        for (let clazz of arkFile.getClasses()) {
            this.constantCheckByArkMethods(clazz.getMethods());
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (let clazz of namespace.getClasses()) {
                this.constantCheckByArkMethods(clazz.getMethods());
            }
        }
    };
    constantCheckByArkMethods(methods) {
        let blocks = undefined;
        for (let method of methods) {
            blocks = method.getCfg()?.getBlocks();
            if (!blocks) {
                continue;
            }
            let blockValues = blocks.values();
            for (let i = 0; i < blocks.size; i++) {
                let value = blockValues.next().value;
                if (!value) {
                    continue;
                }
                let stmts = value.getStmts();
                this.constantCheckByArkStmts(stmts, i, blocks, blockValues, method);
            }
        }
    }
    constantCheckByArkStmts(stmts, index, blocks, blockValues, method) {
        for (let stmt of stmts) {
            if (!(stmt instanceof Stmt_1.ArkIfStmt)) {
                continue;
            }
            if (Index_1.CheckerUtils.getScopeType(stmt) !== Index_1.ScopeType.FOR_CONDITION_TYPE && Index_1.CheckerUtils.getScopeType(stmt) !== Index_1.ScopeType.WHILE_TYPE) {
                continue;
            }
            let variableMap = new Map();
            let externalVariables = [];
            externalVariables = this.getExternalVariables(index, blocks);
            const value = blockValues.next().value;
            if (!value) {
                continue;
            }
            const cyclicStmt = value.stmts[0];
            if (!cyclicStmt) {
                continue;
            }
            const cyclicScope = cyclicStmt.scope;
            index++;
            if (!cyclicScope) {
                continue;
            }
            let cyclicStmts = this.getCyclicStmts(cyclicScope, method);
            if (Index_1.CheckerUtils.getScopeType(stmt) === Index_1.ScopeType.FOR_CONDITION_TYPE) {
                variableMap = this.getVariableMap(externalVariables, cyclicStmts, cyclicScope);
                const conditionExpr = stmt.getConditionExpr();
                const op1 = conditionExpr.getOp1();
                this.setVariableMapByValue(op1, variableMap, stmt);
            }
            this.initData();
            this.constantCheckByCycliStmts(cyclicStmts, variableMap, '');
        }
    }
    setVariableMapByValue(op1, variableMap, stmt) {
        if (op1 instanceof Local_1.Local) {
            variableMap.set(op1.getName(), stmt.getOriginPositionInfo().getLineNo());
        }
    }
    constantCheckByCycliStmts(stmts, variableMap, operator) {
        for (let stmt of stmts) {
            let leftName = '';
            if (stmt instanceof Stmt_1.ArkAssignStmt) {
                this.constantCheckByAssignStmt(leftName, stmt, variableMap, operator);
            }
            else if (stmt instanceof Stmt_1.ArkIfStmt) {
                this.checkByIfStmt(variableMap, operator, stmt);
                this.checkReportAndInit(leftName, stmt);
            }
        }
    }
    constantCheckByAssignStmt(leftOpName, stmt, variableMap, operator) {
        let rightOp = stmt.getRightOp();
        let leftOp = stmt.getLeftOp();
        if (leftOp instanceof Local_1.Local) {
            leftOpName = leftOp.getName();
            if (leftOpName.startsWith('%') && !this.isRecursiveStart) {
                return;
            }
        }
        if (rightOp instanceof Ref_1.ArkStaticFieldRef) {
            this.checkByStaticFieldRef(rightOp, variableMap, operator, stmt);
        }
        else if (rightOp instanceof Expr_1.AbstractBinopExpr) {
            this.checkByBinopExpr(rightOp, variableMap, operator, stmt);
        }
        else if (rightOp instanceof Ref_1.ArkArrayRef) {
            this.checkByArrayRef(rightOp, variableMap, operator);
        }
        else {
            this.dealWithElse(stmt);
        }
        this.checkReportAndInit(leftOpName, stmt);
    }
    checkByStaticFieldRef(rightOp, variableMap, operator, stmt) {
        const staticFieldStr = this.getValueStr(rightOp);
        if (!variableMap.has(staticFieldStr)) {
            this.isStaticFieldConstant = true;
            if (this.isArrayStaticField) {
                if (this.indexStr === '') {
                    this.indexStr = staticFieldStr;
                }
                else {
                    this.indexStr = this.indexStr + ' ' + operator + ' ' + staticFieldStr;
                }
            }
            else {
                if (this.valueStr === '') {
                    this.valueStr = staticFieldStr;
                }
                else {
                    this.valueStr = this.valueStr + ' ' + operator + ' ' + staticFieldStr;
                }
            }
        }
        else {
            this.dealWithElse(stmt);
        }
    }
    checkByBinopExpr(rightOp, variableMap, operator, stmt) {
        const uses = rightOp.getUses();
        for (let use of uses) {
            if (!(use instanceof Local_1.Local)) {
                continue;
            }
            let useName = use.getName();
            if (useName.includes('%')) {
                const declaringStmt = use.getDeclaringStmt();
                if (declaringStmt && declaringStmt !== stmt) {
                    operator = rightOp.getOperator();
                    this.recursiveTime++;
                    this.isRecursiveStart = true;
                    this.constantCheckByCycliStmts([declaringStmt], variableMap, operator);
                    this.recursiveTime--;
                }
            }
            else if (!variableMap.has(useName)) {
                this.withoutVariableMapOperation(useName, operator);
            }
            else {
                this.dealWithElse(stmt);
            }
        }
    }
    checkByArrayRef(rightOp, variableMap, operator) {
        this.isArrayStaticField = false;
        let arrayValueStr = '';
        const rightOpBase = rightOp.getBase();
        const declaringStmt = rightOpBase.getDeclaringStmt();
        if (!(declaringStmt instanceof Stmt_1.ArkAssignStmt)) {
            return;
        }
        const declaringStmtRightOp = declaringStmt.getRightOp();
        if (declaringStmtRightOp instanceof Ref_1.ArkStaticFieldRef) {
            arrayValueStr = this.getValueStr(declaringStmtRightOp);
            this.isArrayStaticField = arrayValueStr !== '';
        }
        if (this.isArrayStaticField) {
            const index = rightOp.getIndex();
            const indexName = index.getName();
            if (indexName.startsWith('%')) {
                this.handleRecursiveIndex(index, variableMap, operator);
            }
            else {
                this.handleNonRecursiveIndex(indexName, variableMap, operator);
            }
            if (this.indexStr.length > 0) {
                arrayValueStr = this.isIndexConstant ? arrayValueStr + '[' + this.indexStr + ']' : this.indexStr;
            }
            this.valueStr = this.valueStr ? this.valueStr + ' ' + operator + ' ' + arrayValueStr : arrayValueStr;
        }
    }
    handleRecursiveIndex(index, variableMap, operator) {
        const indexDeclaringStmt = index.getDeclaringStmt();
        if (indexDeclaringStmt) {
            this.recursiveTime++;
            this.isRecursiveStart = true;
            this.constantCheckByCycliStmts([indexDeclaringStmt], variableMap, operator);
            this.recursiveTime--;
        }
    }
    handleNonRecursiveIndex(indexName, variableMap, operator) {
        if (!variableMap.has(indexName)) {
            if (this.isArrayStaticField) {
                this.isStaticFieldConstant = true;
            }
            this.updateIndexStr(indexName, operator);
        }
    }
    updateIndexStr(indexName, operator) {
        if (this.indexStr === '') {
            this.indexStr = indexName;
        }
        else {
            this.indexStr = this.indexStr + ' ' + operator + ' ' + indexName;
        }
    }
    checkByIfStmt(variableMap, operator, stmt) {
        const conditionExpr = stmt.getConditionExpr();
        const op1 = conditionExpr.getOp1();
        if (op1 instanceof Local_1.Local) {
            const op1Name = op1.getName();
            if (op1Name.startsWith('%')) {
                const declaringStmt = op1.getDeclaringStmt();
                if (declaringStmt) {
                    this.recursiveTime++;
                    this.isRecursiveStart = true;
                    this.constantCheckByCycliStmts([declaringStmt], variableMap, operator);
                    this.recursiveTime--;
                }
            }
        }
    }
    checkReportAndInit(leftName, stmt) {
        if (this.isStaticFieldConstant && ((!leftName.startsWith('%') && !this.isRecursiveStart) ||
            (this.isRecursiveStart && this.recursiveTime === 0))) {
            this.pushIssueReports(this.valueStr, stmt);
        }
        if (this.recursiveTime === 0) {
            this.initData();
        }
    }
    initData() {
        this.valueStr = '';
        this.indexStr = '';
        this.isStaticFieldConstant = false;
        this.isRecursiveStart = false;
        this.isArrayStaticField = false;
        this.isIndexConstant = true;
    }
    dealWithElse(stmt) {
        if (this.isStaticFieldConstant && this.isRecursiveStart && this.valueStr !== '') {
            this.pushIssueReports(this.valueStr, stmt);
        }
        if (this.isArrayStaticField && this.isRecursiveStart) {
            this.isIndexConstant = true;
        }
        if (this.valueStr !== '') {
            this.valueStr = '';
        }
    }
    withoutVariableMapOperation(useName, operator) {
        if (this.isArrayStaticField) {
            if (this.indexStr === '') {
                this.indexStr = useName;
            }
            else {
                this.indexStr = this.indexStr + ' ' + operator + ' ' + useName;
            }
        }
        else {
            if (this.valueStr === '') {
                this.valueStr = useName;
            }
            else {
                this.valueStr = this.valueStr + ' ' + operator + ' ' + useName;
            }
        }
    }
    getValueStr(rightOp) {
        let valueString = '';
        if (rightOp instanceof Ref_1.ArkStaticFieldRef) {
            const classSignature = rightOp.getFieldSignature().getDeclaringSignature();
            const className = classSignature.getClassName();
            const fieldName = rightOp.getFieldName();
            valueString = className + '.' + fieldName;
            const declaringNamespaceSignature = classSignature.getDeclaringNamespaceSignature();
            if (declaringNamespaceSignature) {
                const nameSpace = declaringNamespaceSignature.getNamespaceName();
                valueString = nameSpace + '.' + valueString;
            }
        }
        else if (rightOp instanceof Local_1.Local) {
            valueString = rightOp.getName();
        }
        return valueString;
    }
    getVariableMap(externalVariables, stmts, scope) {
        let variableMap = new Map();
        for (let stmt of stmts) {
            if (stmt instanceof Stmt_1.ArkAssignStmt) {
                let leftOp = stmt.getLeftOp();
                if (leftOp instanceof Local_1.Local) {
                    this.getVariableMapByLocal(leftOp, externalVariables, stmt, variableMap);
                }
                else if (leftOp instanceof Ref_1.ArkStaticFieldRef) {
                    let classSignature = leftOp.getFieldSignature().getDeclaringSignature();
                    let className = classSignature.getClassName();
                    let fieldName = leftOp.getFieldName();
                    let staticFieldStr = className + '.' + fieldName;
                    variableMap.set(staticFieldStr, stmt.getOriginPositionInfo().getLineNo());
                }
            }
        }
        const defList = scope.defList;
        for (let defItem of defList) {
            const redefInfoSize = defItem.redefInfo.size;
            if (redefInfoSize > 0) {
                variableMap.set(defItem.getName(), defItem.defStmt.getOriginPositionInfo().getLineNo());
            }
        }
        return variableMap;
    }
    getVariableMapByLocal(leftOp, externalVariables, stmt, variableMap) {
        let leftOpName = leftOp.getName();
        for (let externalVariable of externalVariables) {
            if (leftOpName === externalVariable) {
                if (Index_1.CheckerUtils.isDeclaringStmt(leftOpName, stmt)) {
                    let index = externalVariables.indexOf(externalVariable);
                    externalVariables.splice(index, 1);
                }
                else {
                    variableMap.set(leftOpName, stmt.getOriginPositionInfo().getLineNo());
                }
            }
        }
    }
    getCyclicStmts(scope, method) {
        let stmts = [];
        let blocks = scope.blocks;
        let baseBlocks = [];
        for (let block of blocks) {
            baseBlocks.push(block);
        }
        let startStmt = baseBlocks[0].getStmts()[0];
        let lastBlockStmts = baseBlocks[baseBlocks.length - 1].getStmts();
        let endStmt = lastBlockStmts[lastBlockStmts.length - 1];
        let isAdd = false;
        let methodStmts = method.getCfg()?.getStmts();
        if (methodStmts) {
            for (let stmt of methodStmts) {
                if (stmt === startStmt) {
                    isAdd = true;
                }
                else if (stmt === endStmt && isAdd) {
                    stmts.push(stmt);
                    break;
                }
                if (isAdd) {
                    stmts.push(stmt);
                }
            }
        }
        return stmts;
    }
    getExternalVariables(index, blocks) {
        let externalVariables = [];
        let blockValues = blocks.values();
        for (let i = 0; i <= index; i++) {
            if (i === index) {
                break;
            }
            let stmts = blockValues.next().value?.getStmts();
            if (!stmts) {
                continue;
            }
            for (let stmt of stmts) {
                let externalName = this.getDeclaringName(stmt);
                if (externalName !== '' && !this.isExist(externalName, externalVariables)) {
                    externalVariables.push(externalName);
                }
            }
        }
        return externalVariables;
    }
    isExist(checkData, checkDatas) {
        for (let data of checkDatas) {
            if (data === checkData) {
                return true;
            }
        }
        return false;
    }
    getDeclaringName(stmt) {
        let def = stmt.getDef();
        if (def instanceof Local_1.Local) {
            if (def.getName() === 'this') {
                return '';
            }
            if (Index_1.CheckerUtils.wherIsTemp(stmt) === Index_1.TempLocation.LEFT || Index_1.CheckerUtils.isDeclaringStmt(def.getName(), stmt)) {
                return def.getName();
            }
        }
        return '';
    }
    isExistIssueReport(defect) {
        for (let issue of this.issues) {
            if (defect.defect.fixKey === issue.defect.fixKey && defect.defect.mergeKey === issue.defect.mergeKey) {
                return true;
            }
        }
        return false;
    }
    pushIssueReports(checkText, stmt) {
        let warnInfo = this.getWarnInfo(checkText, stmt);
        if ((warnInfo.filePath === '' && warnInfo.line === -1)) {
            this.initData();
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        if (this.isExistIssueReport(new Defects_1.IssueReport(defect, undefined))) {
            this.initData();
            return;
        }
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        this.initData();
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
        return { line: lineNo, startCol: startColum, endCol: endColumn, filePath: filePath };
    }
}
exports.ConstantPropertyReferencingInLoopsCheck = ConstantPropertyReferencingInLoopsCheck;
