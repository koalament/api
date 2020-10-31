import IOS from "socket.io-client";
import IO from "socket.io";
import Url from "url-parse";
import { CryptoPrice } from "crypto-state";
import { Transaction } from "bsv";
import { layer2 } from "koalament-layers";
import Tracer from "tracer";
import url from "url";
import Http from "http";
import { MongoDataSource } from "./libs/mongo";
import { IMarkAsReadParams, IComment, IReadCommentsReadParams, IPaginationResult, IFollowParams, IInboxParams, IInboxMessage, ISocketError, IReadClaspsReadParams, IClap, IReadBoosReadParams, IBoo } from "../types/koalament";
import { ILayer2Params } from "koalament-layers/dist/Layer2";
import { Utility } from "./libs/utility";
import { IEnv } from "../types/iEnv";
import { ENV } from "./libs/env";
import { NotificationDataSource } from "./libs/notification";
import { Firebase } from "./libs/firbase-notification";

const env: IEnv = new ENV().environmets;
const cryptoPrice: CryptoPrice = new CryptoPrice();
//Resolve injected class
cryptoPrice.prices();
const watcher: SocketIOClient.Socket = IOS(env.WATCHER_HOST);
const dataSource: MongoDataSource = new MongoDataSource(env.MONGO_COMMENT_STORE, env.MONGO_DATABASE_NAME, env.MONGO_TABLE_NAME, env.MONGO_DEFAULT_READ_COMMENTS_LIMIT);
const notificationSource: NotificationDataSource = new NotificationDataSource(env.MONGO_COMMENT_STORE, env.MONGO_DATABASE_NAME, "follow", "inbox");
const firebase: Firebase = new Firebase(env.FIREBASE_SERVICE_ACCOUNT, env.FIREBASE_DATABASE_URL);
const consoleLogger: Tracer.Tracer.Logger = Tracer.colorConsole({ level: env.LOG_LEVEL });

