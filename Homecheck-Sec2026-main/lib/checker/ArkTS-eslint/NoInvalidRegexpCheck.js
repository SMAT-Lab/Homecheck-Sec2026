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
exports.NoInvalidRegexpCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoInvalidRegexpCheck');
class NoInvalidRegexpCheck {
    REG_EXP = 'RegExp';
    RULE_ID = 'no-invalid-regexp';
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: "docs/no-invalid-regexp.md",
        description: "Suggestion: Disallow empty character classes in regular expressions."
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    methodMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        file: [this.fileMatcher]
    };
    registerMatchers() {
        const methodMatcherCb = {
            matcher: this.methodMatcher,
            callback: this.check,
        };
        return [methodMatcherCb];
    }
    ;
    defaultOptions = [{ 'allowConstructorFlags': [] }];
    check = (target) => {
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        const stmts = target.getBody()?.getCfg().getStmts() ?? [];
        target.getBody()?.getCfg().getStmts() ?? [];
        for (const stmt of stmts) {
            if (!(stmt instanceof arkanalyzer_1.ArkInvokeStmt)) {
                continue;
            }
            let className = stmt.getInvokeExpr()?.getMethodSignature().getMethodSubSignature().getMethodName() ?? '';
            let returnTypeName = stmt.getInvokeExpr()?.getMethodSignature().getDeclaringClassSignature().getClassName() ?? '';
            if (className === this.REG_EXP || returnTypeName === this.REG_EXP) {
                let args = stmt.getInvokeExpr()?.getArgs() ?? [];
                let flags = this.getFlags(args);
                let pattern = this.getPattern(args);
                if (pattern || flags) {
                    let result = this.isValidRegExp(pattern, flags, this.defaultOptions[0].allowConstructorFlags);
                    if (!result.isValid) {
                        this.addIssueReport(stmt, result.pattern, result.message);
                    }
                }
            }
        }
    };
    getFlags(args) {
        if (args.length < 2) {
            return '';
        }
        if (args.length === 2 && args[1] instanceof Constant_1.StringConstant) {
            if (args[1].getType().getTypeString() === 'string') {
                return args[1].getValue();
            }
        }
        return '';
    }
    ;
    getPattern(args) {
        if (args[0] instanceof Constant_1.StringConstant) {
            if (args[0].getType().getTypeString() === 'string') {
                return args[0].getValue();
            }
        }
        return '';
    }
    ;
    unescapeString(value) {
        try {
            const modifiedValue = value.replace(/\//g, '//').replace(/\\/g, '\\\\');
            return modifiedValue;
        }
        catch (error) {
            throw error; // 或者处理错误
        }
    }
    ;
    isValidRegExp(pattern, flags = '', options = []) {
        // 定义有效的标志
        const validFlags = `dgimsuvy`;
        const flagSet = new Set(flags.split(''));
        // 标志是否重复（只检查实际提供的标志）
        if (flags.length !== flagSet.size) {
            return { isValid: false, message: `Duplicate flags ('${Array.from(flagSet).join(', ')}') supplied to RegExp constructor`, pattern: pattern };
        }
        // 标志u和v不能同时使用
        if (flagSet.has('u') && flagSet.has('v')) {
            return { isValid: false, message: `Regex 'u' and 'v' flags cannot be used together`, pattern: pattern };
        }
        // 验证标志是否合法（考虑允许的标志）
        for (const flag of flagSet) {
            if (!validFlags.includes(flag) && !options?.includes(flag)) {
                // 只提示不在允许列表中的无效标志
                let endFlag = this.removeOptions(flags, options);
                return { isValid: false, message: `Invalid flags supplied to RegExp constructor '${endFlag}'`, pattern: pattern };
            }
        }
        // 验证模式是否合法
        try {
            // 构造正则表达式时，只使用原生支持的标志
            const nativeFlags = Array.from(flagSet).filter(flag => validFlags.includes(flag)).join('');
            new RegExp(pattern, nativeFlags);
            return { isValid: true, message: 'Valid RegExp', pattern: pattern };
        }
        catch (e) {
            if (e instanceof SyntaxError) {
                const nativeFlags = Array.from(flagSet).filter(flag => validFlags.includes(flag)).join('');
                // 获取经过格式化的错误消息
                const formattedMessage = this.formatRegExpErrorMessage(e.message, nativeFlags, pattern);
                return { isValid: false, message: formattedMessage, pattern: pattern };
            }
            else {
                return { isValid: false, message: 'Invalid RegExp: Unknown error', pattern: pattern };
            }
        }
    }
    ;
    removeOptions(a, b) {
        // 将字符串 a 转换为数组，以便逐个处理字符
        let result = a.split('');
        // 遍历数组 b 中的每个字符
        for (const char of b) {
            // 使用 filter 方法移除字符串 a 中的字符
            result = result.filter(c => c !== char);
        }
        return result.join('');
    }
    ;
    getLineAndColumn(stmt, pattern) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            let result = originText.includes(this.unescapeString(pattern));
            if (result && !originText.includes('this')) {
                let pos = originText.indexOf(pattern);
                if (originText.includes('new RegExp')) {
                    pos = originText.indexOf('new RegExp');
                }
                else {
                    pos = originText.indexOf('RegExp');
                }
                if (pos !== -1) {
                    startCol += pos;
                    const endCol = startCol + originText.length - 1;
                    const filePath = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile().getFilePath();
                    return { line, startCol, endCol, filePath: filePath };
                }
            }
            ;
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: 0, filePath: '' };
    }
    ;
    addIssueReport(stmt, pattern, message) {
        let currentDescription = message ? message : this.metaData.description;
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt, pattern);
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, currentDescription, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    /**
     * 格式化正则表达式错误消息
     */
    formatRegExpErrorMessage(errorMessage, flags, pattern) {
        // 如果包含"Invalid capture group name"，直接返回原始消息
        if (errorMessage.includes('Invalid capture group name')) {
            return errorMessage;
        }
        if (errorMessage.includes('Invalid flags supplied to RegExp constructor')) {
            return `Invalid regular expression: /${pattern}/${flags}: Unterminated character class`;
        }
        // 处理类似 'Invalid regular expression: /\u{65}*/: Nothing to repeat:u' 的格式
        if (errorMessage.includes(':') && errorMessage.endsWith(`:${flags}`)) {
            // 移除末尾的 `:flags`
            const basePart = errorMessage.substring(0, errorMessage.length - flags.length - 1);
            // 提取正则表达式部分和错误描述部分
            const parts = basePart.split(': ');
            if (parts.length >= 3) {
                const prefix = parts[0] + ': ';
                const regexPart = parts[1];
                const errorDesc = parts.slice(2).join(': ');
                // 在正则表达式后面添加标志
                let patternWithFlags = regexPart;
                if (regexPart.endsWith('/')) {
                    // 在结尾的/前插入标志
                    patternWithFlags = regexPart.substring(0, regexPart.length - 1) + flags + '/';
                }
                else {
                    // 如果没有结尾的/，直接添加标志
                    patternWithFlags = regexPart + flags;
                }
                return `${prefix}${patternWithFlags}: ${errorDesc}`;
            }
        }
        // 处理其他格式的错误消息
        if (errorMessage.startsWith('Invalid regular expression:')) {
            // 尝试提取正则表达式部分
            const match = errorMessage.match(/\/([^/]+)\//);
            if (match) {
                const regexContent = match[1];
                const errorParts = errorMessage.split(': ');
                const errorDesc = errorParts.length > 2 ? errorParts[errorParts.length - 1] : '';
                return `Invalid regular expression: /${regexContent}/${flags}: ${errorDesc}`;
            }
        }
        // 如果无法解析为特定格式，返回原始消息
        return errorMessage;
    }
}
exports.NoInvalidRegexpCheck = NoInvalidRegexpCheck;
