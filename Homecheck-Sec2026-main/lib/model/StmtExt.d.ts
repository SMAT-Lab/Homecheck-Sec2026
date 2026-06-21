import { Stmt } from 'arkanalyzer';
import { Scope } from './Scope';
export declare class StmtExt extends Stmt {
    scope: Scope;
    toString(): string;
}