function pipe(_txid: string, paidUs: number, address: string, data: IComment, callback: (err: Error) => void): void {
  consoleLogger.info(_txid, data);
  if (data.nickname && data.nickname.length > env.MAXIMUM_NICKNAME_LENGTH_BYTES) {
    callback(new Error("Maximum nickname length exceeded."));

    return;
  }
  if (data.text && data.text.length > env.MAXIMUM_COMMENT_LENGTH_BYTES) {
    callback(new Error("Maximum text length exceeded."));

    return;
  }
  switch (data._method) {
    case 0: {
      if (paidUs !== -1 && env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.comment && paidUs < env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.comment) {
        callback(new Error("Minimum pay not met."));

        return;
      }
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
    case 1: {
      if (paidUs !== -1 && env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.reply && paidUs < env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.reply) {
        callback(new Error("Minimum pay not met."));

        return;
      }
      dataSource.replyComment(_txid, address, data.nickname, data.key, data.text, data.created_at, data._layer, callback);
    } break;
    case 2: {
      if (paidUs !== -1 && env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.clap && paidUs < env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.clap) {
        callback(new Error("Minimum pay not met."));

        return;
      }
      dataSource.clapComment(_txid, data.nickname, data.key, data.created_at, data._layer, callback);
    } break;
    case 3: {
      if (paidUs !== -1 && env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.boo && paidUs < env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.boo) {
        callback(new Error("Minimum pay not met."));

        return;
      }
      dataSource.booComment(_txid, data.nickname, data.key, data.created_at, data._layer, callback);
    } break;
    case 4: {
      if (paidUs !== -1 && env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.report && paidUs < env.MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING.report) {
        callback(new Error("Minimum pay not met."));

        return;
      }
      dataSource.reportComment(_txid, address, data.nickname, data.key, data.text, data.created_at, data._layer, callback);
    } break;
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
  let paidUs: number = 0;
  decodedTx.outputs.forEach((out: Transaction.Output) => {
    if (out.satoshis === 0 && out.script.toASM().indexOf("0 OP_RETURN") === 0) {
      opOutput = out.script.toASM();
    }
    if (out.script.toAddress().toString() === env.LISTENING_ON_ADDRESS) {
      const BSVUSD: number = cryptoPrice.price("BSVUSD");
      paidUs = BSVUSD ? (BSVUSD * out.satoshis) / 1000000 : -1;
    }
  });
  if (!opOutput) {
    return;
  }
  if (paidUs === 0) {
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
    const mixedComment: IComment = { ...data, ...{ created_at: createdAt } };
    pipe(txid, paidUs, address, mixedComment, (err: Error) => {
      if (err) {
        consoleLogger.error(err);

        return;
      }
      dataSource.commentById((data as { key: string }).key, (err: Error, comment: IComment) => {
        if (err) {
          consoleLogger.error(err);
        }
        if (comment) {
          let description: string;
          let action: string;

          switch (mixedComment._method) {
            case 1: {
              description = `${mixedComment.nickname || "unknown"} replied on \`${comment.text.slice(0, 40)}\``;
              action = "reply";
            } break;
            case 2: {
              description = `${mixedComment.nickname || "unknown"} clapped the \`${comment.text.slice(0, 40)}\``;
              action = "clap";
            } break;
            case 3: {
              description = `${mixedComment.nickname || "unknown"} boo the \`${comment.text.slice(0, 40)}\``;
              action = "boo";
            } break;
            default:
          }

          if (description && action) {
            const notifMessage: IInboxMessage = { txId: txid, key: mixedComment.key, action, text: description, date: mixedComment.created_at };
            notificationSource.store(txid, mixedComment.key, action, description, (err: Error, followers: string[]) => {
              if (err) {
                consoleLogger.error(err);
              }
              if (followers && followers.length > 0) {
                firebase.sendNotif(followers, { title: action, body: description }, { txId: notifMessage.txId, key: notifMessage.key, date: notifMessage.date.toISOString() });
                // followers.forEach((follower_id: string) => {
                //   io.sockets.emit(`notif_${follower_id}`, notifMessage);
                // });
              }
            });
          }

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
          io.sockets.emit(Buffer.from(`site:all_${layer_version}`).toString("base64"), emit_data);
          if (Utility.isUrl(data.key)) {
            io.sockets.emit(Buffer.from(`site:${url.parse(data.key).host}_${layer_version}`).toString("base64"), emit_data);
          }
        }
      });
    });
  });
}
watcher.on(`address.out:${env.LISTENING_ON_ADDRESS}`, (hex: string) => {
  onHex(hex);
});

io.sockets.on("connection", (socket: IO.Socket) => {
  console.log("CLIENTS ", Object.keys(io.sockets.connected).length);
  console.log("User connected.");
  socket.on("read", (input: IReadCommentsReadParams, callback: (err: ISocketError, comments?: IPaginationResult<IComment>) => void) => {
    dataSource.comments(input.key, input.scrollId, input.limit, (err: Error, readResult: IPaginationResult<IComment>) => {
      if (err) {
        console.log(err);
        callback({ error: { code: 520, message: err.message } });

        return;
      }
      callback(undefined, readResult);
    });
  });

  socket.on("claps", (input: IReadClaspsReadParams, callback: (err: ISocketError, claps?: IPaginationResult<IClap>) => void) => {
    dataSource.claps(input.key, input.scrollId, input.limit, (err: Error, readResult: IPaginationResult<IClap>) => {
      if (err) {
        console.log(err);
        callback({ error: { code: 520, message: err.message } });

        return;
      }
      callback(undefined, readResult);
    });
  });

  socket.on("boos", (input: IReadBoosReadParams, callback: (err: ISocketError, boos?: IPaginationResult<IBoo>) => void) => {
    dataSource.boos(input.key, input.scrollId, input.limit, (err: Error, readResult: IPaginationResult<IBoo>) => {
      if (err) {
        console.log(err);
        callback({ error: { code: 520, message: err.message } });

        return;
      }
      callback(undefined, readResult);
    });
  });

  socket.on("follow", (input: IFollowParams, callback: (err: ISocketError) => void) => {
    if (!input) {
      callback({ error: { code: 400, message: "Wrong input" } });

      return;
    }
    // if (!new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i).test(input.userId)) {
    //   callback({ error: { code: 400, message: "Wrong userId uuid4 type." } });

    //   return;
    // }
    notificationSource.follow(input.userToken, input.key, (err: Error) => {
      if (err) {
        console.log(err);
        callback({ error: { code: 520, message: err.message } });

        return;
      }
      callback(undefined);
    });
  });

  socket.on("inbox", (input: IInboxParams, callback: (err: ISocketError, results?: IPaginationResult<IInboxMessage>) => void) => {
    notificationSource.inbox(input.userToken, input.scrollId, input.limit, (err: Error, results: IPaginationResult<IInboxMessage>) => {
      if (err) {
        console.log(err);
        callback({ error: { code: 520, message: err.message } });

        return;
      }
      callback(undefined, results);
    });
  });

  socket.on("mark_as_read", (input: IMarkAsReadParams, callback: (err: ISocketError) => void) => {
    notificationSource.markAsRead(input.userToken, input.scrollId, (err: Error) => {
      if (err) {
        console.log(err);
        callback({ error: { code: 520, message: err.message } });

        return;
      }
      callback(undefined);
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
