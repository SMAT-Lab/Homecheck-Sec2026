// Code Sample with Security Issue 4: Path Traversal
import { readFile, writeFile } from 'fs';
import { join, resolve } from 'path';

class FileManager {
    private baseDir: string = './uploads';

    readUserFile(filename: string) {
        // 危险：没有验证filename，可能导致路径遍历
        const filePath = join(this.baseDir, filename);
        return readFile(filePath, 'utf-8');
    }

    saveFile(path: string, content: string) {
        // 危险：直接使用用户输入的路径
        writeFile(resolve(path), content, (err) => {
            if (err) throw err;
        });
    }

    downloadFile(relativePath: string) {
        // 危险：../../../etc/passwd 可以访问系统文件
        const fullPath = this.baseDir + '/' + relativePath;
        return readFile(fullPath);
    }
}
