import { ArkFile, Stmt } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects, FileMatcher, MatcherCallback, MatcherTypes, Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Do not use the Function constructor: it is equivalent to eval and breaks code integrity guarantees.'
};

const NEW_FUNCTION = /\bnew\s+Function\s*\(/;

export class FunctionConstructorCheck implements BaseChecker {
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
                    if (text && NEW_FUNCTION.test(text)) {
                        const m = text.match(NEW_FUNCTION);
                        const hl = m ? m[0].replace(/\($/, '').trim() : 'Function';
                        this.reportIssue(targetFile, stmt, hl);
                    }
                }
            }
        }
    }

    private reportIssue(arkFile: ArkFile, stmt: Stmt, highlight: string): void {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const keyword = highlight.includes('Function') ? 'Function' : highlight;
        const idx = text.indexOf(keyword);
        const startColumn = originPositionInfo.getColNo() + (idx >= 0 ? idx : 0);
        const endColumn = startColumn + keyword.length;
        const defects = new Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId,
            filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new IssueReport(defects, undefined));
    }
}
