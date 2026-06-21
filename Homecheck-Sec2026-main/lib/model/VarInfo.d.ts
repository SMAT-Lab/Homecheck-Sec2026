import { Stmt } from 'arkanalyzer';
import { Scope } from './Scope';
export declare class VarInfo {
    stmt: Stmt;
    scope: Scope;
    constructor(stmt: Stmt, scope: Scope);
}
