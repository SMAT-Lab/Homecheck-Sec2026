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
exports.SQLInjectionCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../../Index");
const Index_2 = require("../../../Index");
const Defects_1 = require("../../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'SQLInjectionCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects potential SQL injection vulnerabilities via string concatenation in queries.'
};
class SQLInjectionCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE
    };
    // SQL相关的方法名和关键词
    sqlPatterns = [
        /query\s*\(/gi,
        /execute\s*\(/gi,
        /SELECT\s+\*/gi,
        /INSERT\s+INTO/gi,
        /UPDATE\s+/gi,
        /DELETE\s+FROM/gi,
        /WHERE\s+/gi
    ];
    // 字符串拼接的危险模式
    concatenationPatterns = [
        /\$\{.*?\}/g,
        /"\s*\+\s*"/g,
        /'\s*\+\s*'/g,
        /`.*?\${/g // 模板字符串
    ];
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        for (const arkClass of targetFile.getClasses()) {
            for (const arkMethod of arkClass.getMethods()) {
                if (arkMethod.getName() == '_DEFAULT_ARK_METHOD') {
                    continue;
                }
                const methodName = arkMethod.getName();
                const cfg = arkMethod.getCfg();
                if (cfg == undefined) {
                    continue;
                }
                for (const stmt of cfg.getStmts()) {
                    const text = stmt.getOriginalText();
                    if (text && this.isSQLInjectionVulnerable(text)) {
                        this.reportIssue(targetFile, stmt, methodName);
                    }
                }
            }
        }
    };
    isSQLInjectionVulnerable(text) {
        // 检查是否包含SQL操作
        let hasSQLOperation = false;
        for (const pattern of this.sqlPatterns) {
            if (pattern.test(text)) {
                hasSQLOperation = true;
                break;
            }
        }
        if (!hasSQLOperation) {
            return false;
        }
        // 检查是否有字符串拼接
        for (const pattern of this.concatenationPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        return false;
    }
    reportIssue(arkFile, stmt, methodName) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const startColumn = originPositionInfo.getColNo();
        const endColunm = startColumn + text.length;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.SQLInjectionCheck = SQLInjectionCheck;
