import { ArkFile, Stmt } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects, FileMatcher, MatcherCallback, MatcherTypes, Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Cleartext HTTP URLs leak or tamper traffic; prefer https:// endpoints.'
};

const CLEARTEXT_URL = /(['"`])http:\/\/.+?\1/;

export class CleartextHttpUrlCheck implements BaseChecker {
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
                    if (!text || !text.includes('http://')) {
                        continue;
                    }
                    if (!CLEARTEXT_URL.test(text)) {
                        continue;
                    }
                    this.reportIssue(targetFile, stmt);
                }
            }
        }
    }

    private reportIssue(arkFile: ArkFile, stmt: Stmt): void {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const quoted = text.match(CLEARTEXT_URL);
        const highlight = quoted ? quoted[0].slice(1, -1) : 'http://';
        let idx = text.indexOf(highlight);
        if (idx < 0) {
            idx = text.indexOf('http://');
        }
        const startColumn = originPositionInfo.getColNo() + (idx >= 0 ? idx : 0);
        const endColumn = startColumn + Math.max(highlight.length, 'http://'.length);
        const defects = new Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId,
            filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new IssueReport(defects, undefined));
    }
}
