import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects } from '../../model/Defects';
import { Rule } from '../../model/Rule';
import { IssueReport } from '../../model/Defects';
export declare class LoadOnDemandCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetCla: ArkClass) => void;
    private lookingForEach;
    private getForeachInitSize;
    private getSizeFromArkField;
    private reportIssue;
}
