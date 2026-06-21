"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAfterCheck = void 0;
async function processAfterCheck(checkEntry) {
    // 按规则维度统计告警信息，按文件维度汇总告警信息
    const fileIssues = checkEntry.sortIssues();
    let fileReports = [];
    if (checkEntry.projectConfig.fix === 'true') {
        // 代码修复
        fileReports = checkEntry.codeFix(fileIssues);
    }
    else {
        // 转换输出格式，去掉fix相关信息
        fileIssues.forEach((fileIssue) => {
            fileReports.push({ filePath: fileIssue.filePath, defects: fileIssue.issues.map(issue => issue.defect) });
        });
    }
    // 发送消息
    await checkEntry.message?.sendResult(checkEntry, fileReports, checkEntry.projectConfig.reportDir);
}
exports.processAfterCheck = processAfterCheck;
