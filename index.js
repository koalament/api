const supported_layers = process.env.SUPPORTED_LAYERS.split(",");
const MongoClient = require('mongodb').MongoClient;
const watcher = require('socket.io-client')(process.env.WATCHER_HOST);
const bitcoin = require('bitcoinjs-lib');
const url = require("url");
const layers = {
  layer1: require("koalament-layers").layer1
}

let collection = null;
MongoClient.connect(process.env.MONGO_COMMENT_STORE, { useUnifiedTopology: true }, function (err, client) {
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

watcher.on("koalament", (hex) => {
  let decodedTx = undefined;
  try {
    decodedTx = bitcoin.Transaction.fromHex(hex);
  } catch (e) {
    consoleLogger.error(e);
  }
  if (!decodedTx) {
    return;
  }
  const hexSplitted = bitcoin.script.toASM(decodedTx.outs[0].script).toString().split(" ");
  if (hexSplitted.length < 2) {
    return;
  }
  const splitted = new Buffer(hexSplitted[2], "hex").toString("utf8").split(" ");
  const label = splitted.shift();
  if (label !== "koalament") {
    return;
  }
  const layer = splitted.shift();
  if (supported_layers.indexOf(layer) === -1) {
    console.log(`Unknown layer ${layer}`);
    return;
  }
  const remained = splitted.join(" ");
  layers[`layer${layer}`].decode(remained, (err, res) => {
    if (err) {
      console.log(err);

      return;
    }
    const data = { ...{ _layer: layer }, ...res, ...{ created_at: new Date() } };
    collection.insertOne({ ...{ _id: decodedTx.getId() }, ...data }, (err) => {
      if (err) {
        console.log(err);

        return;
      }
      supported_layers.forEach(layer_version => {
        console.log({ ...{ _txid: decodedTx.getId() }, ...data })
        const emit_data = { ...{ _txid: decodedTx.getId() }, ...data };
        io.sockets.emit(Buffer.from(`${data.key}_${layer_version}`).toString("base64"), emit_data);
        io.sockets.emit(Buffer.from(`site:${url.parse(data.key).host}_${layer_version}`).toString("base64"), emit_data);
        io.sockets.emit(Buffer.from(`site:all_${layer_version}`).toString("base64"), emit_data);
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