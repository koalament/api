export interface IEnv {
    LOG_LEVEL: string;
    MONGO_COMMENT_STORE: string;
    MONGO_DATABASE_NAME: string;
    MONGO_TABLE_NAME: string;
    MONGO_DEFAULT_READ_COMMENTS_LIMIT: number;
    SUPPORTED_LAYERS: number[];
    SUPPORTED_FORMATS: string[];
    IGNORE_DOMAIN_EXTENSIONS: string[];
    MAXIMUM_COMMENT_LENGTH_BYTES: number;
    MAXIMUM_NICKNAME_LENGTH_BYTES: number;
    IGNORE_DOMAINS: string[];
    LISTENING_ON_ADDRESS: string;
    MINIMUM_ACTION_PAY_AS_CENT_FOR_LISTENING: { comment?: number; reply?: number; clap?: number; boo?: number; report?: number };
    EXPRESS_HOST: string;
    EXPRESS_PORT: number;
    WATCHER_HOST: string;
}
