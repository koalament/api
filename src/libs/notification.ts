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

    public follow(userToken: string, key: string, callback: (err: Error) => void): void {
        this.followCollection.insertOne({ _id: `${userToken}-${key}`, user_token: userToken, key: key, created_at: new Date() }, callback);
    }

    public followers(key: string, callback: (err: Error, followers?: string[]) => void): void {
        this.followCollection.find<IMongoFollow>({ key: key }).toArray()
            .then((follows: IMongoFollow[]) => {
                callback(undefined, follows.map((p: IMongoFollow) => p.user_token));
            })
            .catch(callback);
    }

    public unreadCount(userToken: string, callback: (err: Error, count?: number) => void): void {
        this.inboxCollection.countDocuments({ user_token: userToken })
            .then((count: number) => {
                callback(undefined, count);
            })
            .catch(callback);
    }

    public store(txId: string, key: string, action: string, description: string, callback: (err: Error, followers?: string[]) => void): void {
        this.followCollection.aggregate<IMongoFollow>([{ $match: { key: key } }, { $project: { _id: { $concat: ["$user_token", "-", txId] }, tx_id: txId, user_token: "$user_token", key: key, action: action, description: description, created_at: new Date() } }, { $merge: this.inboxTable }])
            .toArray()
            .then(() => {
                this.followers(key, callback);
            }).catch(callback);
    }

    public inbox(userToken: string, scrollId: string, limit: number, callback: (err: Error, results?: IPaginationResult<IInboxMessage>) => void): void {
        this.inboxCollection.countDocuments({ userToken: userToken })
            .then((count: number) => {
                const query: FilterQuery<any> = scrollId ? { $and: [{ user_token: userToken }, { created_at: { $gt: new Date(parseInt(scrollId, 10)) } }] } : { user_token: userToken };
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
                                        key: inbox.key,
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

    public markAsRead(userToken: string, scrollId: string, callback: (err: Error) => void): void {
        this.inboxCollection.deleteMany({ $and: [{ userToken: userToken }, { created_at: { $lte: new Date(parseInt(scrollId, 10)) } }] })
            .then(() => {
                callback(undefined);
            })
            .catch(callback);
    }
}
