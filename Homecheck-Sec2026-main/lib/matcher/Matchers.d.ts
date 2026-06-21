import { ArkField, ArkFile, ArkMethod, ArkNamespace } from 'arkanalyzer';
import { ArkClass, ClassCategory } from 'arkanalyzer/lib/core/model/ArkClass';
export declare enum MethodCategory {
    Accessor = 0,
    ArrowFunction = 1,
    FunctionExpression = 2,
    Constructor = 3
}
export declare enum MatcherTypes {
    FILE = 0,
    NAMESPACE = 1,
    CLASS = 2,
    METHOD = 3,
    FIELD = 4,
    EXPR = 5
}
export interface BaseMatcher {
    [matchFieldName: string]: any;
}
export interface FileMatcher extends BaseMatcher {
    readonly matcherType: MatcherTypes.FILE;
    name?: string;
}
export interface NamespaceMatcher extends BaseMatcher {
    readonly matcherType: MatcherTypes.NAMESPACE;
    name?: string[];
    file?: (FileMatcher | ArkFile)[];
    namespace?: (NamespaceMatcher | ArkNamespace)[];
    isExport?: boolean;
}
export interface ClassMatcher extends BaseMatcher {
    readonly matcherType: MatcherTypes.CLASS;
    name?: string[];
    file?: (FileMatcher | ArkFile)[];
    namespace?: (NamespaceMatcher | ArkNamespace)[];
    category?: ClassCategory[];
    isAbstract?: boolean;
    isExport?: boolean;
    extends?: (ClassMatcher | ArkClass)[];
    implements?: (ClassMatcher | ArkClass)[];
    hasViewTree?: boolean;
}
export interface MethodMatcher extends BaseMatcher {
    readonly matcherType: MatcherTypes.METHOD;
    name?: string[];
    file?: (FileMatcher | ArkFile)[];
    namespace?: (NamespaceMatcher | ArkNamespace)[];
    class?: (ClassMatcher | ArkClass)[];
    category?: MethodCategory[];
    decorators?: string[];
    isStatic?: boolean;
    isExport?: boolean;
    isPublic?: boolean;
    isPrivate?: boolean;
    isProtected?: boolean;
    isAbstract?: boolean;
    hasViewTree?: boolean;
    isAnonymous?: boolean;
}
export interface FieldMatcher extends BaseMatcher {
    readonly matcherType: MatcherTypes.FIELD;
    name?: string[];
    file?: (FileMatcher | ArkFile)[];
    namespace?: (NamespaceMatcher | ArkNamespace)[];
    class?: (ClassMatcher | ArkClass)[];
    decorators?: string[];
    isStatic?: boolean;
    isPublic?: boolean;
    isPrivate?: boolean;
    isProtected?: boolean;
    isReadonly?: boolean;
}
export interface MatcherCallback {
    matcher: BaseMatcher | undefined;
    callback: Function;
}
export declare function isMatchedFile(arkFile: ArkFile, matchers: (FileMatcher | ArkFile)[]): boolean;
export declare function isMatchedNamespace(arkNs: ArkNamespace | null | undefined, matchers: (NamespaceMatcher | ArkNamespace)[]): boolean;
export declare function isMatchedClass(arkClass: ArkClass | null | undefined, matchers: (ClassMatcher | ArkClass)[]): boolean;
export declare function isMatchedMethod(arkMethod: ArkMethod | null | undefined, matchers: (MethodMatcher | ArkMethod)[]): boolean;
export declare function isMatchedField(arkField: ArkField | null | undefined, matchers: (FieldMatcher | ArkField)[]): boolean;
