// Code Sample with Security Issue 2: Hardcoded Secrets
class DatabaseConnection {
    private username: string = 'admin';
    private password: string = 'password123';
    private apiKey: string = 'sk-1234567890abcdef';
    private token: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

    connect() {
        const secret = 'mysecretpassword';
        const dbUrl = `postgresql://user:hardcodedpass@localhost:5432/mydb`;
        return dbUrl;
    }

    getCredentials() {
        const credentials = {
            key: 'AKIA1234567890ABCDEF',
            secret: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYzSAzSTzF3+Ab'
        };
        return credentials;
    }
}
