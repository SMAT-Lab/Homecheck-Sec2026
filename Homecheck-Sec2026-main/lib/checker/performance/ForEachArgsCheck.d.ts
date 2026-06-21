import { ArkFile, ArkMethod } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ForeachArgsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly FOREACH_STR: string;
    readonly CREAER_STR: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private buildMatcher;
    private builderMatcher;
    private anonymousMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMtd: ArkMethod) => void;
    private addIssueReport;
    private getLineAndColumn;
    codeFix(arkFile: ArkFile, fixKey: string): boolean;
}
