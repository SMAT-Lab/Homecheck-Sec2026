"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixUtils = void 0;
const arkanalyzer_1 = require("arkanalyzer");
class FixUtils {
    static getRangeStart(arkFile, codeNode) {
        let lineNum = 0;
        let startColumn = 0;
        if (codeNode instanceof arkanalyzer_1.Stmt) {
            let originalPosition = codeNode.getOriginPositionInfo();
            lineNum = originalPosition.getLineNo();
            startColumn = originalPosition.getColNo();
        }
        else if (codeNode instanceof arkanalyzer_1.ArkMethod) {
            lineNum = codeNode.getLine() ?? 0;
            startColumn = codeNode.getColumn() ?? 0;
        }
        else if (codeNode instanceof arkanalyzer_1.ArkClass) {
            lineNum = codeNode.getLine() ?? 0;
            startColumn = codeNode.getColumn() ?? 0;
        }
        else if (codeNode instanceof arkanalyzer_1.ExportInfo) {
            let originalPosition = codeNode.getOriginTsPosition();
            lineNum = originalPosition.getLineNo();
            startColumn = originalPosition.getColNo();
        }
        else if (codeNode instanceof arkanalyzer_1.ImportInfo) {
            let originalPosition = codeNode.getOriginTsPosition();
            lineNum = originalPosition.getLineNo();
            startColumn = originalPosition.getColNo();
        }
        // 原文代码
        let code = arkFile.getCode();
        // 找到当前分割符所在行
        let lineBreak = this.getTextEof(code);
        let cnt = 0;
        if (lineBreak.length > 0) {
            for (let index = 1; index !== lineNum; index++) {
                cnt = code.indexOf(lineBreak, cnt + 1);
            }
        }
        let start = (cnt === 0 && startColumn === 1) ? 0 : (cnt + startColumn + 1); //对第一行第一列特殊处理，后续代码都是以0，所以需要+1
        return start;
    }
    static getTextEof(text) {
        if (text.includes('\r\n')) {
            return '\r\n';
        }
        else if (text.includes('\n')) {
            return '\n';
        }
        else if (text.includes('\r')) {
            return '\r';
        }
        else {
            return '';
        }
    }
    static isRuleFix(object) {
        return typeof object === 'object' && 'range' in object && 'text' in object;
    }
    static isFunctionFix(object) {
        return typeof object === 'object' && 'fix' in object;
    }
    static isAIFix(object) {
        return typeof object === 'object' && 'text' in object;
    }
    static hasOwnPropertyOwn(object, key) {
        return typeof object === 'object' && key in object;
    }
}
exports.FixUtils = FixUtils;
