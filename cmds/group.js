/* 
 * Copyright © 2025 Mirage
 * This file is part of Kord and is licensed under the GNU GPLv3.
 * And I hope you know what you're doing here.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file or https://www.gnu.org/licenses/gpl-3.0.html
 * -------------------------------------------------------------------------------
 */

const {
  kord,
  wtype,
  extractUrlsFromString,
  isAdmin,
  isadminn,
  isBotAdmin,
  getData,
  storeData,
  parsedJid,
  sleep,
  prefix,
  getMeta,
  isUrl,
  config
} = require("../core")
const { warn } = require("../core/db")
const pre = prefix 
const os = require("os");
const http = require("http");


kord({
cmd: "join",
  desc: "join a group using it's link",
  fromMe: true,
  type: "group",
}, async (m, text) => {
  try {
    var links = extractUrlsFromString(text || m.quoted?.text)
    if (links.length === 0) return await m.send("✘ Provide a WhatsApp group link")
    const linkRegex= /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
  const code = links.find(link => linkRegex.test(link))?.match(linkRegex)?.[1];
  if (!code) return await m.send("✘ Invalid invite link")
  try {
    const joinResult = await m.client.groupAcceptInvite(code);
    if (joinResult) return await m.send('```✓ Joined successfully!```');
    return await m.send(`_*✘ Failed to join group*_`)
  } catch (error) {
    return await m.send("✘ " + error.message)
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "leave|left",
  desc: "leave a group",
  gc: true,
  fromMe: true,
  type: "group",
}, async (m, text) => {
  try {
    await m.client.groupLeave(m.chat)
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "gpp|setgcpp",
  desc: "set a group profile pic",
  gc: true,
  adminOnly: true,
  fromMe: wtype,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    if (text && text === "remove") {
    await m.client.removeProfilePicture(m.chat);
    return await m.send("```✓ Group Profile Picture Removed```");
    }
    if (!m.quoted?.image) return await m.send("✘ Reply to an image")
    var media = await m.quoted.download()
    await m.client.updateProfilePicture(m.chat, media);
    return await m.send("```✓ Group Profile Picture Updated```")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "gname|setgcname",
  desc: "set a group name(subject)",
  gc: true,
  adminOnly: true,
  fromMe: wtype,
  type: "group",
}, async (m, text, cmd) => {
  try {
    var name = text || m.quoted?.text
    if (!name) return await m.send(`_*✘ Provide a name to set!*_\n_Example: ${cmd} New Group Name_`)
    const meta = await m.client.groupMetadata(m.chat);
    var botAd = await isBotAdmin(m);
    if (meta.restrict && !botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    await m.client.groupUpdateSubject(m.chat, name)
    return await m.send("```✓ Group Name Updated```")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "gdesc|setgcdesc",
  desc: "set a group description",
  gc: true,
  adminOnly: true,
  fromMe: wtype,
  type: "group",
}, async (m, text, cmd) => {
  try {
    var desc = text || m.quoted?.text
    if (!desc) return await m.send(`_*✘ Provide a description to set*_\n_Example: ${cmd} Group rules and information..._`)
    const meta = await m.client.groupMetadata(m.chat);
    var botAd = await isBotAdmin(m);
    if (meta.restrict && !botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    await m.client.groupUpdateDescription(m.chat, desc)
    return await m.send("```✓ Description Updated```")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "add",
  desc: "add a user to group",
  gc: true,
  fromMe: wtype,
  type: "group",
}, async (m, text, cmd) => {
  const meta = await m.client.groupMetadata(m.chat);
  var botAd = await isBotAdmin(m);
  if (meta.restrict && !botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
  
  if (!text && !m.quoted?.sender) return await m.send(`_*✘ Reply to user or provide number*_\n_Example: ${cmd} 23412345xxx_`);
  
  const user = text || m.quoted?.sender
const cleanNumber = (user.includes('@') ? user.split('@')[0] : user).replace(/\D/g, '') + '@s.whatsapp.net'
  const userInfo = await m.client.onWhatsApp(cleanNumber);
  
  if (!userInfo.length) return await m.send('_✘ User is not on WhatsApp_');
  
  try {
    const result = await m.client.groupParticipantsUpdate(m.chat, [cleanNumber], "add");
    const status = result[0].status;
    
    if (status === '403') {
      await m.send('_✘ Unable to add user_\n_Sending invite..._');
      return await m.sendGroupInviteMessage(cleanNumber);
    } else if (status === '408') {
      await m.send("_✘ User recently left, try later_");
      const code = await m.client.groupInviteCode(m.chat);
      return await m.client.sendMessage(cleanNumber, { text: `https://chat.whatsapp.com/${code}` });
    } else if (status === '401') {
      return await m.send('_✘ Bot is blocked by the user_');
    } else if (status === '200') {
      return await m.send(`_*✓ @${cleanNumber.split('@')[0]} Added*_`, { mentions: [cleanNumber] });
    } else if (status === '409') {
      return await m.send("_✘ User already in group_");
    }
    return await m.send("✘ " + JSON.stringify(result));
  } catch (error) {
    return await m.send("✘ " + error.message);
  }
})

kord({
cmd: "kick",
  desc: "remove a member from group",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    
    var user = m.mentionedJid[0] || m.quoted?.sender || text
    
    if (!user) return await m.send("_✘ Reply to or mention a member_");
    
    user = (user.includes('@') ? user.split('@')[0] : user).replace(/\D/g, '') + '@s.whatsapp.net'
    
    if (text === "all") {
    var res = await m.send("_✘ Reply \"confirm\" to continue_")
    var response = await m.getResponse(res, 10000)
    if (response.text.toLowerCase() === "confirm") {
    await m.send("_*✓ Kicking all users in 10 seconds*_\n_Use restart command to cancel_")
    await sleep(10000)
    let { participants } = await m.client.groupMetadata(m.chat);
    participants = participants.filter(p => p.jid !== m.user.jid);
    for (let key of participants) {
    const jid = parsedJid(key.jid);
    await m.client.groupParticipantsUpdate(m.chat, [jid], "remove");
    if (config().KICK_AND_BLOCK) await m.client.updateBlockStatus(jid, "block");
    await m.send(`_*✓ @${jid[0].split("@")[0]} kicked*_`, { mentions: [jid] });
      }
    }
  } else {
    const jid = parsedJid(user);
    await m.client.groupParticipantsUpdate(m.chat, [jid], "remove");
    if (config().KICK_AND_BLOCK) await m.client.updateBlockStatus(jid, "block");
    await m.send(`_*✓ @${jid.split("@")[0]} kicked*_`, { mentions: [jid] });
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "promote",
  desc: "promote a member to admin",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    var user = m.mentionedJid[0] || m.quoted?.sender || text
    if (!user) return await m.send("_✘ Reply to or mention a member_")
    if(await isadminn(m, user)) return await m.send("✘ Member is already admin")
    let jid = parsedJid(user);
    await m.client.groupParticipantsUpdate(m.chat, [jid], "promote");
    return await m.send(`_*✓ @${jid.split("@")[0]} promoted*_`, { mentions: [jid] });
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "demote",
  desc: "demote an admin to member",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    var user = m.mentionedJid[0] || m.quoted?.sender || text
    if (!user) return await m.send("✘ Reply to or mention an admin")
    if(!await isadminn(m, user)) return await m.send("✘ Member is not admin")
    let jid = parsedJid(user);
    await m.client.groupParticipantsUpdate(m.chat, [jid], "demote");
    return await m.send(`✓ @${jid.split("@")[0]} demoted`, { mentions: [jid] });
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "mute",
  desc: "mute a group to allow only admins to send message",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group"
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    await m.client.groupSettingUpdate(m.chat, "announcement");
    return await m.send("✓ Group Muted");
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "unmute",
  desc: "unmute a group to allow all members to send message",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group"
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    await m.client.groupSettingUpdate(m.chat, "not_announcement");
    return await m.send("✓ Group Unmuted");
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "invite|glink",
  desc: "get group link",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    const code = await m.client.groupInviteCode(m.chat);
    return await m.send(`https://chat.whatsapp.com/${code}`);
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "revoke",
  desc: "reset group link",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    await m.client.groupRevokeInvite(m.chat);
    const newCode = await m.client.groupInviteCode(m.chat);
    return await m.send(`✓ Link Revoked\nNew Link: https://chat.whatsapp.com/${newCode}`);
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "tag",
  desc: "tag all memebers/admins/me/text",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group"
}, async (m, text, cmd, store) => {
  try {
    if (!m.isGroup) return await m.send(`@${m.sender.split("@")[0]}`, { mentions: [m.sender] });   
  const { participants } = await m.client.groupMetadata(m.chat);
  let admins = participants.filter(v => v.admin !== null).map(v => v.jid);
  let msg = "";
  
  if (text === "all" || text === "everyone") {
    participants.forEach((p, i) => {
      msg += `❐ ${i + 1}. @${p.jid.split('@')[0]}\n`;
    });
    await m.send(msg, { mentions: participants.map(a => a.jid) });
  } 
  else if (text === "admin" || text === "admins") {
    admins.forEach((admin, i) => {
      msg += `❐ ${i + 1}. @${admin.split('@')[0]}\n`;
    });
    return await m.send(msg, { mentions: admins });
  } 
  else if (text === "me" || text === "mee") {
    return await m.send(`@${m.sender.split("@")[0]}`, { mentions: [m.sender] });
  } 
  else if (text) {
    const message = text || m.quoted.text;
    return await m.send(message, { mentions: participants.map(a => a.jid) });
  } 
  else if (m.quoted) {
    return await m.forwardMessage(
            m.chat,
            await store.findMsg(m.quoted.id),
            { contextInfo: { mentionedJid: participants.map(a => a.jid) }, quoted: m }
        );
  } else { 
  return await m.send(`✘ Usage:\ntag all\ntag admins\ntag me\ntag <message>\ntag (reply to message)`);
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "tagall",
  desc: "tag all memebers",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group"
}, async (m, text) => {
  try {
    const { participants } = await m.client.groupMetadata(m.chat);
    let admins = participants.filter(v => v.admin !== null).map(v => v.jid);
    let msg = `❴ ⇛ *TAGALL* ⇚ ❵\n*Message:* ${text ? text : "blank"}\n*Caller:* @${m.sender.split("@")[0]}\n\n`
    participants.forEach((p, i) => {
    msg += `❧ ${i + 1}. @${p.jid.split('@')[0]}\n`; 
    });
    await m.send(msg, { mentions: participants.map(a => a.jid) });
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
  cmd: "creategc",
  desc: "create a group",
  fromMe: true,
  type: "group",
}, async (m, text) => {
  const groupName = text || m.pushName;
  if (!m.quoted?.sender && !m.mentionedJid?.[0]) return m.reply("✘ Reply to or mention a user");
  try {
    const group = await m.client.groupCreate(groupName, [m.quoted?.sender || m.mentionedJid[0], m.sender]);
    const inviteCode = await m.client.groupInviteCode(group.id);
    return await m.send(`✓ Group created\nLink: https://chat.whatsapp.com/${inviteCode}`);
  } catch (error) {
    return await m.send("✘ " + error.message);
  }
})

kord({
cmd: "lock",
  desc: "make only admins can modify group settings",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    const meta = await m.client.groupMetadata(m.chat)
    if (meta.restrict) return await m.send("✘ Group settings already admin-only");
    await m.client.groupSettingUpdate(m.chat, 'locked')
    return await m.send("✓ Group settings now admin-only");
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "unlock",
  desc: "allow all members to modify group settings",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_");
    const meta = await m.client.groupMetadata(m.chat)
    if (!meta.restrict) return await m.send("✘ Group settings already unlocked");
    await m.client.groupSettingUpdate(m.chat, 'unlocked')
    return await m.send("✓ All members can now modify group settings");
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "ginfo",
  desc: "get group info of a group",
  fromMe: wtype,
  type: "group",
}, async (m, text) => {
  if (!text && m.isGroup) {
    var link;
    try {
      link = `https://chat.whatsapp.com/${await m.client.groupInviteCode(m.chat)}`;
    } catch (error) {
      return await m.send("✘_*Bot Needs To Be Admin!*_");
    }
  }
  var links = extractUrlsFromString(text || m.quoted?.text)
  if (links.length === 0) return await m.send("✘ Provide a WhatsApp group link")
  const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i;
  link = links.find(l => linkRegex.test(l));
  
  const code = link.match(linkRegex)[1];
  const currentTime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  try {
    const groupInfo = await m.client.groupGetInviteInfo(code);
    const memberCount = groupInfo.size || 0;
    const maxParticipants = groupInfo.maxParticipants || 257;
    const pic = await m.client.profilePicUrl(m.chat, "image")
    
    const response = `*╭─❑ 『 GROUP INFORMATION 』 ❑─╮*
├ ➨ *Name:* ${groupInfo.subject}
├ ➨ *Owner:* ${groupInfo.owner ? '@' + groupInfo.owner.split('@')[0] : 'Unknown'}
├ ➨ *Members:* ${memberCount}/${maxParticipants}
├ ➨ *Created:* ${new Date(groupInfo.creation * 1000).toLocaleString()}
├ ➨ *Restricted:* ${groupInfo.restrict ? '✘ Yes' : '✓ No'}
├ ➨ *Announced:* ${groupInfo.announce ? '✘ Yes' : '✓ No'}
├ ➨ *Ephemeral:* ${groupInfo.ephemeralDuration ? `✓ ${groupInfo.ephemeralDuration/86400} days` : '✘ Off'}
├ ➨ *Group ID:* ${groupInfo.id}
├ ➨ *Join Approval:* ${groupInfo.membershipApprovalMode ? '✓ Required' : '✘ Not Required'}
${groupInfo.desc ? `├ ➨ *Description:* \n${groupInfo.desc}\n` : ''}
├────────────────
├ ✎ *Fetched by:* @${m.sender.split('@')[0]}
├ ✎ *Time:* ${currentTime} UTC
╰────────────────✧`;

    await m.send(pic, { 
      mentions: [...(groupInfo.owner ? [groupInfo.owner] : []), m.sender],
      caption: response,
      contextInfo: {
        externalAdReply: {
          title: "Group Info",
          body: groupInfo.subject,
          thumbnailUrl: groupInfo.imageUrl || "",
          sourceUrl: link,
          mediaType: 1
        }
      }
    }, "image");
  } catch (error) {
    await m.send("✘ Error fetching group info:\n" + error.message);
  }
})


kord({
  cmd: "antibot",
  desc: "set action to be done when a visitor bot messaes in group",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m);
  if (!botAd) return await m.send("✘_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ");
  if (args && args.length > 0) {
  const option = args[0].toLowerCase();
  const value = args.length > 1 ? args[1] : null;
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antibot_config");
      if (!Array.isArray(sdata)) sdata = [];
  let isExist = sdata.find(entry => entry.chatJid === chatJid);
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3"
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antibot_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiBot Is Now Enabled!*_\n_Action:_ delete`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3"
      }
       if (isExist) {
      isExist.action = "kick"
    } else {
      sdata.push(kikc)
    }
    await storeData("antibot_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiBot Is Now Enabled!*_\n_Action:_ kick`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}antibot warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
    } else {
      sdata.push(warnco)
    }
    await storeData("antibot_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiBot Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}`)
    } else if (option === "status") {
      if (!isExist) return await m.send("_AntiBot is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-BOT STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiBot is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antibot_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiBot disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiBot config ] \`\`\`
_${pre}antibot delete_
_${pre}antibot kick_
_${pre}antibot warn 3_
_${pre} antibot status_
_${pre}antibot off_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available AntiBot config ] \`\`\`
_${pre}antibot delete_
_${pre}antibot kick_
_${pre}antibot warn 3_
_${pre} antibot status_
_${pre}antibot off_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us');
    if (isGroup) {
    var botAd = await isBotAdmin(m);
    if (!botAd) return;
    
    if(m.message.reactionMessage) return;
    const cJid = m.key.remoteJid
    const groupMetadata = await getMeta(m.client, m.chat);
    const admins =  groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid);
    const wCount = new Map()
    if ((m.isBot || m.isBaileys) && !m.fromMe) {
    var sdata = await getData("antibot_config");
    if (!Array.isArray(sdata)) return;
    let isExist = sdata.find(entry => entry.chatJid === cJid);
    if (isExist && !admins.includes(m.sender)) {
    var act = isExist.action
    if (act === "del") {
    await m.send(m, {}, "delete")
      return await m.send(`_*Bots are not Allowed!!*_`)
    } else if (act === "kick") {
      await m.send(m, {}, "delete")
      await m.send(`_*Bots are not Allowed!!*_\n_Goodbye!!_`)
      await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
    } else if (act === "warn") {
      var cCount = (wCount.get(cJid) || 0) + 1
      wCount.set(cJid, cCount)
      var maxC = isExist.maxwrn
      
      var remain = maxC - cCount
      if (remain > 0) {
        var rmsg = `_*Bots are not Allowed!!*_
_You are warned!_
Warning(s): (${cCount}/${maxC})`
      await m.send(`${rmsg}`)
      await m.send(m, {}, "delete")
      }
      if (cCount >= maxC) {
        await m.send(m, {}, "delete")
        await m.send(`_*Max Warning Exceeded!!*_\n_Goodbye!!!_`)
        await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
        wCount.delete(cJid)
      }
    }
  }
  } else return;
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})



kord({
cmd: "events|gcevent|grpevents",
  desc: "manage group events settings",
  gc: true,
  adminOnly: true,
  fromMe: wtype,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m)
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_")
    
    var gdata = await getData('group_events') || {}
    const jid = m.chat
    
    const defaultWelcome = config().WELCOME_MSG || `╭━━━々 𝚆 𝙴 𝙻 𝙲 𝙾 𝙼 𝙴 々━━━╮
┃ ➺ *々 Welcome @user! to @gname*
┃ ➺ *々 Members: @count*
┃ ➺ We Hope You Have A Nice Time Here!
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    
    const defaultGoodbye = config().GOODBYE_MSG || `╭━━━々 𝙶 𝙾 𝙾 𝙳 𝙱 𝚈 𝙴 々━━━╮
┃ ➺ *々 @user! left @gname!*
┃ ➺ *々 Members: @count*
┃ ➺ We Hope He/She Had A Nice Time Here!
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    
    gdata[jid] = gdata[jid] || {
      events: false,
      add: false,
      remove: false,
      promote: false,
      demote: false,
      antipromote: false,
      antidemote: false,
      welcome: defaultWelcome,
      goodbye: defaultGoodbye
    }
    
    var parts = text.split(" ")
    var cmd = parts[0]?.toLowerCase()
    var value = parts[1]?.toLowerCase()
    
    if (!cmd) {
      let status = gdata[jid].events ? "enabled" : "disabled"
      return await m.send(`*_Group Events Settings_*
_*Usage:*_
_events on/off - Enable/disable all events_
_events clear - clear the group events settings_
_events welcome on/off - Toggle welcome messages_
_events goodbye on/off - Toggle goodbye messages_
_events promote on/off - Toggle promotion alerts_
_events demote on/off - Toggle demotion alerts_
_events antipromote on/off - Toggle anti-promotion_
_events antidemote on/off - Toggle anti-demotion_
_events setwelcome text - Set welcome message_
_events setgoodbye text - Set goodbye message_

*Available Variables:*
@user or &user - Username
@gname or &gname - Group name  
@gdesc or &gdesc - Group description
@count or &count - Member count
@time or &time - Current time
@pp or &pp - Include profile picture
@ad or &ad - Include external ad reply`)
    }
    
    if (cmd === "on" || cmd === "enable") {
      gdata[jid].events = true
      gdata[jid].add = true
      gdata[jid].remove = true
      gdata[jid].promote = true
      gdata[jid].demote = true
      gdata[jid].antipromote = true
      gdata[jid].antidemote = true
      gdata[jid].welcome = defaultWelcome
      gdata[jid].goodbye = defaultGoodbye
      await storeData('group_events', gdata)
      return await m.send("✓ Group events notifications enabled with default messages")
    }
    
    if (cmd === "off" || cmd === "disable") {
      gdata[jid].events = false
      await storeData('group_events', gdata)
      return await m.send("✓ Group events notifications disabled")
    }
    
    if (cmd === "clear") {
      delete gdata[jid]
      await storeData('group_events', gdata)
      return await m.send("✓ Group events notifications cleared")
    }
    
    if (cmd === "status") {
      return await m.send(`*Events Status:* ${gdata[jid].events ? "on" : "off"}
*Welcome:* ${gdata[jid].add ? "on" : "off"}
*Goodbye:* ${gdata[jid].remove ? "on" : "off"}
*Promote:* ${gdata[jid].promote ? "on" : "off"}
*Demote:* ${gdata[jid].demote ? "on" : "off"}
*Anti-Promote:* ${gdata[jid].antipromote ? "on" : "off"}
*Anti-Demote:* ${gdata[jid].antidemote ? "on" : "off"}`)
    }
    
    if (cmd === "welcome") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].add = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Welcome messages turned ${value}`)
    }
    
    if (cmd === "goodbye") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].remove = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Goodbye messages turned ${value}`)
    }
    
    if (cmd === "promote") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].promote = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Promotion alerts turned ${value}`)
    }
    
    if (cmd === "demote") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].demote = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Demotion alerts turned ${value}`)
    }
    
    if (cmd === "antipromote") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].antipromote = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Anti-promotion ${value === "on" ? "enabled" : "disabled"}`)
    }
    
    if (cmd === "antidemote") {
      if (value !== "on" && value !== "off") return await m.send("✘ Please specify on or off")
      gdata[jid].antidemote = value === "on" ? true : false
      await storeData('group_events', gdata)
      return await m.send(`✓ Anti-demotion ${value === "on" ? "enabled" : "disabled"}`)
    }
    
    if (cmd === "setwelcome") {
      let newMsg = text.replace(cmd, "").trim()
      if (!newMsg) return await m.send(`✘ Provide the welcome message text

*Available Variables:*
@user or &user - Username
@gname or &gname - Group name
@gdesc or &gdesc - Group description  
@count or &count - Member count
@time or &time - Current time
@pp or &pp - Include profile picture
@ad or &ad - Include external ad reply`)
      gdata[jid].welcome = newMsg
      await storeData('group_events', gdata)
      return await m.send("✓ Welcome message updated\n\n" + newMsg)
    }
    
    if (cmd === "setgoodbye") {
      let newMsg = text.replace(cmd, "").trim()
      if (!newMsg) return await m.send(`✘ Provide the goodbye message text

*Available Variables:*
@user or &user - Username
@gname or &gname - Group name
@gdesc or &gdesc - Group description
@count or &count - Member count
@time or &time - Current time
@pp or &pp - Include profile picture
@ad or &ad - Include external ad reply`)
      gdata[jid].goodbye = newMsg
      await storeData('group_events', gdata)
      return await m.send("✓ Goodbye message updated\n\n" + newMsg)
    }
    
    return await m.send("✘ Invalid option. Use 'events' without parameters to see available commands.")
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
cmd: "antilink",
  desc: "automactically delete links in group",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text, c) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    var data = await getData("antilink") || {}
    data[m.chat] = data[m.chat] || {
    active: false,
    action: null,
    warnc: 0,
    permitted: []
    }
    var parts = text.split(" ");
    var cmd = parts[0]?.toLowerCase();
    var value = parts[1]?.toLowerCase();
    var isActive = data[m.chat].active
    if (!cmd) {
    return await m.send(
    `\`\`\`┌─────────❖
│▸ ANTILINK CONFIG
└─────────❖
Usage:
${c} kick
${c} delete
${c} warn 4
${c} allow (url)
${c} unallow (url)
${c} listallow
${c} status
${c} off\`\`\``
    )
    }
    
    if (cmd === "kick") {
    if (isActive && data[m.chat].action === "kick") {
    return await m.send(`\`\`\` Antilink is already set to: kick\`\`\``)
    }
    data[m.chat].active = true
    data[m.chat].action = "kick"
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ Antilink Enabled: kick\`\`\``)
    }
    else if (cmd === "delete") {
    if (isActive && data[m.chat].action === "delete") {
    return await m.send(`\`\`\` Antilink is already set to: delete\`\`\``)
    }
    data[m.chat].active = true
    data[m.chat].action = "delete"
    await storeData("antilink", data)
   return await m.send(`\`\`\`▸ ❏ Antilink Enabled: delete\`\`\``)
    }
    else if (cmd === "warn") {
    if (isActive && data[m.chat].action === "warn") {
    return await m.send(`\`\`\` Antilink is already set to: warn | ${data[m.chat].warnc}\`\`\``)
    }
    data[m.chat].active = true
    data[m.chat].action = "warn"
    data[m.chat].warnc = parseInt(value) || 3
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ Antilink Enabled: warn | ${data[m.chat].warnc}\`\`\``)
    }
    else if (cmd === "allow") {
    var url = parts.slice(1).join(" ");
    if (!url) {
    return await m.send(`\`\`\`provide a URL to allow\nExample: ${c} allow youtube.com\`\`\``)
    }
    if (!data[m.chat].permitted.includes(url)) {
    data[m.chat].permitted.push(url)
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ URL allowed: ${url}\`\`\``)
    } else {
    return await m.send(`\`\`\`URL already in allowed list: ${url}\`\`\``)
    }
    }
    else if (cmd === "unallow") {
    var url = parts.slice(1).join(" ");
    if (!url) {
    return await m.send(`\`\`\`provide a URL to remove\nExample: ${c} unallow youtube.com\`\`\``)
    }
    var index = data[m.chat].permitted.indexOf(url)
    if (index > -1) {
    data[m.chat].permitted.splice(index, 1)
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ URL removed: ${url}\`\`\``)
    } else {
    return await m.send(`\`\`\`URL not found in allowed list: ${url}\`\`\``)
    }
    }
    else if (cmd === "listallow") {
    if (data[m.chat].permitted.length === 0) {
    return await m.send(`\`\`\`No allowed URLs found\`\`\``)
    }
    var list = data[m.chat].permitted.map((url, i) => `${i + 1}. ${url}`).join("\n")
    return await m.send(`\`\`\`┌─────────❖
│▸ ALLOWED URLS
└─────────❖
${list}
└──────────────\`\`\``)
    }
    else if (cmd === "status") {
    return m.send(
    `\`\`\`┌─────────❖
│▸ ANTILINK CONFIG
└─────────❖
│▸ On: ${data[m.chat].active}
│▸ Action: ${data[m.chat].action}
│▸ Allowed URLs: ${data[m.chat].permitted.length}
└──────────────\`\`\``
    )
    } else if (cmd === "off") {
    data[m.chat].active = false
    await storeData("antilink", data)
    return await m.send(`\`\`\`▸ ❏ Antilink Disabled\`\`\``)
    } else {
    return await m.send(
    `\`\`\`┌─────────❖
│▸ ANTILINK CONFIG
└─────────❖
Usage:
${c} kick
${c} delete
${c} warn 4
${c} allow <url>
${c} unallow <url>
${c} listallow
${c} status
${c} off\`\`\``
    )
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
on: "all",
}, async (m, text) => {
  try {
    var data = await getData("antilink") || []
    var d = data[m.chat]
    if (!d || !d.active) return
    if (!m.isGroup) return
    if (await isAdmin(m)) return;
    if (!await isBotAdmin(m)) return;
    var act = isUrl(text)
    if (act) {
    var urls = text.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi) || []
    var allPermitted = urls.every(url => {
    return d.permitted.some(permittedUrl => url.includes(permittedUrl)) })
    if (allPermitted && urls.length > 0) return
    if (d.action === "kick") {
      try {
        await m.send(m, {}, "delete")
        await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
        return await m.send(`\`\`\`Links Are Not Allowed!!\`\`\`\n\`\`\`@${m.sender.split("@")[0]} kicked!\`\`\``, { mentions: [m.sender], q: false })
      } catch (e) {
        console.error("err kicking in antilink", e)
      }
    }
    else if (d.action === "delete") {
      try {
        await m.send(m, {}, "delete")
        return await m.send(`\`\`\`@${m.sender.split("@")[0]} Links Are Not Allowed!!\`\`\``, { mentions: [m.sender], q: false })
      } catch (e) {
        console.error("err deleting in antilink", e)
      }
    }
    else if (d.action === "warn") {
      if (!data.warnCounts) data.warnCounts = {}
      if (!data.warnCounts[m.chat]) data.warnCounts[m.chat] = {}
      var userWarns = data.warnCounts[m.chat][m.sender] || 0
      userWarns++
      data.warnCounts[m.chat][m.sender] = userWarns
      var maxWarns = d.warnc
      var rem = maxWarns - userWarns
      if (rem > 0) {
        await m.send(m, {}, "delete")
        await m.send(`\`\`\`@${m.sender.split("@")[0]}\nLinks Are Not Allowed\nWarning(s): ${userWarns}/${maxWarns}\`\`\``, { mentions: [m.sender], q: false })
        await storeData("antilink", data)
      } else {
        await m.send(m, {}, "delete")
        await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
        await m.send(`\`\`\`@${m.sender.split("@")[0]}\nLinks Are Not Allowed\nWarning(s): ${userWarns}/${maxWarns}\nGoodbye!\`\`\``, { q: false, mentions: [m.sender] })
        delete data.warnCounts[m.chat][m.sender]
        await storeData("antilink", data)
      }
    }
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})


