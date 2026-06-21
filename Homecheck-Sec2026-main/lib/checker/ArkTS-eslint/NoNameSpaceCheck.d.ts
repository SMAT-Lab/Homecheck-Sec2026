import { ArkFile } from 'arkanalyzer';
import { Rule } from '../../model/Rule';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
export type Options = [
    {
        allowDeclarations?: boolean;
        allowDefinitionFiles?: boolean;
    }
];
export declare class NoNameSpaceCheck implements BaseChecker {
    issues: IssueReport[];
    private defaultOptions;
    rule: Rule;
    defects: Defects[];
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private excuteReport;
    private executeCheck;
    private checkChild;
    private checkLine;
    private isDeclare;
    private addIssueReport;
    private getOption;
}
