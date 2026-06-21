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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigUtils = void 0;
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
const Rule_1 = require("../../model/Rule");
const FileUtils_1 = require("./FileUtils");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Utils_1 = require("./Utils");
const child_process_1 = require("child_process");
const Json5parser_1 = require("./Json5parser");
const CheckerStorage_1 = require("./CheckerStorage");
const path_1 = __importDefault(require("path"));
const RuleConfig_1 = require("../../model/RuleConfig");
const ProjectConfig_1 = require("../../model/ProjectConfig");
const CheckerIndex_1 = require("./CheckerIndex");
const fs_1 = __importDefault(require("fs"));
const Message_1 = require("../../model/Message");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ConfigUtils');
// 日志级别映射表
const logLevelMap = {
    'info': logger_1.LOG_LEVEL.INFO,
    'debug': logger_1.LOG_LEVEL.DEBUG,
    'warn': logger_1.LOG_LEVEL.WARN,
    'error': logger_1.LOG_LEVEL.ERROR,
    'trace': logger_1.LOG_LEVEL.TRACE
};
class ConfigUtils {
    /**
     * 获取配置文件
     * @param configPath 配置文件路径
     * @param rootDir 根目录，可选参数
     * @returns 返回解析后的配置对象，如果解析失败则返回null
     */
    static getConfig(configPath, rootDir) {
        if (!fs_1.default.existsSync(configPath) && rootDir) {
            // 规则配置文件不存在，使用默认配置文件
            configPath = path_1.default.join(rootDir, 'config', 'ruleConfig.json');
        }
        try {
            return Json5parser_1.Json5parser.parseJsonText(FileUtils_1.FileUtils.readFile(configPath));
        }
        catch (e) {
            logger.error(e);
            return null;
        }
    }
    /**
     * 解析配置文件并设置检查入口
     * @param argvObj 命令行参数对象
     * @param checkEntry 检查入口对象
     * @returns 是否成功解析配置文件
     */
    static parseConfig(argvObj, checkEntry) {
        const projectConfig = ConfigUtils.getConfig(argvObj.projectConfigPath);
        const ruleConfig = ConfigUtils.getConfig(argvObj.configPath, projectConfig.arkCheckPath);
        if (!ruleConfig || !projectConfig) {
            return false;
        }
        // 解析规则配置文件
        checkEntry.ruleConfig = new RuleConfig_1.RuleConfig(ruleConfig);
        // 解析项目配置文件
        checkEntry.projectConfig = new ProjectConfig_1.ProjectConfig(projectConfig);
        // 设置日志配置
        ConfigUtils.setLogConfig(checkEntry.projectConfig);
        logger.info('Checking started.');
        // api版本配置
        CheckerStorage_1.CheckerStorage.getInstance().setApiVersion(checkEntry.projectConfig.apiVersion);
        // product配置
        CheckerStorage_1.CheckerStorage.getInstance().setProduct(checkEntry.projectConfig.product);
        return true;
    }
    static setLogConfig(projectConfig) {
        // 日志配置
        const logPath = projectConfig.logPath;
        const arkanalyzerLogLevel = projectConfig.arkanalyzer_log_level;
        const homecheckLogLevel = projectConfig.homecheck_log_level;
        const lowerArkLevel = arkanalyzerLogLevel.toLowerCase();
        const arkLogLevel = logLevelMap[lowerArkLevel];
        const lowerHcLevel = homecheckLogLevel.toLowerCase();
        const hcLogLevel = logLevelMap[lowerHcLevel];
        Utils_1.Utils.setLogPath(logPath.length === 0 ? './HomeCheck.log' : logPath, arkLogLevel, hcLogLevel);
        if (!arkLogLevel) {
            logger.info('Invalid arkanalyzer log level: ' + arkanalyzerLogLevel);
            logger.info('Default user log level: ' + logger_1.LOG_LEVEL.ERROR);
        }
        if (!hcLogLevel) {
            logger.info('Invalid homecheck log level: ' + homecheckLogLevel);
            logger.info('Default user log level: ' + logger_1.LOG_LEVEL.INFO);
        }
    }
    /**
     * 从配置文件中获取规则
     * @param ruleConfig 规则配置
     * @param projectConfig 项目配置
     * @param message 消息通知实例
     * @returns Map, ruleId -- Rule
     */
    static getRuleMap(ruleConfig, projectConfig, message) {
        let ruleMap = new Map();
        const allRules = ConfigUtils.getRuleSetMap(projectConfig.arkCheckPath);
        for (const ruleSetStr of ruleConfig.ruleSet ?? []) {
            const ruleSet = allRules.get(ruleSetStr);
            if (!ruleSet) {
                logger.error('Invalid ruleSet name: ' + ruleSetStr);
                continue;
            }
            for (const [ruleId, level] of Object.entries(ruleSet)) {
                const alert = Utils_1.Utils.getEnumValues(level, Rule_1.ALERT_LEVEL);
                const rule = new Rule_1.Rule(ruleId, alert);
                ruleMap.set(rule.ruleId, rule);
            }
        }
        for (const ruleInfo of Object.entries(ruleConfig.rules ?? {})) {
            if (!this.isOnlineRule(ruleInfo[0], allRules)) {
                logger.error('Invalid rule name: ' + ruleInfo[0]);
                continue;
            }
            const rule = this.genRuleByOneRuleCfg(ruleInfo);
            if (!rule) {
                continue;
            }
            ruleMap.set(rule.ruleId, rule);
        }
        // override 独有配置
        Object.entries(ruleConfig.extRules ?? {}).forEach(ruleInfo => {
            const rule = this.genRuleByOneRuleCfg(ruleInfo);
            if (!rule) {
                return;
            }
            ruleMap.set(rule.ruleId, rule);
        });
        // 解析自定义规则集配置
        this.parseExtRuleConfig(ruleConfig, projectConfig, message, allRules, ruleMap);
        return ruleMap;
    }
    /**
     * 解析自定义规则配置
     * @param ruleConfig 规则配置
     * @param projectConfig 项目配置
     * @param message 消息对象
     * @param allRules 所有规则集合
     * @param ruleMap 规则映射
     */
    static parseExtRuleConfig(ruleConfig, projectConfig, message, allRules, ruleMap) {
        logger.info('The npmPath:' + projectConfig.npmPath);
        logger.info('The npmInstallDir:' + projectConfig.npmInstallDir);
        const extRuleSetSet = new Set();
        ruleConfig.extRuleSet.forEach((ruleSet) => {
            if (!this.checkExtRuleSetConfig(ruleSet, allRules, extRuleSetSet, message)) {
                return;
            }
            try {
                const cmd = `${projectConfig.npmPath} install --no-save --prefix "${projectConfig.npmInstallDir}" "${ruleSet.packagePath}"`;
                logger.info('Start to execute cmd: ' + cmd);
                const execLog = (0, child_process_1.execSync)(cmd);
                logger.info('Exec log: ' + execLog.toString());
            }
            catch (e) {
                logger.error(e.message);
                return;
            }
            logger.info('npm install completed.');
            let extPkg = null;
            try {
                extPkg = require(path_1.default.resolve(projectConfig.npmInstallDir, 'node_modules', ruleSet.ruleSetName));
            }
            catch (e) {
                logger.error(e.message);
                message?.messageNotify(Message_1.MessageType.CHECK_WARN, `Failed to get ${ruleSet.ruleSetName}, please check the ruleSetName.`);
                return;
            }
            extRuleSetSet.add(ruleSet.ruleSetName);
            this.processExternalRules(ruleSet, allRules, extPkg, message, ruleMap);
        });
    }
    static processExternalRules(ruleSet, allRules, extPkg, message, ruleMap) {
        Object.entries(ruleSet.extRules ?? {}).forEach(ruleInfo => {
            if (this.isOnlineRule(ruleInfo[0], allRules)) {
                message?.messageNotify(Message_1.MessageType.CHECK_WARN, `The extRuleName can't be the same as the internal rules name, name = ${ruleInfo[0]}.`);
                return;
            }
            const rule = this.genRuleByOneRuleCfg(ruleInfo);
            if (!rule) {
                return;
            }
            let module = extPkg?.file2CheckRuleMap?.get(rule.ruleId);
            if (module) {
                CheckerIndex_1.file2CheckRuleMap.set(rule.ruleId, module);
            }
            else {
                module = extPkg?.project2CheckRuleMap?.get(rule.ruleId);
                if (module) {
                    CheckerIndex_1.project2CheckRuleMap.set(rule.ruleId, module);
                }
                else {
                    message?.messageNotify(Message_1.MessageType.CHECK_WARN, `Failed to get '${rule.ruleId}' in '${ruleSet.ruleSetName}', please check the extRules.`);
                    return;
                }
            }
            ruleMap.set(rule.ruleId, rule);
        });
    }
    /**
     * 通过单个规则配置生成Rule对象，eg: "@ruleSet/ruleName": "error" | ["error", []...]
     * @param ruleCfg - 规则配置，格式为 [string, any]
     * @returns Rule | null - 生成的规则对象或 null
     */
    static genRuleByOneRuleCfg(ruleCfg) {
        let alert = Rule_1.ALERT_LEVEL.SUGGESTION;
        let option = [];
        if (ruleCfg[1] instanceof Array) {
            alert = Utils_1.Utils.getEnumValues(ruleCfg[1][0], Rule_1.ALERT_LEVEL);
            for (let i = 1; i < ruleCfg[1].length; i++) {
                option.push(ruleCfg[1][i]);
            }
        }
        else {
            alert = Utils_1.Utils.getEnumValues(ruleCfg[1], Rule_1.ALERT_LEVEL);
        }
        const rule = new Rule_1.Rule(ruleCfg[0], alert);
        rule.option = option;
        return rule;
    }
    /**
     * 读取RuleSet.json中配置的规则集
     */
    static getRuleSetMap(rootDir) {
        const ruleSetMap = new Map();
        try {
            const fileStr = FileUtils_1.FileUtils.readFile(path_1.default.join(rootDir, 'ruleSet.json'));
            const config = JSON.parse(fileStr);
            for (const [key, value] of Object.entries(config)) {
                ruleSetMap.set(key, value);
            }
        }
        catch (error) {
            logger.error(error.message);
        }
        return ruleSetMap;
    }
    /**
     * 检查指定的规则是否存在
     * @param ruleId - 要检查的规则ID
     * @param allRules - 包含所有规则的Map对象
     * @returns 如果规则存在则返回true，否则返回false
     */
    static isOnlineRule(ruleId, allRules) {
        for (const [ruleSet, rules] of allRules) {
            if (Object.keys(rules).includes(ruleId)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 检查自定义规则集配置的有效性
     * @param ruleSet - 自定义规则集
     * @param allRules - 所有规则集合
     * @param extRuleSetSet - 自定义规则集集合
     * @param message - 消息对象
     * @returns {boolean} - 是否通过检查
     */
    static checkExtRuleSetConfig(ruleSet, allRules, extRuleSetSet, message) {
        if (allRules.get(`${ruleSet.ruleSetName}`)) {
            message?.messageNotify(Message_1.MessageType.CHECK_WARN, `The extRuleSetName can't be the same as the name of internal rule set name, name = ${ruleSet.ruleSetName}.`);
            return false;
        }
        if (!ruleSet.packagePath || ruleSet.packagePath.length === 0 || FileUtils_1.FileUtils.isExistsSync(ruleSet.packagePath) === false) {
            message?.messageNotify(Message_1.MessageType.CHECK_WARN, `'${ruleSet.packagePath}' is invalid or not exist, please check the packagePath.`);
            return false;
        }
        if (extRuleSetSet.has(ruleSet.ruleSetName)) {
            message?.messageNotify(Message_1.MessageType.CHECK_WARN, `'${ruleSet.ruleSetName}' is conflict, please check the ruleSetName.`);
            return false;
        }
        return true;
    }
}
exports.ConfigUtils = ConfigUtils;
