const Pinboard = require('./pinboard');

class PinManager {
  constructor(client, server, pinboards) {
    this.pinboards = new Map();
    pinboards.forEach(board => {
      var pinboard = new Pinboard(client, server, board);
      this.pinboards.set(pinboard.reaction, pinboard);
    });
  }

  Add(msg) {
    var pinboard = this.pinboards.get(msg.emoji.toString());
    if (pinboard) {
      pinboard.Update(msg);
    }
  }

  Remove(msg) {
    var pinboard = this.pinboards.get(msg.emoji.toString());
    if (pinboard) {
      var count = msg.count;
      pinboard.Update(msg, count);
    }
  }
}
module.exports = PinManager;
