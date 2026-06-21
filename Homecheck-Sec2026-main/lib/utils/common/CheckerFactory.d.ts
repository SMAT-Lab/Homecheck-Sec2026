import { BaseChecker } from '../../checker/BaseChecker';
import { Rule } from '../../model/Rule';
export declare class CheckerFactory {
    static getChecker(rule: Rule): BaseChecker | null;
}
