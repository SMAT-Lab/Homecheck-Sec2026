class Config {
    private password: string = "secret123";
    private apiKey: string = "abc123def456";
    private authToken: string = "token_xyz";
    
    login(username: string, password: string): void {
        console.log("Attempting login with username: " + username + ", password: " + password);
        console.log("API Key used: " + this.apiKey);
    }
    
    getToken(): string {
        console.log("Returning auth token: " + this.authToken);
        return this.authToken;
    }
}

const dbConfig = {
    host: "localhost",
    username: "admin",
    password: "password123"
};

console.log("Database password: " + dbConfig.password);