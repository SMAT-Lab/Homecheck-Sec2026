import { ViewTreeNode } from 'arkanalyzer';
import { ArkClass } from 'arkanalyzer';
export declare class ViewTreeTool {
    private recordMap;
    constructor();
    hasTraverse(item: ArkClass | ViewTreeNode): boolean;
}
