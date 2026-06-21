import { ArkFile, ts } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
declare class ReportBean {
    line: number;
    character: number;
    message: string;
    sourceCode: string;
}
export declare class UseIsNaNCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private defalutOptions;
    private options;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    /**
     * 检查 TypeScript 代码中是否正确使用 isNaN 或 Number.isNaN 来检查 NaN
     * @param code 要检查的 TypeScript 代码
     * @returns 包含错误位置的对象数组
     */
    checkUseIsNaN(sourceFile: ts.SourceFile): ReportBean[];
    private checkNode;
    private checkSwitchCase;
    private checkEnforceForIndexOf;
    private checkIndexOf;
    private checkIndexOfTraversal;
    private getOption;
    check: (target: ArkFile) => void;
    private addIssueReport;
}
export {};
