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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeSecReport = void 0;
const FileUtils_1 = require("./FileUtils");
const path_1 = __importDefault(require("path"));
class HomeSecReport {
    static instance = null;
    homeSecReport = [];
    constructor() { }
    static getInstance() {
        if (this.instance === null) {
            this.instance = new HomeSecReport();
        }
        return this.instance;
    }
    addProjectResult(projectName, projectPath, issues) {
        const projectResult = new ProjectResult(projectName, projectPath, issues);
        this.homeSecReport.push(projectResult);
    }
    generateReport() {
        const report = this.homeSecReport.map(project => {
            let parsedIssues;
            try {
                parsedIssues = JSON.parse(project.issues);
            }
            catch (error) {
                console.error(`Failed to parse issues for project ${project.projectName}: ${error}`);
                parsedIssues = [];
            }
            return {
                projectName: project.projectName,
                projectPath: project.projectPath,
                issues: Array.isArray(parsedIssues) ? parsedIssues : [parsedIssues]
            };
        });
        const jsonString = JSON.stringify(report, null, 2);
        FileUtils_1.FileUtils.writeToFile(path_1.default.resolve("./report", 'issuesReport.json'), jsonString, FileUtils_1.WriteFileMode.OVERWRITE);
    }
}
exports.HomeSecReport = HomeSecReport;
class ProjectResult {
    projectName;
    projectPath;
    issues;
    constructor(projectName, projectPath, issues) {
        this.projectName = projectName;
        this.projectPath = projectPath;
        this.issues = issues;
    }
}
