// Code Sample with Path Traversal Vulnerability
import { fileIo } from '@kit.CoreFileKit';

function vulnerablePathTraversal(userInput: string) {
    // 路径遍历漏洞：直接拼接用户输入到文件路径中
    const filePath = `/data/app/${userInput}`;
    
    try {
        const file = fileIo.openSync(filePath, fileIo.OpenMode.READ_ONLY);
        return file;
    } catch (error) {
        console.error(`Error: ${error}`);
        return null;
    }
}

function anotherVulnerablePathTraversal(filename: string) {
    // 另一个路径遍历漏洞示例
    const filePath = `../../secret/${filename}`;
    
    try {
        const content = fileIo.readTextSync(filePath);
        return content;
    } catch (error) {
        console.error(`Error: ${error}`);
        return null;
    }
}