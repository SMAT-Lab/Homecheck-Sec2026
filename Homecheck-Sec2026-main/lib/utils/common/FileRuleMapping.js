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
exports.fileRuleMapping = void 0;
const ConfigUtils_1 = require("./ConfigUtils");
const CheckerUtils_1 = require("../checker/CheckerUtils");
const CheckerIndex_1 = require("./CheckerIndex");
const CheckBuilder_1 = require("./CheckBuilder");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const FileUtils_1 = require("./FileUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'fileRuleMapping');
async function fileRuleMapping(checkFileList, checkEntry) {
    // 获取规则配置文件的规则，除了override
    const allRulesMap = ConfigUtils_1.ConfigUtils.getRuleMap(checkEntry.ruleConfig, checkEntry.projectConfig, checkEntry.message);
    if (allRulesMap.size === 0) {
        checkEntry.message?.progressNotify(1, 'No rule to check');
        return false;
    }
    let arkFiles = [];
    const fiRulesMap = new Map();
    const fileRulesMap = await createFileRulesMap(checkFileList, allRulesMap, checkEntry, CheckerIndex_1.file2CheckRuleMap, fiRulesMap);
    for (const filePath of checkFileList) {
        try {
            const arkFile = CheckerUtils_1.CheckerUtils.getArkFileByFilePath(checkEntry.scene, filePath);
            if (!arkFile) {
                continue;
            }
            arkFiles.push(arkFile);
            const enabledRules = fileRulesMap.get(filePath);
            if (enabledRules) {
                checkEntry.addFileCheck((0, CheckBuilder_1.fileCheckBuilder)(arkFile, enabledRules));
            }
        }
        catch (error) {
            logger.error(`Error processing file ${filePath}: ${error.message}`);
        }
    }
    const proRulesMap = new Map();
    const projectRulesMap = await createFileRulesMap(checkFileList, allRulesMap, checkEntry, CheckerIndex_1.project2CheckRuleMap, proRulesMap);
    const projectRules = Array.from(proRulesMap.values());
    try {
        checkEntry.addProjectCheck((0, CheckBuilder_1.projectCheckBuilder)(arkFiles, projectRules));
        checkEntry.projectCheck.ruleMap = projectRulesMap;
    }
    catch (error) {
        logger.error(`Error adding project check: ${error.message}`);
    }
    return true;
}
exports.fileRuleMapping = fileRuleMapping;
function filterRule(allRulesMap, filterMap) {
    const rules = [];
    for (const [key, value] of allRulesMap) {
        if (filterMap && !filterMap.has(key)) {
            continue;
        }
        rules.push(value);
    }
    return rules;
}
async function createFileRulesMap(allFiles, allRulesMap, checkEntry, checksRuleMap, proRulesMap) {
    // 获取配置的规则列表
    let fileRulesMap = new Map();
    const ruleMap = filterRule(allRulesMap, checksRuleMap);
    const defaultRules = Array.from(ruleMap.values());
    allFiles.forEach(filePath => fileRulesMap.set(filePath, defaultRules));
    ruleMap.forEach(rule => {
        proRulesMap.set(rule.ruleId, rule);
    });
    // 检查额外规则覆盖
    for (const override of checkEntry.ruleConfig.overrides ?? []) {
        try {
            const overrideFileRulesMap = await createFileRulesMapWithOverride(checkEntry, override, checksRuleMap, proRulesMap);
            fileRulesMap = mergeFileRulesMap(fileRulesMap, overrideFileRulesMap);
        }
        catch (error) {
            logger.error(`Error check extra rule overrides: ${error.message}`);
        }
    }
    return filterOutCloseRules(fileRulesMap);
}
async function createFileRulesMapWithOverride(checkEntry, override, checksRuleMap, proRulesMap) {
    let checkFileList = checkEntry.selectFileList.map(file => file.filePath);
    if (checkFileList.length === 0) {
        checkFileList = FileUtils_1.FileUtils.getAllFiles(checkEntry.projectConfig.projectPath, ['.ts', '.ets', '.json5']);
    }
    checkFileList = await FileUtils_1.FileUtils.getFiltedFiles(checkFileList, override);
    const allRuleMap = ConfigUtils_1.ConfigUtils.getRuleMap(override, checkEntry.projectConfig, checkEntry.message);
    const ruleMap = filterRule(allRuleMap, checksRuleMap);
    ruleMap.forEach(rule => {
        if (!proRulesMap.has(rule.ruleId)) {
            proRulesMap.set(rule.ruleId, rule);
        }
    });
    const fileRulesMap = new Map();
    const defaultRules = Array.from(ruleMap.values());
    checkFileList.forEach(filePath => fileRulesMap.set(filePath, defaultRules));
    return fileRulesMap;
}
function mergeFileRulesMap(fileRulesMap, overrideFileRulesMap) {
    // 取fileRule和overrideRule交集
    for (const [key, vals] of overrideFileRulesMap) {
        if (!fileRulesMap.has(key) || vals.length === 0) {
            continue;
        }
        let fileRules = fileRulesMap.get(key);
        if (!fileRules || fileRules.length === 0) {
            fileRulesMap.set(key, vals);
            continue;
        }
        let newRules = [...fileRules];
        vals.forEach(val => {
            let existIndex = fileRules?.findIndex(fileRule => fileRule.ruleId === val.ruleId);
            if (existIndex === undefined || existIndex === -1) {
                newRules.push(val);
            }
            else {
                newRules[existIndex] = val;
            }
        });
        fileRulesMap.set(key, newRules);
    }
    return fileRulesMap;
}
function filterOutCloseRules(fileRulesMap) {
    // 筛除关闭的rule
    const filteredRulesMap = new Map();
    for (const [key, rules] of fileRulesMap) {
        const filteredRules = rules.filter(rule => rule.alert !== 0);
        filteredRulesMap.set(key, filteredRules);
    }
    return filteredRulesMap;
}
