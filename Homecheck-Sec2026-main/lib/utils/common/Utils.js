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
exports.Utils = void 0;
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
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const commander_1 = require("commander");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'Utils');
class Utils {
    /**
     * 解析命令行选项
     * @param args 命令行参数数组
     * @returns 解析后的选项值
     */
    static parseCliOptions(args) {
        logger.info('Parse cli options.');
        const program = new commander_1.Command();
        return this.getCliOptions(program, args);
    }
    /**
     * 获取命令行选项
     * @param program Command 对象
     * @param args 命令行参数数组
     * @returns 选项值对象
     */
    static getCliOptions(program, args) {
        program
            .option('--configPath <configPath>', 'rule config path')
            .option('--projectConfigPath <projectConfigPath>', 'project config path')
            .option('--depGraphOutputDir <depGraphOutputDir>', 'output directory of dependency graph')
            .parse(args);
        return program.opts();
    }
    /**
     * 设置日志路径
     * @param logPath 日志路径
     */
    static setLogPath(logPath, arkLogLevel = logger_1.LOG_LEVEL.ERROR, hcLogLevel = logger_1.LOG_LEVEL.INFO) {
        logger_1.default.configure(logPath, arkLogLevel, hcLogLevel);
    }
    /**
     * 获取枚举类型的值
     * @param value - 枚举值，可以是字符串或数字
     * @param enumType - 枚举类型
     * @returns 枚举值对应的枚举类型值
     */
    static getEnumValues(value, enumType) {
        const key = Object.keys(enumType).find(k => k.toLowerCase() === value || enumType[k] === value);
        return enumType[key];
    }
    /**
     * 按行号和列号对键值对进行排序
     * @param keyA 格式为 "行号%列号%规则ID" 的字符串
     * @param keyB 格式为 "行号%列号%规则ID" 的字符串
     * @returns 排序比较结果
     */
    static sortByLineAndColumn(keyA, keyB) {
        const [lineA, colA] = keyA.split('%', 2).map(Number);
        const [lineB, colB] = keyB.split('%', 2).map(Number);
        if (lineA !== lineB) {
            return lineA - lineB;
        }
        return colA - colB;
    }
}
exports.Utils = Utils;
