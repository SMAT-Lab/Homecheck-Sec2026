import { Scene } from 'arkanalyzer';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { IssueReport } from '../../model/Defects';
export declare class ResourcesFileCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    registerMatchers(): MatcherCallback[];
    /**
     * resource file check.
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
    private imageSuggest;
    private getImageFileByDependencyTree;
    private moduleProcess;
    private imageProcess;
    private checkMediaPrefix;
    private checkImageFormatInAbility;
    private checkImageFormatInExtensionAbility;
    private checkImageFormatInEts;
    private classProcess;
    private findSymbolInMethod;
    private getImagePath;
    private getRawFdProcess;
    private mapProcess;
    private reportIssue;
}
