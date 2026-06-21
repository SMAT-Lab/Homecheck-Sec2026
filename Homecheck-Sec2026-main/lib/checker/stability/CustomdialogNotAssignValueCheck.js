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
exports.CustomdialogNotAssignValueCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'CustomdialogNotAssignValueCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/customdialog-not-assign-value-check.md',
    description: 'The CustomdialogController does not allow dynamic assignment within methods.'
};
const customDialogControllerSignature = [
    'CustomDialogController',
    'CustomDialogController|null',
    'CustomDialogController|undefined',
    '@ohosSdk/component/custom_dialog_controller.d.ts: CustomDialogController',
    '@ohosSdk/component/custom_dialog_controller.d.ts: CustomDialogController|null',
    '@ohosSdk/component/custom_dialog_controller.d.ts: CustomDialogController|undefined'
];
class CustomdialogNotAssignValueCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    classMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS
    };
    registerMatchers() {
        const matchClassCb = {
            matcher: this.classMatcher,
            callback: this.check
        };
        return [matchClassCb];
    }
    check = (arkClass) => {
        if (arkClass.hasDecorator('Component')) {
            return;
        }
        for (const field of arkClass.getFields()) {
            if (!customDialogControllerSignature.includes(field.getType().getTypeString())) {
                continue;
            }
            if (field.getInitializer().length !== 0) {
                this.reportIssue(field, field.getName());
            }
        }
    };
    reportIssue(field, name) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = field.getDeclaringArkClass().getDeclaringArkFile().getFilePath();
        let lineNum = field.getOriginPosition().getLineNo();
        let startColum = field.getOriginPosition().getColNo();
        let endColumn = startColum + name.length - 1;
        let defects = new Index_1.Defects(lineNum, startColum, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.CustomdialogNotAssignValueCheck = CustomdialogNotAssignValueCheck;