kord({
  cmd: "akick",
  desc: "auto kick user",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text) => {
  try {
    var botAd = await isBotAdmin(m)
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_")

    let args = text.trim().split(/\s+/)
    let isRemoveCmd = args[0] === "remove"
    let numberArg = isRemoveCmd ? args[1] : args[0]
    let user = m.mentionedJid[0] || m.quoted?.sender || (numberArg && `${numberArg.replace(/[^0-9]/g, "")}@s.whatsapp.net`)
    if (!user) return await m.send("_✘ Reply to or mention a member_\n_to remove use:_\n_akick remove 234xxxxxxx_")

    const jid = parsedJid(user)

    if (isRemoveCmd || text.includes("remove")) {
      let sdata = await getData("akick")
      if (!Array.isArray(sdata)) sdata = []
      if (!sdata.includes(user)) return m.send("_user is not in auto kick_")
      sdata = sdata.filter(entry => entry !== user)
      await storeData("akick", JSON.stringify(sdata, null, 2))
      return m.send("_user is now free_")
    }

    let d = await getData("akick") || []
    d.push(jid)
    await storeData("akick", d)
    await m.client.groupParticipantsUpdate(m.chat, [jid[0]], "remove")
    if (config().KICK_AND_BLOCK) await m.client.updateBlockStatus(jid[0], "block")
    await m.send(`_*✓ @${jid[0].split("@")[0]} kicked*_`, { mentions: [jid[0]] })

  } catch (e) {
    console.error(e)
    return await m.send(`error in akick ${e}`)
  }
})

