import { ArkFile, ts } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export declare class NoCaseDeclarationsCheck implements BaseChecker {
    defects: Defects[];
    issues: IssueReport[];
    readonly metaData: BaseMetaData;
    rule: Rule;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    /**
     * 检查 TypeScript 代码中是否在 case/default 子句中使用词法声明，返回报错位置
     * @param sourceFile 要检查的 TypeScript 代码
     * @returns 包含词法声明错误位置的对象数组
     */
    checkLexicalDeclarationsInSwitch(sourceFile: ts.SourceFile): {
        line: number;
        startCol: number;
        endCol: number;
    }[];
    check: (target: ArkFile) => void;
    private addIssueReport;
}
