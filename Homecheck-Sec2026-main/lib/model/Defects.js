"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueReport = exports.Defects = exports.engine = void 0;
exports.engine = {
    engineName: ''
};
class Defects {
    reportLine;
    reportColumn;
    description = '';
    severity = -1; // 0:info, 1:warning, 2:error
    ruleId = '@perforce/<checker-name>';
    mergeKey = ''; // 文件路径%行号%开始列号%结束列号%规则%规则描述
    ruleDocPath = 'doc/<checker-name>.md';
    disabled = true;
    checked = false;
    fixable = false; // 是否可以修复
    fixKey = ''; // 行号%开始列号%结束列号%规则id
    showIgnoreIcon = true;
    engineName = exports.engine.engineName;
    constructor(reportLine, reportColumn, endColumn, description, severity, ruleId, filePath, ruleDocPath, disabled, checked, fixable, showIgnoreIcon = true) {
        this.reportLine = reportLine;
        this.reportColumn = reportColumn;
        this.description = description;
        this.severity = severity;
        this.ruleId = ruleId;
        this.fixKey = this.reportLine + '%' + this.reportColumn + '%' + endColumn + '%' + this.ruleId;
        this.mergeKey = filePath + '%' + this.fixKey + '%' + this.description;
        this.ruleDocPath = ruleDocPath;
        this.disabled = disabled;
        this.checked = checked;
        this.fixable = fixable;
        this.showIgnoreIcon = showIgnoreIcon;
    }
}
exports.Defects = Defects;
class IssueReport {
    defect;
    fix;
    constructor(defect, fix) {
        this.defect = defect;
        this.fix = fix;
    }
}
exports.IssueReport = IssueReport;
