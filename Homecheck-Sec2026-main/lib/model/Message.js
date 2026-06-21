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
exports.MessageType = exports.DefaultMessage = void 0;
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
const GeneratingJsonFile_1 = require("../utils/common/GeneratingJsonFile");
const path_1 = __importDefault(require("path"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'Message');
class DefaultMessage {
    /**
     * 发送消息
     *
     * @param msg 要发送的消息内容
     */
    async sendResult(checkEntry, fileReports, reportDir) {
        if (reportDir && reportDir.length !== 0) {
            GeneratingJsonFile_1.GeneratingJsonFile.generatingJsonFile(checkEntry, path_1.default.resolve(reportDir, 'issuesReport.json'), fileReports);
        }
        else {
            process.stdout.write(JSON.stringify(fileReports));
        }
    }
    /**
     * 消息通知函数
     *
     * @param messageLevel 消息类型，类型为MessageType枚举
     * @param msg 消息内容，类型为字符串
     */
    messageNotify(messageLevel, msg) {
        logger.error(JSON.stringify(msg));
        return;
    }
    /**
     * 通知进度更新
     *
     * @param progress 进度值，取值范围为 0 到 1 之间
     * @param msg 与进度相关的消息
     */
    progressNotify(progress, msg) {
        const checkPercent = Math.floor(progress * 100);
        if (checkPercent % 20 === 0) {
            logger.info(`===== progress: ${checkPercent}% ======`);
        }
    }
}
exports.DefaultMessage = DefaultMessage;
/**
 * 告警消息类型
 */
var MessageType;
(function (MessageType) {
    MessageType[MessageType["BASE_ERROR"] = 0] = "BASE_ERROR";
    MessageType[MessageType["CHECK_ERROR"] = -1] = "CHECK_ERROR";
    MessageType[MessageType["CHECK_WARN"] = -2] = "CHECK_WARN";
    MessageType[MessageType["CHECK_INFO"] = -3] = "CHECK_INFO";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
