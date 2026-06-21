import { relationalStore } from '@ohos.data.relationalStore';

class UserDB {
    private store: relationalStore.RdbStore;

    async getUserByName(name: string) {
        // 危险：字符串拼接 SQL
        let sql = "SELECT * FROM user WHERE name = '" + name + "'";
        let result = await this.store.querySql(sql);
        return result;
    }

    async deleteUser(id: number) {
        // 危险：字符串拼接 SQL
        let sql = "DELETE FROM user WHERE id = " + id;
        await this.store.executeSql(sql);
    }
}
