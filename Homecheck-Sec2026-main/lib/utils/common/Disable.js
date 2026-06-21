"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterDisableIssue = exports.DisableText = void 0;
exports.DisableText = {
    FILE_DISABLE_TEXT: '\/* homecheck-disable *\/',
    NEXT_LINE_DISABLE_TEXT: '\/\/ homecheck-disable-next-line ',
};
function filterDisableIssue(lineList, issues) {
    let filtedIssues = [];
    issues.forEach(issue => {
        // 有些特殊规则允许返回行列号为0
        if (issue.defect.reportLine < 0 || issue.defect.reportLine - 1 > lineList.length) {
            return;
        }
        const text = lineList[issue.defect.reportLine - 2];
        if (!isDisableIssue(text, issue.defect.ruleId)) {
            filtedIssues.push(issue);
        }
    });
    return filtedIssues;
}
exports.filterDisableIssue = filterDisableIssue;
function isDisableIssue(lineText, ruleId) {
    if (!lineText || lineText.length === 0) {
        return false;
    }
    if (lineText.includes(exports.DisableText.NEXT_LINE_DISABLE_TEXT) && lineText.includes(ruleId)) {
        return true;
    }
    return false;
}
