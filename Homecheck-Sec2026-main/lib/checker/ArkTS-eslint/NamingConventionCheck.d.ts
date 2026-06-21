import { ArkFile } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { MatcherCallback } from "../../Index";
type Selector = 'default' | 'variable' | 'function' | 'parameter' | 'property' | 'parameterProperty' | 'method' | 'accessor' | 'enumMember' | 'class' | 'interface' | 'typeAlias' | 'enum' | 'typeParameter' | 'memberLike' | 'typeLike' | 'variableLike' | 'classMethod' | 'objectLiteralMethod' | 'typeMethod' | 'classProperty' | 'objectLiteralProperty' | 'typeProperty' | 'import';
type Format = 'camelCase' | 'strictCamelCase' | 'PascalCase' | 'StrictPascalCase' | 'snake_case' | 'UPPER_CASE';
type Modifier = 'abstract' | 'async' | 'const' | 'default' | 'destructured' | 'exported' | 'global' | 'namespace' | 'override' | '#private' | 'private' | 'protected' | 'public' | 'readonly' | 'requiresQuotes' | 'static' | 'unused';
type TypeOption = 'array' | 'boolean' | 'function' | 'number' | 'string';
type Option = {
    selector: Selector | Selector[];
    format?: Format[] | null;
    modifiers?: Modifier[];
    types?: TypeOption[];
    filter?: string | {
        regex: string;
        match: boolean;
    };
    custom?: {
        regex: string;
        match: boolean;
    };
    leadingUnderscore?: 'forbid' | 'require' | 'requireDouble' | 'allow' | 'allowDouble' | 'allowSingleOrDouble';
    trailingUnderscore?: 'forbid' | 'require' | 'requireDouble' | 'allow' | 'allowDouble' | 'allowSingleOrDouble';
    prefix?: string[];
    suffix?: string[];
};
export declare class NamingConventionCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    issues: any[];
    defects: Defects[];
    rule: Rule;
    private currentArkFile;
    private fileMatcher;
    private selectors;
    private formats;
    private ruleConfigs;
    private options;
    private methodArr;
    private defaultArr;
    private variableArr;
    private functionArr;
    private parameterArr;
    private parameterPropertyArr;
    private accessorArr;
    private enumMemberArr;
    private classArr;
    private interfaceArr;
    private typeAliasArr;
    private enumArr;
    private typeParameterArr;
    private memberLikeArr;
    private typeLikeArr;
    private variableLikeArr;
    private classMethodArr;
    private objectLiteralMethodArr;
    private typeMethodArr;
    private classPropertyArr;
    private objectLiteralPropertyArr;
    private typePropertyArr;
    private importArr;
    private propertyArr;
    private checkParamMap;
    private selectorProcessors;
    constructor(customOption?: Option[]);
    registerMatchers(): MatcherCallback[];
    check: (targetField: ArkFile) => void;
    private checkSelectors;
    private collectNeededNodes;
    /**
     * 收集变量相关节点
     */
    private collectVariableNodes;
    /**
     * 收集函数相关节点
     */
    private collectFunctionNodes;
    /**
     * 收集类型相关节点
     */
    private collectTypeNodes;
    /**
     * 收集成员相关节点
     */
    private collectMemberNodes;
    private collectMethod;
    private collectProperty;
    /**
     * 收集需要进行命名规范检查的默认节点
     * @param node 当前遍历的节点
     */
    private collectDefaultNodes;
    /**
     * 收集标识符节点
     */
    private collectDefaultIdentifiers;
    /**
     * 收集导入和函数表达式节点
     */
    private collectImportAndFunctionNodes;
    /**
     * 收集属性节点
     */
    private collectPropertyNodes;
    /**
     * 收集非标识符名称的节点
     */
    private collectNonIdentifierNames;
    /**
     * 收集其他类型的节点
     */
    private collectMiscNodes;
    private getOptionForSelector;
    private processVariableSelector;
    private processFunctionSelector;
    private processClassSelector;
    private processInterfaceSelector;
    private processEnumSelector;
    private processParameterSelector;
    private processImportSelector;
    /**
     * 处理单个导入节点
     * @param node 导入声明节点
     * @param option 命名选项
     */
    private processImportNode;
    /**
     * 处理默认导入
     * @param importClause 导入子句
     * @param option 命名选项
     */
    private processDefaultImport;
    /**
     * 处理命名导入
     * @param importClause 导入子句
     * @param option 命名选项
     */
    private processNamedImports;
    private checkImport;
    private processParameterPropertySelector;
    private processAccessorSelector;
    private processEnumMemberSelector;
    private processTypeAliasSelector;
    private processTypeParameterSelector;
    private processClassMethodSelector;
    private processObjectLiteralMethodSelector;
    private processTypeMethodSelector;
    private processClassPropertySelector;
    private processObjectLiteralPropertySelector;
    private processTypePropertySelector;
    private processMemberLikeSelector;
    private processMethodSelector;
    private processPropertySelector;
    private processTypeLikeSelector;
    private processVariableLikeSelector;
    private processDefaultSelector;
    private checkDefault;
    private getIdentifierKind;
    /**
     * 处理字面量节点类型
     */
    private getLiteralNodeKind;
    /**
     * 处理标识符节点类型
     */
    private getIdentifierNodeKind;
    /**
     * 获取属性相关的类型
     */
    private getPropertyKindIfApplicable;
    /**
     * 获取函数相关的类型
     */
    private getFunctionKindIfApplicable;
    /**
     * 获取类型相关的声明
     */
    private getTypeKindIfApplicable;
    /**
     * 获取类成员相关的类型
     */
    private getClassMemberKindIfApplicable;
    /**
     * 获取变量和参数相关的类型
     */
    private getVariableKindIfApplicable;
    private shouldSkipNode;
    private checkVariable;
    /**
     * 检查对象解构模式中的变量命名
     * @param pattern 对象解构模式
     * @param option 命名选项
     */
    private checkObjectBindingPattern;
    /**
     * 处理单个解构绑定元素
     * @param element 绑定元素
     * @param option 命名选项
     */
    private processBindingElement;
    /**
     * 处理解构绑定中的标识符
     * @param element 包含标识符的绑定元素
     * @param option 命名选项
     */
    private processIdentifierBinding;
    /**
     * 检查数组解构模式中的变量命名
     * @param pattern 数组解构模式
     * @param option 命名选项
     */
    private checkArrayBindingPattern;
    private checkFunction;
    private checkParameter;
    private checkProperty;
    private getPropertyKind;
    private checkParameterProperty;
    private checkMethod;
    private getMethodKind;
    private checkAccessor;
    private checkEnumMember;
    private checkClass;
    private checkInterface;
    private checkTypeAlias;
    private checkEnum;
    private checkTypeParameter;
    private checkMemberLike;
    private getMemberLikeKind;
    private getMemberName;
    private checkTypeLike;
    private getTypeLikeKind;
    private getTypeLikeName;
    private checkVariableLike;
    private getVariableLikeKind;
    private checkClassMethod;
    private checkObjectLiteralMethod;
    private checkTypeMethod;
    private checkClassProperty;
    private checkObjectLiteralProperty;
    private checkTypeProperty;
    private checkModifiers;
    private checkSingleModifier;
    private checkSimpleModifier;
    private checkConstModifier;
    private checkGlobalModifier;
    private checkPrivateIdentifier;
    private checkPublicModifier;
    private checkUnusedModifier;
    private checkTypes;
    private findNodeReferences;
    private getNodeType;
    private isArrayType;
    private isBooleanType;
    private isFunctionType;
    private isNumberType;
    private isStringType;
    private checkNaming;
    private runNamingChecks;
    private isAlreadyChecked;
    private checkTypesCondition;
    private checkModifiersCondition;
    private checkCustomRegex;
    private checkFilter;
    private checkLeadingUnderscore;
    private checkTrailingUnderscore;
    private checkPrefix;
    private checkSuffix;
    private checkFormat;
    private addFormatViolation;
    private handleViolations;
    private getNodePosition;
    /**
     * 获取节点的起始位置
     * @param node 当前节点
     * @param sourceFile 源文件
     * @returns 节点起始位置
     */
    private getNodeStartPosition;
    /**
     * 检查节点是否为类型声明节点（类、接口、枚举、类型别名）
     */
    private isTypeDeclarationNode;
    /**
     * 检查节点是否为方法或属性相关节点
     */
    private isMethodOrPropertyNode;
    /**
     * 获取命名声明节点的位置
     */
    private getNamedDeclarationPosition;
    /**
     * 获取绑定元素（解构赋值）的位置，特别处理重命名变量
     */
    private getBindingElementPosition;
    /**
     * 查找重命名绑定变量的实际位置
     * 例如对于 { a: b } 要找到 b 的实际位置
     */
    private findRenamedBindingPosition;
    /**
     * 收集解构赋值模式中的变量名
     * @param pattern 解构赋值模式
     */
    private collectDestructuringNames;
    private isInGlobalTypeDeclaration;
}
export {};
