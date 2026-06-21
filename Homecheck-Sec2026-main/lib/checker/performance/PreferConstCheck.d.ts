import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
import { MatcherCallback } from '../../matcher/Matchers';
export declare class PreferConstCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private processMethod;
    private isVariableModified;
    private createDefect;
    private createFix;
    private getRangeBySourceFile;
}
