import IOS from "socket.io-client";
import IO from "socket.io";
import Url from "url-parse";
import { Transaction } from "bsv";
import { layer2 } from "koalament-layers";
import Tracer from "tracer";
import url from "url";
import Http from "http";
import { MongoDataSource } from "./libs/mongo";
import { IComment, IReadCommentsReadParams, IPaginationResult } from "../types/koalament";
import { ILayer2Params } from "koalament-layers/dist/Layer2";
import { Utility } from "./libs/utility";
import { IEnv } from "../types/iEnv";
import { ENV } from "./libs/env";

const env: IEnv = new ENV().environmets;
const watcher: SocketIOClient.Socket = IOS(env.WATCHER_HOST);
const dataSource: MongoDataSource = new MongoDataSource(env.MONGO_COMMENT_STORE, env.MONGO_DEFAULT_READ_COMMENTS_LIMIT);
const consoleLogger: Tracer.Tracer.Logger = Tracer.colorConsole({ level: env.LOG_LEVEL });

function pipe(_txid: string, address: string, data: IComment, callback: (err: Error) => void): void {
  consoleLogger.info(_txid, data);
  switch (data._method) {
    case 0: {
      const url: Url = new Url(data.key);
      let flag: boolean = false;
      if (url.hostname) {
        env.IGNORE_DOMAIN_EXTENSIONS.forEach((ext: string): void => {
          if (url.hostname.split(".").pop() === ext) {
            flag = true;
          }
        });
        env.IGNORE_DOMAIN_EXTENSIONS.forEach((domain: string): void => {
          if (url.hostname === domain) {
            flag = true;
          }
        });
      }

      dataSource.insertComment(_txid, address, data.nickname, data.key, data.text, data.created_at, data._layer, flag, callback);
    } break;
    case 1: dataSource.replyComment(_txid, address, data.nickname, data.key, data.text, data.created_at, data._layer, callback); break;
    case 2: dataSource.clapComment(_txid, data.key, callback); break;
    case 3: dataSource.booComment(_txid, data.key, callback); break;
    case 4: dataSource.reportComment(_txid, address, data.nickname, data.key, data.text, data.created_at, data._layer, callback); break;
    default: callback(new Error('Unknown method "data._method"'));
  }
}

const index: string = "<html><body>Listening</body></html>";

// send html content to all requests
const app: Http.Server = Http.createServer((req: Http.IncomingMessage, res: Http.ServerResponse) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(index);
});

const io: IO.Server = IO.listen(app);

function onHex(hex: string): void {
  const createdAt: Date = new Date();
  let decodedTx: Transaction;
  try {
    decodedTx = new Transaction(hex);
  } catch (e) {
    consoleLogger.error(e);
  }
  if (!decodedTx) {
    return;
  }
  const address: string = decodedTx.inputs[0].script.toAddress().toString();
  let opOutput: string;
  decodedTx.outputs.forEach((out: Transaction.Output) => {
    if (out.satoshis === 0 && out.script.toASM().indexOf("0 OP_RETURN") === 0) {
      opOutput = out.script.toASM();
    }
  });
  if (!opOutput) {
    return;
  }
  const hexSplitted: string[] = opOutput.split(" ");
  if (hexSplitted.length < 2) {
    return;
  }
  const splitted: string[] = Buffer.from(hexSplitted[2], "hex").toString("utf8").split(" ");
  const label: string = splitted.shift();
  if (label !== "koalament") {
    return;
  }
  const remained: string = splitted.join(" ");
  layer2.decode(remained, (err: Error, data: any) => {
    if (err) {
      console.log(err);

      return;
    }
    const txid: string = decodedTx.id;
    pipe(txid, address, { ...data, ...{ created_at: createdAt } }, (err: Error) => {
      if (err) {
        consoleLogger.error(err);

        return;
      }
      dataSource.commentById((data as { key: string }).key, (err: Error, comment: IComment) => {
        if (err) {
          consoleLogger.error(err);
        }
        if (comment) {
          const keys: string[] = Utility.multipleUrlAddress(comment.key);
          keys.forEach((key: string): void => {
            env.SUPPORTED_LAYERS.forEach((layer_version: number) => {
              const layer_data: any = layer2.downgrade(comment as ILayer2Params, layer_version);
              if (layer_data !== undefined) {
                const emit_data: any = { ...{ _txid: comment._txid, address: address, boos: comment.boos, claps: comment.claps, replies: comment.replies }, ...layer_data, ...{ created_at: comment.created_at }, updated: true };
                io.sockets.emit(Buffer.from(`${key}_${layer_version}`).toString("base64"), emit_data);
              }
            });
          });
        }
      });
      env.SUPPORTED_LAYERS.forEach((layer_version: number) => {
        const layer_data: any = layer2.downgrade(data as ILayer2Params, layer_version);
        if (layer_data !== undefined) {
          const emit_data: any = { ...{ _txid: txid, address: address, boos: [], claps: [], replies: [] }, ...layer_data, ...{ created_at: createdAt }, updated: false };
          consoleLogger.warn(layer_version, emit_data);
          io.sockets.emit(Buffer.from(`${data.key}_${layer_version}`).toString("base64"), emit_data);
          if (Utility.isUrl(data.key)) {
            io.sockets.emit(Buffer.from(`site:${url.parse(data.key).host}_${layer_version}`).toString("base64"), emit_data);
            io.sockets.emit(Buffer.from(`site:all_${layer_version}`).toString("base64"), emit_data);
          }
        }
      });
    });
  });
}
watcher.on(env.LISTENING_ON, (hex: string) => {
  onHex(hex);
});

io.sockets.on("connection", (socket: IO.Socket) => {
  console.log("CLIENTS ", Object.keys(io.sockets.connected).length);
  console.log("User connected.");
  socket.on("read", (input: IReadCommentsReadParams, callback: (err: Error, comments?: IPaginationResult<IComment>) => void) => {
    dataSource.comments(input.key, input.scrollId, input.limit, (err: Error, readResult: IPaginationResult<IComment>) => {
      if (err) {
        console.log(err);
        callback(err);

        return;
      }
      callback(undefined, readResult);
    });
  });

  socket.on("disconnect", () => {
    //Before ts was 0 ? false ?
    socket.disconnect(false);
    console.log("CLIENTS ", io.sockets.clients.length);
    console.log("User disconnected");
  });
});

app.listen(env.EXPRESS_PORT, env.EXPRESS_HOST);

console.log(`Server running at ${env.EXPRESS_HOST}:${env.EXPRESS_PORT}/`);
