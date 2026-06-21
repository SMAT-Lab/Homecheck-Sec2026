import { ArkFile } from 'arkanalyzer';
import { Rule } from '../model/Rule';
import { MatcherCallback } from '../matcher/Matchers';
import { IssueReport } from '../model/Defects';
export interface BaseMetaData {
    severity: number;
    ruleDocPath: string;
    description: string;
    [extendField: string]: any;
}
export interface BaseChecker {
    metaData: object;
    rule: Rule;
    registerMatchers(): MatcherCallback[];
    check(target: any): void;
    codeFix?(arkFile: ArkFile, fixKey: string): boolean;
    issues: IssueReport[];
}
