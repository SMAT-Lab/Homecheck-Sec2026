import { Scene } from 'arkanalyzer';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { IssueReport } from '../../model/Defects';
export declare class ImageFormatCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    registerMatchers(): MatcherCallback[];
    /**
     * Image Format check.
     *
     * @param scene
     */
    check: (scene: Scene) => void;
    /**
     * Cache project image files.
     *
     * @param scene
     */
    private cacheProjectImages;
    /**
     * Check image format in json5.
     *
     * @param scene
     */
    private checkImageFormatInJson5;
    private checkImageFormatInAbility;
    private checkImageFormatInExtensionAbility;
    /**
     * If media image is jpg, png, webp return true, otherwise false.
     *
     * @param type
     * @param scene
     * @param moduleName
     * @param imageName
     * @returns boolean
     */
    private isImageSuggest;
    private getImageFileByDependencyTree;
    /**
     * Get image format, like jpg, png, webp, astc.
     *
     * @param imagePath
     * @returns string
     */
    private getImageFormat;
    /**
     * Check image format in ets file.
     *
     * @param arkFile
     */
    private checkImageFormatInEts;
    private traverseNameSpace;
    /**
     * traverse view find container with one children.
     *
     * @param arkFile
     * @param treeNode
     */
    private traverseViewTree;
    private processArkMethod;
    private checkImageFormatInArg;
    private checkImageFormatInConstant;
    private checkImageFormatInRef;
    private checkImageFormatInClassField;
    private checkImageFormatInStaticExpr;
    /**
     * Report issue in json5.
     *
     * @param json5Path
     * @param iconName
     */
    private reportJson5Issue;
    /**
     * Report issue.
     *
     * @param arkFile
     * @param stmtLike
     * @param imageName
     */
    private reportEtsIssue;
}
