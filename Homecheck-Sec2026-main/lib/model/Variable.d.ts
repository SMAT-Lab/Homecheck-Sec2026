import { Stmt } from 'arkanalyzer';
import { VarInfo } from './VarInfo';
export declare class Variable {
    defStmt: Stmt;
    redefInfo: Set<VarInfo>;
    leftUsedInfo: Set<VarInfo>;
    constructor(defStmt: Stmt);
    getName(): string;
}
