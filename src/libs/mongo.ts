import { MongoClient, Collection } from "mongodb";

import { IMongoComment, IComment, IPaginationResult } from "../../types/koalament";
import { Utility } from "./utility";

export class MongoDataSource {
  private commentsCollection: Collection;
  private ready: boolean = false;
  public isReady(): boolean {
    return this.ready;
  }
  public constructor(uri: string) {
    MongoClient.connect(uri, { useUnifiedTopology: true }, (err: Error, client: MongoClient) => {
      if (err) {
        throw err;
      }
      console.log("Connected successfully to server");
      this.commentsCollection = client.db("koala").collection("ment");
      this.ready = true;
    });
  }
  public comments(key: string, scrollId: string, limit: number, callback: (err: Error, comments?: IPaginationResult<IComment>) => void): void {
    const fromDate: Date = scrollId ? new Date(parseInt(Buffer.from(scrollId, "base64").toString("ascii"), 10)) : new Date();
    const keys: string[] = Utility.multipleUrlAddress(key);
    this.commentsCollection.find({ $and: [{ key: { $in: keys } }, { flag: { $ne: true } }] }).count((err: Error, total: number) => {
      if (err) {
        callback(err);

        return;
      }
      this.commentsCollection.find({ $and: [{ key: { $in: keys } }, { created_at: { $lt: fromDate } }, { flag: { $ne: true } }] }).count((err: Error, totalFromHere: number) => {
        if (err) {
          callback(err);

          return;
        }
        this.commentsCollection.find<IMongoComment>({ $and: [{ key: { $in: keys } }, { created_at: { $lt: fromDate } }, { flag: { $ne: true } }] }, { limit: limit || parseInt(process.env.MONGO_DEFAULT_READ_COMMENTS_LIMIT, 10) })
          .sort({ created_at: -1 })
          .toArray((err: Error, comments: IMongoComment[]) => {
            if (err) {
              console.log(err);
              callback(err);

              return;
            }
            let scrollId: string;
            if (comments.length > 0) {
              scrollId = Buffer.from(comments[comments.length - 1].created_at.getTime().toString(), "ascii").toString("base64").replace(/=/g, "");
            }
            callback(undefined, {
              total: total,
              remained: totalFromHere - comments.length,
              scrollId,
              results: comments.map((p: IMongoComment) =>
                ({
                  _txid: p._id,
                  _layer: p._layer,
                  text: p.text,
                  nickname: p.nickname || "unknown",
                  address: p.address,
                  replies: p.replies ? { results: [], total: p.replies.length, remained: p.replies.length } : { results: [], total: 0, remained: 0 },
                  claps: p.claps ? { results: [], total: p.claps.length, remained: p.claps.length } : { results: [], total: 0, remained: 0 },
                  boos: p.boos ? { results: [], total: p.boos.length, remained: p.boos.length } : { results: [], total: 0, remained: 0 },
                  created_at: p.created_at
                }))
            });
          });
      });

    });
  }

  public insertComment(txid: string, address: string, nickname: string, key: string, text: string, createdAt: Date, layer: number, flag: boolean, callback: (err: Error) => void): void {
    const comment: IMongoComment = { _id: txid, key, text, address, created_at: createdAt, _layer: layer };
    if (nickname) {
      comment.nickname = nickname;
    }
    this.commentsCollection.insertOne(comment, callback);
  }

  public clapComment(txid: string, key: string, callback: (err: Error) => void): void {
    this.commentsCollection.updateOne({ _id: key }, { $addToSet: { claps: txid } }, callback);
  }
  public booComment(txid: string, key: string, callback: (err: Error) => void): void {
    this.commentsCollection.updateOne({ _id: key }, { $addToSet: { boos: txid } }, callback);
  }
  public replyComment(txid: string, address: string, nickname: string, key: string, text: string, createdAt: Date, layer: number, callback: (err: Error) => void): void {
    this.commentsCollection.updateOne({ _id: key }, { $addToSet: { replies: txid } }, (err: Error) => {
      if (err) {
        callback(err);

        return;
      }
      this.insertComment(txid, address, nickname, key, text, createdAt, layer, false, callback);
    });
  }
  public reportComment(txid: string, address: string, nickname: string, key: string, text: string, createdAt: Date, layer: number, callback: (err: Error) => void): void {
    const reportComment: IMongoComment = { _id: txid, key: key, text: text, address: address, created_at: createdAt, _layer: layer };
    if (nickname) {
      reportComment.nickname = nickname;
    }
    this.commentsCollection.updateOne({ _id: key }, { $push: { reports: reportComment } }, callback);
  }

  public commentById(txId: string, callback: (err: Error, comment?: IComment) => void): void {
    this.commentsCollection.findOne<IMongoComment>({ _id: txId }, (err: Error, comment: IMongoComment) => {
      if (err) {
        callback(err);

        return;
      }
      if (!comment) {
        callback(undefined, undefined);

        return;
      }

      callback(undefined, {
        _txid: comment._id,
        _layer: comment._layer,
        key: comment.key,
        text: comment.text,
        nickname: comment.nickname || "unknown",
        address: comment.address,
        replies: comment.replies ? { results: [], total: comment.replies.length, remained: comment.replies.length } : { results: [], total: 0, remained: 0 },
        claps: comment.claps ? { results: [], total: comment.claps.length, remained: comment.claps.length } : { results: [], total: 0, remained: 0 },
        boos: comment.boos ? { results: [], total: comment.boos.length, remained: comment.boos.length } : { results: [], total: 0, remained: 0 },
        created_at: comment.created_at
      });
    });
  }
}
