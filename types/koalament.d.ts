export interface ISocketError {
  error: {
    code?: number;
    message: string;
  };
}
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

export interface IMongoClap {
  _id: string;
  _layer: number;
  key: string;
  nickname?: string;
  created_at: Date;
}

export interface IMongoBoo {
  _id: string;
  _layer: number;
  key: string;
  nickname?: string;
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

export interface IClap {
  _txid: string;
  nickname?: string;
  created_at: Date;
}

export interface IBoo {
  _txid: string;
  nickname?: string;
  created_at: Date;
}

export interface IReadCommentsReadParams {
  nickname?: string;
  key: string;
  scrollId: string;
  limit: number;
}

export type IReadClaspsReadParams = IReadCommentsReadParams;
export type IReadBoosReadParams = IReadCommentsReadParams;

export interface IFollowParams {
  userToken: string;
  key: string;
}

export interface IInboxParams {
  userToken: string;
  scrollId: string;
  limit: number;
}

export interface IMarkAsReadParams {
  userToken: string;
  scrollId: string;
}

export interface IMongoFollow {
  _id: string;
  user_token: string;
  key: string;
  created_at: Date;
}

export interface IMongoInbox {
  _id: string;
  tx_id: string;
  user_token: string;
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
