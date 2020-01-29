const valid_methods = [0];
function decode(input, callback) {
  if (!input) {
    callback(new Error(`Unknown input ${input}`));

    return;
  }
  if (input === "") {
    callback(new Error(`Empty input ${input}`));

    return;
  }
  if (input.trim() === "") {
    callback(new Error(`Empty input ${format}`));

    return;
  }
  let splitted = input.split(" ");
  const format = splitted.shift();
  if (["plain", "gzip"].indexOf(format) === -1) {
    callback(new Error(`Unknown format ${format}`));

    return;
  }

  require(`../../formats/${format}`).decode(splitted.pop(), (err, data) => {
    if (err) {
      console.log(err);
      callback(err);

      return;
    }
    splitted = data.split(" ");
    const method = parseInt(splitted.shift());
    if (valid_methods.indexOf(method) === -1) {
      console.log(`Unknown method ${method}`);
      callback(new Error(`Unknown method ${method}`));

      return;
    }
    const json = JSON.parse(splitted.join(" "));
    switch (method) {
      case 0: {
        if (json.key && json.text) {
          callback(undefined, { ...{ _method: method }, ...json });

          return;
        }
        callback(new Error(`No pass required data! ${JSON.stringify(json)}`))
      }; break;
      default: {
        callback(new Error(`Unknown method ${method}`))
      }
    }
  });
}

module.exports = {
  decode: decode
}