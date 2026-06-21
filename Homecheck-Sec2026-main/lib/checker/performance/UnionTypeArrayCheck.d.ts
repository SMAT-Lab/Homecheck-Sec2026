import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { ArkClass, ArkFile, ArkMethod, Value } from 'arkanalyzer';
import { IssueReport } from '../../model/Defects';
export declare class UnionTypeArrayCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    unionClassProcess(arkClass: ArkClass): void;
    methodProcess(arkMethod: ArkMethod, clazz: ArkClass): void;
    getArrayName(leftOp: Value): string | undefined;
    numberCheck(leftOp: Value, clazz: ArkClass): boolean;
    private reportIssue;
}
