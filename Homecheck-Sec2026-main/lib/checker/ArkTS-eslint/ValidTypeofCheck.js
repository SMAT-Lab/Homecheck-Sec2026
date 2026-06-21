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
exports.ValidTypeofCheck = void 0;
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
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ValidTypeofCheck');
const VALID_TYPES = new Set(['symbol', 'undefined', 'object', 'boolean', 'number', 'string', 'function', 'bigint']);
const OPERATORS = new Set(['==', '===', '!=', '!==']);
class ValidTypeofCheck {
    TYPEOF_NAME = 'typeof';
    defaultOptions = [{ requireStringLiterals: false }];
    messageId = 'invalidValue';
    messages = {
        invalidValue: 'Invalid typeof comparison value',
        notString: 'Typeof comparisons should be to string literals',
    };
    rule;
    defects = [];
    issues = [];
    textIndexCache = new Map();
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/valid-typeof.md',
        description: 'Invalid typeof comparison value.',
    };
    fieldMatcher = {
        matcherType: Index_1.MatcherTypes.FIELD,
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
    };
    methodMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        class: [this.clsMatcher],
        file: [this.fileMatcher],
    };
    registerMatchers() {
        const methodMatcherCb = {
            matcher: this.methodMatcher,
            callback: this.check,
        };
        const fieldMatcherCb = {
            matcher: this.fieldMatcher,
            callback: this.check,
        };
        return [methodMatcherCb, fieldMatcherCb];
    }
    check = (target) => {
        if (!this.rule) {
            return;
        }
        ;
        this.defaultOptions = this.rule.option[0] ?
            this.rule.option :
            this.defaultOptions;
        if (target instanceof arkanalyzer_1.ArkMethod) {
            const stmts = target.getBody()?.getCfg().getStmts() ?? [];
            for (const stmt of stmts) {
                this.checkArkMethod(stmt);
            }
            ;
        }
        else {
            let stmts = target.getInitializer();
            for (const stmt of stmts) {
                this.checkArkField(stmt);
            }
            ;
        }
        ;
        // 清理缓存
        this.textIndexCache.clear();
    };
    checkArkField(stmt) {
        let text = stmt.getOriginalText() ?? '';
        if (text.indexOf('typeof') == -1) {
            return;
        }
        ;
        if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return;
        }
        ;
        let rightOp = stmt.getRightOp();
        if (rightOp instanceof arkanalyzer_1.ArkConditionExpr && OPERATORS.has(rightOp.getOperator())) {
            this.checkExpr(stmt, text, rightOp);
        }
        ;
    }
    ;
    checkArkMethod(stmt) {
        let text = stmt.getOriginalText() ?? '';
        if (text.indexOf('typeof') == -1) {
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkIfStmt) {
            let exprs = stmt.getExprs();
            for (let i = 0; i < exprs.length; i++) {
                let expr = exprs[i];
                if (expr instanceof arkanalyzer_1.ArkConditionExpr && OPERATORS.has(expr.getOperator())) {
                    this.checkExpr(stmt, text, expr);
                }
                ;
            }
            ;
        }
        ;
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            if (rightOp instanceof arkanalyzer_1.ArkConditionExpr && OPERATORS.has(rightOp.getOperator())) {
                this.checkExpr(stmt, text, rightOp);
            }
            else if (rightOp instanceof arkanalyzer_1.ArkNormalBinopExpr && OPERATORS.has(rightOp.getOperator())) {
                this.checkExpr(stmt, text, rightOp);
            }
            ;
        }
        ;
    }
    ;
    checkExpr(stmt, text, rightOp) {
        const op1 = rightOp.getOp1();
        const op2 = rightOp.getOp2();
        const op1IsTypeOf = op1 instanceof arkanalyzer_1.ArkTypeOfExpr;
        const op2IsTypeOf = op2 instanceof arkanalyzer_1.ArkTypeOfExpr;
        if (!op1IsTypeOf && !op2IsTypeOf) {
            return;
        }
        if (op1IsTypeOf && !op2IsTypeOf) {
            this.checkMode(stmt, text, op2, rightOp);
        }
        else if (!op1IsTypeOf && op2IsTypeOf) {
            this.checkMode(stmt, text, op1, rightOp);
        }
    }
    checkMode(stmt, text, op, rightOp) {
        if (op instanceof Constant_1.StringConstant) {
            this.checkIsString(stmt, text, op, rightOp);
        }
        else {
            if (!this.defaultOptions[0].requireStringLiterals) {
                if (this.checkParameter(stmt, text, op, rightOp)) {
                    return;
                }
                ;
            }
            if (op instanceof Constant_1.UndefinedConstant) {
                this.checkIsUndefined(stmt, text, op, rightOp);
            }
            else if (op instanceof Constant_1.NullConstant || op instanceof Constant_1.BooleanConstant || op instanceof Constant_1.NumberConstant) {
                this.checkIsNullIsBooleanIsNumber(stmt, text, op, rightOp);
            }
            else {
                this.checkIsObjectIsFunction(stmt, text, op, rightOp);
            }
            ;
        }
        ;
    }
    ;
    checkParameter(stmt, text, op, rightOp) {
        let method = stmt.getCfg()?.getDeclaringMethod();
        if (!method) {
            return false;
        }
        ;
        let parameter = method.getParameterInstances();
        if (parameter && parameter.length > 0) {
            for (const param of parameter) {
                if (param.toString() === op.toString()) {
                    return true;
                }
            }
        }
        return false;
    }
    ;
    // 字符串的场景
    checkIsString(stmt, text, op, rightOp) {
        let str = op.getValue();
        if (!VALID_TYPES.has(str)) {
            this.messageId = 'invalidValue';
            // 处理 带转义符的字符串
            if (text.indexOf('\\') !== -1) {
                str = this.getRightOpStr(text, rightOp);
            }
            ;
            this.addIssueReport(stmt, text, str, op);
        }
        ;
    }
    ;
    checkIsUndefined(stmt, text, op, rightOp) {
        this.messageId = this.defaultOptions[0].requireStringLiterals ? 'notString' : 'invalidValue';
        let str = this.getOpValue(op, text, rightOp);
        this.addIssueReport(stmt, text, str, op);
    }
    ;
    checkIsNullIsBooleanIsNumber(stmt, text, op, rightOp) {
        this.messageId = 'invalidValue';
        let str = this.getOpValue(op, text, rightOp);
        this.addIssueReport(stmt, text, str, op);
    }
    ;
    checkIsObjectIsFunction(stmt, text, op, rightOp) {
        if (this.defaultOptions[0].requireStringLiterals) {
            this.messageId = 'notString';
            let str = this.getOpValue(op, text, rightOp);
            this.addIssueReport(stmt, text, str, op);
        }
        ;
    }
    ;
    getOpValue(op, text, rightOp) {
        if (op instanceof arkanalyzer_1.Local) {
            // 处理模板字符串的情况 处理数组字面量的情况 处理方法调用的情况 处理对象调用的情况
            if (text.indexOf('`') !== -1 ||
                text.indexOf('[') !== -1 && text.indexOf(']') !== -1 ||
                op.getDeclaringStmt()?.getRightOp() instanceof arkanalyzer_1.AbstractInvokeExpr ||
                op.getDeclaringStmt()?.getRightOp() instanceof arkanalyzer_1.AbstractFieldRef) {
                return this.getRightOpStr(text, rightOp);
            }
            else {
                return op.toString();
            }
            ;
        }
        else if (op instanceof Constant_1.UndefinedConstant || op instanceof Constant_1.NullConstant ||
            op instanceof Constant_1.BooleanConstant || op instanceof Constant_1.NumberConstant) {
            return op.getValue();
        }
        ;
        return this.getRightOpStr(text, rightOp);
    }
    ;
    getRightOpStr(text, rightOp) {
        // 目前底座无法获取模板字符串的源码，只能通过originalText源码的操作符进行截取
        let str = '';
        if (rightOp instanceof arkanalyzer_1.ArkConditionExpr) {
            let operator = rightOp.getOperator();
            str = text.split(operator)[1].trim().replace('`', '');
        }
        ;
        return str;
    }
    ;
    addIssueReport(stmt, text, opValue, op) {
        this.metaData.description = this.messages[this.messageId];
        const warnInfo = this.getLineAndColumn(stmt, text, opValue, op);
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    getLineAndColumn(stmt, text, opValue, op) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (!arkFile) {
            logger.debug('originStmt or arkFile is null');
            return { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        ;
        const index = text.indexOf(opValue);
        const startCol = this.getStartCol(stmt, index, text, opValue, op);
        const endCol = startCol + opValue.length;
        const filePath = arkFile.getFilePath();
        return { line, startCol, endCol, filePath };
    }
    ;
    getStartCol(stmt, index, text, opValue, op) {
        if (this.messageId == 'notString') {
            if (op instanceof arkanalyzer_1.Local && op.getType().toString() == 'string' && this.isStringType(opValue)) {
                return stmt.getOriginPositionInfo().getColNo() + index - 1;
            }
            ;
            return stmt.getOriginPositionInfo().getColNo() + index;
        }
        else if (this.messageId == 'invalidValue') {
            if (op instanceof Constant_1.UndefinedConstant || op instanceof Constant_1.NullConstant ||
                op instanceof Constant_1.BooleanConstant || op instanceof Constant_1.NumberConstant) {
                return stmt.getOriginPositionInfo().getColNo() + index;
            }
            ;
            return stmt.getOriginPositionInfo().getColNo() + index - 1;
        }
        ;
        return -1;
    }
    ;
    isStringType(opValue) {
        return /['"`]/.test(opValue);
    }
}
exports.ValidTypeofCheck = ValidTypeofCheck;
