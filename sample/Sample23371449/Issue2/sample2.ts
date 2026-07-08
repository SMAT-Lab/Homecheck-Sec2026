// Code Sample with SQL Injection Vulnerability
import { relationalStore } from '@kit.ArkData';

function vulnerableQuery(username: string, password: string) {
    // SQL注入漏洞：直接拼接用户输入到SQL语句中
    const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    
    const config = {
        "readType": relationalStore.QueryMode.READ_ONLY,
        "sql": sql
    };
    
    return config;
}

function anotherVulnerableQuery(userId: string) {
    // 另一个SQL注入漏洞示例
    const sql = `DELETE FROM users WHERE id = ${userId}`;
    
    const config = {
        "readType": relationalStore.QueryMode.READ_ONLY,
        "sql": sql
    };
    
    return config;
}