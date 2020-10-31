import * as admin from "firebase-admin";

export class Firebase {
    private readonly ready: boolean;
    public constructor(serviceAccount: admin.ServiceAccount, databaseUrl: string) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: databaseUrl
        });
        this.ready = true;
    }

    public sendNotif(userTokens: string[], notification: admin.messaging.Notification, data: { [key: string]: string }): void {
        if (!this.ready) {
            throw new Error("Firebase not ready yet!");
        }
        admin.messaging().sendMulticast({ tokens: userTokens, data: data, notification: notification })
            .catch((err: Error) => {
                console.log(err);
            });
    }
}
