// ./src/checker/SoftwareSecurity26/Checker23371148/CommandExecutionCheck.ts
import { ArkFile, Stmt } from 'arkanalyzer';
import Logger, { LOG_MODULE_TYPE } from 'arkanalyzer/lib/utils/logger';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects } from '../../../Index';
import { FileMatcher, MatcherCallback, MatcherTypes } from '../../../Index';
import { Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'CommandExecutionCheck');

const gMetaData: BaseMetaData = {
    severity: 2,
    ruleDocPath: 'https://security.ohos.com/command-injection',
    description: 'Detects unsafe command execution via exec() calls.'
};

export class CommandExecutionCheck implements BaseChecker {
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
                    
                    // 检测是否包含 exec 或 execSync 调用
                    if (text.includes('exec(') || text.includes('execSync(')) {
                        // 检测是否包含危险命令或用户输入拼接
                        if (this.isDangerousCommand(text) || this.isUserInput(text)) {
                            this.reportIssue(targetFile, stmt, 'exec');
                        }
                    }
                }
            }
        }
    };

    private isDangerousCommand(text: string): boolean {
        const dangerousPatterns = [
            'rm -rf', 'del /f', 'format', 'shutdown',
            'reboot', 'dd if=', 'mkfs', 'chmod 777'
        ];
        return dangerousPatterns.some(pattern => text.includes(pattern));
    }

    private isUserInput(text: string): boolean {
        const userInputPatterns = ['+', '${', '`', '$('];
        return userInputPatterns.some(pattern => text.includes(pattern));
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
        const execIndex = text.indexOf('exec');
        const startColumn = originPositionInfo.getColNo() + (execIndex >= 0 ? execIndex : 0);
        const endColumn = startColumn + 4;
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