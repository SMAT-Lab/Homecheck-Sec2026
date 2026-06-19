import {ArkFile, Stmt} from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'SensitiveInfoLeakCheck');

const gMetaData: BaseMetaData = {
    severity: 2,
    ruleDocPath: '',
    description: 'Detects sensitive information leakage via hardcoded credentials or logging.'
};

export class SensitiveInfoLeakCheck implements BaseChecker {
    readonly metaData: BaseMetaData = gMetaData;
    public rule: Rule;
    public defects: Defects[] = [];
    public issues: IssueReport[] = [];

    private fileMatcher: FileMatcher = {
        matcherType: MatcherTypes.FILE
    };

    public registerMatchers(): MatcherCallback[] {
        const fileMatchBuildCb: MatcherCallback = {
            matcher: this.fileMatcher,
            callback: this.check
        }
        return [fileMatchBuildCb];
    }

    public check = (targetFile: ArkFile) => {
        const sensitivePatterns = [
            /password\s*[=:]\s*['"][^'"]*['"]/gi,
            /secret\s*[=:]\s*['"][^'"]*['"]/gi,
            /key\s*[=:]\s*['"][^'"]*['"]/gi,
            /token\s*[=:]\s*['"][^'"]*['"]/gi,
            /api[_-]?key\s*[=:]\s*['"][^'"]*['"]/gi,
            /auth[_-]?token\s*[=:]\s*['"][^'"]*['"]/gi,
            /credential\s*[=:]\s*['"][^'"]*['"]/gi,
            /log\s*\(\s*.*password.*\s*\)/gi,
            /console\.log\s*\(\s*.*password.*\s*\)/gi,
            /console\.log\s*\(\s*.*secret.*\s*\)/gi,
            /console\.log\s*\(\s*.*key.*\s*\)/gi,
            /console\.log\s*\(\s*.*token.*\s*\)/gi
        ];

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
                    if (!text || text.length === 0) {
                        continue;
                    }
                    for (const pattern of sensitivePatterns) {
                        if (pattern.test(text)) {
                            this.reportIssue(targetFile, stmt, methodName);
                            break;
                        }
                    }
                }
            }
        }
    }

    public reportIssue(arkFile: ArkFile, stmt: Stmt, methodName: string): void {
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
        let defects = new Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId,
            filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new IssueReport(defects, undefined));
    }
}