import { ArkFile } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export declare class NoCondAssignCheck implements BaseChecker {
    defects: Defects[];
    issues: IssueReport[];
    readonly metaData: BaseMetaData;
    rule: Rule;
    private defualtOption;
    private option;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    /**
     * 判断 TypeScript 代码中条件表达式的合法性，并返回不合法的行列号和错误信息
     * @param sourceFile 要检查的 TypeScript 代码
     * @param mode 检查模式，"always" 表示任何赋值都是错误的，其他模式表示仅当赋值括在括号中时才允许
     * @returns 包含不合法条件表达式位置和错误信息的对象数组
     */
    private checkConditionValidity;
    private traverseNodes;
    private findContainsEqualsSignNode;
    private isConditionalStatement;
    private getCondition;
    private containsEqualsSign;
    private isInvalidAssignment;
    private addInvalidPosition;
    private getConditionalType;
    check: (target: ArkFile) => void;
    private addIssueReport;
}
