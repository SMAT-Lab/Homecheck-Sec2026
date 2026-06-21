// ./sample/Sample23371148/Issue2/sample2.ts
// Code Sample with Security Issue 2: SQL Injection
import { database } from '@ohos.data.database';

class UserController {
    getUserInfo(userId: string) {
        // 危险：直接拼接用户输入到SQL语句
        let sql = "SELECT * FROM users WHERE id = '" + userId + "'";
        database.executeSql(sql);
    }
    
    searchUsers(keyword: string) {
        // 危险：使用模板字符串拼接
        let sql = `SELECT * FROM users WHERE name LIKE '%${keyword}%'`;
        database.executeSql(sql);
    }
}

function safeExample() {
    // 安全：使用参数化查询
    // database.executeSql('SELECT * FROM users WHERE id = ?', [userId]);
}