export interface IPaginationResult<T> {
  total: number;
  remained: number;
  scrollId?: string;
  results: T[];
}
export interface IMongoComment {
  _id: string;
  _layer: number;
  address: string;
  nickname?: string;
  key: string;
  text: string;
  replies?: string[];
  claps?: string[];
  boos?: string[];
  created_at: Date;
}

export interface IComment {
  _txid: string;
  _layer: number;
  _method?: number;
  nickname?: string;
  key?: string;
  text: string;
  address: string;
  replies?: IPaginationResult<any>;
  claps?: IPaginationResult<any>;
  boos?: IPaginationResult<any>;
  created_at: Date;
}

export interface IReadCommentsReadParams {
  nickname?: string;
  key: string;
  scrollId: string;
  limit: number;
}

export interface IFollowParams {
  userId: string;
  key: string;
}

export interface IInboxParams {
  userId: string;
  scrollId: string;
  limit: number;
}

export interface IMarkAsReadParams {
  userId: string;
  scrollId: string;
}

export interface IMongoFollow {
  _id: string;
  user_id: string;
  key: string;
  created_at: Date;
}

export interface IMongoInbox {
  _id: string;
  tx_id: string;
  user_id: string;
  action: string;
  key: string;
  description: string;
  created_at: Date;
}

export interface IInboxMessage {
  txId: string;
  key: string;
  action: string;
  text: string;
  date: Date;
}
