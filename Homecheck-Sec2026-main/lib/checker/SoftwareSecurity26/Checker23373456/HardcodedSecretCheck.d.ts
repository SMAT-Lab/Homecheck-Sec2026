import { ArkFile, Stmt } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { Defects } from '../../../Index';
import { MatcherCallback } from '../../../Index';
import { Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';
export declare class HardcodedSecretCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    private secretPatterns;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    private containsHardcodedSecret;
    reportIssue(arkFile: ArkFile, stmt: Stmt, methodName: string): void;
}
