//discord.js API
const Discord = require("discord.js");
//menu client
const MenuClient = require('./src/client');
//this bot client
const bot = new MenuClient();
//config file
const CONFIG = require('./res/config.json');
//pinboard handling
const Pinboard = require('./src/pinboard/Pinboards');
var pinboards = new Map();
//useful commands
const Util = require('./src/util/Utils');

/*
*   ====================
*   Commands
*   ====================
*/

const commands = {
  "purge":{
    name:"purge",
    description:"Deletes messages.",
    help:"Deletes a specified number of messges (default=50, max=300) from the current \
channel.",
    usage:"[number]",
    adminOnly:true,
    process: function(bot, info) {
      let n = parseInt(info.params[0]) || 50;
      if (n > 300) n = 300;
      info.channel.bulkDelete(++n, true)
        .then(msgs => {
          console.log(`${msgs.size - 1} msgs`)
        })
        .catch(console.error);
    }
  },
  "eval":{
    name:"eval",
    description:"Evaluates JavaScript.",
    help:"Evaluates the parameter text as real JavaScript.",
    usage:"<JavaScript>",
    adminOnly:true,
    process: function(bot, info) {
      try {
        var code = info.params.join(" ");
        var evaled = eval(code);

        if (typeof evaled !== "string") evaled = require("util").inspect(evaled);

        info.msg.reply(
              "\`\`\`js\n" +
              "--- in ---\n" +
              code + "\n" +
              "--- out ---\n" +
              evaled + "\n" +
              "\`\`\`"
        ).then(() => {
          info.msg.delete().catch(console.error);
        }).catch(console.error);

      } catch(err) {
        info.msg.reply(`\`${err}\``)
        .then(msg => {
          info.msg.delete().catch(console.error);
          msg.delete(10000).catch(console.error);
        }).catch(console.error);
      }
    }
  },
  "pin":{
    name:"pin",
    description:"Information on the pinboard system.",
    help:"This pinboard system was built from scratch, by Mundane. Currently \
there are two boards: the suggestion board and the help board. The help board's \
shortcut is ❓, and the suggestion's is ❗. Reacting to a message with one of \
these emoji will add it to the board, if it meets certain criteria. For example, \
the message must have at least 5 people also calling for it to be pinned (by \
reacting). Helpers can instantly pin a message to a board, and they can also \
resolve help or suggestion requests.",
    process: function(bot, info) {
      Util.pinHelp(bot, info, commands);
    }
  }
}

/*
*   ====================
*   Message Handling
*   ====================
*/

bot.on('message', msg => {
  //don't respond to own messages
  if(msg.author === bot.user) return;

  //check for prefix
  prefix = CONFIG.prefix;
  if(!msg.content.startsWith(prefix)) return;

  //store the input command
  const cmd = msg.content.split(' ')[0].substr(1).toLowerCase();

  //check if the command is "#help"
  if(cmd == "help")
    return Util.Help(bot, {"params":msg.content.split(' ').slice(1),
    "channel":msg.channel,"user":msg.author,"member":msg.member,
    "dm":msg.channel.type == "dm"}, commands);

  //check if in DMs
  if(msg.channel.type == "dm") return msg.reply("Commands only function in a\
  server.");

  //create an object of useful information
  const info = {
    "msg":msg,
    "content":msg.content.toLowerCase(),
    "params":msg.content.split(' ').slice(1),
    "mentions":msg.mentions.users.array(),
    "server":msg.guild,
    "channel":msg.channel,
    "user":msg.author,
    "member":msg.member,
    "uid":msg.author.id
  }

  //check if the input is a valid command
  if(commands[cmd] === undefined) return msg.reply(`that's not a valid command. Do\
\`${prefix}help\` for a list of valid commands.`);

  //check if the chosen command is adminOnly
  //get superusers
  const admins = Util.Supers(CONFIG, info.server).admins;
  const devs = Util.Supers(CONFIG, info.server).devIDs;
  if(commands[cmd].adminOnly && !admins.has(info.uid) && !devs.includes(info.uid))
    return msg.reply(`you have insufficient permissions to access the command\
${prefix}${cmd}.`);

  //check if param is required and missing
  if(commands[cmd].requiresParam && !info.params[0])
    return msg.reply(`${prefix}${cmd} requires a parameter. Do ${prefix}help\
${cmd} for additional help.`);

  //if all else passes correctly, execute the command
  commands[cmd].process(bot, info);
  console.log(`${info.server.name}#${info.channel.name}: ${info.user.tag} did ${commands[cmd].name}`);
});

/*
*   =========================
*   Reaction Handling (Pinboard)
*   =========================
*/

bot.on('messageReactionAdd', (rxn, user) => {
  var boards = CONFIG[rxn.message.guild.id].boards;
  if (!boards) return;
  pinboards.get(rxn.message.guild.id).Add(rxn);

  bot.MenuManager.Handle(user, rxn);
});

bot.on('messageReactionRemove', (rxn, user) => {
  var boards = CONFIG[rxn.message.guild.id].boards;
  if (!boards) return;
  pinboards.get(rxn.message.guild.id).Remove(rxn);
});

/*
*   ========================
*   Bot Initialisation
*   ========================
*/

bot.on('ready', () => {
  bot.guilds.array().forEach(guild => {
    var boards = CONFIG[guild.id].boards;
    if (boards)
      pinboards.set(guild.id, new Pinboard.PinManager(bot, guild, boards));
  });

bot.user.setGame(`do ${CONFIG.prefix}help`)

  console.log(`Ready to serve in ${bot.channels.size} channels on \
${bot.guilds.size} servers, for a total of ${bot.users.size} users.`);
});

bot.login(CONFIG.token);
