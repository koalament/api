import { MongoClient, Collection } from "mongodb";

import { IMongoComment, IComment, IPaginationResult } from "../../types/koalament";

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
    this.commentsCollection.find({ $and: [{ key: key }, { created_at: { $lt: fromDate } }] }).count((err: Error, count: number) => {
      if (err) {
        callback(err);

        return;
      }
      this.commentsCollection.find<IMongoComment>({ $and: [{ key: key }, { created_at: { $lt: fromDate } }] }, { limit: limit || parseInt(process.env.MONGO_DEFAULT_READ_COMMENTS_LIMIT, 10) })
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
            total: count,
            scrollId,
            results: comments.map((p: IMongoComment) =>
              ({
                _txid: p._id,
                _layer: p._layer,
                text: p.text,
                nickname: p.nickname || "unknown",
                replies: p.replies ? { results: [], total: p.replies.length } : { results: [], total: 0 },
                claps: p.claps ? { results: [], total: p.claps.length } : { results: [], total: 0 },
                boos: p.boos ? { results: [], total: p.boos.length } : { results: [], total: 0 },
                created_at: p.created_at
              }))
          });
        });
    });
  }

  public insertComment(txid: string, nickname: string, key: string, text: string, createdAt: Date, layer: number, callback: (err: Error) => void): void {
    const comment: IMongoComment = { _id: txid, key, text, created_at: createdAt, _layer: layer };
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
  public replyComment(txid: string, nickname: string, key: string, text: string, createdAt: Date, layer: number, callback: (err: Error) => void): void {
    this.commentsCollection.updateOne({ _id: key }, { $addToSet: { replies: txid } }, (err: Error) => {
      if (err) {
        callback(err);

        return;
      }
      this.insertComment(txid, nickname, key, text, createdAt, layer, callback);
    });
  }
  public reportComment(txid: string, nickname: string, key: string, text: string, createdAt: Date, layer: number, callback: (err: Error) => void): void {
    const reportComment: IMongoComment = { _id: txid, key: key, text: text, created_at: createdAt, _layer: layer };
    if (nickname) {
      reportComment.nickname = nickname;
    }
    this.commentsCollection.updateOne({ _id: key }, { $push: { reports: reportComment } }, callback);
  }
}
