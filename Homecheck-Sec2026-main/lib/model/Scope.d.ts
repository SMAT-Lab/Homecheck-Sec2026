import { BasicBlock } from 'arkanalyzer';
import { Variable } from './Variable';
export declare enum TempLocation {
    NOFOUND = 0,
    LEFT = 1,
    RIGHT = 2
}
export declare enum ScopeType {
    IF_TYPE = 0,
    ELSE_TYPE = 1,
    FOR_CONDITION_TYPE = 2,
    FOR_IN_TYPE = 3,
    WHILE_TYPE = 4,
    CASE_TYPE = 5,
    UNKNOWN_TYPE = 10
}
export declare class Scope {
    parentScope: Scope | null;
    childScopeList: Array<Scope>;
    defList: Array<Variable>;
    blocks: Set<BasicBlock>;
    scopeLevel: number;
    scopeType: ScopeType;
    constructor(parent: Scope | null, defList: Array<Variable>, level: number, type?: ScopeType);
    setChildScope(child: Scope): void;
    addVariable(variable: Variable): void;
}
