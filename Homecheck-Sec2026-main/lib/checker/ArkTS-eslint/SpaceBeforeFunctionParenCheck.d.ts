import { ArkFile, ts } from 'arkanalyzer';
import { Rule } from '../../Index';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects } from '../../Index';
import { MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class SpaceBeforeFunctionParenCheck implements BaseChecker {
    issues: IssueReport[];
    rule: Rule;
    defects: Defects[];
    sourceFile: ts.SourceFile;
    private defaultOptions;
    private errors;
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    /**
      * 检测函数括号前的空格问题
      * @param code 代码字符串
      * @param options 规则配置选项
      * @returns 错误信息数组，包含行列号和消息
    */
    private checkSpaceBeforeFunctionParen;
    private getParenPosition;
    private checkNamedFunction;
    private findClosingAngleBracket;
    private checkAsyncArrowFunction;
    private checkMethod;
    private findClosingAngleBracketForMethod;
    private checkConstructor;
    private isGeneratorFunction;
    private checkFunctionExpression;
    private checkSpace;
    private checkNeverSpace;
    private checkAlwaysSpace;
    private addError;
    check: (targetField: ArkFile) => void;
    private sortMyInvalidPositions;
    private getDefaultOption;
    private ruleFix;
    private addIssueReport;
    private generateFix;
    private isFunctionLikeDeclaration;
    private getAlwaysFixPositions;
    private getNeverFixPositions;
}
