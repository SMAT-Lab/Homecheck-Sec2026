import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class MaxClassesPerFileCheck implements BaseChecker {
    metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private defaultOptions;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private parseOptions;
    private validateClassCount;
    private getFirstCodePosition;
    private createFileIssue;
    private addIssueReport;
}
