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
exports.EsLintFixEngine = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const FixUtils_1 = require("../../utils/common/FixUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'EsLintFixEngine');
const BOM = '\uFEFF';
let eof = '\r\n';
class EsLintFixEngine {
    applyFix(arkFile, fixIssues, remainIssues) {
        let sourceText = arkFile.getCode();
        const bom = sourceText.startsWith(BOM) ? BOM : '';
        const text = bom ? sourceText.slice(1) : sourceText;
        let lastPos = Number.NEGATIVE_INFINITY;
        let output = bom;
        eof = FixUtils_1.FixUtils.getTextEof(text) || eof;
        // issue非法数据检查及排序
        const ret = this.checkAndSortIssues(fixIssues, remainIssues);
        fixIssues = ret.fixIssues, remainIssues = ret.remainIssues;
        if (fixIssues.length === 0) {
            return { defects: remainIssues.map((issue => issue.defect)), output: '', filePath: arkFile.getFilePath() };
        }
        // 深拷贝remainIssues，防止在遍历过程中修改remainIssues导致后续迭代出错
        const remainIssuesCopy = JSON.parse(JSON.stringify(remainIssues));
        for (const issue of fixIssues) {
            let fix = issue.fix;
            const start = fix.range[0];
            const end = fix.range[1];
            output += text.slice(Math.max(0, lastPos), Math.max(0, start));
            output += fix.text;
            lastPos = end;
            fix.fixed = true;
            this.updateRemainIssues(text, issue, remainIssues, remainIssuesCopy);
        }
        output += text.slice(Math.max(0, lastPos));
        return { defects: remainIssues.map((issue => issue.defect)), output: bom + output, filePath: arkFile.getFilePath() };
    }
    checkAndSortIssues(fixIssues, remainIssues) {
        const fixIssuesValid = [];
        fixIssues.forEach((issue) => {
            const fix = issue.fix;
            if (fix.range[0] <= fix.range[1] && fix.range[1] !== 0 && fix.range[0] >= 0) {
                fixIssuesValid.push(issue);
            }
            else {
                remainIssues.push(issue);
            }
        });
        return { fixIssues: fixIssuesValid.sort(this.compareIssueByRange), remainIssues: remainIssues.sort(this.compareIssueByLocation) };
    }
    compareIssueByRange(issue1, issue2) {
        let fix1 = issue1.fix;
        let fix2 = issue2.fix;
        if (FixUtils_1.FixUtils.isRuleFix(fix1) && FixUtils_1.FixUtils.isRuleFix(fix2)) {
            return fix1.range[0] - fix2.range[0] || fix1.range[1] - fix2.range[1];
        }
        else {
            return 0;
        }
    }
    compareIssueByLocation(a, b) {
        return a.defect.reportLine - b.defect.reportLine || a.defect.reportColumn - b.defect.reportColumn;
    }
    updateRemainIssues(sourceText, issue, remainIssues, remainIssuesOld) {
        if (remainIssues.length === 0) {
            return;
        }
        let fix = issue.fix;
        const start = fix.range[0];
        const end = fix.range[1];
        const fixEndCol = Number.parseInt(issue.defect.fixKey.split('%')[2]);
        const originLineNum = sourceText.slice(start, end).split(eof).length;
        const fixTextLineNUM = fix.text.split(eof).length;
        const subLine = fixTextLineNUM - originLineNum;
        for (let i = 0; i < remainIssuesOld.length; i++) {
            const defectOld = remainIssuesOld[i].defect;
            const defectOldEndCol = Number.parseInt(defectOld.fixKey.split('%')[2]);
            // 1、当前告警区域完全在修复区域之前，不做处理。注意判断需使用旧的defect信息
            if (defectOld.reportLine < issue.defect.reportLine ||
                (defectOld.reportLine === issue.defect.reportLine && defectOldEndCol < issue.defect.reportColumn)) {
                continue;
            }
            // 2、当前告警区域跟修复区域有重叠，不进行修复，直接删除该issue。TODO：该操作会导致重叠告警漏报，后续优化
            if (defectOld.reportLine === issue.defect.reportLine &&
                ((issue.defect.reportColumn < defectOld.reportColumn && defectOld.reportColumn < fixEndCol) ||
                    (issue.defect.reportColumn < defectOldEndCol && defectOldEndCol < fixEndCol))) {
                logger.warn(`The current defect area overlaps with the repair area, delete the defect, fixKey = ${defectOld.fixKey}`);
                remainIssues.splice(i, 1);
                remainIssuesOld.splice(i, 1);
                i--;
                continue;
            }
            // 注意行列号的累加需使用新的defect信息进行叠加
            const defectNew = remainIssues[i].defect;
            // 更新行号
            defectNew.reportLine += subLine;
            defectNew.fixKey = defectNew.fixKey.replace(/^[^%]*/, `${defectNew.reportLine}`);
            defectNew.mergeKey = defectNew.mergeKey.replace(/%(.*?)%/, `%${defectNew.fixKey}%`);
            // 更新列号, 当前告警跟修复issue在同一行，且在修复issue之后，需要进行列偏移
            if (defectOld.reportLine === issue.defect.reportLine) {
                const splitText = fix.text.split(eof);
                let endCol = 0;
                if (splitText.length > 1) {
                    // 单行改多行，则偏移后的列号 = fixCode最后一行的长度 + 修复之前两个告警的间隔差值subCol
                    const subCol = defectNew.reportColumn - fixEndCol;
                    const colLen = Number.parseInt(defectNew.fixKey.split('%')[2]) - defectNew.reportColumn;
                    defectNew.reportColumn = splitText[splitText.length - 1].length + subCol;
                    endCol = defectNew.reportColumn + colLen;
                }
                else {
                    // 单行改单行，则偏移后的列号 = 当前列号 + 修复后的列差（fixCode的长度 - 被替换的文本长度）
                    const subCol = fix.text.length - (end - start);
                    defectNew.reportColumn += subCol;
                    endCol = Number.parseInt(defectNew.fixKey.split('%')[2]) + subCol;
                }
                defectNew.fixKey = `${defectNew.reportLine}%${defectNew.reportColumn}%${endCol}%${defectNew.ruleId}`;
                defectNew.mergeKey = defectNew.mergeKey.replace(/%(.*?)%/, `%${defectNew.fixKey}%`);
            }
        }
    }
}
exports.EsLintFixEngine = EsLintFixEngine;
