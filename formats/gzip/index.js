const { gzip, ungzip } = require('node-gzip');
function encode(input, callback) {
  gzip(Buffer.from(input, "utf-8"))
    .then(compressed => {
      callback(undefined, compressed.toString("hex"))
    }).catch(callback)
}

function decode(input, callback) {
  console.log(input)
  ungzip(Buffer.from(input, "base64")).then((decompressed) => {
    callback(undefined, decompressed.toString("utf8"));
  }).catch(callback)
}

module.exports = {
  encode: encode,
  decode: decode
}