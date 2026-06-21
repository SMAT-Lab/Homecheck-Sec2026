export declare class GlobMatch {
    private regexps;
    constructor(globPattern: string[]);
    matchGlob(path: string): boolean;
    private globToRegexp;
}
