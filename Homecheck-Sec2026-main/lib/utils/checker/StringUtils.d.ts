import { ArkFile, Value } from 'arkanalyzer';
import { VarInfo } from '../../model/VarInfo';
export declare class StringUtils {
    static getStringByScope(arkFile: ArkFile, valueStmtInfo: VarInfo, value: Value): string;
    private static getInstanceFieldValue;
    private static getValueImportInfo;
    private static getImportStringValue;
    private static getMethodStringValue;
    private static getExprStringValue;
    private static getStaticStringValue;
}
