class UserService {
    getUserById(userId: string): void {
        let sql = "SELECT * FROM users WHERE id = '" + userId + "'";
        executeQuery(sql);
    }
    
    searchUsers(keyword: string): void {
        let query = `SELECT * FROM users WHERE name LIKE '%${keyword}%'`;
        executeQuery(query);
    }
}

function executeQuery(sql: string): void {
    console.log("Executing: " + sql);
}