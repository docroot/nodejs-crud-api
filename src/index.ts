import cluster, { Worker } from 'cluster';
import http, { IncomingMessage, ServerResponse } from 'http';
import { availableParallelism } from 'node:os';
import process from 'process';
import child_process, { spawn, ChildProcess } from 'child_process';
import dotenv from 'dotenv';
import { DbService } from "./db_service";
import { UserService } from "./user_service";

dotenv.config();

// Object.keys(process.env).forEach((key) => {
//     if (key.startsWith('CRUD'))
//         console.log(`${key}=[${process.env[key]}]`);
// });

const numCPUs = availableParallelism() - 1;
let activeChildProcesses = 0;
const masterPort = process.env['CRUD_US_PORT'] ? process.env['CRUD_US_PORT'] : '4000';
let currentWorkerPort = parseInt(masterPort) + 1;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  const dbService = new DbService();
  //  dbService.createTestUsers();
  dbService.start();


  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({ 'CRUD_US_PORT': currentWorkerPort });
    currentWorkerPort++;
  }

  cluster.on('exit', (worker: Worker, code: number, signal: string) => {
    console.log(`worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
  });

  cluster.on('listening', (worker, address) => {
    console.log(
      `A worker is now connected to ${address.address}:${address.port}`);
  });

  const loadBalancer = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const options = {
      hostname: 'localhost',
      port: 4001,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const outgoingReq = http.request(options, (outgoingRes) => {

      if (outgoingRes && outgoingRes.statusCode) {
        res.writeHead(outgoingRes.statusCode, outgoingRes.headers);
        outgoingRes.pipe(res);
      }
      else {
        res.statusCode = 500;
        res.end('Error: Could not resend request');
      }
    });

    outgoingReq.on('error', (error) => {
      console.error(error);
      res.statusCode = 500;
      res.end('Error: Could not resend request');
    });

    req.pipe(outgoingReq);
  }).listen(masterPort);

} else if (cluster.isWorker) {

  console.log(`Cur port: [${process.env.CRUD_US_PORT}]`);
  if (cluster.worker) console.log(`Worker ID: [${cluster.worker.id}]`);

  const userService = new UserService();
  userService.start();

  console.log(`Worker ${process.pid} started`);
}
