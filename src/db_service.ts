import http, { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import * as uuid from 'uuid';
import { User } from './entities/User'

const dbPort = process.env['CRUD_DB_PORT'] ? process.env['CRUD_US_PORT'] : '4100';

class DbService {
  private users: User[];

  constructor() {
    this.users = [];
  }

  createUser(user: User) {
    this.users.push(user);
  }

  getUsers() {
    return this.users;
  }

  getUserById(id: string) {
    return this.users.find((user) => user.id === id);
  }

  updateUser(id: string, updatedUser: User) {
    const index = this.users.findIndex((user) => user.id === id);
    if (index !== -1) {
      this.users[index] = updatedUser;
      return this.users[index];
    }
    return false;
  }

  deleteUser(id: string) {
    const index = this.users.findIndex((user) => user.id === id);
    if (index !== -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }
}

const dbService = new DbService();

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

    if (method === 'POST' && (path === '/api' || path === '')) {
      try {
        res.statusCode = 200;
        const request = JSON.parse(requestBody);
        console.log(request);
        if (request.cmd) {
          const cmd = request.cmd;
          console.log(`CMD is [${cmd}]`);
          const data = request.data;
          switch (cmd) {
            case 'USERS':
              response = JSON.stringify(dbService.getUsers());
              break;
            case 'USER':
              if (!data.id) {
                res.statusCode = 400;
                response = 'No user ID';
                throw new Error(response);
              }
              if (!uuid.validate(data.id)) {
                res.statusCode = 400;
                response = 'User ID is not valid';
                throw new Error(response);
              }
              console.log(`User ID: [${data.id}]`);
              const user = dbService.getUserById(data.id);
              if (user) {
                response = JSON.stringify(user);
                console.log(user);
              }
              else {
                res.statusCode = 404;
                response = 'User not found';
                throw new Error(response);
              }
              break;
            case 'ADD':
              console.log('ADD' + data);
              if (!data.username || data.username === '' || !data.age) {
                res.statusCode = 400;
                response = 'User data is not valid';
                throw new Error(response);
              }
              else {
                const hobbies = Array.isArray(data.hobbies) ? data.hobbies : [];
                const user = new User(uuid.v4(), data.username, data.age, hobbies);
                dbService.createUser(user);
                response = JSON.stringify(user);
                res.statusCode = 201;
              }
              break;
            case 'UPDATE':
              console.log('UPDATE' + data);
              if (!data.id || !data.username || data.username === '' || !data.age) {
                res.statusCode = 400;
                response = 'User data is not valid';
                throw new Error(response);
              }
              if (!uuid.validate(data.id)) {
                res.statusCode = 400;
                response = 'User ID is not valid';
                throw new Error(response);
              }
              else {
                const hobbies = Array.isArray(data.hobbies) ? data.hobbies : [];
                const user = new User(data.id, data.username, data.age, hobbies);
                const result = dbService.updateUser(data.id, user);
                if (result) {
                  response = JSON.stringify(result);
                  //res.statusCode = 200;
                }
                else {
                  res.statusCode = 404;
                  response = 'User not found';
                  throw new Error(response);
                }
              }
              break;
            case 'DELETE':
              console.log('DELETE' + data);
              if (!data.id) {
                res.statusCode = 400;
                response = 'No user ID';
                throw new Error(response);
              }
              if (!uuid.validate(data.id)) {
                res.statusCode = 400;
                response = 'User ID is not valid';
                throw new Error(response);
              }
              console.log(`User ID: [${data.id}]`);
              const result = dbService.deleteUser(data.id);
              if (result) {
                res.statusCode = 204;
                response = 'DELETED';
              }
              else {
                res.statusCode = 404;
                response = 'User not found';
                throw new Error(response);
              }
              break;
            default:
              throw new Error(`Unknown command ${cmd}`);
          }
        }
      }
      catch (error) {
        console.log("Incorrect request");
        console.log(error);
        console.log(response);// = JSON.stringify(error);
        if (res.statusCode === 200) res.statusCode = 400;
      }
      // response = userService.getUsers();
      // res.statusCode = 200;
    } else {
      response = { error: 'Not found' };
      res.statusCode = 404;
    }

    res.end(response);
  });
});


process.on('SIGTERM', () => {
  process.exit(0);
});

process.on('exit', () => {
  server.closeAllConnections();
  console.log("DB service done its work.");
});


process.on('error', (error) => {
  console.log(error);
  process.exit(0);
});


const createTestUsers = () => {
  const json = [{
    id: uuid.v4(),
    username: 'John',
    age: 25,
    hobbies: ['Ski', 'Videogames'],
  },
  {
    id: 'f8561522-0681-41b4-979b-3b1ef3ae09de',//uuid.v4(),
    username: 'Emma',
    age: 27,
    hobbies: ['Writing', 'Gardening'],
  },
  {
    id: uuid.v4(),
    username: 'Ben',
    age: 52,
    hobbies: ['Reading', 'Gardening'],
  }
  ];

  json.forEach((element) => {
    const user: User = User.fromJson(element);
    // console.log(user);
    dbService.createUser(user);
  });
}

createTestUsers();

server.listen(dbPort, () => {
  console.log(`Server is running on port ${dbPort}`);
});
