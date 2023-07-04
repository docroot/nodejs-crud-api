export class User {
    id: string;
    username: string;
    age: number;
    hobbies: string[];

    constructor(uuid: string, username: string, age: number, hobbies: string[]) {
        this.id = uuid;
        this.username = username;
        this.age = age;
        this.hobbies = hobbies;
    }

    static fromJson(json: any): User {
        const { id, username, age, hobbies } = json;
        return new User(id, username, age, hobbies);
    }
};
