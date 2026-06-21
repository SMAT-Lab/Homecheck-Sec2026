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
exports.TypedArrayCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Local_1 = require("arkanalyzer/lib/core/base/Local");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'TypedArrayCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/typed-array-check.md',
    description: 'Array used only for numeric calculation detected. TypedArray is recommended.'
};
const binopOperator = ['+', '-', '*', '/', '%', '&', '|', '^', '>>', '<<', '>>>'];
const unopOperator = ['~'];
const unNumCalculateOpr = ['!'];
var StmtCalculateType;
(function (StmtCalculateType) {
    StmtCalculateType[StmtCalculateType["NUM_CALCULATE"] = 0] = "NUM_CALCULATE";
    StmtCalculateType[StmtCalculateType["OTHER_CALCULATE"] = 1] = "OTHER_CALCULATE";
    StmtCalculateType[StmtCalculateType["NOT_CALCULATE"] = 2] = "NOT_CALCULATE";
})(StmtCalculateType || (StmtCalculateType = {}));
var TempLocation;
(function (TempLocation) {
    TempLocation[TempLocation["NOFOUND"] = 0] = "NOFOUND";
    TempLocation[TempLocation["LEFT"] = 1] = "LEFT";
    TempLocation[TempLocation["RIGHT"] = 2] = "RIGHT";
})(TempLocation || (TempLocation = {}));
class TypedArrayCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    methodMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.methodMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (targetmethod) => {
        const stmts = targetmethod.getBody()?.getCfg().getStmts() ?? [];
        for (let stmt of stmts) {
            if (stmt instanceof lib_1.ArkAssignStmt && this.isArray(stmt)) {
                const truelyDef = this.getTruelyArrDef(stmt);
                if (truelyDef === null || !(truelyDef.getType().getBaseType() instanceof lib_1.NumberType)) {
                    continue;
                }
                let arrName = truelyDef.getName();
                let usedStmts = truelyDef.getUsedStmts();
                if (usedStmts !== undefined && arrName !== undefined && this.usedStmtProcess(usedStmts, arrName)) {
                    this.addIssueReport(stmt, arrName);
                }
            }
        }
    };
    addIssueReport(stmt, arrName) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt, arrName);
        let defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
    getLineAndColumn(stmt, arrName) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            const pos = originText.indexOf(' ' + arrName);
            if (pos !== -1) {
                const startCol = originPosition.getColNo() + pos + 1;
                const endCol = startCol + arrName.length - 1;
                const originPath = arkFile.getFilePath();
                return { line: line, startCol: startCol, endCol: endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    usedStmtProcess(usedStmts, arrName) {
        let result = false;
        for (let usedStmt of usedStmts) {
            if (this.isArrInLeft(usedStmt, arrName)) {
                continue;
            }
            let oneResult = this.isCalculatedStmt(usedStmt, arrName, false);
            if (oneResult === StmtCalculateType.NUM_CALCULATE) {
                result = true;
            }
            else if (oneResult === StmtCalculateType.OTHER_CALCULATE) {
                result = false;
                break;
            }
        }
        return result;
    }
    isArray(stmt) {
        let exprs = stmt.getExprs();
        for (let i = 0; i < exprs.length; i++) {
            let expr = exprs[i];
            if (expr instanceof lib_1.ArkNewArrayExpr) {
                return true;
            }
        }
        return false;
    }
    getTruelyArrDef(stmt) {
        let def = stmt.getDef();
        if (def instanceof Local_1.Local) {
            let tempName = def.getName();
            let usedStmts = def.getUsedStmts();
            for (let usedStmt of usedStmts) {
                if (!(usedStmt instanceof lib_1.ArkAssignStmt)) {
                    continue;
                }
                const truelyDef = this.getArrDef(usedStmt, tempName);
                if (truelyDef) {
                    return truelyDef;
                }
            }
        }
        return null;
    }
    getArrDef(stmt, tempName) {
        let right = stmt.getRightOp();
        if (right instanceof Local_1.Local && right.getName() === tempName) {
            let def = stmt.getDef();
            if (def instanceof Local_1.Local && def.getType() instanceof lib_1.ArrayType) {
                return def;
            }
        }
        return null;
    }
    isArrInLeft(stmt, arrName) {
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let def = stmt.getDef();
            if (def instanceof lib_1.ArkArrayRef) {
                let base = def.getBase();
                if (base instanceof Local_1.Local && base.getName() === arrName) {
                    return true;
                }
            }
        }
        return false;
    }
    isCalculatedStmt(stmt, arrName, flag) {
        if (stmt instanceof lib_1.ArkAssignStmt) {
            if (stmt.getExprs().length === 0) {
                return this.noEXprProcess(stmt, arrName, flag);
            }
            else {
                return this.exprProcess(stmt, arrName);
            }
        }
        return StmtCalculateType.OTHER_CALCULATE;
    }
    exprProcess(stmt, arrName) {
        let exprs = stmt.getExprs();
        for (let i = 0; i < exprs.length; i++) {
            let expr = exprs[i];
            if (expr instanceof lib_1.ArkNormalBinopExpr && binopOperator.includes(expr.getOperator())) {
                return this.binopProcess(stmt, expr, arrName);
            }
            else if (expr instanceof lib_1.ArkUnopExpr) {
                return this.unopProcess(stmt, expr, arrName);
            }
        }
        return StmtCalculateType.NOT_CALCULATE;
    }
    binopProcess(stmt, expr, arrName) {
        let tempLocation = this.whereIsTepm(stmt);
        if (expr.getOperator() === '+') {
            if (this.isNumberOp(expr.getOp1()) && this.isNumberOp(expr.getOp2())) {
                if (tempLocation === TempLocation.LEFT) {
                    return this.leftTempRecursion(stmt, arrName, true);
                }
                return StmtCalculateType.NUM_CALCULATE;
            }
            return StmtCalculateType.OTHER_CALCULATE;
        }
        else {
            if (tempLocation === TempLocation.LEFT) {
                return this.leftTempRecursion(stmt, arrName, true);
            }
            return StmtCalculateType.NUM_CALCULATE;
        }
    }
    unopProcess(stmt, expr, arrName) {
        if (unopOperator.includes(expr.getOperator())) {
            if (this.whereIsTepm(stmt) === TempLocation.LEFT) {
                return this.leftTempRecursion(stmt, arrName, true);
            }
            return StmtCalculateType.NUM_CALCULATE;
        }
        else if (unNumCalculateOpr.includes(expr.getOperator())) {
            return StmtCalculateType.OTHER_CALCULATE;
        }
        return StmtCalculateType.NOT_CALCULATE;
    }
    noEXprProcess(stmt, arrName, flag) {
        let tempLocation = this.whereIsTepm(stmt);
        if (tempLocation === TempLocation.LEFT) {
            return this.leftTempRecursion(stmt, arrName, flag);
        }
        else if (tempLocation === TempLocation.RIGHT) {
            if (flag) {
                return StmtCalculateType.NUM_CALCULATE;
            }
            else {
                return StmtCalculateType.NOT_CALCULATE;
            }
        }
        else {
            return StmtCalculateType.NOT_CALCULATE;
        }
    }
    whereIsTepm(stmt) {
        let def = stmt.getDef();
        if (def instanceof Local_1.Local) {
            if (def.getName().includes('%')) {
                return TempLocation.LEFT;
            }
        }
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let right = stmt.getRightOp();
            if (right instanceof Local_1.Local) {
                if (right.getName().includes('%')) {
                    return TempLocation.RIGHT;
                }
            }
        }
        return TempLocation.NOFOUND;
    }
    leftTempRecursion(stmt, arrName, flag) {
        let def = stmt.getDef();
        if (def instanceof Local_1.Local) {
            let usedStmts = def.getUsedStmts();
            for (let i = 0; i < usedStmts.length; i++) {
                return this.isCalculatedStmt(usedStmts[i], arrName, flag);
            }
        }
        return StmtCalculateType.NOT_CALCULATE;
    }
    isNumberOp(op) {
        if (op instanceof Local_1.Local || op instanceof lib_1.Constant) {
            let type = op.getType();
            if (type instanceof lib_1.NumberType) {
                return true;
            }
        }
        return false;
    }
}
exports.TypedArrayCheck = TypedArrayCheck;
