export class Utility {
    public static multipleUrlAddress(url: string): string[] {
        const keys: string[] = [url];
        if (new RegExp("(https?:\/\/)?([\da-z\.-]+)\.([a-z]{2,6})([\/\w\.-]*)*\/?").test(url)) {
            if (url[url.length - 1] === "/") {
                keys.push(url.slice(0, url.length - 1));
            } else {
                keys.push(url + "/");
            }
        }

        return keys;
    }
}
