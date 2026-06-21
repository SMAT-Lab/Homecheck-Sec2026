import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
import { IssueReport } from '../../model/Defects';
export type Option = {
    ignoreEnums?: boolean;
    ignoreNumericLiteralTypes?: boolean;
    ignoreReadonlyClassProperties?: boolean;
    ignoreTypeIndexes?: boolean;
    /** 是否检测对象属性值中的魔法数字 */
    detectObjects?: boolean;
    /** 是否强制魔法数字常量使用const声明 */
    enforceConst?: boolean;
    /** 需要忽略的特定数字数组 */
    ignore?: (number | string)[];
    /** 是否忽略数组索引 */
    ignoreArrayIndexes?: boolean;
    /** 是否忽略默认值 */
    ignoreDefaultValues?: boolean;
    /** 是否忽略类字段初始值 */
    ignoreClassFieldInitialValues?: boolean;
};
export declare class NoMagicNumbersCheck implements BaseChecker {
    private defaultOption;
    private option;
    readonly metaData: BaseMetaData;
    defects: Defects[];
    issues: IssueReport[];
    rule: Rule;
    private ignoreSet;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    private normalizeIgnoreValue;
    private isIgnoredValue;
    private checkMagicNumbers;
    private processNumericNode;
    private checkParenthesizedExpr;
    private getParentAfterParenthesis;
    private shouldSkipNumberCheck;
    private checkVariableDeclaration;
    private reportConstError;
    private shouldReportMagicNumber;
    private getFullNumberNodeInfo;
    private isDefaultValue;
    private isInDestructuringPropertyAssignment;
    private isClassFieldInitialValue;
    private isParseIntRadix;
    private isJSXNumber;
    private isArrayIndex;
    private isEnumMember;
    private isParentTSLiteralType;
    private isGrandparentTSTypeAliasDeclaration;
    private isGrandparentTSUnionType;
    private isNumericLiteralType;
    private isReadonlyClassProperty;
    private isTypeIndex;
    private getLiteralParent;
    private addIssueReport;
    private reportMagicNumber;
    private isPropertyAccessCompoundAssignment;
}
