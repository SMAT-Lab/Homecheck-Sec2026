class UserStorage {
    saveUserCredentials(username: string, password: string): void {
        localStorage.setItem('password', password);
        localStorage.setItem('username', username);
    }
    
    saveAuthToken(token: string): void {
        localStorage.setItem('auth_token', token);
    }
    
    saveApiKey(key: string): void {
        localStorage.setItem('api_key', key);
    }
    
    savePreferences(): void {
        let prefs = {
            password: "user123",
            secret: "my_secret"
        };
        localStorage.setItem('prefs', JSON.stringify(prefs));
    }
}

const storage = new UserStorage();
storage.saveUserCredentials('admin', 'password123');
storage.saveAuthToken('bearer_token_xyz');
storage.saveApiKey('api_key_abc123');