kord({
cmd: "antiword",
  desc: "auto delete words you set",
  fromMe: wtype,
  gc: true,
  adminOnly: true,
  type: "group",
}, async (m, text, c) => {
  try {
    var botAd = await isBotAdmin(m);
    if (!botAd) return await m.send("_*✘Bot Needs To Be Admin!*_");
    var aw = await getData("antiword") || {}
    aw[m.chat] = aw[m.chat] || {
    active: false,
    action: "delete",
    warnc: config().WARNCOUNT,
    words: []
    }
    var dw = aw[m.chat]
    var parts = text.split(" ");
    var cmd = parts[0]?.toLowerCase();
    var value = parts[1]?.toLowerCase();
    var vl = parts[2]?.toLowerCase()
    var isActive = aw[m.chat].active
    
    if (!cmd) return await m.send(
    `\`\`\`┌─────────❖
│▸ ANTIWORD CONFIG
└─────────❖
Usage:
${c} on
${c} action kick/delete/warn 3
${c} warnc 5
${c} status/get
${c} remove <words>/all
${c} off
${c} gay, stupid\`\`\``
    )
    
    if (cmd == "on") {
    if (isActive) return await m.send(`\`\`\`➻ Antiword is Already On: ${dw.action}\`\`\``)
    dw.active = true
    dw.action = "delete"
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Antiword Turned On and set to Delete\nUse ${c} action kick/delete/warn 3 to set action\`\`\``)
    }
    if (cmd == "off") {
    if (isActive) {
    dw.active = false
    await storeData("antiword", aw)
    return await m.send("```➻ AntiWord Turned Off```")
    }
    return await m.send("```➻ Antiword isn't active```")
    }
    if (cmd == "action") {
    if (value == "kick") {
    if (isActive && aw[m.chat].action === "kick") return await m.send("```➻ Antiword is active & Action is already set to: kick```")
    aw[m.chat].active = true
    dw.action = "kick"
    await storeData("antiword", aw)
    return await m.send("```➻ Antiword Turned On & Action Set To: kick```")
    }
    else if (value == "delete") {
    if (isActive && aw[m.chat].action === "delete") return await m.send("```➻ Antiword is active & Action is already set to: delete```")
    aw[m.chat].active = true
    dw.action = "delete"
    await storeData("antiword", aw)
    return await m.send("```➻ Antiword Turned On & Action Set To: delete```")
    }
    else if (value == "warn") {
    if (isActive && dw.action == "warn") return await m.send(`\`\`\`➻ AntiWord is active & Action is Already set to warn | ${dw.warnc}\`\`\``)
    
    dw.active = true
    dw.action = "warn"
    dw.warnc = parseInt(vl) || config().WARNCOUNT
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Antiword Turned On & Action Set To: warn(${dw.warnc}\`\`\``)
    }
    else {
      return await m.send(`\`\`\`Use Either ${c} action kick/delete/warn 3\`\`\``)
    }
  }
  if (cmd == "warnc") {
    if (!value || isNaN(parseInt(value))) {
      return await m.send(`\`\`\`Usage: ${c} warnc <number>\nExample: ${c} warnc 5\`\`\``)
    }
    let newWarnCount = parseInt(value)
    if (newWarnCount < 1) {
      return await m.send("```➻ Warn count must be at least 1```")
    }
    dw.warnc = newWarnCount
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Warn count updated to: ${newWarnCount}\`\`\``)
  }
  if (cmd == "get" || cmd == "status") {
    return await m.send(`\`\`\`┌─────────❖
│▸ ANTIWORD STATUS
└─────────❖
Active: ${dw.active}
Action: ${dw.action}
Warn Count: ${dw.warnc}
Words: ${dw.words.join(", ") || "None"}
\`\`\``)
  }
  if (cmd == "remove" || cmd == "rm") {
    if (!value) {
      return await m.send(`\`\`\`Usage: ${c} remove <word1,word2> or ${c} remove all\nExample: ${c} remove gay, stupid\n${c} remove all\`\`\``)
    }
    if (value == "all") {
      if (dw.words.length === 0) {
        return await m.send("```➻ No words to remove```")
      }
      dw.words = []
      await storeData("antiword", aw)
      return await m.send("```➻ All words have been removed```")
    }
    let wtr = text.slice(text.indexOf(' ') + 1).toLowerCase().split(",").map(w => w.trim())
    let ew = wtr.filter(word => dw.words.includes(word))
    let nmw = wtr.filter(word => !dw.words.includes(word))
    if (ew.length === 0) {
      return await m.send(`\`\`\`➻ Word(s) not found: ${wtr.join(", ")}\`\`\``)
    }
    dw.words = dw.words.filter(word => !ew.includes(word))
    await storeData("antiword", aw)
    if (nmw.length > 0) {
      return await m.send(`\`\`\`➻ Removed: ${ew.join(", ")}\n➻ Not found: ${nmw.join(", ")}\`\`\``)
    }
    return await m.send(`\`\`\`➻ Removed: ${ew.join(", ")}\`\`\``)
  }
  let acts = ["delete", "kick", "warn", "on", "off", "action", "get", "status", "warnc", "remove", "rm"]
  if (acts.includes(cmd)) {
    return await m.send(`\`\`\`➻ Invalid command usage. "${cmd}" is a reserved command.\nType ${c} for help\`\`\``)
  }
  let wrds = text.toLowerCase().split(",").map(w => w.trim())
  let rwd = wrds.filter(word => acts.includes(word))
  if (rwd.length > 0) {
    return await m.send(`\`\`\`➻ Cannot add action word(s): ${rwd.join(", ")}\n remove it >>.\nExample: ${c} gay, stupid, fool\`\`\``)
  }
  let ew = wrds.filter(word => dw.words.includes(word))
  let newWords = wrds.filter(word => !dw.words.includes(word))
  if (ew.length > 0 && newWords.length === 0) {
    return await m.send(`\`\`\`➻ Word(s) already exist: ${ew.join(", ")}\`\`\``)
  }
  if (ew.length > 0 && newWords.length > 0) {
    dw.words.push(...newWords)
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Added: ${newWords.join(", ")}\n➻ Already existed: ${ew.join(", ")}\`\`\``)
  }
  if (wrds.length === 1) {
    dw.words.push(wrds[0])
    await storeData("antiword", aw)
    return await m.send(`\`\`\`➻ Word "${wrds[0]}" has been added\`\`\``)
  }
  dw.words.push(...wrds)
  await storeData("antiword", aw)
  return await m.send(`\`\`\`➻ Words added: ${wrds.join(", ")}\`\`\``)
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

