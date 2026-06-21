import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class DefaultCaseCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    private defalutOptions;
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    /**
     * 检查 TypeScript 代码中switch代码块中是否缺少default case，返回报错位置
     * @param code 要检查的 TypeScript 代码
     * @param options 包含commentPattern的选项对象
     * @returns 包含缺少default case错误位置的对象数组
     */
    checkMissingDefaultCase(target: ArkFile, options?: {
        commentPattern?: string;
    }): {
        line: number;
        character: number;
        code: string;
    }[];
    private checkNode;
    private getOption;
    check: (target: ArkFile) => void;
    private addIssueReport;
}
