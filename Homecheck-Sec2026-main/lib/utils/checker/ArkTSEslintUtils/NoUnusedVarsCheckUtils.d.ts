import { ArkMethod, Stmt, ArkClass, ArkNamespace, ImportInfo, ArkFile, ClassSignature, ts, NamespaceSignature, ArkInvokeStmt } from 'arkanalyzer/lib';
type astType = {
    name: string;
    kind: string;
    line: number;
    character: number;
};
declare enum VarType {
    Var = "var",
    Class = "class",
    Import = "import",
    Method = "method",
    Type = "type",
    Args = "args",
    ArgsP = "ArrayBindingPattern",
    Catch = "catch",
    Static = "static",
    UsedIgnorePattern = "UsedIgnorePattern"
}
type noUseVars = {
    varType: VarType;
    stmt?: Stmt;
    arkClass?: ArkClass;
    arkNamespace?: ArkNamespace;
    declareStmt?: Stmt;
    name: string | string[];
    local?: 'local' | 'all';
    isMethodParam?: boolean;
    arkMethod?: ArkMethod;
    isRestSiblings?: boolean;
    methodName?: string;
    parammaxUsedIndex?: number;
    paramIndex?: number;
    static?: boolean;
    varInit?: boolean;
    ArrayBindingPattern?: boolean;
    argPosion?: [lineNo: number, strClo: number, endClo: number];
    filePath?: string;
    isAll?: boolean;
};
export declare class NoUnusedVarsCheckUtils {
    static collecUnusedImports(importInfos: ImportInfo[], targetFilePath: string, importNoused: string[]): noUseVars[];
    static collecUnusedTypes(noUsedtype: astType[], targetFilePath: string): noUseVars[];
    static collecUnusedGenerics(generics: astType[], targetFilePath: string): noUseVars[];
    static extractParameters(methodCode: string): string[];
    static extractParameters_nested(char: string, nested: number): number;
    static excetParamsBody(paramStr: string, inString: string | null, current: string, inArrowFn: boolean, nested: number, paramList: string[]): {
        inString: string | null;
        current: string;
        inArrowFn: boolean;
        nested: number;
        paramList: string[];
    };
    static getAccuratePosition(codeImport: string, name: string): {
        line: number;
        col: number;
    };
    static setWarnInfoForArgType(noUseVar: noUseVars, warnInfo: any): void;
    static setWarnInfoForMethodNobody(noUseVar: noUseVars, warnInfo: any): void;
    static setWarnInfoForClass(noUseVar: noUseVars, warnInfo: any): void;
    static setWarnInfoForType(noUseVar: noUseVars, warnInfo: any): void;
    static setWarnInfoForArgs(noUseVar: noUseVars, warnInfo: any): void;
    static setWarnInfoForVar(noUseVar: noUseVars, warnInfo: any): void;
    static setWarnInfoForNamespace(noUseVar: noUseVars, warnInfo: any): void;
    static getTextPosition(text: string, target: string): {
        line: number;
        column: number;
    };
    static escapeRegExp(str: string): string;
    static getArkFileAllClasss(targetFile: ArkFile): ArkClass[];
    static getAllNamespaces(targetFile: ArkFile): ArkNamespace[];
    static recursiveSearch(namespaces: ArkNamespace[], result: ArkNamespace[]): void;
    static extractMethodBody(methodCode: string): string;
    static noUsedType(astRoot: ts.SourceFile): astType[];
    static collectTypes(node: ts.Node, astRoot: ts.SourceFile, typeMap: Map<string, {
        used: boolean;
        kind: string;
        pos: number;
    }>): void;
    static checkTypeUsage(node: ts.Node, astRoot: ts.SourceFile, typeMap: Map<string, {
        used: boolean;
        kind: string;
        pos: number;
    }>): void;
    static isTypeDeclaration(node: ts.Identifier): boolean;
    static isDefaultExport(node: ts.Identifier): boolean;
    static markTypeAsUsed(node: ts.Identifier, typeMap: Map<string, {
        used: boolean;
        kind: string;
        pos: number;
    }>): void;
    static isTextUsed(code: string, name: string): boolean;
    static collectGenerics(node: ts.Node, typeMap: Map<string, {
        used: boolean;
        kind: string;
        pos: number;
        node: ts.Node;
    }>): void;
    static handleGenerics(node: ts.Node, typeMap: Map<string, {
        used: boolean;
        kind: string;
        pos: number;
        node: ts.Node;
    }>): void;
    static collectTypeAliasGenerics(node: ts.TypeAliasDeclaration | ts.FunctionDeclaration | ts.FunctionExpression | ts.InterfaceDeclaration | ts.ClassDeclaration | ts.ArrowFunction | ts.MethodDeclaration | ts.FunctionTypeNode | ts.ClassExpression, typeMap: Map<string, {
        used: boolean;
        kind: string;
        pos: number;
        node: ts.Node;
    }>): void;
    static collectConstructorTypeGenerics(node: ts.TypeAliasDeclaration | ts.ConstructSignatureDeclaration, typeMap: Map<string, {
        used: boolean;
        kind: string;
        pos: number;
        node: ts.Node;
    }>): void;
    static checkGenericUsages(typeMap: Map<string, {
        used: boolean;
        kind: string;
        pos: number;
        node: ts.Node;
    }>): void;
    static checkGenericUsage(node: ts.Node, typeMap: {
        used: boolean;
        kind: string;
        pos: number;
    }): void;
    static checkPressTypeUsage(node: ts.Node, typeMap: {
        used: boolean;
        kind: string;
        pos: number;
    }): void;
    static isGenericUsedInType(node: ts.Node): string | null;
    static handleTypeReferenceNode(node: ts.TypeReferenceNode): string | null;
    static handleConditionalTypeNode(node: ts.ConditionalTypeNode): string | null;
    static handleIndexedAccessTypeNode(node: ts.IndexedAccessTypeNode): string | null;
    static handleFunctionTypeNode(node: ts.FunctionTypeNode | ts.ConstructorTypeNode): string | null;
    static checkChildrenForGeneric(node: ts.Node): string | null;
    static getUnusedGenerics(astRoot: ts.SourceFile): astType[];
    static traverseAST(node: ts.Node, namespaceName: string): boolean;
    static isNamespaceUse(arkfile: ArkFile, namespaceSignature: NamespaceSignature): boolean;
    static isMethodUsingNamespace(method: ArkMethod, namespaceSignature: NamespaceSignature): boolean;
    static isInvokeUsingNamespace(stmt: ArkInvokeStmt, namespaceSignature: NamespaceSignature): boolean;
    static isArgumentUsingNamespace(arg: any, namespaceSignature: NamespaceSignature): boolean;
    static getClassOrMethod(arkFileAllClass: ArkClass[], arkfile: ArkFile): noUseVars[];
    static filterClass(clas: ArkClass, signature: ClassSignature, exportNames: string[]): boolean;
    static collectImports(node: ts.Node, astRoot: ts.SourceFile, importMap: Map<string, {
        used: boolean;
        source: string;
    }>): void;
    static processImportDeclaration(node: ts.ImportDeclaration | ts.ImportEqualsDeclaration, astRoot: ts.SourceFile, importMap: Map<string, {
        used: boolean;
        source: string;
    }>): void;
    static processDefaultImport(defaultImportName: string, source: string, importMap: Map<string, {
        used: boolean;
        source: string;
    }>): void;
    static processNamedBindings(namedBindings: ts.ImportClause['namedBindings'], source: string, importMap: Map<string, {
        used: boolean;
        source: string;
    }>): void;
    static processNamedImports(namedImports: ts.NamedImports, source: string, importMap: Map<string, {
        used: boolean;
        source: string;
    }>): void;
    static processNamespaceImport(namespaceImport: ts.NamespaceImport, source: string, importMap: Map<string, {
        used: boolean;
        source: string;
    }>): void;
    static checkUsage(node: ts.Node, astRoot: ts.SourceFile, importMap: Map<string, {
        used: boolean;
        source: string;
    }>): void;
    static noUsedImport(astRoot: ts.SourceFile): string[];
}
export {};