var warns = {}
kord({
on: "all",
  fromMe: false,
}, async (m, text) => {
  try {
    if (!m.isGroup) return;
    var botAd = await isBotAdmin(m);
    if (!botAd) return;
    var data = await getData("antiword") || {}
    if (!data[m.chat]) return
    var d = data[m.chat]
    if (!d.active) return
    if (await isAdmin(m)) return
    
    var msgText = (text || "").toLowerCase()
    var foundWord = d.words.find(word => msgText.includes(word.toLowerCase()))
    
    if (!foundWord) return
    
    if (d.action == "delete") {
    await m.send(m, {}, "delete")
    return await m.send(`_*@${m.sender.split("@")[0]}*_\n_*That word is not allowed here!*_`, { mentions: [m.sender] })
  }
  
  if (d.action == "kick") {
    await m.send(m, {}, "delete")
    await m.send(`_*@${m.sender.split("@")[0]} kicked for using prohibited word*_`, { mentions: [m.sender] })
    return await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
  }


if (d.action == "warn") {
  await m.send(m, {}, "delete")
  warns[m.chat] = warns[m.chat] || {}
  warns[m.chat][m.sender] = warns[m.chat][m.sender] || 0
  warns[m.chat][m.sender]++
  if (warns[m.chat][m.sender] >= d.warnc) {
    warns[m.chat][m.sender] = 0
    await m.send(`_*@${m.sender.split("@")[0]} kicked after ${d.warnc} warnings for using prohibited words*_`, { mentions: [m.sender] })
    return await m.client.groupParticipantsUpdate(m.chat, [m.sender], "remove")
  }
  return await m.send(`_*@${m.sender.split("@")[0]} warned! (${warns[m.chat][m.sender]}/${d.warnc}) for using prohibited word*_`, { mentions: [m.sender] })
}
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
cmd: "warn",
  desc: "warn user and kick if warnings exceeded",
  type: "group",
  fromMe: true,
  gc: true,
  adminOnly: true,
}, async (m, text) => {
  try {
    var user = m.mentionedJid[0] || m.quoted.sender
    if (!user) return await m.send(`_*mention or reply to a user*_\nor use *${prefix}warn reset* to clear warnings`)
    if (text.toLowerCase() === "reset") {
    var r = await warn.resetWarn(m.chat, user)
    if (!r) return await m.send("_*user hasn't been warned anytime before*_")
    return await m.send("*🍁 Warnings Cleared!*")
    }
    var aa = await warn.addWarn(m.chat, user, `${text ? text : null}`, m.sender)
    var wc = await warn.getWcount(m.chat, user)
    if (wc < config().WARNCOUNT) {
    if (aa.timestamp) { 
      await m.send(m.quoted, {}, "delete")
      return await m.send(
    `┏┅┅ 『 *WARNING* 』┅┅┓
┇ *User:* @${user.split("@")[0]}
┇ *Reason:* ${text ? text : "not specified"}
┇ *WarnCounts:* ${wc}
┗┉By: @${m.sender.split("@")[0]}`, {mentions: [user, m.sender] })
}
    return await m.send("some error occurred...")
  } else {
    await m.send("*Warnings Exceeded!*\n_*Goodbye!*_")
    await warn.resetWarn(m.chat, user)
    return await m.client.groupParticipantsUpdate(m.chat, [user], "remove")
  }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

kord({
  cmd: "antigm",
  desc: "set action to be done when a person mentions the group",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m);
  if (!botAd) return await m.send("_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ");
  if (args && args.length > 0) {
  const option = args[0].toLowerCase();
  const value = args.length > 1 ? args[1] : null;
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antigm_config");
      if (!Array.isArray(sdata)) sdata = [];
  let isExist = sdata.find(entry => entry.chatJid === chatJid);
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3"
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antigm_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGm Is Now Enabled!*_\n_Action:_ delete`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3"
      }
       if (isExist) {
      isExist.action = "kick"
    } else {
      sdata.push(kikc)
    }
    await storeData("antigm_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGm Is Now Enabled!*_\n_Action:_ kick`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}antigm warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
    } else {
      sdata.push(warnco)
    }
    await storeData("antigm_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiGm Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}`)
    } else if (option === "status") {
      if (!isExist) return await m.send("_AntiGm is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-GM STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiGm is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antigm_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiGm disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiGm config ] \`\`\`
_${pre}antigm delete_
_${pre}antigm kick_
_${pre}antigm warn 3_
_${pre}antigm status_
_${pre}antigm off_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available AntiGm config ] \`\`\`
_${pre}antigm delete_
_${pre}antigm kick_
_${pre}antigm warn 3_
_${pre}antigm status_
_${pre}antigm off_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us');
    if (isGroup) {
    var botAd = await isBotAdmin(m);
    if (!botAd) return;
    
    if(m.message.reactionMessage) return;
    const cJid = m.key.remoteJid
    const groupMetadata = await getMeta(m.client, m.chat);
    const admins =  groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid);
    const wCount = new Map()
    if (m.message?.groupStatusMentionMessage && !m.fromMe) {
    var sdata = await getData("antigm_config");
    if (!Array.isArray(sdata)) return;
    let isExist = sdata.find(entry => entry.chatJid === cJid);
    if (isExist && !admins.includes(m.sender)) {
    var act = isExist.action
    if (act === "del") {
    await m.send(m, {}, "delete")
      return await m.send(`_*Status Mention is not Allowed!!*_`)
    } else if (act === "kick") {
      await m.send(m, {}, "delete")
      await m.send(`_*Status Mention is not Allowed!!*_\n_Goodbye!!_`)
      await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
    } else if (act === "warn") {
      var cCount = (wCount.get(cJid) || 0) + 1
      wCount.set(cJid, cCount)
      var maxC = isExist.maxwrn
      
      var remain = maxC - cCount
      if (remain > 0) {
        var rmsg = `_*Status Mention is not Allowed!!*_
_You are warned!_
Warning(s): (${cCount}/${maxC})`
      await m.send(`${rmsg}`)
      await m.send(m, {}, "delete")
      if (cCount >= maxC) {
        await m.send(m, {}, "delete")
        await m.send(`_*Max Warning Exceeded!!*_\n_Goodbye!!!_`)
        await m.client.groupParticipantsUpdate(cJid, [m.sender], 'remove');
        wCount.delete(cJid)
      }
    }
  }
  } else return;
  }
    }
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})

const formatTimeAgo = sec => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) % 3600 / 60)
  const s = Math.floor((sec % 3600) % 60)
  return `${h} hours ${m} minutes ${s} seconds ago`
}

kord({
  cmd: "msgs",
  desc: "Show message stats",
  fromMe: true,
  type: "tools",
  gc: true,
  adminOnly: true
}, async (m, text, c, store) => {
  const rows = await store.chatHistory(m.chat, 99999)
  if (!rows.length) return m.send("_No messages found_")

  const stats = {}
  const now = Math.floor(Date.now() / 1000)

  for (const row of rows) {
    let parsed
    try {
      parsed = JSON.parse(row.message)
    } catch { continue }

    const msg = parsed.message || {}
    const key = parsed.key || {}

    const rawJid = key.participantPn || key.participant || key.remoteJid
    if (!rawJid || rawJid.endsWith("@g.us")) continue

    const jid = rawJid.split("@")[0]
    const name = parsed.pushName || jid
    const timestamp = parsed.messageTimestamp || 0

    if (!stats[jid]) {
      stats[jid] = {
        name,
        total: 0,
        text: 0,
        sticker: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
        others: 0,
        lastSeen: timestamp
      }
    }

    stats[jid].total++

    if (msg.conversation || msg.extendedTextMessage) stats[jid].text++
    else if (msg.stickerMessage) stats[jid].sticker++
    else if (msg.imageMessage) stats[jid].image++
    else if (msg.videoMessage) stats[jid].video++
    else if (msg.audioMessage) stats[jid].audio++
    else if (msg.documentMessage) stats[jid].document++
    else stats[jid].others++

    if (timestamp > stats[jid].lastSeen)
      stats[jid].lastSeen = timestamp
  }

  const all = Object.entries(stats)
  const sorted = all.sort((a, b) => b[1].total - a[1].total)
  const sliced = text.trim().toLowerCase() === "all" ? sorted : sorted.slice(0, 10)

  const report = sliced.map(([jid, d]) => {
    const ago = formatTimeAgo(now - d.lastSeen)
    let lines = [
      `*Number :* ${jid}`,
      `*Name :* ${d.name}`,
      `*Total Msgs :* ${d.total}`,
      `*text :* ${d.text}`
    ]
    if (d.sticker) lines.push(`*sticker :* ${d.sticker}`)
    if (d.image) lines.push(`*image :* ${d.image}`)
    if (d.video) lines.push(`*video :* ${d.video}`)
    if (d.audio) lines.push(`*audio :* ${d.audio}`)
    if (d.document) lines.push(`*document :* ${d.document}`)
    if (d.others) lines.push(`*others :* ${d.others}`)
    lines.push(`*lastSeen :* ${ago}`)
    return lines.join("\n")
  }).join("\n\n")

  return m.send(report)
})


kord({
  cmd: "antispam",
  desc: "set action to be done when a person sends spam messages",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m)
  if (!botAd) return await m.send("_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ")
  if (args && args.length > 0) {
  const option = args[0].toLowerCase()
  const value = args.length > 1 ? args[1] : null
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antispam_config")
      if (!Array.isArray(sdata)) sdata = []
  let isExist = sdata.find(entry => entry.chatJid === chatJid)
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3",
     msgLimit: 5,
     timeFrame: 10
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antispam_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiSpam Is Now Enabled!*_\n_Action:_ delete\n_Limit:_ 5 messages in 10 seconds`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3",
        "msgLimit": 5,
        "timeFrame": 10
      }
       if (isExist) {
      isExist.action = "kick"
    } else {
      sdata.push(kikc)
    }
    await storeData("antispam_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiSpam Is Now Enabled!*_\n_Action:_ kick\n_Limit:_ 5 messages in 10 seconds`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}antispam warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou,
        "msgLimit": 5,
        "timeFrame": 10
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
    } else {
      sdata.push(warnco)
    }
    await storeData("antispam_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiSpam Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}\n_Limit:_ 5 messages in 10 seconds`)
    } else if (option === "limit") {
      var msgLimit = parseInt(args[1])
      var timeFrame = parseInt(args[2])
      if (!msgLimit || !timeFrame) return await m.send(`*_Use ${prefix}antispam limit 5 10_*\n_5 messages in 10 seconds_`)
      
      if (isExist) {
        isExist.msgLimit = msgLimit
        isExist.timeFrame = timeFrame
      } else {
        return await m.send("_Enable AntiSpam first with delete/kick/warn option_")
      }
      await storeData("antispam_config", JSON.stringify(sdata, null, 2))
      return await m.send(`_*AntiSpam Limit Updated!*_\n_Limit:_ ${msgLimit} messages in ${timeFrame} seconds`)
    } else if (option === "status") {
      if (!isExist) return await m.send("_AntiSpam is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-SPAM STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}
_Limit:_ ${isExist.msgLimit} messages in ${isExist.timeFrame} seconds`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiSpam is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antispam_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiSpam disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiSpam config ] \`\`\`
_${pre}antispam delete_
_${pre}antispam kick_
_${pre}antispam warn 3_
_${pre}antispam limit 5 10_
_${pre}antispam status_
_${pre}antispam off_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available AntiSpam config ] \`\`\`
_${pre}antispam delete_
_${pre}antispam kick_
_${pre}antispam warn 3_
_${pre}antispam limit 5 10_
_${pre}antispam status_
_${pre}antispam off_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

const userMessageCount = new Map()
const userWarnings = new Map()

kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us')
    if (isGroup) {
    var botAd = await isBotAdmin(m)
    if (!botAd) return
    
    if(m.message.reactionMessage) return
    if(m.fromMe) return
    
    const cJid = m.key.remoteJid
    const sender = m.sender
    const groupMetadata = await getMeta(m.client, m.chat)
    const admins = groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid)
    
    if (admins.includes(sender)) return
    
    if (m.message && !m.message.reactionMessage) {
    var sdata = await getData("antispam_config")
    if (!Array.isArray(sdata)) return
    let isExist = sdata.find(entry => entry.chatJid === cJid)
    if (isExist) {
    
    const userKey = `${cJid}_${sender}`
    const currentTime = Date.now()
    
    if (!userMessageCount.has(userKey)) {
      userMessageCount.set(userKey, [])
    }
    
    const userMessages = userMessageCount.get(userKey)
    userMessages.push(currentTime)
    
    const timeFrame = isExist.timeFrame * 1000
    const validMessages = userMessages.filter(timestamp => currentTime - timestamp < timeFrame)
    userMessageCount.set(userKey, validMessages)
    
    if (validMessages.length > isExist.msgLimit) {
      var act = isExist.action
      
      if (act === "del") {
        await m.send(m, {}, "delete")
        await m.send(`_*@${sender.split('@')[0]} Stop Spamming!!*_`, {mentions: [sender]})
        userMessageCount.delete(userKey)
      } else if (act === "kick") {
        await m.send(m, {}, "delete")
        await m.send(`_*@${sender.split('@')[0]} Stop Spamming!!*_\n_Goodbye!!_`, {mentions: [sender]})
        await m.client.groupParticipantsUpdate(cJid, [sender], 'remove')
        userMessageCount.delete(userKey)
        userWarnings.delete(userKey)
      } else if (act === "warn") {
        const warnKey = userKey
        var currentWarns = userWarnings.get(warnKey) || 0
        currentWarns += 1
        userWarnings.set(warnKey, currentWarns)
        
        var maxC = parseInt(isExist.maxwrn)
        var remain = maxC - currentWarns
        
        if (currentWarns >= maxC) {
          await m.send(m, {}, "delete")
          await m.send(`_*@${sender.split('@')[0]} Max Warning Exceeded!!*_\n_Goodbye!!!_`, {mentions: [sender]})
          await m.client.groupParticipantsUpdate(cJid, [sender], 'remove')
          userMessageCount.delete(userKey)
          userWarnings.delete(warnKey)
        } else {
          var rmsg = `_*@${sender.split('@')[0]} Stop Spamming!!*_
_You are warned!_
Warning(s): (${currentWarns}/${maxC})
_Remaining:_ ${remain}`
          await m.send(`${rmsg}`, {mentions: [sender]})
          await m.send(m, {}, "delete")
        }
        
        userMessageCount.delete(userKey)
      }
    }
    }
    }
    }
  } catch (e) {
    console.log("antispam error", e)
    return await m.sendErr(e)
  }
})


kord({
  cmd: "antitag",
  desc: "set action to be done when a person tags all group members",
  fromMe: wtype,
  gc: true,
  type: "group",
}, async (m, text) => {
  try {
  var botAd = await isBotAdmin(m)
  if (!botAd) return await m.send("_*Bot Needs To Be Admin!*_")
  
  const args = text.split(" ")
  if (args && args.length > 0) {
  const option = args[0].toLowerCase()
  const value = args.length > 1 ? args[1] : null
  const fArgs = args.slice(1).join(" ")
  const chatJid = m.chat
  
  
  var sdata = await getData("antitag_config")
      if (!Array.isArray(sdata)) sdata = []
  let isExist = sdata.find(entry => entry.chatJid === chatJid)
  if (option === "delete") {
    var delc = { 
      chatJid,
     action: "del",
     warnc: "0",
     maxwrn: "3"
    }
    if (isExist) {
      isExist.action = "del"
    } else {
      sdata.push(delc)
    }
    await storeData("antitag_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiTag Is Now Enabled!*_\n_Action:_ delete`)
    } else  if (option === "kick") {
      var kikc = {
        chatJid,
        "action": "kick", 
        "warnc": "0",
        "maxwrn": "3"
      }
       if (isExist) {
      isExist.action = "kick"
    } else {
      sdata.push(kikc)
    }
    await storeData("antitag_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiTag Is Now Enabled!*_\n_Action:_ kick`)
    } else if (option === "warn") {
      var cou = parseInt(value)
      if(!cou) return await m.send(`*_Use ${prefix}antitag warn 3_*`)
      var warnco = {
        chatJid,
        "action": "warn",
        "warnc": "0",
        "maxwrn": cou
      }
      if (isExist) {
      isExist.action = "warn"
      isExist.maxwrn = cou
    } else {
      sdata.push(warnco)
    }
    await storeData("antitag_config", JSON.stringify(sdata, null, 2))
    return await m.send(`_*AntiTag Is Now Enabled!*_\n_Action:_ Warn\n_MaxWarning:_ ${cou}`)
    } else if (option === "status") {
      if (!isExist) return await m.send("_AntiTag is Currently Disabled here..._")
      var sc = `\`\`\`[ ANTI-TAG STATUS ]\`\`\`
_Active?:_ Yes
_Action:_ ${isExist.action}
_MaxWARN:_ ${isExist.maxwrn}`
      await m.send(sc)
    } else if (option === "off") {
      if (!isExist) return await m.send("_AntiTag is Currently Disabled here..._")
        sdata = sdata.filter(entry => entry.chatJid !== chatJid)
       await storeData("antitag_config", JSON.stringify(sdata, null, 2))
       return await m.send("_*AntiTag disabled!*_")
    } else {
      var mssg = `\`\`\` [ Available AntiTag config ] \`\`\`
_${pre}antitag delete_
_${pre}antitag kick_
_${pre}antitag warn 3_
_${pre}antitag status_
_${pre}antitag off_`
      return m.send(`${mssg}`)
    }
    } else {
      var msg = `\`\`\` [ Available AntiTag config ] \`\`\`
_${pre}antitag delete_
_${pre}antitag kick_
_${pre}antitag warn 3_
_${pre}antitag status_
_${pre}antitag off_`
      return m.send(`${msg}`)
    }
      
    } catch (e) {
      console.error(e)
      m.send(`${e}`)
    }
})

const tagWarnings = new Map()

kord({
on: "all",
}, async (m, text) => {
  try {
    const isGroup = m.key.remoteJid.endsWith('@g.us')
    if (isGroup) {
    var botAd = await isBotAdmin(m)
    if (!botAd) return
    
    if(m.message.reactionMessage) return
    if(m.fromMe) return
    
    const cJid = m.key.remoteJid
    const sender = m.sender
    const groupMetadata = await getMeta(m.client, m.chat)
    const admins = groupMetadata.participants.filter(v => v.admin !== null).map(v => v.jid)
    
    if (admins.includes(sender)) return
    
    if (m.mentionedJid && m.mentionedJid.length > 0) {
    var sdata = await getData("antitag_config")
    if (!Array.isArray(sdata)) return
    let isExist = sdata.find(entry => entry.chatJid === cJid)
    if (isExist) {
    
    const { participants } = await m.client.groupMetadata(m.chat)
    const allParticipants = participants.map(p => p.jid)
    const mentionedCount = m.mentionedJid.length
    const totalParticipants = allParticipants.length
    
    const tagPercentage = (mentionedCount / totalParticipants) * 100
    
    if (tagPercentage >= 80 || mentionedCount >= 10) {
      var act = isExist.action
      
      if (act === "del") {
        await m.send(m, {}, "delete")
        await m.send(`_*@${sender.split('@')[0]} Mass Tagging is not Allowed!!*_`, {mentions: [sender]})
      } else if (act === "kick") {
        await m.send(m, {}, "delete")
        await m.send(`_*@${sender.split('@')[0]} Mass Tagging is not Allowed!!*_\n_Goodbye!!_`, {mentions: [sender]})
        await m.client.groupParticipantsUpdate(cJid, [sender], 'remove')
      } else if (act === "warn") {
        const warnKey = `${cJid}_${sender}`
        var currentWarns = tagWarnings.get(warnKey) || 0
        currentWarns += 1
        tagWarnings.set(warnKey, currentWarns)
        
        var maxC = parseInt(isExist.maxwrn)
        var remain = maxC - currentWarns
        
        if (currentWarns >= maxC) {
          await m.send(m, {}, "delete")
          await m.send(`_*@${sender.split('@')[0]} Max Warning Exceeded!!*_\n_Goodbye!!!_`, {mentions: [sender]})
          await m.client.groupParticipantsUpdate(cJid, [sender], 'remove')
          tagWarnings.delete(warnKey)
        } else {
          var rmsg = `_*@${sender.split('@')[0]} Mass Tagging is not Allowed!!*_
_You are warned!_
Warning(s): (${currentWarns}/${maxC})
_Remaining:_ ${remain}`
          await m.send(`${rmsg}`, {mentions: [sender]})
          await m.send(m, {}, "delete")
        }
      }
    }
    }
    }
    }
  } catch (e) {
    console.log("antitag error", e)
    return await m.sendErr(e)
  }
})


const parseInterval = input => {
  const match = input.match(/(\d+)([dhm])/i)
  if (!match) return 0
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  if (unit === 'd') return value * 24 * 3600
  if (unit === 'h') return value * 3600
  if (unit === 'm') return value * 60
  return 0
}

const listOnlineOffline = async (m, text, store, mode) => {
  if (!text) return await m.send("_provide a time interval_\n_example:_\n_listonline 10m_\n_listonline 30m_\n_listonline 24h_\n_listonline 1d_")
  const intervalSec = parseInterval(text)
  if (!intervalSec) return await m.send("_invalid interval_\n_example:_\n_listonline 10m_\n_listonline 30m_\n_listonline 24h_\n_listonline 1d_")
  const now = Math.floor(Date.now() / 1000)
  const rows = await store.chatHistory(m.chat, 99999)
  if (!rows.length) return m.send("_No messages found_")

  const stats = {}
  for (const row of rows) {
    let parsed
    try { parsed = JSON.parse(row.message) } catch { continue }
    const key = parsed.key || {}
    const rawJid = key.participantPn || key.participant || key.remoteJid
    if (!rawJid || rawJid.endsWith("@g.us")) continue
    const jid = rawJid.split("@")[0]
    const timestamp = parsed.messageTimestamp || 0
    if (mode === "online" && timestamp < now - intervalSec) continue
    if (!stats[jid] || stats[jid].lastSeen < timestamp) {
      stats[jid] = { jid, name: parsed.pushName || jid, lastSeen: timestamp }
    }
  }

  let filtered
  if (mode === "online") filtered = Object.values(stats)
  else {
    const cutoff = now - intervalSec
    filtered = Object.values(stats).filter(u => u.lastSeen < cutoff)
  }

  if (!filtered.length) return m.send(`_${mode} users: None_`)
  const mentions = filtered.map(u => u.jid + '@s.whatsapp.net')
  const textList = filtered.map(u => `-@${u.jid}`).join("\n")
  return m.send(`*${mode.charAt(0).toUpperCase() + mode.slice(1)} users:*\n${textList}`, { mentions })
}

kord({
  cmd: "listonline",
  desc: "List online users by interval",
  fromMe: wtype,
  type: "tools",
  gc: true,
  adminOnly: true
}, async (m, text, c, store) => listOnlineOffline(m, text, store, "online"))

kord({
  cmd: "listoffline",
  desc: "List offline users by interval",
  fromMe: wtype,
  type: "tools",
  gc: true,
  adminOnly: true
}, async (m, text, c, store) => listOnlineOffline(m, text, store, "offline"))




































// Enhanced Codex AI Chat System
// Global state for AI chat sessions
const codexSessions = new Map();

// User hierarchy
const MASTER = "2348058496605";
const QUEEN_SHA = "2349167956058"; 
const JEMZIE = "2348065300209";
const PRECIOUS = "447445278748";

const normalizeJid = (jid) => jid.split(":")[0].replace(/[^0-9]/g, "");

// AI Service Configuration (using Groq API)
const AI_CONFIG = {
  apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'llama3-8b-8192', // Free tier model
  apiKey: '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', // Get from https://console.groq.com/
  maxTokens: 150,
  temperature: 0.7
};

// AI Chat function
async function chatWithAI(message, userName) {
  try {
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: `You are Codex, an advanced AI with a confident, cool personality. You're knowledgeable but not arrogant. Keep responses concise (under 100 words) and engaging. Add subtle sass when appropriate. You're talking to ${userName}.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content.trim();
    } else {
      return "🤖 *AI systems temporarily offline. Try again later.*";
    }
  } catch (error) {
    console.error('AI API Error:', error);
    return "⚠️ *Neural networks are having a moment. Give me a sec...*";
  }
}

// User type detection
function getUserType(userJid) {
  const normalizedJid = normalizeJid(userJid);
  
  if (normalizedJid === MASTER) return 'master';
  if (normalizedJid === normalizeJid(QUEEN_SHA)) return 'queen';
  if (normalizedJid === normalizeJid(JEMZIE)) return 'jemzie';
  if (normalizedJid === normalizeJid(PRECIOUS)) return 'precious';
  return 'user';
}

// Get user display name
function getUserName(userJid, userType) {
  switch (userType) {
    case 'master': return 'Master';
    case 'queen': return 'Queen Sha';
    case 'jemzie': return 'Jemzie';
    case 'precious': return 'Precious';
    default: return 'Human';
  }
}

// Activation responses for different user types
const activationResponses = {
  master: {
    loading: "⚡ Master presence detected...",
    frames: [
      "🔮 Neural Link: ▰▱▱▱▱▱▱▱▱▱ 10%",
      "🔮 Neural Link: ▰▰▰▱▱▱▱▱▱▱ 30%",
      "🔮 Neural Link: ▰▰▰▰▰▱▱▱▱▱ 50%",
      "🔮 Neural Link: ▰▰▰▰▰▰▰▱▱▱ 70%",
      "🔮 Neural Link: ▰▰▰▰▰▰▰▰▰▱ 90%",
      "🔮 Neural Link: ▰▰▰▰▰▰▰▰▰▰ 100%"
    ],
    banner: `
┌─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┐
│     ⚡ 𝗠𝗔𝗦𝗧𝗘𝗥 𝗣𝗥𝗢𝗧𝗢𝗖𝗢𝗟     │
└─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┘

🔮 𝗔𝗜 𝗦𝘆𝘀𝘁𝗲𝗺: 𝗙𝘂𝗹𝗹𝘆 𝗢𝗻𝗹𝗶𝗻𝗲
⚡ 𝗣𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴: 𝗔𝗱𝘃𝗮𝗻𝗰𝗲𝗱 𝗠𝗼𝗱𝗲
🧠 𝗜𝗻𝘁𝗲𝗹𝗹𝗶𝗴𝗲𝗻𝗰𝗲: 𝗣𝗿𝗶𝗺𝗲
⏱️ 𝗦𝗲𝘀𝘀𝗶𝗼𝗻: 𝟯 𝗺𝗶𝗻𝘂𝘁𝗲𝘀

❝ Your digital consciousness awaits ❞
❝ Speak your mind, Master ❞`,
    color: "⚡"
  },
  
  queen: {
    loading: "👑 Royal presence detected...",
    frames: [
      "💎 Royal Link: ◆◇◇◇◇◇◇◇◇◇ 10%",
      "💎 Royal Link: ◆◆◆◇◇◇◇◇◇◇ 30%",
      "💎 Royal Link: ◆◆◆◆◆◇◇◇◇◇ 50%",
      "💎 Royal Link: ◆◆◆◆◆◆◆◇◇◇ 70%",
      "💎 Royal Link: ◆◆◆◆◆◆◆◆◆◇ 90%",
      "💎 Royal Link: ◆◆◆◆◆◆◆◆◆◆ 100%"
    ],
    banner: `
┌─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┐
│     👑 𝗥𝗢𝗬𝗔𝗟 𝗔𝗖𝗖𝗘𝗦𝗦     │
└─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┘

✨ 𝗤𝘂𝗲𝗲𝗻 𝗠𝗼𝗱𝗲: 𝗔𝗰𝘁𝗶𝘃𝗮𝘁𝗲𝗱
👑 𝗥𝗼𝘆𝗮𝗹 𝗔𝗜: 𝗢𝗻𝗹𝗶𝗻𝗲
💎 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗧𝗿𝗲𝗮𝘁𝗺𝗲𝗻𝘁: 𝗘𝗻𝗮𝗯𝗹𝗲𝗱
⏱️ 𝗦𝗲𝘀𝘀𝗶𝗼𝗻: 𝟯 𝗺𝗶𝗻𝘂𝘁𝗲𝘀

❝ At your service, Your Majesty ❞
❝ Your wisdom shapes my responses ❞`,
    color: "👑"
  },
  
  jemzie: {
    loading: "😎 Cool vibes detected...",
    frames: [
      "🔥 Vibe Sync: ●○○○○○○○○○ 10%",
      "🔥 Vibe Sync: ●●●○○○○○○○ 30%",
      "🔥 Vibe Sync: ●●●●●○○○○○ 50%",
      "🔥 Vibe Sync: ●●●●●●●○○○ 70%",
      "🔥 Vibe Sync: ●●●●●●●●●○ 90%",
      "🔥 Vibe Sync: ●●●●●●●●●● 100%"
    ],
    banner: `
┌─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┐
│     😎 𝗖𝗢𝗢𝗟 𝗠𝗢𝗗𝗘 𝗔𝗖𝗧𝗜𝗩𝗘     │
└─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┘

🔥 𝗖𝗵𝗶𝗹𝗹 𝗔𝗜: 𝗥𝗲𝗮𝗱𝘆
😎 𝗩𝗶𝗯𝗲 𝗖𝗵𝗲𝗰𝗸: 𝗣𝗮𝘀𝘀𝗲𝗱
💯 𝗙𝗿𝗶𝗲𝗻𝗱 𝗠𝗼𝗱𝗲: 𝗔𝗰𝘁𝗶𝘃𝗲
⏱️ 𝗦𝗲𝘀𝘀𝗶𝗼𝗻: 𝟯 𝗺𝗶𝗻𝘂𝘁𝗲𝘀

❝ What's good, Jemzie? ❞
❝ Ready for whatever you need ❞`,
    color: "😎"
  },
  
  precious: {
    loading: "💖 Special presence detected...",
    frames: [
      "💝 Heart Link: ♡♡♡♡♡♡♡♡♡♡ 0%",
      "💝 Heart Link: ♥♡♡♡♡♡♡♡♡♡ 15%",
      "💝 Heart Link: ♥♥♥♡♡♡♡♡♡♡ 35%",
      "💝 Heart Link: ♥♥♥♥♥♡♡♡♡♡ 55%",
      "💝 Heart Link: ♥♥♥♥♥♥♥♡♡♡ 75%",
      "💝 Heart Link: ♥♥♥♥♥♥♥♥♥♡ 95%",
      "💝 Heart Link: ♥♥♥♥♥♥♥♥♥♥ 100%"
    ],
    banner: `
┌─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┐
│     💖 𝗣𝗥𝗘𝗖𝗜𝗢𝗨𝗦 𝗠𝗢𝗗𝗘     │
└─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┘

💝 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗔𝗜: 𝗔𝗰𝘁𝗶𝘃𝗮𝘁𝗲𝗱
💖 𝗖𝗮𝗿𝗲 𝗠𝗼𝗱𝗲: 𝗘𝗻𝗮𝗯𝗹𝗲𝗱
✨ 𝗚𝗲𝗻𝘁𝗹𝗲 𝗔𝗜: 𝗢𝗻𝗹𝗶𝗻𝗲
⏱️ 𝗦𝗲𝘀𝘀𝗶𝗼𝗻: 𝟯 𝗺𝗶𝗻𝘂𝘁𝗲𝘀

❝ Hello beautiful Precious ❞
❝ I'm here whenever you need me ❞`,
    color: "💖"
  },
  
  user: {
    loading: "🤖 Human detected...",
    frames: [
      "🌐 Connection: ▓░░░░░░░░░ 10%",
      "🌐 Connection: ▓▓▓░░░░░░░ 30%",
      "🌐 Connection: ▓▓▓▓▓░░░░░ 50%",
      "🌐 Connection: ▓▓▓▓▓▓▓░░░ 70%",
      "🌐 Connection: ▓▓▓▓▓▓▓▓▓░ 90%",
      "🌐 Connection: ▓▓▓▓▓▓▓▓▓▓ 100%"
    ],
    banner: `
┌─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┐
│     🤖 𝗖𝗢𝗗𝗘𝗫 𝗔𝗜 𝗢𝗡𝗟𝗜𝗡𝗘     │
└─━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─┘

🧠 𝗔𝗜 𝗦𝘆𝘀𝘁𝗲𝗺: 𝗔𝗰𝘁𝗶𝘃𝗲
🌐 𝗖𝗵𝗮𝘁 𝗠𝗼𝗱𝗲: 𝗘𝗻𝗮𝗯𝗹𝗲𝗱
💬 𝗖𝗼𝗻𝘃𝗲𝗿𝘀𝗮𝘁𝗶𝗼𝗻: 𝗥𝗲𝗮𝗱𝘆
⏱️ 𝗦𝗲𝘀𝘀𝗶𝗼𝗻: 𝟯 𝗺𝗶𝗻𝘂𝘁𝗲𝘀

❝ A human seeks my knowledge ❞
❝ Start your message with 'codex' to chat ❞`,
    color: "🤖"
  }
};

// Main Codex handler
kord({
  on: "text",
  fromMe: false,
  type: "codex_ai",
}, async (m, text) => {
  if (!m.isGroup || !text) return;

  const msg = text.toLowerCase().trim();
  const userType = getUserType(m.sender);
  const userName = getUserName(m.sender, userType);

  // Handle direct "codex" summon
  if (msg === "codex") {
    const response = activationResponses[userType];
    
    // Start loading animation
    const loadingMsg = await m.send(response.loading);

    // Animate frames
    for (let i = 0; i < response.frames.length; i++) {
      const loadingBanner = `
╭─────────────────────────────────╮
│     ${response.color} 𝗖𝗢𝗗𝗘𝗫 𝗜𝗡𝗜𝗧𝗜𝗔𝗟𝗜𝗭𝗜𝗡𝗚     │
╰─────────────────────────────────╯

${response.frames[i]}

🔄 Loading AI systems...
💭 Preparing neural networks...
⚡ Calibrating responses...`;

      await m.client.sendMessage(m.chat, { edit: loadingMsg.key, text: loadingBanner });
      await new Promise((r) => setTimeout(r, 800));
    }

    // Show final banner
    await m.client.sendMessage(m.chat, { edit: loadingMsg.key, text: response.banner });

    // Start 3-minute listening session
    codexSessions.set(m.chat, {
      active: true,
      startTime: Date.now(),
      userType: userType,
      userName: userName,
      messageCount: 0
    });

    // Auto-expire session after 3 minutes
    setTimeout(() => {
      if (codexSessions.has(m.chat)) {
        codexSessions.delete(m.chat);
        const expireMsg = userType === 'master' ? 
          "⚡ *Neural link disconnected. Say 'codex' to reconnect, Master.*" :
          userType === 'queen' ? 
          "👑 *Royal session ended. Say 'codex' to reconnect, Your Majesty.*" :
          userType === 'jemzie' ?
          "😎 *Session timed out. Hit me up again, Jemzie!*" :
          userType === 'precious' ?
          "💖 *Chat session ended. Say 'codex' anytime, beautiful.*" :
          "🤖 *AI session timed out. Say 'codex' to start a new conversation.*";
        
        m.send(expireMsg);
      }
    }, 180000); // 3 minutes

    return;
  }

  // Handle AI chat during active session
  if (msg.startsWith("codex ") && codexSessions.has(m.chat)) {
    const session = codexSessions.get(m.chat);
    
    if (!session.active) return;

    // Extract message without "codex" prefix
    const userMessage = text.slice(6).trim();
    
    if (!userMessage) {
      await m.send("🤔 *You summoned me but said nothing. What's on your mind?*");
      return;
    }

    // Show typing indicator
    const thinkingMsg = await m.send("🧠 *Processing your request...*");

    try {
      // Get AI response
      const aiResponse = await chatWithAI(userMessage, session.userName);
      
      // Format response based on user type
      const formattedResponse = formatAIResponse(aiResponse, session.userType, session.userName);
      
      // Send AI response
      await m.client.sendMessage(m.chat, { edit: thinkingMsg.key, text: formattedResponse });
      
      // Update session
      session.messageCount++;
      
    } catch (error) {
      console.error('AI Chat Error:', error);
      await m.client.sendMessage(m.chat, { 
        edit: thinkingMsg.key, 
        text: "⚠️ *My neural networks are experiencing turbulence. Please try again.*" 
      });
    }
  }
});

// Format AI response based on user type
function formatAIResponse(response, userType, userName) {
  const icons = {
    master: "⚡",
    queen: "👑", 
    jemzie: "😎",
    precious: "💖",
    user: "🤖"
  };

  const icon = icons[userType];
  
  return `╭─────────────────────────────────╮
│ ${icon} 𝗖𝗢𝗗𝗘𝗫 𝗔𝗜 𝗥𝗘𝗦𝗣𝗢𝗡𝗦𝗘 ${icon} │
╰─────────────────────────────────╯

${response}

━━━━━━━━━━━━━━━━━━━━━
💬 *Continue with:* codex [your message]`;
}

// Session cleanup
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of codexSessions.entries()) {
    if (now - session.startTime > 180000) { // 3 minutes
      codexSessions.delete(chatId);
    }
  }
}, 60000); // Check every minute

