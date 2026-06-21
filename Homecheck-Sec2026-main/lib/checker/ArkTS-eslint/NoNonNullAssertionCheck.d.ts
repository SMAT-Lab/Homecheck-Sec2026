import { ArkFile, ts } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects } from '../../Index';
import { MatcherCallback } from '../../Index';
import { Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoNonNullAssertionCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    loopNode(targetFile: ArkFile, sourceFile: ts.SourceFileLike, aNode: ts.Node): void;
    private checkNonNullExpression;
    private addIssueReport;
}
