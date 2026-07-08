// Code Sample with Hardcoded Secret Vulnerability

function vulnerableHardcodedKey() {
    // 硬编码密钥漏洞：在代码中直接写入密钥
    const apiKey = "1234567890abcdef1234567890abcdef";
    const secretKey = "mysecretkey12345678901234567890";
    
    return { apiKey, secretKey };
}

function anotherVulnerableHardcodedPassword() {
    // 另一个硬编码密钥漏洞示例
    const password = "admin123";
    const dbPassword = "db_password_123456";
    
    return { password, dbPassword };
}