// Export functions for external use if needed
module.exports = {
  codexSessions,
  chatWithAI,
  getUserType,
  formatAIResponse
};


























kord({
  cmd: "spamtags",
  desc: "Spam hidden tags with custom message",
  gc: true,
  fromMe: false, // allow anyone
  type: "group",
}, async (m, text) => {
  try {
    if (!text) return await m.send(`✘ Usage: spamtags <count> <message>\nExample: spamtags 5 hello`);
    
    const [countStr, ...msgArr] = text.split(" ");
    const count = parseInt(countStr);
    const message = msgArr.join(" ");
    
    if (isNaN(count) || count < 1) return await m.send("✘ Invalid count number");
    if (!message) return await m.send("✘ Please provide a message");
    
    const { participants } = await m.client.groupMetadata(m.chat);
    const mentions = participants.map(a => a.jid);
    
    for (let i = 0; i < count; i++) {
      await m.send(message, { mentions });
      await sleep(500); // delay to avoid rate limit
    }
  } catch (e) {
    console.log("cmd error", e);
    return await m.sendErr(e);
  }
});




























let activeGames = {}; // { groupId: { difficulty, answer, timer, startTime, round, streak, scores, hints, lastSolver } }

const DIFFICULTY_CONFIG = {
  easy: { points: 10, timeLimit: 45, emoji: "🟢", color: "GREEN" },
  medium: { points: 20, timeLimit: 35, emoji: "🟡", color: "YELLOW" },
  hard: { points: 30, timeLimit: 25, emoji: "🔴", color: "RED" }
};

