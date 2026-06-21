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
exports.Project2Check = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../matcher/Matchers");
const matchFiles_1 = require("../matcher/matcherAdapter/matchFiles");
const matchNameSpaces_1 = require("../matcher/matcherAdapter/matchNameSpaces");
const matchClass_1 = require("../matcher/matcherAdapter/matchClass");
const matchMethods_1 = require("../matcher/matcherAdapter/matchMethods");
const matchFields_1 = require("../matcher/matcherAdapter/matchFields");
const FileUtils_1 = require("../utils/common/FileUtils");
const Disable_1 = require("../utils/common/Disable");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'Project2Check');
class Project2Check {
    arkFiles;
    enabledRuleCheckerMap = new Map();
    issues = [];
    ruleMap = new Map();
    sceneCallBacks = [];
    flMatcherMap = new Map();
    nsMatcherMap = new Map();
    clsMatcherMap = new Map();
    mtdMatcherMap = new Map();
    fieldMatcherMap = new Map();
    constructor() {
    }
    addChecker(ruleId, checker) {
        this.enabledRuleCheckerMap.set(ruleId, checker);
    }
    collectMatcherCallbacks() {
        this.enabledRuleCheckerMap.forEach(checker => {
            const matcherCallbacks = checker.registerMatchers();
            matcherCallbacks.forEach(obj => {
                const matcher = obj.matcher;
                const callback = obj.callback;
                if (!matcher) {
                    this.sceneCallBacks.push(callback);
                    return;
                }
                switch (matcher.matcherType) {
                    case Matchers_1.MatcherTypes.FILE:
                        this.flMatcherMap.set(matcher, callback);
                        break;
                    case Matchers_1.MatcherTypes.NAMESPACE:
                        this.nsMatcherMap.set(matcher, callback);
                        break;
                    case Matchers_1.MatcherTypes.CLASS:
                        this.clsMatcherMap.set(matcher, callback);
                        break;
                    case Matchers_1.MatcherTypes.METHOD:
                        this.mtdMatcherMap.set(matcher, callback);
                        break;
                    case Matchers_1.MatcherTypes.FIELD:
                        this.fieldMatcherMap.set(matcher, callback);
                        break;
                    default:
                        break;
                }
            });
        });
    }
    async emitCheck() {
        await Promise.all(Array.from(this.enabledRuleCheckerMap.values()).map(checker => {
            try {
                this.processSceneCallbacks();
                this.flMatcherMap.forEach((callback, matcher) => {
                    (0, matchFiles_1.matchFiles)(this.arkFiles, matcher, callback);
                });
                this.nsMatcherMap.forEach((callback, matcher) => {
                    (0, matchNameSpaces_1.matchNameSpaces)(this.arkFiles, matcher, callback);
                });
                this.clsMatcherMap.forEach((callback, matcher) => {
                    (0, matchClass_1.matchClass)(this.arkFiles, matcher, callback);
                });
                this.mtdMatcherMap.forEach((callback, matcher) => {
                    (0, matchMethods_1.matchMethods)(this.arkFiles, matcher, callback);
                });
                this.fieldMatcherMap.forEach((callback, matcher) => {
                    (0, matchFields_1.matchFields)(this.arkFiles, matcher, callback);
                });
            }
            catch (error) {
                logger.error(`Checker ${checker.rule.ruleId} error: `, error);
            }
        }));
    }
    processSceneCallbacks() {
        try {
            this.sceneCallBacks.forEach((callback) => {
                if (this.arkFiles.length !== 0) {
                    callback(this.arkFiles[0].getScene());
                }
            });
        }
        catch (error) {
            logger.error(`Error in scene callbacks: `, error);
        }
    }
    collectIssues() {
        this.enabledRuleCheckerMap.forEach((v, k) => {
            this.issues.push(...(v.issues?.reduce((acc, cur) => {
                if (acc.some((item) => item.defect.mergeKey === cur.defect.mergeKey)) {
                    logger.debug('Skip the repeated issue, please check. issue.mergeKey = ' + cur.defect.mergeKey);
                }
                else {
                    acc.push(cur);
                }
                return acc;
            }, [])));
        });
        const issueMap = new Map();
        this.issues.forEach(issue => {
            issueMap.set(issue.defect.mergeKey, issue);
        });
        const issueCopyMap = new Map(issueMap);
        for (const [key, value] of issueCopyMap.entries()) {
            const index = value.defect.mergeKey.indexOf('%' + value.defect.fixKey);
            let filePath = '';
            if (index !== -1) {
                filePath = value.defect.mergeKey.slice(0, index);
            }
            if (!this.ruleMap.has(filePath)) {
                continue;
            }
            let rules = this.ruleMap.get(filePath);
            if (!rules) {
                continue;
            }
            let result = rules.find(rule => rule.ruleId === value.defect.ruleId);
            if (!result) {
                issueMap.delete(value.defect.mergeKey);
            }
            else {
                value.defect.severity = result.alert;
            }
        }
        this.issues = Array.from(issueMap.values());
    }
    async checkDisable() {
        let filtedIssues = [];
        for (const issue of this.issues) {
            const filePath = issue.defect.mergeKey.split('%')[0];
            const fileLineList = await FileUtils_1.FileUtils.readLinesFromFile(filePath);
            const filtedResult = (0, Disable_1.filterDisableIssue)(fileLineList, [issue]);
            if (filtedResult.length > 0) {
                filtedIssues = filtedIssues.concat(filtedResult[0]);
            }
        }
        this.issues = filtedIssues;
    }
    async run() {
        this.collectMatcherCallbacks();
        await this.emitCheck();
        this.collectIssues();
        await this.checkDisable();
    }
}
exports.Project2Check = Project2Check;
