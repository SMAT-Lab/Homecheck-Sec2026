import { ArkClass, ArkFile, ArkMethod, ExportInfo, ImportInfo, Stmt } from 'arkanalyzer';
import { AIFix, FunctionFix, RuleFix } from '../../model/Fix';
export declare class FixUtils {
    static getRangeStart(arkFile: ArkFile, codeNode: Stmt | ArkMethod | ArkClass | ExportInfo | ImportInfo): number;
    static getTextEof(text: string): string;
    static isRuleFix(object: any): object is RuleFix;
    static isFunctionFix(object: any): object is FunctionFix;
    static isAIFix(object: any): object is AIFix;
    static hasOwnPropertyOwn(object: any, key: string): boolean;
}
