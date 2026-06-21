import { ArkFile, Stmt, Value } from 'arkanalyzer';
import { VarInfo } from '../../model/VarInfo';
import { NumberValue } from '../../model/NumberValue';
export declare class NumberUtils {
    static readonly mBinopList: string[];
    private static isSupportOperator;
    static isValueSupportCalculation(arkFile: ArkFile, valueStmtInfo: VarInfo, value: Value): boolean;
    private static isExprSupportCalculate;
    private static isMethodValueSupportCalculate;
    private static isImportValueSupportCalculate;
    private static getValueImportInfo;
    static getNumberByScope(arkFile: ArkFile, valueStmtInfo: VarInfo, value: Value): NumberValue;
    private static getInstanceFieldValue;
    private static getImportNumberValue;
    private static getMethodNumberValue;
    private static getExprNumberValue;
    private static getStaticNumberValue;
    static getOriginalValueText(stmt: Stmt, value: Value): string;
}
