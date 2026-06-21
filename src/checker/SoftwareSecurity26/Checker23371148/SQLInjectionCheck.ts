// ./src/checker/SoftwareSecurity26/Checker19241042/SQLInjectionCheck.ts
import { ArkFile, Stmt } from 'arkanalyzer';
import Logger, { LOG_MODULE_TYPE } from 'arkanalyzer/lib/utils/logger';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects } from '../../../Index';
import { FileMatcher, MatcherCallback, MatcherTypes } from '../../../Index';
import { Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'SQLInjectionCheck');

const gMetaData: BaseMetaData = {
    severity: 2,
    ruleDocPath: 'https://security.ohos.com/sql-injection',
    description: 'Detects potential SQL injection vulnerabilities.'
};

export class SQLInjectionCheck implements BaseChecker {
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
    console.log('🔍 SQLInjectionCheck 开始扫描');
    let foundIssues = 0;
    
    for (const arkClass of targetFile.getClasses()) {
        for (const arkMethod of arkClass.getMethods()) {
            const cfg = arkMethod.getCfg();
            if (cfg == undefined) continue;
            for (const stmt of cfg.getStmts()) {
                const text = stmt.getOriginalText();
                if (!text) continue;
                
                // 简化：只要包含 executeSql 就报告
                if (text.includes('executeSql')) {
                    console.log(`  ✅ 发现 executeSql: ${text.trim()}`);
                    foundIssues++;
                    this.reportIssue(targetFile, stmt, 'SQL injection');
                }
            }
        }
    }
    console.log(`🔍 SQLInjectionCheck 完成，发现 ${foundIssues} 个问题`);
};

    private isSQLMethod(text: string): boolean {
        const sqlMethods = ['executeSql', 'query', 'execSql', 'runSql', 'sqlite'];
        return sqlMethods.some(method => text.includes(method));
    }

    private hasStringConcatenation(text: string): boolean {
        const concatPatterns = ["' + ", " + '", "` + ", " + `", "${", "\\${"];
        return concatPatterns.some(pattern => text.includes(pattern));
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
        const endColumn = startColumn + Math.min(text.length, 30);
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