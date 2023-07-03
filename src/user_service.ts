import http, { IncomingMessage, ServerResponse, RequestOptions } from 'http';
import { parse, URL } from 'url';
import * as uuid from 'uuid';
import { User } from './entities/User'


export class UserService {
    usPort: string;
    dbHost: string;
    dbPort: string;
    db_req_options: RequestOptions;

    constructor() {
        this.usPort = process.env['CRUD_US_PORT'] ? process.env['CRUD_US_PORT'] : '4000';
        this.dbHost = process.env['CRUD_DB_HOST'] ? process.env['CRUD_DB_HOST'] : 'localhost';
        this.dbPort = process.env['CRUD_DB_PORT'] ? process.env['CRUD_DB_PORT'] : '4100';
        this.db_req_options = {
            hostname: this.dbHost,
            port: this.dbPort,
            path: '/api',
            method: 'POST',
        };
    }


    async createUser(user: User) {
        return new Promise((resolve, reject) => {
            const req = http.request(this.db_req_options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    console.log(responseData);
                    if (res.statusCode === 201) {
                        try {
                            const newUser = User.fromJson(JSON.parse(responseData));
                            console.log(newUser);
                            resolve(newUser);
                        } catch (error) {
                            reject('Incorrect user data');
                        }
                    }
                    else {
                        reject('Incorrect user data');
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(JSON.stringify({ 'cmd': 'ADD', 'data': { 'username': user.username, 'age': user.age, 'hobbies': user.hobbies } }));
            req.end();
        });
    }


    async getUsers() {
        return new Promise((resolve, reject) => {
            const req = http.request(this.db_req_options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    console.log(responseData);
                    const users: User[] = [];
                    try {
                        for (const userInfo of Object.values(JSON.parse(responseData))) {
                            const user = User.fromJson(userInfo);
                            users.push(user);
                            console.log(user);
                        }
                        resolve(users);
                    } catch (error) {
                        reject({ code: 500, message: 'Internal server error: unable to parse data' });
                    }
                });
            });

            req.on('error', (error) => {
                reject({ code: 500, message: 'Internal server error' });
            });

            req.write(JSON.stringify({ 'cmd': 'USERS', 'data': '' }));
            req.end();
        });
    }


    async getUserById(id: string) {
        return new Promise((resolve, reject) => {
            const req = http.request(this.db_req_options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const user = User.fromJson(JSON.parse(responseData));
                            console.log(user);
                            resolve(user);
                        } catch (error) {
                            reject('Incorrect user data');
                        }
                    }
                    else {
                        reject('Uer not found');
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });
            req.write(JSON.stringify({ 'cmd': 'USER', 'data': { 'id': id } }));
            req.end();
        });
    }


    async updateUser(id: string, user: User) {
        return new Promise((resolve, reject) => {
            const req = http.request(this.db_req_options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const updUser = User.fromJson(JSON.parse(responseData));
                            console.log(updUser);
                            resolve(updUser);
                        } catch (error) {
                            reject('Incorrect user data');
                        }
                    }
                    else {
                        reject('Uer not found');
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(JSON.stringify({ 'cmd': 'UPDATE', 'data': { 'id': user.id, 'username': user.username, 'age': user.age, 'hobbies': user.hobbies } }));
            req.end();
        });
    }


    async deleteUser(id: string) {
        return new Promise((resolve, reject) => {
            const req = http.request(this.db_req_options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 204) {
                        console.log(responseData);
                        resolve('User deleted');
                    }
                    else {
                        reject('User not found');
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(JSON.stringify({ 'cmd': 'DELETE', 'data': { 'id': id } }));
            req.end();
        });
    }

    start() {
        const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
            const { method, url } = req;

            const parsedUrl = parse(url || '', true);
            const path = parsedUrl.pathname || '';

            let requestBody = '';

            req.on('data', (chunk) => {
                requestBody += chunk;
            });

            req.on('end', () => {
                let response;
                res.setHeader('Content-Type', 'application/json');
                // console.log(`PATH: [${path}]`);

                if (method === 'GET' && (path === '/api/users' || path === '/api/users/')) {
                    this.getUsers().then((resolve) => {
                        res.statusCode = 200;
                        response = resolve;
                        res.end(JSON.stringify(response));
                    }).catch((reject) => {
                        // console.log(reject);
                        res.statusCode = reject.code;
                        res.end(reject.message);
                    });
                } else if (method === 'GET' && path.startsWith('/api/users/')) {
                    const userId = path.split('/')[3];
                    if (!userId || !uuid.validate(userId)) {
                        response = 'User ID is not valid';
                        res.statusCode = 400;
                        res.end(response);
                    }
                    else {
                        this.getUserById(userId).then((resolve) => {
                            response = resolve;
                            res.statusCode = 200;
                            res.end(JSON.stringify(response));
                        }).catch((error) => {
                            response = 'User not found';
                            res.statusCode = 404;
                            res.end(response);
                        });
                    }
                } else if (method === 'POST' && path === '/api/users') {
                    // console.log("POST");
                    // console.log(requestBody);
                    const userInfo = JSON.parse(requestBody);
                    userInfo.id = '';
                    let user = User.fromJson(userInfo);
                    this.createUser(user).then((resolve) => {
                        response = resolve;
                        res.statusCode = 201;
                        res.end(JSON.stringify(response));
                    }).catch((error) => {
                        response = 'Unables to create user';
                        res.statusCode = 400;
                        res.end(response);
                    });
                } else if (method === 'PUT' && path.startsWith('/api/users/')) {
                    // console.log("PUT");
                    const userId = path.split('/')[3];
                    if (!userId || !uuid.validate(userId)) {
                        response = 'User ID is not valid';
                        res.statusCode = 400;
                        res.end(response);
                    }
                    else {
                        const userInfo = JSON.parse(requestBody);
                        userInfo.id = userId;
                        let user = User.fromJson(userInfo);
                        this.updateUser(userId, userInfo).then((resolve) => {
                            response = resolve;
                            res.statusCode = 200;
                            res.end(JSON.stringify(response));
                        }).catch((error) => {
                            response = 'Unables to update user';
                            res.statusCode = 404;
                            res.end(response);
                        });
                    }
                } else if (method === 'DELETE' && path.startsWith('/api/users/')) {
                    // console.log("DELETE");
                    const userId = path.split('/')[3];
                    if (!userId || !uuid.validate(userId)) {
                        response = 'User ID is not valid';
                        res.statusCode = 400;
                        res.end(response);
                    }
                    else {
                        this.deleteUser(userId).then((resolve) => {
                            response = 'User deleted successfully';
                            res.statusCode = 200;
                            res.end(response);
                        }).catch((error) => {
                            response = 'User not found';
                            res.statusCode = 404;
                            res.end(response);
                        });
                    }
                } else {
                    response = 'Incorrect API entry point';
                    res.statusCode = 404;
                    res.end(response);
                }
            });
        });

        server.listen(this.usPort, () => {
            console.log(`Users service is running on port ${this.usPort}`);
        });
    }
}
