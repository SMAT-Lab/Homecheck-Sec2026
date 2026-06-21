// ./sample/Sample19241042/Issue5/sample5.ts
// Code Sample with Security Issue 5: Path Traversal
import { fileIo } from '@ohos.file.fs';

class FileManager {
    readUserFile(filename: string) {
        // 危险：用户可控的文件名，存在路径遍历风险
        let path = "/data/user/files/" + filename;
        fileIo.readText(path);
    }
    
    deleteFile(filename: string) {
        // 危险：未验证文件名
        let path = "/data/cache/" + filename;
        fileIo.unlink(path);
    }
    
    uploadFile(filename: string) {
        // 危险：文件名可能包含../等路径遍历字符
        let path = "./uploads/" + filename;
        fileIo.readText(path);
    }
}

function safeExample() {
    // 安全：验证文件名，移除危险字符
    // const safeName = filename.replace(/\.\./g, '').replace(/\//g, '');
    // let path = "/data/user/files/" + safeName;
}