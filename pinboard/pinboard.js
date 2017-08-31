const CONFIG = require('../config.json');
const FS = require('fs');
const Discord = require('discord.js');
const RC = require('reaction-core');

class Pinboard {
  constructor(client, server, data) {
    Object.defineProperty(this, 'client', {value:client});
    Object.defineProperty(this, 'name', {value:data.name});
    Object.defineProperty(this, 'server', {value:server});
    let channel = this.server.channels.get(data.channel);
    Object.defineProperty(this, 'channel', {value:channel});
    Object.defineProperty(this, 'reaction', {value:data.reaction});
    Object.defineProperty(this, 'min', {value:data.min});
    Object.defineProperty(this, 'adminInsta', {value:data.adminInsta});

    this.caches = JSON.parse(FS.readFileSync(`${__dirname}/cache.json`, 'utf-8'))[this.name];
  }

  Update(rxnMsg) {
    //the message reacted to
    var msg = rxnMsg.message;
    //the number of reactions of one type
    var count = rxnMsg.count;
    //check if that pin already exists
    var pin = Fetch(this, msg.id);
    //remove the pin (simulates 'bumping')
    if (pin) this.Remove(msg);
    //if the number of reactions is high enough, add a new pin
    if (count >= this.min) this.Add(msg, count);
    //also, if an admin has reacted and the settings are right, pin anyway
    if (this.adminInsta && AdminReacted(this, rxnMsg)) this.Add(msg, count);
  }

  Add(msg, count) {
    //create a pin of the message
    var pin = CreatePin(this, msg, count);
    //make sure the pin worked
    if (pin) {
      //send the pin
      pin.Send()
        .then(p => {
          //cache the pin
          this.caches.push({"msg":msg.id,"pin":p.id});
          //save the cache
          Save(this);
        }).catch(console.error);
    }
  }

  Remove(msg) {
    //get the pin from the cache
    var pin = Fetch(this, msg.id, true);
    //make sure the pin exists
    if (!pin) return;
    //delete the pin
    pin.delete().then().catch(console.error);
    //save the cache
    Save(this);
  }
}
module.exports = Pinboard;

function Fetch(pinboard, id, uncache = false) {
  //get the cached pin info
  var cache = pinboard.caches.find(m => m.msg == id);
  var pin;

  //get the pin
  if (cache) pin = pinboard.channel.messages.get(cache.pin);
  else pin = null;

  //if the pin is to be uncached, do it
  if (uncache) {
    var index = pinboard.caches.indexOf(cache);
    if (index > -1) pinboard.caches.splice(index, 1);
  }

  return pin;
}

function Save(pinboard) {
  //grab the ubercache
  var supercache = JSON.parse(FS.readFileSync('./src/pinboard/cache.json', 'utf-8'));
  //relocate the current cache (fixes the JSON becoming circular)
  var temp = pinboard.caches;
  //write the cache to the ubercache
  supercache[pinboard.name] = temp;
  //store the ubercache
  FS.writeFile('./src/pinboard/cache.json', JSON.stringify(supercache), console.error);
}

function CreatePin(pinboard, msg, count) {
  if (!count) return;
  var pin = new Discord.RichEmbed();
  pin.setTitle("Query");
  pin.setAuthor(`${pinboard.reaction} x ${count}`);
  pin.setDescription(msg.content);
  pin.addField("Message ID: ", msg.id, true);
  pin.addField("Channel ID: ", msg.channel.id, true);
  pin.setTimestamp(msg.createdAt);
  pin.setFooter(msg.author.tag, msg.author.displayAvatarURL);
  if (count > 50) pin.setColor(0xf74a47);
  else if (count > 25) pin.setColor(0xf79647);
  else if (count > 10) pin.setColor(0xf7df47);
  else pin.setColor(0xb0f747);

  //create a menu message
  menuPin = new RC.Message(pinboard.client, pin, pinboard.channel, true);
  //add a pinboard menu
  menuPin.AddMenu(MenuItems, {board: pinboard});
  return menuPin;
}

function AdminReacted(pinboard, rxnMsg) {
  var server = rxnMsg.message.guild;
  var reactors = rxnMsg.fetchUsers(pinboard.min);
  //check for admin_perm
  return server.members.filter(m => {
    m.hasPermission(CONFIG[server.id].admin_perm)
  }).filter(m => { reactors.has(m.id) });
}

const MenuItems = [
  {emoji: '✅', Callback: (user, client, message, args = undefined) => {
    //Get the pinboard of the pin
    var pinboard = args.board;
    //Turn the original embed into a sendable embed (identical)
    var embed = ToEmbed(message.embeds[0]);
    //send the embed and then a resolve request to the resolving user
    user.send({embed: embed}).catch(console.error);
    user.send("Please enter a response for this message, beginning with the \
keyword \"RESOLVE\": ");
    client.on('message', res => {
      var response = res.content;
      //resolving message must begin with 'RESOLVE'
      if (response.startsWith('RESOLVE')) {
        //delete the pin
        message.delete().then(msg => {
          //removes the message from the cache
          Fetch(pinboard, msg.id, true);
          //get the original message (that begun the query)
          var orgChn = msg.guild.channels.get(embed.fields[1].value);
          var orgMsg = orgChn.messages.get(embed.fields[0].value);
          var orgUser = orgMsg.author;
          //inform the user of his message being resolved
          orgUser.send(orgMsg.content).catch(console.error);
          orgUser.send("This has been resolved with the following message: ")
            .catch(console.error);
          orgUser.send(response.substring(8)).catch(console.error);
          //delete the original message
          orgMsg.delete(50).catch(console.error);
        }).catch(console.error);
      }
    });
  }}
];

function ToEmbed(msgEmbed) {
  var embed = new Discord.RichEmbed();
  embed.setTitle("Query");
  embed.setAuthor(msgEmbed.author.name);
  embed.setDescription(msgEmbed.description);
  msgEmbed.fields.forEach(field => {
    embed.addField(field.name, field.value, field.inline);
  });
  embed.setTimestamp(msgEmbed.createdAt);
  embed.setFooter(msgEmbed.footer.text, msgEmbed.footer.iconURL);
  embed.setColor(msgEmbed.color);
  return embed;
}
