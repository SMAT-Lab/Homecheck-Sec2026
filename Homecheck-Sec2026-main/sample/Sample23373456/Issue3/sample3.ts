// Code Sample with Security Issue 3: SQL Injection
class UserRepository {
    private db: any;

    getUserById(userId: string) {
        // 危险：直接拼接SQL语句
        const query = `SELECT * FROM users WHERE id = '${userId}'`;
        return this.db.query(query);
    }

    searchUsers(keyword: string) {
        // 危险：未过滤的用户输入直接拼接到SQL中
        const sql = "SELECT * FROM users WHERE name LIKE '%" + keyword + "%'";
        return this.db.execute(sql);
    }

    login(username: string, password: string) {
        // 经典SQL注入漏洞
        const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
        return this.db.query(query);
    }
}
