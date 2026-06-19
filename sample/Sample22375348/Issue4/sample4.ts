import fs from 'fs';
import path from 'path';

class FileManager {
    readFile(fileName: string): string {
        let filePath = '/var/data/' + fileName;
        return fs.readFileSync(filePath, 'utf-8');
    }
    
    readUserFile(userId: string, fileName: string): string {
        let userPath = path.join('/users/', userId, fileName);
        return fs.readFileSync(userPath, 'utf-8');
    }
    
    openConfig(configPath: string): string {
        return fs.readFileSync('../../config/' + configPath, 'utf-8');
    }
}

const fm = new FileManager();
fm.readFile('../../etc/passwd');
fm.openConfig('secret.cfg');