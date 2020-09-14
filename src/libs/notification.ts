import { MongoClient, Collection, FilterQuery } from "mongodb";

import { IPaginationResult, IMongoInbox, IInboxMessage, IMongoFollow } from "../../types/koalament";

export class NotificationDataSource {
    private followCollection: Collection;
    private inboxCollection: Collection;
    private ready: boolean = false;
    private readonly inboxTable: string;
    public isReady(): boolean {
        return this.ready;
    }
    public constructor(uri: string, database: string, followTable: string, inboxTable: string) {
        this.inboxTable = inboxTable;
        MongoClient.connect(uri, { useUnifiedTopology: true }, (err: Error, client: MongoClient) => {
            if (err) {
                throw err;
            }
            console.log("Connected successfully to server");
            this.followCollection = client.db(database).collection(followTable);
            this.inboxCollection = client.db(database).collection(inboxTable);
            this.ready = true;
        });
    }

    public follow(userId: string, key: string, callback: (err: Error) => void): void {
        this.followCollection.insertOne({ _id: `${userId}-${key}`, user_id: userId, key: key, created_at: new Date() }, callback);
    }

    public followers(key: string, callback: (err: Error, followers?: string[]) => void): void {
        this.followCollection.find<IMongoFollow>({ key: key }).toArray()
            .then((follows: IMongoFollow[]) => {
                callback(undefined, follows.map((p: IMongoFollow) => p.user_id));
            })
            .catch(callback);
    }

    public unreadCount(userId: string, callback: (err: Error, count?: number) => void): void {
        this.inboxCollection.countDocuments({ user_id: userId })
            .then((count: number) => {
                callback(undefined, count);
            })
            .catch(callback);
    }

    public store(txId: string, key: string, action: string, description: string, callback: (err: Error, followers?: string[]) => void): void {
        this.followCollection.aggregate<IMongoFollow>([{ $match: { key: key } }, { $project: { _id: { $concat: ["$user_id", "-", txId] }, tx_id: txId, user_id: "$user_id", key: key, action: action, description: description, created_at: new Date() } }, { $merge: this.inboxTable }])
            .toArray()
            .then(() => {
                this.followers(key, callback);
            }).catch(callback);
    }

    public inbox(userId: string, scrollId: string, limit: number, callback: (err: Error, results?: IPaginationResult<IInboxMessage>) => void): void {
        this.inboxCollection.countDocuments({ user_id: userId })
            .then((count: number) => {
                const query: FilterQuery<any> = scrollId ? { $and: [{ user_id: userId }, { created_at: { $gt: new Date(parseInt(scrollId, 10)) } }] } : { user_id: userId };
                this.inboxCollection.countDocuments(query).then((remained: number) => {
                    remained = remained - limit;
                    if (remained < 0) {
                        remained = 0;
                    }
                    this.inboxCollection.find<IMongoInbox>(query)
                        .sort({ created_at: 1 })
                        .limit(limit)
                        .toArray()
                        .then((results: IMongoInbox[]) => {
                            callback(undefined, {
                                remained: remained,
                                total: count,
                                scrollId: results.length === 0 ? scrollId : results[results.length - 1].created_at.getTime().toString(),
                                results: results.map((inbox: IMongoInbox) =>
                                    ({
                                        txId: inbox.tx_id,
                                        action: inbox.action,
                                        text: inbox.description,
                                        date: inbox.created_at
                                    }))
                            });
                        })
                        .catch(callback);
                })
                    .catch(callback);
            })
            .catch(callback);
    }

    public markAsRead(userId: string, scrollId: string, callback: (err: Error) => void): void {
        this.inboxCollection.deleteMany({ $and: [{ user_id: userId }, { created_at: { $lte: new Date(parseInt(scrollId, 10)) } }] })
            .then(() => {
                callback(undefined);
            })
            .catch(callback);
    }
}
