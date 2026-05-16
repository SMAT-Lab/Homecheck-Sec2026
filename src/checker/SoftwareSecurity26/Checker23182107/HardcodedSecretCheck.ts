import { ArkFile, Stmt } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects, FileMatcher, MatcherCallback, MatcherTypes, Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Hardcoded passwords, API keys, or tokens in source can be extracted from the application binary.'
};

const SECRET_PATTERN = /\b(password|passwd|pwd|apiKey|api_key|secret|access_token|token)\s*[:=]\s*(['"`])([^'"`\\]{4,})\2/i;

export class HardcodedSecretCheck implements BaseChecker {
    readonly metaData: BaseMetaData = gMetaData;
    public rule: Rule;
    public defects: Defects[] = [];
    public issues: IssueReport[] = [];

    private fileMatcher: FileMatcher = {
        matcherType: MatcherTypes.FILE
    };

    public registerMatchers(): MatcherCallback[] {
        return [{
            matcher: this.fileMatcher,
            callback: this.check
        }];
    }

    public check = (targetFile: ArkFile) => {
        for (const arkClass of targetFile.getClasses()) {
            for (const arkMethod of arkClass.getMethods()) {
                if (arkMethod.getName() === '_DEFAULT_ARK_METHOD') {
                    continue;
                }
                const cfg = arkMethod.getCfg();
                if (cfg === undefined) {
                    continue;
                }
                for (const stmt of cfg.getStmts()) {
                    const text = stmt.getOriginalText();
                    const match = text?.match(SECRET_PATTERN);
                    if (match) {
                        this.reportIssue(targetFile, stmt, match);
                    }
                }
            }
        }
    }

    private reportIssue(arkFile: ArkFile, stmt: Stmt, match: RegExpMatchArray): void {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const hl = match[1];
        const idx = match.index ?? text.indexOf(hl);
        const startColumn = originPositionInfo.getColNo() + (idx >= 0 ? idx : 0);
        const endColumn = startColumn + hl.length;
        const defects = new Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId,
            filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new IssueReport(defects, undefined));
    }
}
