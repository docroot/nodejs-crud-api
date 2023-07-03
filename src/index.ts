import cluster, { Worker } from 'cluster';
import http, { IncomingMessage, ServerResponse } from 'http';
import { availableParallelism } from 'node:os';
import process from 'process';
import child_process, { spawn, ChildProcess } from 'child_process';
import dotenv from 'dotenv';


const numCPUs = availableParallelism() - 1;
let activeChildProcesses = 0;
const masterPort = 3000;
let currentWorkerPort = masterPort + 1;


if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  const child = spawn('ts-node', ['src/db_service.ts']);

  if (child) {
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        console.log(`Child process stdout: ${data}`);
      });
    }

    child.on('exit', (code: number) => {
      console.log(`Child process exited with code ${code}`);
    });
  }

  const onExit = () => {
    if (child !== null) {
      child.kill('SIGTERM');
    }
    const workers = cluster.workers;
    if (workers) {
      Object.values(workers).forEach((worker) => {
        if (worker) {
          worker.kill('SIGTERM');
        }
      });
    }
  }


  process.stdin.on('SIGTERM', () => {
    console.log("SIGTERM!!!!");
    process.exit(0);
  });

  process.stdin.on('data', (data) => {
    if (String(data).trim() === 'exit') {
      onExit();
    }
  });



  process.on('SIGINT', () => {
    console.log('Ctrl+C!\n');
    process.kill(process.pid, 'SIGTERM');
  });

  process.on('exit', () => {
    onExit();
    console.log('EXIT!\n');
  });


  for (let i = 0; i < numCPUs; i++) {
    //    console.log(`Cur port: [${currentWorkerPort}]`);
    cluster.fork({ 'WRK_PORT': currentWorkerPort });
    currentWorkerPort++;
  }

  // const workers = cluster.workers;
  // if (workers) {
  //   Object.values(workers).forEach((worker) => {
  //     // Event listener for 'exit' event
  //     if (worker) {
  //       worker.on('exit', (code, signal) => {
  //         console.log(`Worker ${worker.id} exited with code ${code} and signal ${signal}`);
  //       });
  //     }
  //   });
  // }

  cluster.on('exit', (worker: Worker, code: number, signal: string) => {
    console.log(`worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
  });

  cluster.on('listening', (worker, address) => {
    console.log(
      `A worker is now connected to ${address.address}:${address.port}`);
  });

  // process.on('exit', () => {
  //   cluster.disconnect(() => {
  //     process.exit(0);
  //   });
  //   // console.log("Done");
  // });


  const loadBalancer = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
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

  console.log(`Cur port: [${process.env.WRK_PORT}]`);
  if (cluster.worker) console.log(`Worker ID: [${cluster.worker.id}]`);

  http.createServer((req, res) => {
    req.pipe(process.stdout);
    res.writeHead(200);
    res.end('hello world\n');
  }).listen(process.env.WRK_PORT);

  process.on('SIGTERM', () => {
    process.exit(0);
  });

  console.log(`Worker ${process.pid} started`);
}

