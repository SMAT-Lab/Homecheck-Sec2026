import { ArkFile, ts } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export type MaxLinesOptions = {
    max?: number;
    skipBlankLines?: boolean;
    skipComments?: boolean;
    IIFEs?: boolean;
};
export declare class MaxLinesPerFunctionCheck implements BaseChecker {
    defects: Defects[];
    issues: IssueReport[];
    readonly metaData: BaseMetaData;
    rule: Rule;
    private fileMatcher;
    private defaultOption;
    private option;
    registerMatchers(): MatcherCallback[];
    /**
     * 检查 TypeScript 代码中所有方法，返回超过最大行数的方法位置
     * @param sourceFile 要检查的 sourceFile
     * @returns 超过最大行数的方法位置数组，包含错误信息
     */
    checkMaxLinesPerFunction(sourceFile: ts.SourceFile): {
        line: number;
        character: number;
        message: string;
    }[];
    check: (target: ArkFile) => void;
    private addIssueReport;
}
