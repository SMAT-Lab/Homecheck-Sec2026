// ./src/checker/SoftwareSecurity26/Checker23371148/InsecurePermissionCheck.ts
import { ArkFile, Stmt } from 'arkanalyzer';
import Logger, { LOG_MODULE_TYPE } from 'arkanalyzer/lib/utils/logger';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects } from '../../../Index';
import { FileMatcher, MatcherCallback, MatcherTypes } from '../../../Index';
import { Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'InsecurePermissionCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: 'https://security.ohos.com/insecure-permissions',
    description: 'Detects insecure permission requests (too many permissions or missing checks).'
};

export class InsecurePermissionCheck implements BaseChecker {
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
                    
                    // 检测 requestPermissions 调用
                    if (text.includes('requestPermissions')) {
                        // 检测是否请求了过多权限（3个以上）
                        const permCount = (text.match(/ohos\.permission/g) || []).length;
                        if (permCount >= 3) {
                            this.reportIssue(targetFile, stmt, `Requesting ${permCount} permissions at once`);
                        }
                    }
                    
                    // 检测 checkAccessToken 调用（权限检查但没有处理结果）
                    if (text.includes('checkAccessToken') || text.includes('checkPermission')) {
                        this.reportIssue(targetFile, stmt, 'Permission check found but result may not be handled');
                    }
                }
            }
        }
    };

    public reportIssue(arkFile: ArkFile, stmt: Stmt, detail: string): void {
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
        const description = `${this.metaData.description}: ${detail}`;
        let defects = new Defects(
            lineNum, startColumn, endColumn,
            description,
            severity,
            this.rule.ruleId,
            filePath,
            this.metaData.ruleDocPath,
            true, false, false
        );
        this.issues.push(new IssueReport(defects, undefined));
    }
}