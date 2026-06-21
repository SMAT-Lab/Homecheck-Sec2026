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
exports.RestrictPlusOperandsCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_2 = require("../../model/Defects");
const defaultOptions = {
    allowAny: true,
    allowBoolean: true,
    allowNullish: true,
    allowNumberAndString: true,
    allowRegExp: true,
    skipCompoundAssignments: false
};
;
;
;
;
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'RestrictPlusOperandsCheck');
const gmetaData = {
    severity: 2,
    ruleDocPath: 'docs/restrict-plus-operands.md',
    description: 'Require both operands of addition to be the same type and be bigint, number, or string.'
};
class RestrictPlusOperandsCheck {
    metaData = gmetaData;
    rule;
    defects = [];
    issues = [];
    left = '';
    right = '';
    type = '';
    stringLike = '';
    warnLeftOp = false;
    operands = null;
    messageId = 'bigintAndNumber';
    get messages() {
        return {
            // 当一个操作数是 bigint 类型，另一个是 number 类型时触发
            bigintAndNumber: "Numeric '+' operations must either be both bigints or both numbers. Got `" + this.left + "` + `" + this.right + "`.",
            // 以下情况会触发：
            // 1. 类型是 Symbol、Never 或 Unknown
            // 2. 不允许 any 类型时使用 any
            // 3. 不允许 boolean 类型时使用 boolean
            // 4. 不允许 null/undefined 时使用 nullish 值
            // 5. 不允许 RegExp 时使用正则表达式
            // 6. 使用深层对象类型
            invalid: "Invalid operand for a '+' operation. Operands must each be a number or " + this.stringLike + "." + this.type,
            // 当不允许数字和字符串混合使用时（allowNumberAndString = false）
            mismatched: "Operands of '+' operations must be a number or " + this.stringLike + ". Got `" + this.left + "` + `" + this.right + "`.",
        };
    }
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    classMatcher = {
        file: [this.fileMatcher],
        matcherType: Matchers_1.MatcherTypes.CLASS
    };
    methodMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        class: [this.classMatcher]
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.methodMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    ;
    check = (method) => {
        try {
            let declareClass = method.getDeclaringArkClass();
            const arkFile = declareClass.getDeclaringArkFile();
            // 将规则选项转换为Options类型
            let options = this.getOptions();
            // 遍历方法体中的所有语句
            let stmts = method.getBody()?.getCfg().getStmts() ?? [];
            if (stmts.length === 0) {
                return;
            }
            ;
            for (let stmt of stmts) {
                this.processStatement(stmt, arkFile, options);
            }
        }
        catch (error) {
            logger.debug('Error in RestrictPlusOperandsCheck:', error);
        }
    };
    getOptions() {
        let options = { ...defaultOptions };
        if (this.rule && this.rule.option.length > 0) {
            // 将配置文件中的选项合并到默认配置中
            options = {
                ...options,
                ...this.rule.option[0] // 覆盖配置文件中指定的选项
            };
        }
        ;
        return options;
    }
    processStatement(stmt, arkFile, options) {
        // 获取语句的原始文本
        let text = stmt.getOriginalText() ?? '';
        if (!text) {
            return;
        }
        ;
        let rightOp = undefined;
        // 获取赋值语句的右侧操作数
        if (stmt instanceof lib_1.ArkThrowStmt) {
            rightOp = stmt.getOp();
        }
        else if (stmt instanceof lib_1.ArkAssignStmt) {
            rightOp = stmt.getRightOp();
        }
        ;
        if (!rightOp) {
            return;
        }
        ;
        // 如果右侧操作数不是二元操作符表达式或者操作符不是加号，则跳过
        if (!(rightOp instanceof lib_1.AbstractBinopExpr) || rightOp.getOperator() !== '+' || text.includes('++')) {
            return;
        }
        ;
        if (options.skipCompoundAssignments && text.includes('+=')) {
            return;
        }
        ;
        this.handleBinaryOperation(stmt, arkFile, rightOp, options);
    }
    handleBinaryOperation(stmt, arkFile, rightOp, options) {
        // 获取赋值语句的原始文本
        let textPlus = stmt.getOriginalText() ?? '';
        // 获取二元操作符表达式的两个操作数
        let op1 = rightOp.getOp1();
        let op2 = rightOp.getOp2();
        // 处理加号两边的操作数类型
        let { op1Type, op2Type } = this.processPlusOperandTypes(op1, op2, textPlus, stmt);
        // 获取加号两边的操作数名称
        let op1Name = op1?.toString() ?? '';
        let op2Name = op2?.toString() ?? '';
        // 执行通用检查，如果检查结果为true，则添加问题报告
        this.typeDifferent(stmt, arkFile, op1Name, op2Name, op1Type, op2Type, options);
    }
    processPlusOperandTypes(op1, op2, textPlus, stmt) {
        // 获取初始类型
        let op1Type = this.getTypeString(op1, stmt);
        let op2Type = this.getTypeString(op2, stmt);
        // 处理赋值表达式中的 BigInt
        const equalRightValue = this.extractEqualRightValue(textPlus);
        if (equalRightValue) {
            this.operands = this.extractPlusOperands(equalRightValue);
            if (this.operands) {
                const { leftValue, rightValue } = this.operands;
                op1Type = this.isBigIntType(leftValue, op1Type) ? 'bigint' : op1Type;
                op2Type = this.isBigIntType(rightValue, op2Type) ? 'bigint' : op2Type;
                if (op1Type.startsWith('%') && this.operands.leftValue.includes('as')) {
                    op1Type = this.operands.leftValue.split('as')[1].trim();
                }
                ;
                if (op2Type.startsWith('%') && this.operands.rightValue.includes('as')) {
                    op2Type = this.operands.rightValue.split('as')[1].trim();
                }
                ;
            }
            ;
        }
        ;
        // 处理非赋值表达式中的占位符类型
        if (textPlus.indexOf('=') === -1) {
            if (op1Type.startsWith('%')) {
                const leftValue = this.extractPlusOperands(textPlus)?.leftValue.replace(';', '');
                op1Type = leftValue ?? op1Type;
            }
            ;
            if (op2Type.startsWith('%')) {
                const rightValue = this.extractPlusOperands(textPlus)?.rightValue.replace(';', '');
                op2Type = rightValue ?? op2Type;
            }
            ;
        }
        ;
        return { op1Type, op2Type };
    }
    editBigIntType(op, stmt) {
        let opTypeStr = op.getType().getTypeString() ?? '';
        let opStmt = op.getDeclaringStmt();
        if (opStmt && opStmt instanceof lib_1.ArkAssignStmt) {
            let text = opStmt.getOriginalText() ?? '';
            if (!text) {
                return opTypeStr;
            }
            let value = this.extractEqualRightValue(text);
            if (value && this.isBigIntType(value, opTypeStr)) {
                return 'bigint'; // 修正这里为bigInt类型
            }
            ;
        }
        ;
        let defaultType = this.getGlobalType(op, stmt);
        if (defaultType) {
            return defaultType;
        }
        ;
        return opTypeStr;
    }
    getGlobalType(op, stmt) {
        const declareMethod = stmt.getCfg().getDeclaringMethod();
        // 从当前的方法中查找op的类型
        if (!declareMethod) {
            return '';
        }
        ;
        const locals = declareMethod.getBody()?.getLocals();
        if (!locals) {
            return '';
        }
        ;
        const name = locals.get(op.getType().getTypeString() ?? '');
        if (name) {
            return name.getType().getTypeString() ?? 'unknown';
        }
        ;
        // 从当前的类中查找op的类型
        const declareClass = declareMethod.getDeclaringArkClass();
        if (!declareClass) {
            return '';
        }
        ;
        const methods = declareClass.getMethods();
        if (!methods) {
            return '';
        }
        ;
        for (const method of methods) {
            if (method.getName() === op.getName()) {
                return method.getSignature().toString() ?? 'unknown';
            }
            ;
        }
        ;
        return '';
    }
    extractPlusOperands(expression) {
        // 从表达式中提取加号两边的值
        const operandsPattern = /^([^+]+?)\s*\+\s*([^+]+?)$/;
        const operandsMatch = expression.match(operandsPattern);
        if (!operandsMatch) {
            return null;
        }
        ;
        return {
            leftValue: operandsMatch[1].trim(),
            rightValue: operandsMatch[2].trim() // "1"
        };
    }
    extractEqualRightValue(code) {
        // 匹配等号右边的值，考虑可能的空格
        const pattern = /=\s*([^;]*?)\s*;?$/;
        const match = code.match(pattern);
        return match ? match[1].trim() : '';
    }
    getTypeString(op, stmt) {
        let type = op.getType();
        if (type instanceof lib_1.ClassType) {
            let className = type.getClassSignature().getClassName() ?? '';
            return className;
        }
        ;
        if (op instanceof lib_1.Local) {
            return this.editBigIntType(op, stmt);
        }
        ;
        return type.getTypeString() ?? '';
    }
    getStringLike(options) {
        const stringLikes = [
            options.allowAny && '`any`',
            options.allowBoolean && '`boolean`',
            options.allowNullish && '`null`',
            options.allowRegExp && '`RegExp`',
            options.allowNullish && '`undefined`',
        ]
            .filter((value) => typeof value === 'string');
        return stringLikes.length
            ? stringLikes.length === 1
                ? `string, allowing a string + ${stringLikes[0]}`
                : `string, allowing a string + any of: ${stringLikes.join(', ')}`
            : 'string';
    }
    isBigIntLiteral(code) {
        // 移除所有空白字符
        const trimmedCode = code.replace(/\s/g, '');
        // 匹配 BigInt 字面量模式：数字后面跟着 n
        const bigIntPattern = /^-?\d+n$/;
        // 特别处理二进制、八进制、十六进制的 BigInt
        const binaryPattern = /^-?0b[01]+n$/i;
        const octalPattern = /^-?0o[0-7]+n$/i;
        const hexPattern = /^-?0x[\da-f]+n$/i;
        return bigIntPattern.test(trimmedCode) ||
            binaryPattern.test(trimmedCode) ||
            octalPattern.test(trimmedCode) ||
            hexPattern.test(trimmedCode);
    }
    isBigIntType(value, typeString) {
        // 检查类型标注是否为 bigint
        if (typeString === 'bigint' || typeString === 'BigInt') {
            return true;
        }
        ;
        // 检查是否为 BigInt 字面量
        if (this.isBigIntLiteral(value)) {
            return true;
        }
        ;
        // 检查是否为 BigInt 构造函数调用
        const bigIntConstructorPattern = /^BigInt\s*\([^)]*\)$/;
        return bigIntConstructorPattern.test(value.trim());
    }
    isValidType(type) {
        return type === 'number' || type === 'bigint' || type === 'string';
    }
    checkTypeCombo(type1, type2, targetType, allowOption) {
        const hasValidAndTarget = (this.isValidType(type1) && type2 === targetType) ||
            (this.isValidType(type2) && type1 === targetType);
        if (!hasValidAndTarget) {
            return false;
        }
        ;
        if (allowOption !== undefined && allowOption) {
            return false;
        }
        ;
        if (type1 === targetType) {
            this.warnLeftOp = true;
        }
        ;
        return true;
    }
    checkNumberTypeCombo(type1, type2, targetType, allowOption) {
        const hasNumberAndTarget = (this.isNumberType(type1) && type2 === targetType) ||
            (this.isNumberType(type2) && type1 === targetType);
        if (!hasNumberAndTarget) {
            return false;
        }
        ;
        if (allowOption !== undefined && allowOption) {
            return false;
        }
        ;
        if (type1 === targetType) {
            this.warnLeftOp = true;
        }
        ;
        return true;
    }
    isNumberType(type) {
        return type === 'number' || type === 'bigint';
    }
    typeDifferent(stmt, arkFile, op1Name, op2Name, op1TypeString, op2TypeString, options) {
        if (op1TypeString === 'unknown' && op2TypeString === 'unknown') {
            return;
        }
        ;
        const params = {
            stmt, arkFile, op1Name, op2Name,
            op1TypeString, op2TypeString, options
        };
        // 检查基本类型组合
        this.checkBasicTypes(params);
        // 检查数字和字符串组合
        this.checkNumberStringCombo(params);
        // 检查 bigint 和 number 混合使用
        this.checkBigintNumberCombo(params);
        // 检查其他自定义类型
        this.checkCustomTypes(params);
    }
    checkBasicTypes(params) {
        const { op1TypeString, op2TypeString, options } = params;
        // any 类型检查
        if (op1TypeString === 'any' || op2TypeString === 'any') {
            this.checkTypeAndReport(params, 'any', options.allowAny);
        }
        ;
        // boolean 类型检查
        if (op1TypeString === 'boolean' || op2TypeString === 'boolean') {
            this.checkTypeAndReport(params, 'boolean', options.allowBoolean);
        }
        ;
        // null/undefined 类型检查
        if (this.isNullish(op1TypeString) || this.isNullish(op2TypeString)) {
            this.checkNullishTypes(params);
        }
        ;
        // RegExp 类型检查
        if (op1TypeString === 'RegExp' || op2TypeString === 'RegExp') {
            this.checkRegExpType(params);
        }
        ;
    }
    checkTypeAndReport(params, targetType, allowOption) {
        const { op1TypeString, op2TypeString } = params;
        if (this.checkTypeCombo(op1TypeString, op2TypeString, targetType, allowOption)) {
            this.type = targetType;
            this.stringLike = this.getStringLike(params.options);
            this.messageId = 'invalid';
            this.addIssueReport(params.stmt, params.arkFile, params.options, op1TypeString, op2TypeString, params.op1Name, params.op2Name);
        }
        ;
    }
    isNullish(type) {
        return type === 'null' || type === 'undefined';
    }
    checkNumberStringCombo(params) {
        const { op1TypeString, op2TypeString, options } = params;
        if (!options.allowNumberAndString && this.isStringNumberCombo(op1TypeString, op2TypeString)) {
            const isStringFirst = op1TypeString === 'string';
            this.left = isStringFirst ? 'string' : op1TypeString;
            this.right = isStringFirst ? op2TypeString : 'string';
            this.stringLike = this.getStringLike(options);
            this.messageId = 'mismatched';
            this.addIssueReport(params.stmt, params.arkFile, options, op1TypeString, op2TypeString, params.op1Name, params.op2Name);
        }
        ;
    }
    isStringNumberCombo(type1, type2) {
        return (type1 === 'string' && this.isNumberType(type2)) ||
            (type2 === 'string' && this.isNumberType(type1));
    }
    checkBigintNumberCombo(params) {
        const { op1TypeString, op2TypeString } = params;
        if (this.isBigintNumberCombo(op1TypeString, op2TypeString)) {
            const isBigintFirst = op1TypeString === 'bigint';
            this.left = isBigintFirst ? 'bigint' : 'number';
            this.right = isBigintFirst ? 'number' : 'bigint';
            this.messageId = 'bigintAndNumber';
            this.warnLeftOp = isBigintFirst;
            this.addIssueReport(params.stmt, params.arkFile, params.options, op1TypeString, op2TypeString, params.op1Name, params.op2Name);
        }
        ;
    }
    isBigintNumberCombo(type1, type2) {
        return (type1 === 'bigint' && type2 === 'number') ||
            (type1 === 'number' && type2 === 'bigint');
    }
    checkCustomTypes(params) {
        const { op1TypeString, op2TypeString } = params;
        if (op1TypeString === op2TypeString) {
            return;
        }
        ;
        const validTypes = ['number', 'bigint', 'string', 'unknown', 'boolean', 'null', 'undefined', 'RegExp', 'any'];
        [op1TypeString, op2TypeString].forEach((type, index) => {
            if (!validTypes.includes(type)) {
                this.type = type.indexOf('/') !== -1 && type.indexOf('%') !== -1 ? '' : ' Got `' + type + '`.';
                this.stringLike = this.getStringLike(params.options);
                this.messageId = 'invalid';
                this.warnLeftOp = index === 0;
                this.addIssueReport(params.stmt, params.arkFile, params.options, op1TypeString, op2TypeString, params.op1Name, params.op2Name);
            }
            ;
        });
    }
    checkNullishTypes(params) {
        const { op1TypeString, op2TypeString, options } = params;
        // 检查 null 类型
        if (this.checkTypeCombo(op1TypeString, op2TypeString, 'null', options.allowNullish)) {
            this.type = 'null';
            this.stringLike = this.getStringLike(options);
            this.messageId = 'invalid';
            this.addIssueReport(params.stmt, params.arkFile, options, op1TypeString, op2TypeString, params.op1Name, params.op2Name);
        }
        ;
        // 检查 undefined 类型
        if (this.checkTypeCombo(op1TypeString, op2TypeString, 'undefined', options.allowNullish)) {
            this.type = 'undefined';
            this.stringLike = this.getStringLike(options);
            this.messageId = 'invalid';
            this.addIssueReport(params.stmt, params.arkFile, options, op1TypeString, op2TypeString, params.op1Name, params.op2Name);
        }
        ;
    }
    checkRegExpType(params) {
        const { op1TypeString, op2TypeString, options } = params;
        if (this.checkNumberTypeCombo(op1TypeString, op2TypeString, 'RegExp') ||
            this.checkTypeCombo(op1TypeString, op2TypeString, 'RegExp', options.allowRegExp)) {
            this.type = 'RegExp';
            this.stringLike = this.getStringLike(options);
            this.messageId = 'invalid';
            this.addIssueReport(params.stmt, params.arkFile, options, op1TypeString, op2TypeString, params.op1Name, params.op2Name);
        }
        ;
    }
    addIssueReport(stmt, arkFile, options, op1TypeString, op2TypeString, op1String, op2String) {
        // 确定 messageId
        const op1TypeStringCheck = op1TypeString ?? '';
        const op2TypeStringCheck = op2TypeString ?? '';
        const op1StringCheck = op1String ?? '';
        const op2StringCheck = op2String ?? '';
        const optionsCheck = options ?? defaultOptions;
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt, arkFile, optionsCheck, op1TypeStringCheck, op2TypeStringCheck, op1StringCheck, op2StringCheck);
        if (warnInfo) {
            this.metaData.description = this.messages[this.messageId];
            const filePath = arkFile.getFilePath();
            let defects = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
            DefectsList_1.RuleListUtil.push(defects);
            this.issues.push(new Defects_2.IssueReport(defects, undefined));
            // 重置告警信息
            this.clear();
        }
        ;
    }
    getLineAndColumn(stmt, arkFile, options, op1TypeString, op2TypeString, op1String, op2String) {
        if (!arkFile) {
            logger.debug('originStmt or arkFile is null');
            return { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        ;
        // 获取行列号
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const text = stmt.getOriginalText() ?? '';
        let index = this.getTextIndex(op1String, op2String, op2TypeString, text);
        let startCol = stmt.getOriginPositionInfo().getColNo() + index;
        let endCol = -1;
        if (this.warnLeftOp) {
            endCol = startCol + (this.operands?.leftValue.length ?? 0) - 1;
        }
        else {
            endCol = startCol + (this.operands?.rightValue.length ?? 0);
        }
        ;
        const filePath = arkFile.getFilePath();
        return { line, startCol, endCol, filePath };
    }
    getTextIndex(op1String, op2String, op2TypeString, text) {
        let index = -1;
        if (this.warnLeftOp) {
            if (op1String.includes('%') && this.operands?.leftValue) {
                index = text.split('+')[0].lastIndexOf(this.operands?.leftValue);
                index = this.operands?.leftValue.startsWith('(') ? index + 1 : index;
            }
            else {
                index = text.indexOf(op1String);
            }
            ;
        }
        else {
            if (op2TypeString === '{}') {
                index = text.indexOf(op2TypeString);
            }
            else if (op2String.includes('%')) {
                index = text.split('+')[0].lastIndexOf(this.operands?.rightValue ?? op2String);
                index = this.operands?.rightValue.startsWith('(') ? index + 1 : index;
            }
            else {
                index = text.indexOf(op2String);
            }
            ;
        }
        ;
        return index;
    }
    clear() {
        this.left = '';
        this.right = '';
        this.type = '';
        this.stringLike = '';
        this.warnLeftOp = false;
        this.operands = null;
    }
}
exports.RestrictPlusOperandsCheck = RestrictPlusOperandsCheck;
