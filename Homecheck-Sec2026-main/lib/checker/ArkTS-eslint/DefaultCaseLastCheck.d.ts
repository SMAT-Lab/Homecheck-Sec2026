import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class DefaultCaseLastCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    getAllComments: (code: string) => string[];
    /**
     * 检查 TypeScript 代码中switch代码块中default case是否在所有case中为最后一个，否则返回报错位置
     * @param code 要检查的 TypeScript 代码
     * @returns 包含default case不在最后一个位置的错误位置的对象数组
     */
    checkDefaultCaseLast(target: ArkFile): {
        line: number;
        character: number;
        sourceCode: string;
    }[];
    check: (target: ArkFile) => void;
    getCharPosition: (code: string, charIndex: number) => {
        line: number;
        column: number;
    };
    private addIssueReport;
}
