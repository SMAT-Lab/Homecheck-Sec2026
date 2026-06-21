import { ts, ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
type Options = [
    'always' | 'never',
    {
        allowNewlines?: boolean;
    }?
];
export declare class FuncCallSpacingCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private issueMap;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    loopNode(targetFilePath: string, sourceFile: ts.SourceFile, aNode: ts.Node, mergedOptions: Options): void;
    private extractCallExpressionParts;
    private countCharactersAndNewlines;
    private addIssueReport;
    private formatFnCall;
    private ruleFix;
    private reportSortedIssues;
    private exceFix;
    private addFixByText;
}
export {};
