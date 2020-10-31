### How to use

```javascript
const socket_address = 'https://dev-nap.koalament.io';
const io = require("socket.io-client");

const socket = io.connect(socket_address, { reconnection: false });

//Fetch url comments
socket.emit("read", {
	key: "https://kolament.io/",
	scrollId: null,
	limit: 3
}, (err, comments) => {
	console.log(err, comments)
})
/*
{
  "total": 137,
  "remained": 134,
  "scrollId": "MTYwMzY5ODU2NDE0Mg",
  "results": [
    {
      "_txid": "256e74525d2b20d17d9cc0f255a1c907329af299ed39fab13b73c11b9f48348f",
      "_layer": 2,
      "text": "another test",
      "nickname": "msmrz",
      "address": "1Gryx7mJWaDBYpM4STRxTA2hJtTE5atK2a",
      "replies": {
        "results": [],
        "total": 0,
        "remained": 0
      },
      "claps": {
        "results": [],
        "total": 2,
        "remained": 2
      },
      "boos": {
        "results": [],
        "total": 0,
        "remained": 0
      },
      "created_at": "2020-10-26T07:53:34.169Z"
    },
    {
      "_txid": "14565dc63e1bdcc8acc61fe4a04fed6b296781a54f28e470a0fcab6202179e1c",
      "_layer": 2,
      "text": "this is a test comment",
      "nickname": "msmrz",
      "address": "1JeA5mNU3qbdaj7bN7kzgLWavLsW9jeLEL",
      "replies": {
        "results": [],
        "total": 0,
        "remained": 0
      },
      "claps": {
        "results": [],
        "total": 3,
        "remained": 3
      },
      "boos": {
        "results": [],
        "total": 0,
        "remained": 0
      },
      "created_at": "2020-10-26T07:51:39.837Z"
    },
    {
      "_txid": "9201adef5cd805f0708feaa204b7e467d52494c5c42a1ebcbfea79e0ea29a41d",
      "_layer": 2,
      "text": "test comment",
      "nickname": "mzi",
      "address": "1NdkRLk3ddQbRDT8XBm6orqhmUyzGGXhoe",
      "replies": {
        "results": [],
        "total": 0,
        "remained": 0
      },
      "claps": {
        "results": [],
        "total": 1,
        "remained": 1
      },
      "boos": {
        "results": [],
        "total": 0,
        "remained": 0
      },
      "created_at": "2020-10-26T07:49:24.142Z"
    }
  ]
}
*/

//Receive new comments on url >> Buffer.from(KEY|URL_LAYER-VERSION)
socket.on(Buffer.from("https://koalament.io/" + "_" + "2", "utf-8").toString("base64"), (comment) => {
	console.log(comment);
});
```
