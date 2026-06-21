"use strict";
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
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
exports.getSelectFileList = exports.checkEntryBuilder = exports.CheckEntry = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const arkanalyzer_2 = require("arkanalyzer");
const FileRuleMapping_1 = require("./FileRuleMapping");
const Disable_1 = require("./Disable");
const FileUtils_1 = require("./FileUtils");
const ScopeHelper_1 = require("./ScopeHelper");
const DefectsList_1 = require("./DefectsList");
const Fix_1 = require("../../model/Fix");
const Defects_1 = require("../../model/Defects");
const FixUtils_1 = require("./FixUtils");
const FixEngine_1 = require("../../codeFix/FixEngine");
const CheckerUtils_1 = require("../checker/CheckerUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'CheckEntry');
class CheckEntry {
    ruleConfig;
    projectConfig;
    projectCheck;
    fileChecks = [];
    scene;
    message;
    selectFileList = [];
    constructor() {
    }
    addFileCheck(fileCheck) {
        this.fileChecks.push(fileCheck);
    }
    addProjectCheck(projectCheck) {
        this.projectCheck = projectCheck;
    }
    setDisableText(fileDisableText, nextLineDisableText) {
        Disable_1.DisableText.FILE_DISABLE_TEXT = fileDisableText;
        Disable_1.DisableText.NEXT_LINE_DISABLE_TEXT = nextLineDisableText;
    }
    setEngineName(engineName) {
        Defects_1.engine.engineName = engineName;
    }
    setCheckFileList(selectFileList) {
        this.selectFileList = selectFileList;
    }
    setMessage(message) {
        this.message = message;
    }
    async runAll() {
        // TODO: worker_threads改造
        let checkedIndex = 1;
        for (const fileCheck of this.fileChecks) {
            try {
                await fileCheck.run();
                // 进度条通知
                this.message?.progressNotify(checkedIndex / (this.fileChecks.length + 1), fileCheck.arkFile.getFilePath());
                checkedIndex++;
            }
            catch (error) {
                logger.error(`Error running file check for ${fileCheck.arkFile.getFilePath()}: ${error.message}`);
                continue;
            }
        }
        if (this.projectCheck) {
            try {
                await this.projectCheck.run();
                this.message?.progressNotify(checkedIndex / (this.fileChecks.length + 1), 'Project Check');
            }
            catch (error) {
                logger.error(`Error running project check: ${error.message}`);
            }
        }
    }
    /**
     * 按规则维度统计并输出告警信息，按文件维度汇总并返回告警信息。
     *
     * @returns FileReport[] 文件报告数组，每个元素包含文件名、缺陷列表和输出信息
     */
    sortIssues() {
        const issuesMapByChecker = new Map();
        const issuesMapByFile = new Map();
        DefectsList_1.RuleListUtil.printDefects();
        for (const fileCheck of this.fileChecks) {
            if (!fileCheck.issues || fileCheck.issues.length === 0) {
                continue;
            }
            issuesMapByFile.set(fileCheck.arkFile.getFilePath(), fileCheck.issues);
            for (const issue of fileCheck.issues) {
                logger.debug(issue.defect.mergeKey);
                const checkerStorage = issuesMapByChecker.get(issue.defect.ruleId);
                if (checkerStorage) {
                    checkerStorage.push(issue);
                }
                else {
                    issuesMapByChecker.set(issue.defect.ruleId, [issue]);
                }
            }
        }
        for (const issue of this.projectCheck?.issues ?? []) {
            logger.debug(issue.defect.mergeKey);
            const checkerStorage = issuesMapByChecker.get(issue.defect.ruleId);
            if (checkerStorage) {
                checkerStorage.push(issue);
            }
            else {
                issuesMapByChecker.set(issue.defect.ruleId, [issue]);
            }
            const filePath = issue.defect.mergeKey.split('%')[0];
            const fileStorage = issuesMapByFile.get(filePath);
            if (fileStorage) {
                fileStorage.push(issue);
            }
            else {
                issuesMapByFile.set(filePath, [issue]);
            }
        }
        issuesMapByChecker.forEach((issues, checker) => {
            logger.info(issues.length + ' issues from checker - ' + checker);
        });
        const fileReports = [];
        issuesMapByFile.forEach((issues, filePath) => {
            fileReports.push({ filePath, issues });
        });
        return fileReports;
    }
    buildScope() {
        new ScopeHelper_1.ScopeHelper().buildScope(this.scene);
    }
    /**
     * 修复代码问题
     *
     * @param fileIssues 以文件为维度的issues信息
     * @returns 修复后的文件报告数组，去掉已修复issues，且需更新未修复issues行列号等信息
     */
    codeFix(fileIssues) {
        const fileReports = [];
        for (const fileIssue of fileIssues) {
            const arkFile = CheckerUtils_1.CheckerUtils.getArkFileByFilePath(this.scene, fileIssue.filePath);
            if (!arkFile) {
                fileReports.push({ filePath: fileIssue.filePath, defects: fileIssue.issues.map(issue => issue.defect) });
                continue;
            }
            let keys = [];
            let isFixAll = false;
            // 寻找该文件的fixKey，即需要修复的issue
            for (const fileInfo of this.selectFileList) {
                if (fileInfo.fixKey && fileInfo.filePath === fileIssue.filePath) {
                    keys = fileInfo.fixKey;
                    break;
                }
            }
            // 没有指定key，则修复所有issue
            if (keys.length === 0) {
                isFixAll = true;
            }
            const remainIssues = [];
            const astFixIssues = [];
            this.classifyIssues(fileIssue.issues, isFixAll, keys, astFixIssues, remainIssues);
            const astFixReport = new FixEngine_1.FixEngine().getEngine(Fix_1.FixMode.AST).applyFix(arkFile, astFixIssues, remainIssues);
            fileReports.push(astFixReport);
        }
        return fileReports;
    }
    classifyIssues(allIssues, fixAll, keys, astFixIssues, remainIssues) {
        for (const issue of allIssues) {
            if (fixAll || keys.includes(issue.defect.fixKey)) {
                if (issue.fix && issue.defect.fixable && FixUtils_1.FixUtils.isRuleFix(issue.fix)) {
                    astFixIssues.push(issue);
                }
                else {
                    remainIssues.push(issue);
                    logger.debug('Fix type is unsupported.');
                }
            }
            else {
                remainIssues.push(issue);
            }
        }
    }
}
exports.CheckEntry = CheckEntry;
async function checkEntryBuilder(checkEntry) {
    // 1、 无指定文件则检查项目下所有文件
    let checkFileList = checkEntry.selectFileList.map(file => file.filePath);
    if (checkFileList.length === 0) {
        checkFileList = FileUtils_1.FileUtils.getAllFiles(checkEntry.projectConfig.projectPath, ['.ts', '.ets', '.json5']);
    }
    // 2、文件过滤和文件级屏蔽处理
    checkFileList = await FileUtils_1.FileUtils.getFiltedFiles(checkFileList, checkEntry.ruleConfig);
    logger.info('File count: ' + checkFileList.length);
    if (checkFileList.length === 0) {
        checkEntry.message?.progressNotify(1, 'No file to check.');
        return false;
    }
    // 3、scene按需构建、scope构建
    if (!buildScene(checkFileList, checkEntry)) {
        return false;
    }
    // 4、规则和文件映射构建
    if (!(await (0, FileRuleMapping_1.fileRuleMapping)(checkFileList, checkEntry))) {
        return false;
    }
    return true;
}
exports.checkEntryBuilder = checkEntryBuilder;
/**
 * 获取指定检查的文件列表
 *
 * @param checkFilePath - 指定的检查文件路径的配置文件路径，该文件内容示例{"checkPath": [{"filePath": "xxx", "fixKey": ["%line%sCol%eCol%ruleId"]}]}
 * filePath为需要检查的文件路径，fixKey为需要修复的缺陷key，空数组则不修复。
 * @returns SelectFileInfo[] - 需要检查的文件列表
 */
function getSelectFileList(checkFilePath) {
    if (checkFilePath.length > 0) {
        // 解析指定的文件
        return FileUtils_1.FileUtils.getSeletctedFileInfos(checkFilePath, ['.ts', '.ets', '.json5']);
    }
    return [];
}
exports.getSelectFileList = getSelectFileList;
/**
 * 构建Scene
 * @param fileList - 文件列表
 * @param checkEntry - 检查条目
 * @returns {boolean} - 构建是否成功
 */
function buildScene(fileList, checkEntry) {
    try {
        // 构建SceneConfig信息
        const sceneConfig = new arkanalyzer_2.SceneConfig();
        const projectName = checkEntry.projectConfig.projectName;
        const projectPath = checkEntry.projectConfig.projectPath;
        const sdkList = FileUtils_1.FileUtils.genSdks(checkEntry.projectConfig);
        sceneConfig.buildFromProjectFiles(projectName, projectPath, fileList, sdkList);
        logger.info('Build sceneConfig completed.');
        // 构建Scene信息
        checkEntry.scene = new arkanalyzer_1.Scene();
        checkEntry.scene.buildSceneFromFiles(sceneConfig);
        logger.info('Build scene completed.');
        checkEntry.scene.inferTypes();
        logger.info('Infer types completed.');
    }
    catch (error) {
        logger.error('Build scene or infer types error: ', error);
        return false;
    }
    // 构建Scope信息
    checkEntry.buildScope();
    logger.info('Build scope completed.');
    return true;
}
