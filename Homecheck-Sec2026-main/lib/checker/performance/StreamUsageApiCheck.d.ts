import { ArkClass, ArkFile, ArkMethod } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class StreamUsageApiCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    private clsMatcher;
    private mtdMatcher;
    registerMatchers(): MatcherCallback[];
    fileCheck: (arkFile: ArkFile) => void;
    clsCheck: (clazz: ArkClass) => void;
    check: (target: ArkMethod) => void;
    private processClazz;
    private traversalLocals;
    private processDeclaringStmt;
    private processUsage;
    private reportIssue;
}
