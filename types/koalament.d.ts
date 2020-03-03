export interface IPaginationResult<T> {
  total: number;
  results: T[];
}
export interface IMongoComment {
  _id: string;
  _layer: number;
  nickname?: string;
  key: string;
  text: string;
  replies?: string[];
  claps?: string[];
  created_at: Date;
}

export interface IComment {
  _txid: string;
  _layer: number;
  _method?: number;
  nickname?: string;
  key?: string;
  text: string;
  replies?: IPaginationResult<any>;
  claps?: IPaginationResult<any>;
  created_at: Date;
}

export interface IReadCommentsReadParams {
  nickname?: string;
  key: string;
  from: number;
  limit: number;
}
