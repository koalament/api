### How to use

```javascript
const socket_address = 'https://dev-nap.koalament.io';
const io = require("socket.io-client");

const layer_version = 2;
const url = 'https://koalament.io/';
const socket = io.connect(socket_address, { reconnection: false });

//Fetch url comments
socket.emit("read", {
	key: url,
	from: 0,
	limit: 10
}, (err, comments) => {
	console.log(err, comments)
})

//Receive new comments on url
socket.on(Buffer.from(url + "_" + layer_version, "utf-8").toString("base64"), (comment) => {
	console.log(comment);
});
```