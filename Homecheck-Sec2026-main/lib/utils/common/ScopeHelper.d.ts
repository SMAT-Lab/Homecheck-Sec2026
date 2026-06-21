import { Scene } from 'arkanalyzer';
export declare class ScopeHelper {
    private gFilePath;
    private firstBlock;
    private finishBlockSet;
    private isSwitchLastCase;
    private gFinishIfStmtLines;
    private gTernaryConditionLines;
    buildScope(scene: Scene): void;
    private createScopeInClass;
    private blockProcess;
    private isFirstThisBlock;
    private isForStmtDefinedPart;
    private genChildScope;
    private assignStmtProcess;
    private getDefAndSetRedef;
    private switchBlockPreProcess;
    private nextBlockPreProcess;
    private handleSuccessorBlock;
    private isTernaryCondition;
    private isNeedCreateScope;
    private getReturnScope;
}
