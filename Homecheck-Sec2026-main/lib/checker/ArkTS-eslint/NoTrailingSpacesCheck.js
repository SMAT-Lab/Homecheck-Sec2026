"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoTrailingSpacesCheck = void 0;
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
class NoTrailingSpacesCheck {
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-trailing-spaces.md',
        description: 'Disallow trailing spaces at the end of lines.'
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    defaultOptions = [{}];
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        const filePath = target.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target); // 获取AST节点
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : [{}];
        const defects = this.checkTrailingSpaces(sourceFile, this.defaultOptions, filePath);
        defects.forEach(defect => {
            const ruleFix = this.createFix(sourceFile, defect);
            this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
        });
    };
    checkTrailingSpaces(sourceFile, options, filePath) {
        const { skipBlankLines, ignoreComments } = options[0];
        const lines = sourceFile.getFullText().split(/\r?\n/);
        const defects = [];
        // 获取模板字符串的行范围
        const templateStringRanges = this.getTemplateStringRanges(sourceFile);
        // 跟踪多行注释状态
        let inMultilineComment = false;
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trimEnd();
            const trailingSpaces = line.length - trimmedLine.length;
            // 检查是否进入或退出多行注释
            if (line.includes("/*")) {
                inMultilineComment = true;
            }
            if (inMultilineComment && line.includes("*/")) {
                inMultilineComment = false;
            }
            if (trailingSpaces > 0) {
                if (skipBlankLines && trimmedLine.length === 0)
                    return; // 忽略空白行
                // 同时检查单行注释和多行注释
                if (ignoreComments && (line.includes("//") || inMultilineComment))
                    return; // 忽略注释中的尾随空格
                // 检查当前行是否在模板字符串内部
                const templateInfo = templateStringRanges.find(range => range.start <= lineNumber && lineNumber <= range.end);
                // 如果当前行不是是模板字符串的最后一行
                if (templateInfo && templateInfo.end !== lineNumber) {
                    return;
                }
                const severity = this.rule.alert ?? this.metaData.severity;
                const message = 'Trailing spaces not allowed';
                const defect = new Index_1.Defects(lineNumber, line.length - trailingSpaces + 1, line.length + 1, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
                defects.push(defect);
                DefectsList_1.RuleListUtil.push(defect);
            }
        });
        return defects;
    }
    ;
    getTemplateStringRanges(sourceFile) {
        const templateStringRanges = [];
        // 递归遍历所有节点
        const traverse = (node) => {
            if (arkanalyzer_1.ts.isTemplateExpression(node)) {
                // 检测到模板字符串
                const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
                const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
                templateStringRanges.push({ start: startLine, end: endLine });
            }
            // 递归遍历子节点
            arkanalyzer_1.ts.forEachChild(node, traverse);
        };
        // 从根节点开始遍历
        traverse(sourceFile);
        return templateStringRanges;
    }
    ;
    createFix(sourceFile, defect) {
        const { reportLine, reportColumn } = defect;
        const lineIndex = reportLine - 1;
        const lines = sourceFile.getFullText().split(/\r?\n/);
        const originalLine = lines[lineIndex];
        // 获取模板字符串范围
        const templateStringRanges = this.getTemplateStringRanges(sourceFile);
        // 检查当前行是否是模板字符串的最后一行
        const isLastLineOfTemplate = templateStringRanges.some(range => range.end === reportLine);
        // 修复逻辑
        let fixedLine;
        if (isLastLineOfTemplate) {
            // 如果是模板字符串的最后一行，去掉行尾空格
            fixedLine = originalLine.trimEnd();
        }
        else {
            // 如果是模板字符串外部或非模板字符串，去掉行尾空格
            fixedLine = originalLine.trimEnd();
        }
        const start = sourceFile.getPositionOfLineAndCharacter(lineIndex, 0);
        const end = sourceFile.getPositionOfLineAndCharacter(lineIndex, originalLine.length);
        return { range: [start, end], text: fixedLine };
    }
    ;
}
exports.NoTrailingSpacesCheck = NoTrailingSpacesCheck;
