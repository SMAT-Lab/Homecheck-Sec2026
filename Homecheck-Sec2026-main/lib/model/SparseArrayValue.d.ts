export declare class SparseArrayValue {
    sparseArrayType: SparseArrayType;
    baseStr: string;
    valStr: string;
    fulBaseStr: string;
    fulStmtStr: string;
    constructor(StmtType: SparseArrayType, baseStr: string, valStr: string);
}
export declare enum SparseArrayType {
    NEW_ARRAY = 0,
    ARRAY_RIGHT = 1,
    ARRAY_LEFT = 2,
    UNKNOWN = 3
}
