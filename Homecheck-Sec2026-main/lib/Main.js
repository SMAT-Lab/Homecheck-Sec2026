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
exports.run = exports.start = void 0;
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
const AfterCheck_1 = require("./utils/common/AfterCheck");
const CheckEntry_1 = require("./utils/common/CheckEntry");
const ConfigUtils_1 = require("./utils/common/ConfigUtils");
const Message_1 = require("./model/Message");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'Main');
async function start(checkEntry) {
    // 外部没有建立消息通道，使用默认通道
    if (!checkEntry.message) {
        checkEntry.message = new Message_1.DefaultMessage();
    }
    // 前处理
    if (!await (0, CheckEntry_1.checkEntryBuilder)(checkEntry)) {
        return false;
    }
    // 开始检查
    await checkEntry.runAll();
    // 后处理
    await (0, AfterCheck_1.processAfterCheck)(checkEntry);
    logger.info('Checking completed.');
    return true;
}
exports.start = start;
async function run(projectConfigPath, configPath) {
    const startTime = new Date().getTime();
    const checkEntry = new CheckEntry_1.CheckEntry();
    // 直接使用传入的配置文件路径解析配置
    if (!ConfigUtils_1.ConfigUtils.parseConfig({ projectConfigPath, configPath }, checkEntry)) {
        return false;
    }
    // 设置指定文件检查，不设置默认检查所有文件
    checkEntry.setCheckFileList((0, CheckEntry_1.getSelectFileList)(checkEntry.projectConfig.checkPath));
    // 启动homecheck检查
    await start(checkEntry);
    const endTime = new Date().getTime();
    logger.info(`HomeCheck took: ${(endTime - startTime) / 1000} s.`);
    return true;
}
exports.run = run;
