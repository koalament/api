import { IEnv } from "../../types/iEnv";

export class ENV {
    public environmets: IEnv;
    public constructor() {
        this.environmets = ENV.read();
    }
    private static Setter(envParam: string, type: string, defaultValue?: string): string {
        let value: string | undefined = process.env[envParam];
        if (value === undefined && defaultValue !== undefined) {
            value = defaultValue;
        }
        if (["number"].indexOf(type) > -1) {
            if (value === undefined || isNaN(parseFloat(value))) {
                throw new Error(`${envParam} => Not value[${value}] in type[${type}]`);
            }

            return value;
        }

        if (["string"].indexOf(type) > -1) {
            if (value === undefined) {
                throw new Error(`${envParam} => Not value[${value}] in type[${type}]`);
            }

            return value;
        }

        return "";
    }

    private static read(): IEnv {
        const env: IEnv = {
            LOG_LEVEL: ENV.Setter("LOG_LEVEL", "string"),
            MONGO_COMMENT_STORE: ENV.Setter("MONGO_COMMENT_STORE", "string"),
            MONGO_DEFAULT_READ_COMMENTS_LIMIT: parseInt(ENV.Setter("MONGO_DEFAULT_READ_COMMENTS_LIMIT", "number"), 10),
            SUPPORTED_LAYERS: ENV.Setter("SUPPORTED_LAYERS", "string").split(",").map((p: string) => parseInt(p, 10)).filter((p: number) => p),
            SUPPORTED_FORMATS: ENV.Setter("SUPPORTED_FORMATS", "string").split(",").map((p: string) => p.trim()).filter((p: string) => p !== ""),
            IGNORE_DOMAIN_EXTENSIONS: ENV.Setter("IGNORE_DOMAIN_EXTENSIONS", "string").split(",").map((p: string) => p.trim()).filter((p: string) => p !== ""),
            MAXIMUM_COMMENT_LENGTH_BYTES: parseInt(ENV.Setter("MAXIMUM_COMMENT_LENGTH_BYTES", "number"), 10),
            MAXIMUM_NUCKNAME_LENGTH_BYTES: parseInt(ENV.Setter("MAXIMUM_NUCKNAME_LENGTH_BYTES", "number"), 10),
            IGNORE_DOMAINS: ENV.Setter("IGNORE_DOMAINS", "string").split(",").map((p: string) => p.trim()).filter((p: string) => p !== ""),
            LISTENING_ON: ENV.Setter("LISTENING_ON", "string"),
            EXPRESS_HOST: ENV.Setter("EXPRESS_HOST", "string"),
            EXPRESS_PORT: parseInt(ENV.Setter("EXPRESS_PORT", "number"), 10),
            WATCHER_HOST: ENV.Setter("WATCHER_HOST", "string")
        };

        return env;
    }
}
