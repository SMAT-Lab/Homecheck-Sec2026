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
exports.GeneratingJsonFile = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const FileUtils_1 = require("./FileUtils");
const HomeSecReport_1 = require("./HomeSecReport");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'GeneratingJsonFile');
const severitys = ['OFF', 'WARN', 'ERROR', 'SUGGESTION'];
const FILE_NAMING_RULE = '@hw-stylistic/file-naming-convention';
class GeneratingJsonFile {
    static generatingJsonFile(checkEntry, filePath, fileReports) {
        writeFileFix(fileReports);
        const fileDefectInfos = this.format(fileReports);
        let results = new Map();
        for (let fileDefectInfo of fileDefectInfos) {
            this.addResult(fileDefectInfo, results);
        }
        const jsonString = this.format2(results);
        HomeSecReport_1.HomeSecReport.getInstance().addProjectResult(checkEntry.projectConfig.projectName, checkEntry.projectConfig.projectPath, jsonString);
        try {
            FileUtils_1.FileUtils.writeToFile(filePath, jsonString, FileUtils_1.WriteFileMode.OVERWRITE);
        }
        catch (error) {
            logger.error(`write file ${filePath} failed, error: ${error}`);
        }
    }
    /**
     * 过滤掉部分不需要的defect属性
     *
     * @param fileReports 原始文件缺陷信息数组
     * @returns 过滤后的文件缺陷信息数组
     */
    static format(fileReports) {
        const fileDefectInfos = [];
        for (const fileReport of fileReports) {
            const fileDefectInfo = {
                filePath: fileReport.filePath,
                defects: []
            };
            for (const defect of fileReport.defects) {
                const defectInfo = {
                    reportLine: defect.reportLine,
                    reportColumn: defect.reportColumn,
                    ruleId: defect.ruleId,
                    severity: severitys[defect.severity],
                    mergeKey: defect.mergeKey,
                    description: defect.description,
                    ruleDocPath: defect.ruleDocPath
                };
                fileDefectInfo.defects.push(defectInfo);
            }
            fileDefectInfos.push(fileDefectInfo);
        }
        return fileDefectInfos;
    }
    static addResult(defect, results) {
        const normalizedPath = path.normalize(defect.filePath).toLocaleLowerCase();
        if (!results.has(normalizedPath)) {
            results.set(normalizedPath, defect);
        }
        else {
            results.get(normalizedPath)?.defects.push(...defect.defects);
        }
        const defectInfo = results.get(normalizedPath);
        defectInfo?.defects.sort((defectA, defectB) => {
            if (defectA.ruleId === FILE_NAMING_RULE) {
                return -1;
            }
            if (defectB.ruleId === FILE_NAMING_RULE) {
                return 1;
            }
            if (defectA.reportLine === defectB.reportLine) {
                if (defectA.reportColumn === defectB.reportColumn) {
                    return defectA.mergeKey.localeCompare(defectB.mergeKey);
                }
                return defectA.reportColumn - defectB.reportColumn;
            }
            return defectA.reportLine - defectB.reportLine;
        });
    }
    static format2(results) {
        const jsonResults = [];
        for (let result of results) {
            const oneResult = {
                filePath: '',
                messages: []
            };
            oneResult.filePath = result[1].filePath;
            let defects = result[1].defects;
            for (let defect of defects) {
                const oneDefect = {
                    line: 0,
                    column: 0,
                    severity: '',
                    message: '',
                    rule: '',
                };
                oneDefect.line = defect.reportLine;
                oneDefect.column = defect.reportColumn;
                oneDefect.severity = defect.severity;
                oneDefect.message = defect.description;
                oneDefect.rule = defect.ruleId;
                oneResult.messages.push(oneDefect);
            }
            jsonResults.push(oneResult);
        }
        return JSON.stringify(jsonResults, null, 2);
    }
}
exports.GeneratingJsonFile = GeneratingJsonFile;
function writeFileFix(fileReports) {
    for (const fileReport of fileReports) {
        if (fileReport.output) {
            try {
                const sanitizedContent = fileReport.output.replace(/\r/g, ''); // 移除所有 \r
                fs.writeFileSync(fileReport.filePath + '.homecheckFix', sanitizedContent, { encoding: 'utf8' });
            }
            catch (error) {
                logger.error(error.message);
            }
            ;
        }
        ;
    }
    ;
}