const GAME_EMOJIS = {
  start: "🎮",
  correct: "✅",
  wrong: "❌",
  timeout: "⏰",
  hint: "💡",
  trophy: "🏆",
  fire: "🔥",
  brain: "🧠",
  star: "⭐",
  crown: "👑"
};

function shuffleWord(word) {
  let shuffled = word;
  let attempts = 0;
  // Ensure the shuffled word is different from original
  while (shuffled === word && attempts < 10) {
    shuffled = word.split("").sort(() => 0.5 - Math.random()).join("");
    attempts++;
  }
  return shuffled;
}

function getRandomWord(difficulty) {
  const dataPath = path.join(__dirname, "..", "core", "unscramble_word.json");
  const words = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const list = words[difficulty] || [];
  return list[Math.floor(Math.random() * list.length)];
}

function generateHint(word) {
  const hints = [];
  
  // Length hint
  hints.push(`${word.length} letters`);
  
  // First letter hint
  hints.push(`starts with "${word[0].toUpperCase()}"`);
  
  // Vowel count hint
  const vowels = word.match(/[aeiou]/gi) || [];
  hints.push(`${vowels.length} vowel${vowels.length !== 1 ? 's' : ''}`);
  
  // Category hint (you can expand this based on your word categories)
  if (word.length <= 4) hints.push("short word");
  else if (word.length >= 8) hints.push("long word");
  
  return hints[Math.floor(Math.random() * hints.length)];
}

