export declare class NumberValue {
    value: number;
    type: ValueType;
    constructor(value: number, type: ValueType);
}
export declare enum ValueType {
    INT = 0,
    DOUBLE = 1,
    UNKNOWN = 2
}
