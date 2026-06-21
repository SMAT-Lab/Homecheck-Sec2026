// ./sample/Sample19241042/Issue3/sample3.ts
// Code Sample with Security Issue 3: Hardcoded Credentials
class ConfigManager {
    // 危险：硬编码密码
    private static readonly PASSWORD = "admin123";
    
    // 危险：硬编码API密钥
    private static readonly API_KEY = "sk-1234567890abcdef";
    
    // 危险：硬编码数据库密码
    private static readonly DB_PASSWORD = "root123";
    
    // 危险：硬编码JWT密钥
    private static readonly JWT_SECRET = "mysecretkey123";
}

function authenticate(username: string) {
    // 危险：硬编码用户名密码比较
    if (username === "admin" && "password123" === "password123") {
        console.log("Login success");
    }
}

function safeExample() {
    // 安全：从配置文件或环境变量读取
    // const password = process.env.PASSWORD;
    // const apiKey = Config.get('API_KEY');
}