// ./src/checker/SoftwareSecurity26/Checker19241042/PathTraversalCheck.ts
import { ArkFile, Stmt } from 'arkanalyzer';
import Logger, { LOG_MODULE_TYPE } from 'arkanalyzer/lib/utils/logger';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects } from '../../../Index';
import { FileMatcher, MatcherCallback, MatcherTypes } from '../../../Index';
import { Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'PathTraversalCheck');

const gMetaData: BaseMetaData = {
    severity: 2,
    ruleDocPath: 'https://security.ohos.com/path-traversal',
    description: 'Detects potential path traversal vulnerabilities.'
};

export class PathTraversalCheck implements BaseChecker {
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
                    
                    // 检测文件操作相关方法
                    if (this.isFileMethod(text)) {
                        // 检测是否存在路径遍历模式
                        if (this.hasPathTraversalPattern(text)) {
                            this.reportIssue(targetFile, stmt, 'path traversal');
                        }
                    }
                }
            }
        }
    };

    private isFileMethod(text: string): boolean {
        const fileMethods = [
            'readText', 'readFile', 'writeText', 'writeFile',
            'unlink', 'delete', 'rename', 'copy', 'move',
            'open', 'createFile', 'mkdir'
        ];
        return fileMethods.some(method => text.includes(method));
    }

    private hasPathTraversalPattern(text: string): boolean {
        const patterns = ['../', '..\\', '/etc/', '/system/', '/proc/', '+', '${'];
        return patterns.some(pattern => text.includes(pattern));
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