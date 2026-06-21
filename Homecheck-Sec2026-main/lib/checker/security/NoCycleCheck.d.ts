import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoCycleCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    /**
     * 循环依赖检测.
     *
     * @param arkFile
     */
    check: (arkFile: ArkFile) => void;
    /**
     * 递归获取依赖.
     *
     * @param scene
     * @param importInfos
     * @param refChainInfo
     * @param refFileSignatureChain
     */
    private getImportByRecursion;
    /**
     * 拼接issue.
     *
     * @param lineNum
     * @param startColumn
     * @param endColunm
     * @param refChainInfo
     */
    private reportIssue;
}
