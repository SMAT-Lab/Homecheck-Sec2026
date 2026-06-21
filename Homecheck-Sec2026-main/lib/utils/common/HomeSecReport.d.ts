export declare class HomeSecReport {
    private static instance;
    private homeSecReport;
    private constructor();
    static getInstance(): HomeSecReport;
    addProjectResult(projectName: string, projectPath: string, issues: string): void;
    generateReport(): void;
}
