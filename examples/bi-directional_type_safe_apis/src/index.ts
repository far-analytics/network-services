/* eslint-disable @typescript-eslint/no-misused-promises */
import * as net from "node:net";
import { Async, createService } from "network-services";

// DataStore
interface IDataStore {
  addData: (...args: number[]) => Promise<void>;
  getData: () => number[];
}

class DataStore implements IDataStore {
  private data: number[] = [];
  private provider: Async<IDataProvider>;
  private storageLimit = 10;

  constructor(provider: Async<IDataProvider>) {
    this.provider = provider;
  }

  async addData(...args: number[]): Promise<void> {
    if (this.data.length < this.storageLimit) {
      this.data = this.data.concat(args);
    } else {
      await this.provider.stop();
    }
  }

  getData(): number[] {
    return this.data;
  }

  throwError() {
    throw new Error("Something wonderful happened.");
  }
}

const server = net.createServer().listen({ port: 3000, host: "127.0.0.1" });
server.on("connection", (socket: net.Socket) => {
  socket.on("error", console.error);
  const service = createService(socket);
  const provider = service.createServiceAPI<IDataProvider>();
  const store = new DataStore(provider);
  service.createServiceApp<IDataStore>(store, { paths: ["addData", "getData"] });
});

// DataProvider
interface IDataProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
}

class DataProvider implements IDataProvider {
  public store: Async<IDataStore>;
  public continue = true;

  constructor(store: Async<IDataStore>) {
    this.store = store;
  }

  async start() {
    let n = 0;
    while (this.continue) {
      await this.store.addData(n++);
    }
  }

  async stop() {
    if (this.continue) {
      this.continue = false;
      const data = await this.store.getData();
      console.log(data);
    }
  }
}

const socket = net.connect({ port: 3000, host: "127.0.0.1" });
socket.on("error", console.error);
socket.on("ready", async () => {
  try {
    const service = createService(socket);
    const store = service.createServiceAPI<IDataStore>();
    const provider = new DataProvider(store);
    service.createServiceApp(provider);
    await provider.start();
  } catch (err) {
    console.error(err);
  }
});
