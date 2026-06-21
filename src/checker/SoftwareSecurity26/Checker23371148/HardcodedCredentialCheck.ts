// ./src/checker/SoftwareSecurity26/Checker19241042/HardcodedCredentialCheck.ts
import { ArkFile, Stmt } from 'arkanalyzer';
import Logger, { LOG_MODULE_TYPE } from 'arkanalyzer/lib/utils/logger';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects } from '../../../Index';
import { FileMatcher, MatcherCallback, MatcherTypes } from '../../../Index';
import { Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'HardcodedCredentialCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: 'https://security.ohos.com/hardcoded-credentials',
    description: 'Detects hardcoded credentials, passwords, or API keys.'
};

export class HardcodedCredentialCheck implements BaseChecker {
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
        };
        return [fileMatchBuildCb];
    }

    public check = (targetFile: ArkFile) => {
        for (const arkClass of targetFile.getClasses()) {
            for (const arkMethod of arkClass.getMethods()) {
                const cfg = arkMethod.getCfg();
                if (cfg == undefined) {
                    continue;
                }
                for (const stmt of cfg.getStmts()) {
                    const text = stmt.getOriginalText();
                    if (!text || text.length === 0) {
                        continue;
                    }
                    
                    if (this.containsCredentialPattern(text)) {
                        this.reportIssue(targetFile, stmt, 'credential');
                    }
                }
            }
        }
    };

    private containsCredentialPattern(text: string): boolean {
        const patterns = [
            /password\s*[=:]\s*["'][^"']+["']/i,
            /passwd\s*[=:]\s*["'][^"']+["']/i,
            /api[_-]?key\s*[=:]\s*["'][^"']+["']/i,
            /secret\s*[=:]\s*["'][^"']+["']/i,
            /token\s*[=:]\s*["'][^"']+["']/i,
            /jwt[_-]?secret\s*[=:]\s*["'][^"']+["']/i,
            /db[_-]?password\s*[=:]\s*["'][^"']+["']/i,
            /["'][a-zA-Z0-9]{16,}["']/
        ];
        return patterns.some(pattern => pattern.test(text));
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
        const endColumn = startColumn + Math.min(text.length, 20);
        let defects = new Defects(
            lineNum, startColumn, endColumn,
            this.metaData.description,
            severity,
            this.rule.ruleId,
            filePath,
            this.metaData.ruleDocPath,
            true, false, false
        );
        this.issues.push(new IssueReport(defects, undefined));
    }
}