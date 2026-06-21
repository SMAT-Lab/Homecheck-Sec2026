import { Rule } from '../../model/Rule';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
type NoTypeAliasOptions = [
    {
        allowAliases?: string;
        allowCallbacks?: string;
        allowConditionalTypes?: string;
        allowConstructors?: string;
        allowLiterals?: string;
        allowMappedTypes?: string;
        allowTupleTypes?: string;
        allowGenerics?: string;
    }
];
export declare class NoTypeAliasCheck implements BaseChecker {
    issues: IssueReport[];
    readonly CONST_STR: string;
    readonly CONST_LET: string;
    readonly CONST_CONSTRUCTOR: string;
    readonly CONST_EQUAL: string;
    readonly CONST_ARROW: string;
    private options;
    private messages;
    rule: Rule;
    defects: Defects[];
    metaData: BaseMetaData;
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    private getMessage;
    check: (target: ArkClass) => void;
    private checkRule;
    private needCheckAliases;
    private checkGenerics;
    private verifyPosition;
    private checkGenericsUnclearReferenceType;
    private checkGenericsClassType;
    private checkGenericsArrayType;
    private checkTupleTypes;
    private checkTupleKeyofType;
    private checkMappedTypes;
    private getRealMessage;
    private checkLiterals;
    private checkLiteralsClassType;
    private getCount;
    private checkConstructors;
    private checkConditionalTypes;
    private checkCallbacks;
    private checkAliases;
    private checkAliasGenericType;
    private isNormalType;
    private checkAliasArrayType;
    private checkAliasUnclearReferenceType;
    private checkAliasKeyofType;
    private getText;
    private getText1;
    private getText2;
    private getParseOriginText;
    private executeClassType;
    private executeUnknownType;
    private executeUnionOrIntersection;
    getDefaultOption(): NoTypeAliasOptions;
    private addIssueReport;
    private getLineAndColumn;
    /**
     * 计算一个字符串包含另一个字符串的次数
     * @param haystack  要搜索的字符串
     * @param needle 要查找的子字符串
     * @returns 子字符串出现的次数
     */
    private countOccurrences;
    private parseUnion;
    private pushItem;
    private isWhitespace;
    private findNextPipe;
    private getUnionPart;
}
export {};
