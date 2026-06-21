import { ArkFile, ts } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
export type Options = [
    {
        /** Allow autofixers that will change the return type of the expression. This option is considered unsafe as it may break the build. */
        allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing?: boolean;
        /** Check operands that are typed as `any` when inspecting "loose boolean" operands. */
        checkAny?: boolean;
        /** Check operands that are typed as `bigint` when inspecting "loose boolean" operands. */
        checkBigInt?: boolean;
        /** Check operands that are typed as `boolean` when inspecting "loose boolean" operands. */
        checkBoolean?: boolean;
        /** Check operands that are typed as `number` when inspecting "loose boolean" operands. */
        checkNumber?: boolean;
        /** Check operands that are typed as `string` when inspecting "loose boolean" operands. */
        checkString?: boolean;
        /** Check operands that are typed as `unknown` when inspecting "loose boolean" operands. */
        checkUnknown?: boolean;
        /** Skip operands that are not typed with `null` and/or `undefined` when inspecting "loose boolean" operands. */
        requireNullish?: boolean;
    }
];
interface Diagnostic {
    startLine: number;
    startColumn: number;
    errorType: string;
    fixRange?: {
        start: number;
        end: number;
    };
    fixMessage?: string;
    suffix?: string;
}
export declare class PreferOptionalChainCheck implements BaseChecker {
    private defaultOptions;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    sourceFile: ts.SourceFile;
    diagnostics: Diagnostic[];
    variableTypes: Map<string, string>;
    metaData: BaseMetaData;
    private fileMatcher;
    private executeNode;
    registerMatchers(): MatcherCallback[];
    check: (targetField: ArkFile) => void;
    private execute;
    private executeCheck;
    private filterResult;
    private executeReport;
    private executeOtherReport;
    private addIssueReport;
    private createFix;
    private getOption;
    private getTypeText;
    private getErrorType;
    private addDiagnostic;
    private checkLogicalExpression;
    private checkLogicalAnd;
    private addReport;
    private buildRightReplacement1;
    private isReplaceableRight1;
    private checkLogicalOr1;
    private checkLogicalOr;
    private getErrorTypeForExpression;
    private buildRightReplacement;
    private isReplaceableRight;
    private isNullCheck;
    private flattenLogicalAnd;
    private isPropertyAccessChain;
    private isNullCheckAndCodeCheck;
    private buildOptionalChain;
    private executeBinaryExpression;
    private isNullOrUndefined;
    private areEquivalent;
    private unwrapLogicalNot;
    private checkLogicalOrWithDefault;
    private checkNestedLogicalOr;
    private checkOptionalChain;
    private executeDeclaration;
}
export {};
