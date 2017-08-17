exports.Edit = function(msg, chn, i = 0) {
  if (i > 9) i = 9;
  chn.fetchMessages({limit: 10})
    .then(messages => {
      let msgs = messages.array();
      msgs = msgs.filter(m => m.author.id === bot.user.id);
      setTimeout( () => { msgs[i].edit(msg).catch(err => {console.error(err)}) }, 50);
    });
}

exports.Supers = function(CONFIG, server) {
  let devIDs = CONFIG.devs.map(o => {
    return o.id;
  });

  let devNames = CONFIG.devs.map(o => {
    return o.name;
  });

  let admins = server.members.filter(m => {
    m.hasPermission(CONFIG[server.id].admin_perm);
  });

  return {"devIDs":devIDs,"devNames":devNames,"admins":admins};
}

//help command
exports.Help = function(bot, info, commands) {
  //return and exec different function if asking for extra help
  if(info.params[0]) return __extraHelp(bot, info, commands, info.params[0]);

  //create array for messages
  let msgArray = [];

  //generic information
  msgArray.push(`List of commands for ${bot.user.username}.`);
  msgArray.push(`Do ${prefix}help <command name> for extra help.`);

  //build each command and add it
  //set builder vars
  let commHelp = "";
  let commandsHelp = "\`\`\`\n";

  //set each command's help and add to a container var
  for(cmd in commands) {
    commHelp += `${prefix}${commands[cmd].name} `;
    if(commands[cmd].usage) commHelp += commands[cmd].usage;
    commHelp += ` - ${commands[cmd].description}\n`;
    commandsHelp += commHelp;
    commHelp = "";
  }
  commandsHelp += "\`\`\`";
  msgArray.push(commandsHelp);

  //tell user that a DM has been sent
  if(!info.dm)
    info.channel.send("<:mailbox_with_mail:273678780613132288>");
  console.log(`Sent ${info.user.username} a help DM.`)
  //send in DM to user
  msgArray.forEach(m => {
    if(info.dm) {
      info.channel.send(m);
    } else {
      info.member.send(m);
    }
  });
}

//extra help command
__extraHelp = function(bot, info, commands, cmd) {
  //return if no extra help
  if(!commands[cmd].help) return msg.reply(`${prefix}${cmd} has no extra help.`);

  //create array for messages
  let msgArray = [];

  //generic information
  msgArray.push(`Extra help for the **${prefix}${cmd}** command.`);

  //build the command and add it
  //set builder var
  let commHelp = "";

  //set the command's help and add to a container var
  commHelp += `__Usage:__\t**${prefix}${commands[cmd].name} `;
  if(commands[cmd].usage) commHelp += commands[cmd].usage;
  commHelp += "**.\n";
  commHelp += `__Description:__\t*${commands[cmd].description}*\n`;
  commHelp += `__Specifics:__\t*${commands[cmd].help}*`;
  if(commands[cmd].adminOnly) commHelp += `\n**This command is admin only.**`;

  msgArray.push(commHelp);

  console.log(`Sent ${info.user.username} a help DM for ${cmd}.`)
  //send in DM to user
  msgArray.forEach(m => {
    if(info.dm) {
      info.channel.send(m);
    } else {
      info.member.send(m);
    }
  });
}

exports.pinHelp = function(bot, info, commands) {
  var msgArray = [];
  //generic information
  msgArray.push(`Extra help for **pins**.`);

  //build the command and add it
  //set builder var
  let commHelp = "";

  //set the command's help and add to a container var
  commHelp += `__Description:__\t*${commands["pin"].description}*\n`;
  commHelp += `__Specifics:__\t*${commands["pin"].help}*`;

  msgArray.push(commHelp);

  console.log(`Sent ${info.user.username} a help DM for pins.`)
  //send in DM to user
  msgArray.forEach(m => {
    if(info.dm) {
      info.channel.send(m);
    } else {
      info.member.send(m);
    }
  });
}
