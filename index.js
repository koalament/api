const supported_layers = process.env.SUPPORTED_LAYERS.split(",");
const MongoClient = require('mongodb').MongoClient;
const watcher = require('socket.io-client')(process.env.WATCHER_HOST);
const hex_decoder = require("raw-transaction-hex-decoder");
let collection = null;
const url = process.env.MONGO_COMMENT_STORE;
MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
  if (err) {
    throw err;
  }
  console.log("Connected successfully to server");
  const db = client.db('koala');
  collection = db.collection("ment");
});

function read(key, from, limit, callback) {
  collection.find({ key: key }).count((err, count) => {
    if (err) {
      console.log(err);
      res.sendStatus(404);

      return;
    }
    collection.find({ key: key }, { skip: parseInt(from), limit: parseInt(limit) })
      .sort({ created_at: 1 })
      .toArray((err, comments) => {
        if (err) {
          console.log(err);
          callback(err);

          return;
        }
        callback(undefined, {
          total: count,
          results: comments.map(p => {
            return {
              _txid: p._id,
              text: p.text,
              _layer: p._layer,
              created_at: p.created_at
            }
          })
        })
      })
  })
}

watcher.on("koalament", (tx) => {
  let decodedTx = hex_decoder.decodeRawUTXO(tx.hex);
  const s = new Buffer(decodedTx.outs[0].script.split(" ").pop(), 'hex').toString('utf8');
  const splitted = s.split(" ");
  const label = splitted.shift();
  if (label !== "koalament") {
    console.log(`Unknown label ${label}`);

    return;
  }
  const layer = splitted.shift();
  if (supported_layers.indexOf(layer) === -1) {
    console.log(`Unknown layer ${layer}`);

  }
  const remained = splitted.join(" ");
  require(`./layers/${layer}`).decode(remained, (err, res) => {
    if (err) {
      console.log(err);

      return;
    }
    const data = { ...{ _layer: layer }, ...res, ...{ created_at: new Date() } };
    collection.insertOne({ ...{ _id: tx.txid }, ...data }, (err) => {
      if (err) {
        console.log(err);

        return;
      }
      supported_layers.forEach(layer_version => {
        io.sockets.emit(Buffer.from(`${data.key}_${layer_version}`).toString("base64"), { ...{ _txid: tx.txid }, ...data });
      });
    });

  });
})

var http = require('http'),
  index = "<html><body>Listening</body></html>";

var PORT = parseInt(process.env.EXPRESS_PORT);
var HOST = "0.0.0.0";


// send html content to all requests
var app = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(index);
});

var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket) {
  console.log("CLIENTS ", io.engine.clientsCount)
  console.log("User connected.");
  socket.on('read', function (input) {
    read(input.key, input.from, input.limit, (err, readResult) => {
      if (err) {
        console.log(err);
        socket.emit("error_on_read", { error: err });

        return;
      }
      socket.emit("read_answer", readResult)
    })
  });

  socket.on('disconnect', function () {
    socket.disconnect(0);
    console.log("CLIENTS ", io.sockets.clients.length)
    console.log('User disconnected');
  });
});

app.listen(PORT, HOST);

console.log('Server running at ' + HOST + ':' + PORT + '/');