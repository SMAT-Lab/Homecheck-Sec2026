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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tools = exports.runTool = exports.arkanalyzer = exports.ts = exports.AstTreeUtils = exports.Utils = exports.Json5parser = exports.WriteFileMode = exports.FileUtils = exports.ConfigUtils = exports.CheckerUtils = exports.CheckEntry = exports.RuleConfig = exports.ProjectConfig = exports.MessageType = exports.IssueReport = exports.Defects = exports.Rule = exports.CheckerStorage = exports.run = exports.start = void 0;
// main
var Main_1 = require("./Main");
Object.defineProperty(exports, "start", { enumerable: true, get: function () { return Main_1.start; } });
Object.defineProperty(exports, "run", { enumerable: true, get: function () { return Main_1.run; } });
// matchers
__exportStar(require("./matcher/Matchers"), exports);
// models
var CheckerStorage_1 = require("./utils/common/CheckerStorage");
Object.defineProperty(exports, "CheckerStorage", { enumerable: true, get: function () { return CheckerStorage_1.CheckerStorage; } });
var Rule_1 = require("./model/Rule");
Object.defineProperty(exports, "Rule", { enumerable: true, get: function () { return Rule_1.Rule; } });
var Defects_1 = require("./model/Defects");
Object.defineProperty(exports, "Defects", { enumerable: true, get: function () { return Defects_1.Defects; } });
Object.defineProperty(exports, "IssueReport", { enumerable: true, get: function () { return Defects_1.IssueReport; } });
var Message_1 = require("./model/Message");
Object.defineProperty(exports, "MessageType", { enumerable: true, get: function () { return Message_1.MessageType; } });
var ProjectConfig_1 = require("./model/ProjectConfig");
Object.defineProperty(exports, "ProjectConfig", { enumerable: true, get: function () { return ProjectConfig_1.ProjectConfig; } });
var RuleConfig_1 = require("./model/RuleConfig");
Object.defineProperty(exports, "RuleConfig", { enumerable: true, get: function () { return RuleConfig_1.RuleConfig; } });
__exportStar(require("./model/Scope"), exports);
// utils
var CheckEntry_1 = require("./utils/common/CheckEntry");
Object.defineProperty(exports, "CheckEntry", { enumerable: true, get: function () { return CheckEntry_1.CheckEntry; } });
var CheckerUtils_1 = require("./utils/checker/CheckerUtils");
Object.defineProperty(exports, "CheckerUtils", { enumerable: true, get: function () { return CheckerUtils_1.CheckerUtils; } });
var ConfigUtils_1 = require("./utils/common/ConfigUtils");
Object.defineProperty(exports, "ConfigUtils", { enumerable: true, get: function () { return ConfigUtils_1.ConfigUtils; } });
var FileUtils_1 = require("./utils/common/FileUtils");
Object.defineProperty(exports, "FileUtils", { enumerable: true, get: function () { return FileUtils_1.FileUtils; } });
Object.defineProperty(exports, "WriteFileMode", { enumerable: true, get: function () { return FileUtils_1.WriteFileMode; } });
var Json5parser_1 = require("./utils/common/Json5parser");
Object.defineProperty(exports, "Json5parser", { enumerable: true, get: function () { return Json5parser_1.Json5parser; } });
var Utils_1 = require("./utils/common/Utils");
Object.defineProperty(exports, "Utils", { enumerable: true, get: function () { return Utils_1.Utils; } });
// arkanalyzer
var arkanalyzer_1 = require("arkanalyzer");
Object.defineProperty(exports, "AstTreeUtils", { enumerable: true, get: function () { return arkanalyzer_1.AstTreeUtils; } });
Object.defineProperty(exports, "ts", { enumerable: true, get: function () { return arkanalyzer_1.ts; } });
exports.arkanalyzer = __importStar(require("arkanalyzer"));
// tools
var toolEntry_1 = require("./tools/toolEntry");
Object.defineProperty(exports, "runTool", { enumerable: true, get: function () { return toolEntry_1.runTool; } });
Object.defineProperty(exports, "Tools", { enumerable: true, get: function () { return toolEntry_1.Tools; } });