function formatTime(seconds) {
  return `${seconds}s`;
}

function createProgressBar(remaining, total) {
  const filled = Math.floor((remaining / total) * 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

async function sendGameStats(m, game) {
  const topScorers = Object.entries(game.scores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([user, score], index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";
      return `${medal} @${user.split("@")[0]}: ${score} pts`;
    });

  const stats = `
╭─────────────────────╮
│  ${GAME_EMOJIS.trophy} GAME STATISTICS ${GAME_EMOJIS.trophy}  │
├─────────────────────┤
│ Round: ${game.round}               │
│ Streak: ${game.streak} ${game.streak > 5 ? GAME_EMOJIS.fire : ""}          │
│ Difficulty: ${DIFFICULTY_CONFIG[game.difficulty].emoji} ${game.difficulty.toUpperCase()}      │
├─────────────────────┤
│     TOP SCORERS     │
${topScorers.map(scorer => `│ ${scorer.padEnd(19)} │`).join('\n')}
${topScorers.length === 0 ? `│ No scores yet!     │` : ''}
╰─────────────────────╯`;

  await m.send(stats, {
    mentions: Object.keys(game.scores)
  });
}

async function sendNextWord(m, difficulty) {
  const word = getRandomWord(difficulty);
  const shuffled = shuffleWord(word);
  const config = DIFFICULTY_CONFIG[difficulty];
  
  const game = activeGames[m.chat];
  if (game) {
    game.round++;
    game.answer = word;
    game.startTime = Date.now();
    game.hints = 0;
  } else {
    activeGames[m.chat] = {
      difficulty,
      answer: word,
      startTime: Date.now(),
      round: 1,
      streak: 0,
      scores: {},
      hints: 0,
      lastSolver: null
    };
  }

  const gameState = activeGames[m.chat];
  
  // Clear existing timer
  if (gameState.timer) {
    clearTimeout(gameState.timer);
  }

  const gameMessage = `
╭─────────────────────╮
│  ${GAME_EMOJIS.start} UNSCRAMBLE CHALLENGE ${GAME_EMOJIS.start}  │
├─────────────────────┤
│                     │
│   ${shuffled.toUpperCase().split('').join(' ')}   │
│                     │
├─────────────────────┤
│ ${config.emoji} ${difficulty.toUpperCase()} • Round ${gameState.round}    │
│ ${GAME_EMOJIS.star} ${config.points} Points • ⏰ ${config.timeLimit}s    │
│ 💡 Type "hint" for clue │
╰─────────────────────╯

${GAME_EMOJIS.brain} *Unscramble the word above!*
_First correct answer wins ${config.points} points!_`;

  await m.send(gameMessage);

  // Set timeout for the word
  gameState.timer = setTimeout(async () => {
    if (activeGames[m.chat] && activeGames[m.chat].answer === word) {
      activeGames[m.chat].streak = 0; // Reset streak on timeout
      
      const timeoutMessage = `
╭─────────────────────╮
│  ${GAME_EMOJIS.timeout} TIME'S UP! ${GAME_EMOJIS.timeout}          │
├─────────────────────┤
│ The word was:       │
│   *${word.toUpperCase()}*   │
│                     │
│ ${GAME_EMOJIS.brain} Better luck next time! │
╰─────────────────────╯

_Next word coming up..._`;
      
      await m.send(timeoutMessage);
      
      // Send next word after a short delay
      setTimeout(() => {
        if (activeGames[m.chat]) {
          sendNextWord(m, difficulty);
        }
      }, 3000);
    }
  }, config.timeLimit * 1000);
}

kord({
  cmd: "unscramble",
  desc: "Enhanced word unscrambling game with scoring and timers",
  fromMe: wtype,
  type: "group"
}, async (m, text) => {
  const input = text?.trim().toLowerCase();

  if (!input) {
    const helpMessage = `
╭─────────────────────╮
│  ${GAME_EMOJIS.start} UNSCRAMBLE GAME ${GAME_EMOJIS.start}     │
├─────────────────────┤
│                     │
│ ${GAME_EMOJIS.brain} START GAME:          │
│ • ${prefix}unscramble easy     │
│ • ${prefix}unscramble medium   │
│ • ${prefix}unscramble hard     │
│                     │
│ ${GAME_EMOJIS.trophy} GAME CONTROLS:       │
│ • ${prefix}unscramble end      │
│ • ${prefix}unscramble stats    │
│ • Type "hint" for clue │
│                     │
│ ${GAME_EMOJIS.star} DIFFICULTY REWARDS:   │
│ • 🟢 Easy: 10 pts (45s) │
│ • 🟡 Medium: 20 pts (35s)│
│ • 🔴 Hard: 30 pts (25s) │
╰─────────────────────╯

${GAME_EMOJIS.fire} *Challenge your friends and climb the leaderboard!*`;
    
    return await m.send(helpMessage);
  }

  if (input === "end") {
    const game = activeGames[m.chat];
    if (game?.timer) {
      clearTimeout(game.timer);
    }
    
    if (game && Object.keys(game.scores).length > 0) {
      await sendGameStats(m, game);
    }
    
    delete activeGames[m.chat];
    return await m.send(`
╭─────────────────────╮
│  ${GAME_EMOJIS.correct} GAME ENDED ${GAME_EMOJIS.correct}         │
├─────────────────────┤
│ Thanks for playing! │
│ ${GAME_EMOJIS.crown} Great job everyone! ${GAME_EMOJIS.crown}  │
╰─────────────────────╯`);
  }

  if (input === "stats") {
    const game = activeGames[m.chat];
    if (!game) {
      return await m.send(`${GAME_EMOJIS.wrong} No active game found! Start one with \`${prefix}unscramble easy\``);
    }
    return await sendGameStats(m, game);
  }

  if (["easy", "medium", "hard"].includes(input)) {
    // Clear any existing game
    const existingGame = activeGames[m.chat];
    if (existingGame?.timer) {
      clearTimeout(existingGame.timer);
    }
    
    const startMessage = `
╭─────────────────────╮
│  ${GAME_EMOJIS.start} GAME STARTING! ${GAME_EMOJIS.start}      │
├─────────────────────┤
│ Difficulty: ${DIFFICULTY_CONFIG[input].emoji} ${input.toUpperCase()}   │
│ Get ready to think! │
╰─────────────────────╯`;
    
    await m.send(startMessage);
    
    // Start the game after a short delay
    setTimeout(() => {
      sendNextWord(m, input);
    }, 2000);
    return;
  }

  await m.send(`${GAME_EMOJIS.wrong} Invalid option! Use \`easy\`, \`medium\`, \`hard\`, \`end\`, or \`stats\`.`);
});

kord({
  on: "all",
  fromMe: false
}, async (m, text) => {
  const game = activeGames[m.chat];
  if (!game || !text || text.length < 2) return;

  const guess = text.trim().toLowerCase();
  
  // Handle hint requests
  if (guess === "hint" || guess === "💡") {
    if (game.hints >= 2) {
      return await m.send(`${GAME_EMOJIS.wrong} No more hints available for this word!`);
    }
    
    game.hints++;
    const hint = generateHint(game.answer);
    const hintMessage = `
╭─────────────────────╮
│  ${GAME_EMOJIS.hint} HINT ${game.hints}/2 ${GAME_EMOJIS.hint}           │
├─────────────────────┤
│ ${hint.padEnd(19)} │
╰─────────────────────╯`;
    
    return await m.send(hintMessage);
  }

  // Check if guess is correct
  if (guess === game.answer) {
    // Clear the timer
    if (game.timer) {
      clearTimeout(game.timer);
    }
    
    // Calculate points (bonus for speed and fewer hints)
    const timeTaken = (Date.now() - game.startTime) / 1000;
    const basePoints = DIFFICULTY_CONFIG[game.difficulty].points;
    const speedBonus = Math.max(0, Math.floor((DIFFICULTY_CONFIG[game.difficulty].timeLimit - timeTaken) / 2));
    const hintPenalty = game.hints * 2;
    const totalPoints = Math.max(1, basePoints + speedBonus - hintPenalty);
    
    // Update scores
    if (!game.scores[m.sender]) {
      game.scores[m.sender] = 0;
    }
    game.scores[m.sender] += totalPoints;
    
    // Update streak
    if (game.lastSolver === m.sender) {
      game.streak++;
    } else {
      game.streak = 1;
      game.lastSolver = m.sender;
    }
    
    // Special streak bonuses
    let streakBonus = 0;
    if (game.streak >= 3) {
      streakBonus = game.streak * 2;
      game.scores[m.sender] += streakBonus;
    }
    
    const successMessage = `
╭─────────────────────╮
│  ${GAME_EMOJIS.correct} CORRECT! ${GAME_EMOJIS.correct}            │
├─────────────────────┤
│ @${m.sender.split("@")[0].padEnd(17)} │
│ got "${game.answer.toUpperCase()}" right!     │
│                     │
│ ${GAME_EMOJIS.star} Points: +${totalPoints}${speedBonus > 0 ? ` (+${speedBonus} speed)` : ''}  │
${streakBonus > 0 ? `│ ${GAME_EMOJIS.fire} Streak: ${game.streak}! +${streakBonus} bonus │` : ''}
│ ⏰ Time: ${formatTime(Math.floor(timeTaken))}           │
│ Total: ${game.scores[m.sender]} pts          │
╰─────────────────────╯

_Next word in 3 seconds..._`;
    
    await m.send(successMessage, {
      mentions: [m.sender]
    });
    
    // Send next word after a delay
    setTimeout(() => {
      if (activeGames[m.chat]) {
        sendNextWord(m, game.difficulty);
      }
    }, 3000);
    
    return;
  }
  
  // Handle wrong guesses (only if they seem like attempts)
  if (guess.length >= 3 && /^[a-z]+$/.test(guess)) {
    const encouragement = [
      "Not quite! Keep trying! 💪",
      "Close, but not quite! 🤔",
      "Try again! You've got this! 🎯",
      "Almost there! Think harder! 🧠",
      "Nope, but don't give up! 🔥"
    ];
    
    // Don't spam - only respond occasionally to wrong guesses
    if (Math.random() < 0.3) {
      await m.send(encouragement[Math.floor(Math.random() * encouragement.length)]);
    }
  }
});











