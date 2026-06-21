"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoLossOfPrecisionCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-loss-of-precision.md',
    description: 'This number literal will lose precision at runtime.'
};
class NoLossOfPrecisionCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    ;
    check = (targetMtd) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        const stmts = targetMtd.getBody()?.getCfg().getStmts() ?? [];
        stmts.forEach((stmt) => {
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                return;
            }
            ;
            const originalText = stmt.getOriginalText();
            if (!originalText) {
                return;
            }
            ;
            const trimmedText = originalText?.trim();
            const parts = originalText?.split('=');
            const right = stmt.getRightOp();
            if (right instanceof arkanalyzer_1.ArkNormalBinopExpr) {
                this.checkBinaryExpression(stmt, originalText, parts, severity);
                return;
            }
            ;
            if (!trimmedText || !(right?.getType() instanceof arkanalyzer_1.NumberType) || parts?.length !== 2) {
                return;
            }
            ;
            const originalTextValue = parts[1].trim().replace(/;$/, '');
            const cleanedNumberStr = originalTextValue.replace(/_/g, '');
            const numberStr = cleanedNumberStr.toString();
            if (!this.isNumber(numberStr)) {
                return;
            }
            ;
            const numberValue = this.getNumberValue(numberStr, stmt);
            if (this.checkIntegerstartsWithZero(stmt, numberStr, numberValue, originalTextValue, severity)) {
                return;
            }
            if (this.checkIntegerRange(stmt, numberStr, numberValue, originalTextValue, severity)) {
                return;
            }
            ;
            if (this.checkExponentAndMantissa(stmt, numberStr, originalText, severity)) {
                return;
            }
            ;
            if (this.checkDecimalPart(stmt, numberStr, originalText, severity)) {
                return;
            }
            ;
        });
    };
    checkBinaryExpression(stmt, originalText, parts, severity) {
        if (parts.length !== 2) {
            return;
        }
        ;
        const rightExpression = parts[1].trim().replace(/;$/, '');
        const numberRegex = /\b0\d+\b/g;
        const matches = rightExpression.match(numberRegex);
        if (matches) {
            // 检查每个匹配到的数字
            for (const match of matches) {
                if (this.isDecimalNumber(match)) {
                    continue;
                }
                if (match.length > 2 && match.startsWith('0') &&
                    !match.startsWith('0x') && !match.startsWith('0X') &&
                    !match.startsWith('0b') && !match.startsWith('0B') &&
                    !match.startsWith('0o') && !match.startsWith('0O')) {
                    this.addIssueReport(stmt, match, severity);
                    return;
                }
                ;
            }
            ;
        }
        ;
    }
    ;
    checkIntegerstartsWithZero(stmt, numberStr, numberValue, originalTextValue, severity) {
        if (this.isDecimalNumber(numberStr)) {
            return false;
        }
        ;
        if (numberStr.length > 1 &&
            numberStr.startsWith('0') &&
            !numberStr.startsWith('0x') &&
            !numberStr.startsWith('0X') &&
            !numberStr.startsWith('0b') &&
            !numberStr.startsWith('0B') &&
            !numberStr.startsWith('0o') &&
            !numberStr.startsWith('0O')) {
            if (numberStr.length > 2) {
                this.addIssueReport(stmt, originalTextValue, severity);
                return true;
            }
            ;
            if (/^0\d+$/.test(numberStr)) {
                this.addIssueReport(stmt, originalTextValue, severity);
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    /**
     * 检查是否是小数
     */
    isDecimalNumber(str) {
        return str.includes('.') || /^0\.\d+$/.test(str);
    }
    ;
    checkIntegerRange(stmt, numberStr, numberValue, originalTextValue, severity) {
        let isIntegerInRange = originalTextValue.includes('e') || originalTextValue.includes('E');
        if (!isIntegerInRange && (numberValue > Number.MAX_SAFE_INTEGER || numberValue < Number.MIN_SAFE_INTEGER)) {
            const lastDigit = originalTextValue[originalTextValue.length - 1];
            if (lastDigit === '0' && !originalTextValue.includes('.')) {
                numberStr = stmt.getRightOp().toString();
            }
            else {
                this.addIssueReport(stmt, originalTextValue, severity);
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkExponentAndMantissa(stmt, numberStr, originalText, severity) {
        if (numberStr.includes('e') || numberStr.includes('E')) {
            const [mantissa, exponent] = numberStr.split(/[eE]/);
            const expNum = parseInt(exponent, 10);
            if (expNum > 308 || expNum < -308) {
                const value = originalText.split('=')[1].trim();
                this.addIssueReport(stmt, value, severity);
                return true;
            }
            ;
            const mantissaDecimalPart = mantissa.split('.')[1];
            if (mantissaDecimalPart && mantissaDecimalPart.length > 15) {
                const value = originalText.split('=')[1].trim();
                this.addIssueReport(stmt, value, severity);
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkDecimalPart(stmt, numberStr, originalText, severity) {
        const decimalPart = numberStr.split('.')[1];
        if (decimalPart) {
            if (decimalPart.length > 15) {
                const normalizedDecimalPart = decimalPart.replace(/0+$/, '');
                if (normalizedDecimalPart.length > 1) {
                    const value = originalText.split('=')[1].trim();
                    this.addIssueReport(stmt, value, severity);
                    return true;
                }
                ;
            }
            else {
                const num = parseFloat(numberStr).toString();
                if (num !== numberStr) {
                    const value = originalText.split('=')[1].trim();
                    this.addIssueReport(stmt, value, severity);
                    return true;
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    getNumberValue(numberStr, stmt) {
        if (numberStr.startsWith('0x') || numberStr.startsWith('0X')) {
            return parseInt(numberStr, 16);
        }
        else if (numberStr.startsWith('0o') || numberStr.startsWith('0O')) {
            return +stmt.getRightOp();
        }
        else if (numberStr.startsWith('0b') || numberStr.startsWith('0B')) {
            return +stmt.getRightOp();
        }
        else if (numberStr.includes('e') || numberStr.includes('E')) {
            return parseFloat(numberStr);
        }
        else {
            return parseFloat(numberStr);
        }
        ;
    }
    ;
    isNumber(isNumber) {
        const isNumericLiteral = /^-?(0[bB][01_]+|0[oO][0-7_]+|0[xX][0-9a-fA-F_]+|[0-9_]*\.?[0-9_]+([eE][-+]?[0-9_]+)?)$/;
        const isNumberConstantValue = isNumericLiteral.test(isNumber);
        return isNumberConstantValue;
    }
    ;
    addIssueReport(stmt, name, severity) {
        const warnInfo = this.getLineAndColumn(stmt, name);
        const defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    ;
    getLineAndColumn(stmt, name) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            let originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            const pos = originText.indexOf(name);
            if (pos !== -1) {
                startCol += pos;
                const endCol = startCol + name.length - 1;
                const originPath = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile().getFilePath();
                return { line, startCol, endCol, filePath: originPath };
            }
            ;
        }
        ;
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    ;
}
exports.NoLossOfPrecisionCheck = NoLossOfPrecisionCheck;
;
