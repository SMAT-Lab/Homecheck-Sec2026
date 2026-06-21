import { ArkFile, ts } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects } from '../../Index';
import { MatcherCallback } from '../../Index';
import { Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ConsistentTypeAssertionsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private issueMap;
    private ruleOptions;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    loopNode(targetFile: ArkFile, sourceFile: ts.SourceFileLike, aNode: ts.Node): void;
    private checkExpression;
    private reportIssue;
    private getObjectLiteralFix;
    private getFixInfo;
    private getTypeFixInfo;
    private needBracket;
    private getTypeNode;
    private removeBracket;
    private addIssueReport;
    private reportSortedIssues;
}
