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
exports.NoUnusedExpressionsCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const CheckerUtils_1 = require("../../utils/checker/CheckerUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnusedExpressionsCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/no-unused-expressions.md',
    description: 'Expected an assignment or function call and instead saw an expression.',
};
//结果类型
var ExpType;
(function (ExpType) {
    ExpType["Tag"] = "tag";
    ExpType["func"] = "function";
    ExpType["allowShortCircuit"] = "allowShortCircuit";
    ExpType["allowTernary"] = "allowTernary";
    ExpType["allowTaggedTemplates"] = "allowTaggedTemplates";
})(ExpType || (ExpType = {}));
const defaultOptions = {
    allow: {
        allowShortCircuit: false,
        allowTaggedTemplates: false,
        allowTernary: false,
    },
};
const assignmentPattern = /^\(?[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[a-zA-Z_][a-zA-Z0-9_]*\)?$/;
// 匹配有效的函数调用，例如 'f()' 或 'f(a, b)'
const functionCallPattern = /^[a-zA-Z_][a-zA-Z0-9_]*\s*\([a-zA-Z0-9_,\s]*\)$/;
const pressfuncReg = /^[a-zA-Z]\w*\s*\($/;
const funcCallReg = /^\s*[a-zA-Z_]\w*\s*\(/;
const loopOrConditionReg = /^\s*(for|if|while|switch|with)\s*\(.*\)\s*{/;
const isTaggedStringReg = /^[a-zA-Z]\s+'.*`$/;
const isfunCallReg = /^\s*(\w+\s*\([^)]*\)|\([^)]+\))\s*\.\w+\([^)]*\)\s*$/;
const isAssignDefaultStatementReg = /^(?!.*!=|==|===)(?!\d+=)(?:(?:[^=\d]*=\s*)?delete\s+.*|[^=\d]+=\s*[^!=].*|(?:var|let|const)\s+\w+\s*=\s*[^!=].*)$/;
const logicalAssignReg = /^\s*\w+\s*(\&\&=|\|\|=|\?\?=)\s*.+$/; //逻辑赋值语句
const isFilterAsginReg = /^\s*(?:var|let|const)\s+\w+\s*(?::\s*\w+)?\s*=(?!=)/;
const includeOperator = /[+\-*/]/;
class NoUnusedExpressionsCheck {
    metaData = gMetaData;
    textTernary = ''; //存放三元表达式信息---->锁定三元表达相关语句;
    textTernaryBefor = ''; //存放三元表达式信息---->锁定三元表达相关语句;
    textCircuit = ''; //存放逻辑运算信息信息---->锁定|| &&相关语句;
    textCircuitBefor = ''; //存放逻辑运算信息信息---->锁定|| &&相关语句;
    TernaryErrorCount = 0;
    CircuitErrorCount = 0;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.clsMatcher,
            callback: this.check,
        };
        return [matchBuildCb];
    }
    check = (arkClass) => {
        this.arkFieldExpressionsProcess(arkClass);
    };
    //类体
    arkFieldExpressionsProcess(arkClass) {
        const options = this.rule.option;
        const mergedOptions = {
            ...defaultOptions,
            ...options,
        };
        let exportLineNo = 100000;
        const inNamespace = arkClass.getDeclaringArkNamespace();
        if (inNamespace) {
            const exports = inNamespace?.getExportInfos() ?? [];
            exportLineNo = exports.length > 0 ? exports[0].getOriginTsPosition()?.getLineNo() : -1;
        }
        const arkMethods = arkClass.getMethods();
        const staticMethod = arkClass.getMethodWithName('%statBlock0');
        staticMethod ? arkMethods.push(staticMethod) : arkMethods;
        let noUsedExpression = [];
        for (const arkMethod of arkMethods) {
            const stmts = arkMethod.getBody()?.getCfg().getStmts() ?? []; //获取方法体的所有语句()
            //执行体
            this.expressionsProcess(stmts, mergedOptions, noUsedExpression, exportLineNo);
        }
    }
    //方法体
    expressionsProcess(stmts, mergedOptions, noUsedExpression, exportLineNo) {
        this.processExpress(stmts, noUsedExpression, exportLineNo);
        noUsedExpression = this.filterUnuseds(mergedOptions, noUsedExpression);
        //装配报错信息
        for (const noUsed of noUsedExpression) {
            this.addIssueReport(noUsed, noUsed.originalText);
        }
    }
    checkExpression(noUsedExpression, nowline) {
        for (let i = 0; i < noUsedExpression.length; i++) {
            const item = noUsedExpression[i];
            const lineNo = item.stmt.getOriginPositionInfo().getLineNo() ?? -1;
            if (lineNo === nowline) {
                return true;
            }
        }
        return false;
    }
    //判断是否是未使用
    isNoExpression(stmt) {
        const leftOp = stmt.getLeftOp();
        const originalText = stmt.getOriginalText() ?? '';
        const rightOp = stmt.getRightOp();
        if ((leftOp.name?.startsWith('%') && leftOp.usedStmts?.length === 0) && !this.isrightOpExpr(rightOp, originalText)) {
            return true;
        }
        return false; // Return false if the condition is not met.
    }
    isrightOpExpr(rightOp, originalText) {
        const isInvokeExpr = rightOp instanceof lib_1.AbstractInvokeExpr;
        const isNewArrayExpr = rightOp instanceof lib_1.ArkNewArrayExpr;
        const originalTextfunc = loopOrConditionReg.test(originalText);
        const isAbstractBinopExpr = rightOp instanceof lib_1.AbstractBinopExpr;
        const originalTextPres = ((originalText?.startsWith('new') && !originalText.includes('.')) ||
            originalText?.startsWith('void') || originalText?.startsWith('await') || originalText?.startsWith('yield') ||
            isFilterAsginReg.test(originalText) || originalText?.startsWith('delete') || originalText?.startsWith('export'));
        if (!isAbstractBinopExpr && (isInvokeExpr || isNewArrayExpr || originalTextfunc || originalTextPres)) {
            return true;
        }
        else if (originalText?.startsWith('const')) {
            return true;
        }
        return false;
    }
    isCircuit(rightOp) {
        if (rightOp instanceof lib_1.ArkNormalBinopExpr) {
            let Operator = rightOp.getOperator();
            let Op2 = rightOp.getOp2();
            Op2.declaringStmt;
            if (Operator === '&&' || Operator === '||') {
                return true;
            }
        }
        return false;
    }
    allowShortCircuitExpressions(rightOp) {
        if (rightOp instanceof lib_1.ArkNormalBinopExpr) {
            let Operator = rightOp.getOperator();
            let Op2 = rightOp.getOp2();
            Op2.declaringStmt;
            let isExpression = false;
            if (Op2.declaringStmt instanceof lib_1.ArkAssignStmt &&
                !this.isNoExpression(Op2.declaringStmt)) {
                isExpression = true;
            }
            const declareStmtOp = Op2?.declaringStmt ? Op2.declaringStmt : Op2?.promise?.declaringStmt;
            if ((Operator === '&&' || Operator === '||') && (declareStmtOp && (CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(declareStmtOp)))) {
                return true;
            }
        }
        return false;
    }
    allowTernaryExpressions(Op) {
        const rightOrLeft = Op;
        let isExpression = false;
        if (rightOrLeft.declaringStmt instanceof lib_1.ArkAssignStmt &&
            !this.isNoExpression(rightOrLeft.declaringStmt)) {
            isExpression = true;
        }
        if (Op instanceof lib_1.AbstractInvokeExpr || isExpression) {
            return true;
        }
        return false;
    }
    isValidTernary(expression) {
        // 用于存储问号和冒号的索引
        const stack = [];
        let questionIndex = -1;
        let colonIndex = -1;
        // 遍历表达式，记录问号和冒号的索引
        for (let i = 0; i < expression.length; i++) {
            const char = expression[i];
            if (char === '?') {
                if (stack.length === 0) {
                    questionIndex = i;
                }
                stack.push('?');
            }
            else if (char === ':') {
                if (stack.length === 1) {
                    colonIndex = i;
                }
                stack.pop();
            }
        }
        // 如果没有问号或冒号，表示没有有效的三元表达式
        if (questionIndex === -1 || colonIndex === -1) {
            return false;
        }
        // 获取问号之前、问号之后到冒号之前、冒号之后的表达式
        const beforeQuestion = expression.substring(0, questionIndex).trim();
        const betweenQuestionAndColon = expression
            .substring(questionIndex + 1, colonIndex)
            .trim();
        const afterColon = expression.substring(colonIndex + 1).trim();
        // 如果任何一个部分为空，表示表达式不完整
        if (!beforeQuestion || !betweenQuestionAndColon || !afterColon) {
            return false;
        }
        return betweenQuestionAndColon !== '' && !betweenQuestionAndColon.startsWith('.');
    }
    // 判断普通的表达式是否有效
    isValidExpression(expression) {
        // 判断是否是有效的赋值表达式或函数调用
        return (assignmentPattern.test(expression) || functionCallPattern.test(expression));
    }
    //检查三元表达方程执行符串是否是函数
    isPressfunc(expression) {
        // 检查一个表达式是否可能是函数调用
        function isFunction(expr) {
            return pressfuncReg.test(expr.trim());
        }
        // 分割表达式并检查每个部分
        function splitAndCheck(expr) {
            // 查找第一个问号和对应的冒号
            const questionIndex = expr.indexOf('?');
            const colonIndex = expr.indexOf(':');
            // 如果没有问号或冒号，表示没有更多的三元表达式
            if (questionIndex === -1 || colonIndex === -1) {
                return false;
            }
            // 检查问号是否在冒号之前
            if (questionIndex > colonIndex) {
                return false;
            }
            // 获取问号之前、问号之后到冒号之前、冒号之后的表达式
            const beforeQuestion = expr.substring(0, questionIndex).trim();
            const betweenQuestionAndColon = expr
                .substring(questionIndex + 1, colonIndex)
                .trim();
            const afterColon = expr.substring(colonIndex + 1).trim();
            // 检查问号之后和冒号之后的表达式是否是函数
            if (!isFunction(betweenQuestionAndColon) || !isFunction(afterColon)) {
                return false;
            }
            // 递归检查问号之前的表达式``
            return splitAndCheck(beforeQuestion);
        }
        // 开始递归检查整个表达式
        return splitAndCheck(expression);
    }
    //allowTaggedTemplates--->true
    isTaggedString(expression) {
        // 正则表达式解释：
        // ^[a-zA-Z] - 字符串以一个字母开始
        // \\s+ - 后面跟着一个或多个空格
        // ' - 然后是一个双引号
        // .* - 引号内可以包含任意字符
        // '$ - 以双引号结束
        return isTaggedStringReg.test(expression);
    }
    filterUnuseds(mergedOptions, unuseds) {
        //开启检查
        //1.本地检查
        if (mergedOptions.allow.allowShortCircuit === true) {
            unuseds = unuseds.filter((item) => !(item.exptype === ExpType.allowShortCircuit));
        }
        //1.1是否过滤变量
        if (mergedOptions.allow.allowTaggedTemplates === true) {
            unuseds = unuseds.filter((item) => !(item.exptype === ExpType.allowTaggedTemplates));
        }
        //2.函数参数 (忽略最后调用之前--默认值)
        if (mergedOptions.allow.allowTernary === true) {
            unuseds = unuseds.filter((item) => !(item.exptype === ExpType.allowTernary));
        }
        return unuseds;
    }
    //判断是否是赋值语句
    isAssignDefaultStatement(text) {
        let containsInvalidChars = false;
        if (text.length === 0) {
            return true;
        }
        // 正则表达式用于检查字符串是否包含赋值操作符（=），
        // 确保赋值操作符的左边不是纯数字，
        //     ^：字符串的开始。
        // (?!\d+=)：负向前瞻断言，确保字符串不是以数字后跟等号开始的。
        // (?: ... )：非捕获组，用于组合多个选择。
        // (?:[^=\d]*=\s*)?：匹配零个或多个不是等号或数字的字符，后跟一个等号和任意数量的空白字符。整个组是可选的，以便 “delete” 可以在字符串的开始位置。
        // delete\s+：匹配 “delete” 字符串后跟至少一个空格。
        // .*：匹配任意数量的任意字符（除了换行符）。
        // |：逻辑“或”操作符，用于分隔两个选择。
        // [^=\d]+=.*$：匹配不是等号或数字的字符后跟等号，然后是任意数量的任意字符直到字符串的末尾。
        // (?:var|let|const)\s+：匹配 var、let 或 const 后跟至少一个空格。  const pattern = /^(?!\d+=)(?:(?:[^=\d]*=\s*)?delete\s+.*|[^=\d]+=.*$)/;
        containsInvalidChars = isAssignDefaultStatementReg.test(text);
        return !text.startsWith('/') && containsInvalidChars;
    }
    isAssignText(text) {
        const result = text.split('=');
        return result.length >= 2 && result[1] !== '';
    }
    addIssueReport(noUsedExpression, name) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(noUsedExpression.stmt, name);
        if (noUsedExpression.posion) {
            warnInfo.line = noUsedExpression.posion[0];
            warnInfo.startCol = noUsedExpression.posion[1];
            warnInfo.endCol = noUsedExpression.posion[1];
        }
        const defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.defects.push(defect);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getLineAndColumn(stmt, name) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            const pos = originText.indexOf(name);
            if (pos !== -1) {
                startCol += pos;
                const endCol = startCol + name.length - 1;
                const originPath = arkFile.getFilePath();
                return { line, startCol, endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    processExpress(stmts, noUsedExpression, exportLineNo) {
        let prevStm = stmts[0];
        for (const index in stmts) {
            const statement = stmts[index];
            const nowline = statement.getOriginPositionInfo().getLineNo() ?? -1;
            const originalText = statement.getOriginalText() ?? '';
            const isValidTernary = statement instanceof lib_1.ArkAssignStmt &&
                (this.isValidTernary(statement.getRightOp().toString()) || this.funcInTernary(originalText));
            let exists = this.checkExpression(noUsedExpression, nowline);
            exists = this.execPress(originalText, isValidTernary, noUsedExpression, prevStm, nowline);
            prevStm = this.execAsignStmt(statement, prevStm, originalText, exists, isValidTernary, noUsedExpression, index, stmts, nowline, exportLineNo);
            const invockeStmt = CheckerUtils_1.CheckerUtils.getInvokeExprFromAwaitStmt(statement);
            this.execInvoke(invockeStmt, noUsedExpression, exists, statement, originalText);
        }
    }
    //处理 (function(){}) ? a() : b();
    funcInTernary(text) {
        return !this.isAssignText(text) && this.isValidTernary(text);
    }
    execPress(originalText, isValidTernary, noUsedExpression, prevStm, nowline) {
        let exists = false;
        this.execText(originalText, isValidTernary);
        if (this.textTernaryBefor !== '') {
            if (!exists && this.TernaryErrorCount === 0) {
                noUsedExpression.push({
                    stmt: prevStm,
                    originalText: this.textTernaryBefor,
                    exptype: ExpType.allowTernary,
                });
            }
            else if (!this.textTernaryBefor.startsWith('await') && !funcCallReg.test(this.textTernaryBefor.trim())) {
                noUsedExpression.push({
                    stmt: prevStm,
                    originalText: this.textTernaryBefor,
                });
            }
            this.textTernary = '';
            this.textTernaryBefor = '';
            this.TernaryErrorCount = 0;
        }
        if (this.textCircuitBefor !== '' && !logicalAssignReg.test(this.textCircuitBefor)) {
            exists = this.checkExpression(noUsedExpression, nowline);
            if (!exists && this.CircuitErrorCount === 0 && !this.isAssignText(this.textCircuitBefor) && !this.textCircuitBefor.startsWith('await')) {
                noUsedExpression.push({
                    stmt: prevStm,
                    originalText: this.textCircuitBefor,
                    exptype: ExpType.allowShortCircuit,
                });
            }
            else {
                noUsedExpression.push({
                    stmt: prevStm,
                    originalText: this.textCircuit,
                });
            }
            this.textCircuit = '';
            this.textCircuitBefor = '';
            this.CircuitErrorCount = 0;
        }
        return exists;
    }
    execPressV(currentOriginalText, leftOp, rightOp) {
        const leftOPScene = leftOp;
        const isCircuit = this.isCircuit(rightOp) && leftOPScene?.usedStmts?.length === 0 && leftOp.toString().startsWith('%');
        if (this.textCircuit === '' && isCircuit && !logicalAssignReg.test(currentOriginalText)) {
            this.textCircuit = currentOriginalText;
        }
        if (this.textTernary !== '' && currentOriginalText === this.textTernary) {
            let isValidTernary;
            if (leftOp.toString().startsWith('%')) {
                isValidTernary = this.allowTernaryExpressions(rightOp);
            }
            else {
                isValidTernary = true;
            }
            if (!isValidTernary) {
                this.TernaryErrorCount++;
            }
        }
        if (this.textCircuit === currentOriginalText &&
            !this.allowShortCircuitExpressions(rightOp)) {
            this.CircuitErrorCount += 1;
        }
        return isCircuit;
    }
    execText(originalText, isValidTernary) {
        if (this.textTernary !== '' && originalText !== this.textTernary) {
            this.textTernaryBefor = this.textTernary;
        }
        if (this.textCircuit !== '' && originalText !== this.textCircuit) {
            this.textCircuitBefor = this.textCircuit;
        }
        if (this.textTernary === '' && isValidTernary) {
            this.textTernary = originalText;
        }
    }
    execEnd(index, stmts, noUsedExpression, nowline, statement, exists) {
        //排除最后还有语句
        if (Number(index) === stmts.length - 1) {
            if (this.textTernaryBefor !== '') {
                exists = this.checkExpression(noUsedExpression, nowline);
                if (!exists && this.TernaryErrorCount === 0) {
                    noUsedExpression.push({
                        stmt: statement,
                        originalText: this.textTernary,
                        exptype: ExpType.allowTernary,
                    });
                }
                else {
                    noUsedExpression.push({
                        stmt: statement,
                        originalText: this.textTernary,
                    });
                }
                this.textTernary = '';
                this.textTernaryBefor = '';
                this.TernaryErrorCount = 0;
            }
            if (this.textCircuitBefor !== '') {
                exists = this.checkExpression(noUsedExpression, nowline);
                if (!exists && this.CircuitErrorCount === 0) {
                    noUsedExpression.push({
                        stmt: statement,
                        originalText: this.textCircuit,
                        exptype: ExpType.allowShortCircuit,
                    });
                }
                else {
                    noUsedExpression.push({
                        stmt: statement,
                        originalText: this.textCircuit,
                    });
                }
                this.textCircuit = '';
                this.textCircuitBefor = '';
                this.CircuitErrorCount = 0;
            }
        }
        return exists;
    }
    execInvoke(invockeStmt, noUsedExpression, exists, statement, originalText) {
        if (invockeStmt) {
            const args = invockeStmt.getArgs();
            //排除特殊情况 
            const invokeName = invockeStmt?.getMethodSignature()?.getMethodSubSignature()?.getMethodName() ?? '';
            const originalText = statement.getOriginalText() ?? '';
            const isAssign = this.isAssignText(originalText) ||
                (originalText.startsWith('new') && !originalText.includes('.'));
            const otherTions = ['await', 'log', 'Boolean', 'RegExp', 'info', 'err'];
            const isTagTem = !originalText.includes('(') || (originalText.includes('(') && originalText.includes('`') && !originalText.includes(').'));
            if (isTagTem && !isAssign && !exists && !otherTions.includes(invokeName) && args.some((item) => item.toString().startsWith('%') && !(item.getType() instanceof lib_1.FunctionType))) {
                noUsedExpression.push({
                    stmt: statement,
                    originalText: originalText,
                    exptype: ExpType.allowTaggedTemplates,
                });
            }
        }
    }
    execAsignStmt(statement, prevStm, originalText, exists, isValidTernary, noUsedExpression, index, stmts, nowline, exportLineNo) {
        if (statement instanceof lib_1.ArkAssignStmt) {
            prevStm = statement;
            const leftOp = statement.getLeftOp();
            const rightOp = statement.getRightOp();
            if (leftOp.toString() === 'this') {
                return prevStm;
            }
            const isCircuit = this.execPressV(originalText, leftOp, rightOp);
            if (!exists &&
                !isCircuit &&
                !isValidTernary &&
                this.isNoExpression(statement)) {
                if (this.isAssignDefaultStatement(rightOp.toString()) || logicalAssignReg.test(rightOp.toString()) || this.isKeyWord(originalText)) {
                    return prevStm;
                }
                else if (!this.removeSemicolonAndCheckExclamation(originalText) && !this.isFunctionCall(originalText) &&
                    (!this.isFirstStringNoAsgin(index, leftOp, rightOp, originalText) ||
                        (this.isFirstStringNoAsgin(index, leftOp, rightOp, originalText) && nowline > exportLineNo))) {
                    noUsedExpression.push({
                        stmt: statement,
                        originalText: originalText,
                    });
                }
            }
            exists = this.execEnd(index, stmts, noUsedExpression, nowline, statement, exists);
        }
        return prevStm;
    }
    isFirstStringNoAsgin(index, leftOp, rightOp, originalText) {
        const num = Number(index) ?? -1;
        const result = (num === 1 && leftOp.toString() === '%0' && rightOp.getType() instanceof lib_1.StringType &&
            (originalText.trim().startsWith('\'') || originalText.trim().startsWith('\"'))) && !includeOperator.test(originalText);
        return result;
    }
    removeSemicolonAndCheckExclamation(originalText) {
        // 如果以分号结尾，删除分号
        if (originalText.endsWith(';')) {
            originalText = originalText.slice(0, -1);
        }
        // 判断是否以 "!" 结尾
        return originalText.endsWith('!') && !originalText.includes('==');
    }
    isFunctionCall(originalText) {
        // 如果以分号结尾，删除分号
        if (originalText.endsWith(';')) {
            originalText = originalText.slice(0, -1);
        }
        // 判断是否以 "!" 结尾
        return isfunCallReg.test(originalText) || (originalText.startsWith('/') && originalText.endsWith(')'));
    }
    isKeyWord(text) {
        const keywords = ['yield'];
        return keywords.includes(text);
    }
}
exports.NoUnusedExpressionsCheck = NoUnusedExpressionsCheck;
