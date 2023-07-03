import { DbService } from "./db_service";
import { UserService } from "./user_service";
import dotenv from 'dotenv';

dotenv.config();

// Object.keys(process.env).forEach((key) => {
//     if (key.startsWith('CRUD'))
//         console.log(`${key}=[${process.env[key]}]`);
// });

const dbService = new DbService();
//dbService.createTestUsers();
dbService.start();

const userService = new UserService();
userService.start();
