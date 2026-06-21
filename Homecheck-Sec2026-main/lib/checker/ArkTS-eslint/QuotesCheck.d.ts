import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class QuotesCheck implements BaseChecker {
    rule: Rule;
    private options;
    defects: Defects[];
    issues: IssueReport[];
    private traversedNodes;
    private defaultOptions;
    private readonly dollarCurlyRegex;
    private readonly backtickRegex;
    private readonly escapedBacktickRegex;
    private readonly doubleQuoteRegex;
    private readonly escapedSingleQuoteRegex;
    private readonly singleQuoteRegex;
    private readonly escapedDoubleQuoteRegex;
    private readonly avoidCheckFolder;
    metaData: BaseMetaData;
    private fileMatcher;
    constructor();
    registerMatchers(): MatcherCallback[];
    check(target: ArkFile): void;
    /**
     * 初始化和解析配置选项
     */
    private initializeOptions;
    /**
     * 解析规则选项
     */
    private parseRuleOptions;
    /**
     * 检查是否是错误级别选项
     */
    private isErrorLevel;
    /**
     * 处理错误级别选项
     */
    private handleErrorLevelOption;
    /**
     * 处理引号类型选项
     */
    private handleQuoteTypeOption;
    /**
     * 设置引号类型
     */
    private setQuoteType;
    /**
     * 应用选项设置
     */
    private applyOptionSettings;
    private checkQuotes;
    private checkStringLiteral;
    private checkTemplateLiteral;
    private isAllowedAsNonBacktick;
    private createQuoteFix;
    private processQuoteConversion;
    private processBacktickConversion;
    private createTemplateFix;
    private processTemplateToQuoteConversion;
    private addIssueReport;
    private escapeDoubleQuotes;
    private escapeSingleQuotes;
    private preserveEscapeSequences;
}
