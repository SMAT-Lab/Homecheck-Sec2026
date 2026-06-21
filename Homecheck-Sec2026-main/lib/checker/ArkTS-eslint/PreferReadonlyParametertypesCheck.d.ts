import { ArkMethod, Scene } from 'arkanalyzer/lib';
import { ClassSignature } from 'arkanalyzer/lib/core/model/ArkSignature';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
interface ClassifiedItem {
    from: string;
    path?: string;
    names: string[];
}
export declare class PreferReadonlyParametertypesCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMethod: ArkMethod) => void;
    private extractParameters;
    private isReadonlyType;
    private paramTypeisUndefined;
    private isComplexParamDef;
    private isAllowedClassType;
    private isReadonlyTypeType;
    private isReadonlyObjectType;
    private isReadonlyPrimitiveType;
    private isReadonlyArrayOrTupleType;
    private isReadonlyUnionType;
    private isReadonlySingleUnionType;
    private isReadonlyOtherUnionType;
    private isSpecialReadonlyType;
    private isReadonlyGenericType;
    /**
     * 判断字符串是否表示基础类型，包括 any 和 undefined
     * @param type 要检查的字符串
     * @returns 如果字符串表示基础类型，则返回 true；否则返回 false
     */
    private isPrimitiveType;
    private isArrayOrTupleType;
    /**
     * 判断一个数组或元组的定义字符串是否符合全部为只读
     * @param type 要检查的字符串
     * @returns 如果字符串表示的数组或元组全部为只读，则返回 true；否则返回 false
     */
    private isReadonlyArrayOrTuple;
    private extractArrayDimensions;
    /**
     * 检查类的属性是否全部为只读
     * @param classSignature 类的签名
     * @param scene 场景对象
     * @returns 如果类的所有属性都是只读的，则返回 true；否则返回 false
     */
    private isClassInAllowList;
    private areFieldsReadonly;
    private isTypeFieldReadonly;
    private isFieldReadonly;
    private checkSuperClassReadonly;
    private areAllClassPropertiesReadonly;
    private verifyMethodsReadonly;
    private verifyFieldsReadonly;
    private verifySuperClassReadonly;
    areAllTypePropertiesReadonly(classSignature: ClassSignature, scene: Scene, allowClass: ClassifiedItem[], treatMethodsAsReadonly: boolean): boolean;
    private classifyAllow;
    private findNames;
    private checkConstructor;
    private addIssueReport;
    private getLineAndColumnMethod;
    private isModifierType;
    private processParam;
    private escapeRegExp;
    private getTextPosition;
    private execArgAssignType;
    private isFunctionCall;
    private execFunctionCallParamType;
    private extractParametersAddReport;
    private containsIsolatedFragment;
    private iscontainsChainCallFunc;
    private isStartReadOnly;
}
export {};
