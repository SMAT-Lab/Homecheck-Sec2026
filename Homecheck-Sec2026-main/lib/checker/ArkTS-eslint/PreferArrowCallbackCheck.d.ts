import { ArkFile } from 'arkanalyzer';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
export declare class PreferArrowCallbackCheck implements BaseChecker {
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    private defaultOptions;
    check: (target: ArkFile) => void;
    private checkAction;
    private checkNode;
    private checkConditionalExpression;
    private checkBinaryExpression;
    private addIssueReport;
    private createFix;
    /**
     * 为函数表达式创建修复
     */
    private createFixForFunctionExpression;
    /**
     * 提取函数参数文本
     */
    private extractParamsText;
    /**
     * 检查函数表达式是否在二元表达式中需要额外括号
     */
    private needsParenthesesForBinaryExpression;
}
