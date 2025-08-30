/* 
 * Copyright © 2025 Mirage
 * This file is part of Kord and is licensed under the GNU GPLv3.
 * And I hope you know what you're doing here.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file or https://www.gnu.org/licenses/gpl-3.0.html
 * -------------------------------------------------------------------------------
 */

const os = require("os")
const { changeFont } = require("../core")
const { prefix, kord, wtype, secondsToHms, config, commands } = require("../core")
const { version } = require("../package.json")

const format = (bytes) => {
  const sizes = ["B", "KB", "MB", "GB"]
  if (bytes === 0) return "0 B"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + sizes[i]
}

function clockString(ms) {
  let h = isNaN(ms) ? "--" : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? "--" : Math.floor(ms % 3600000 / 60000)
  let s = isNaN(ms) ? "--" : Math.floor(ms % 60000 / 1000)
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(":")
}

const getRandomFont = () => {
  return "sansItalic"
}

// Modern design elements
const designs = {
  // Cyberpunk neon style
  cyber: {
    header: (botName) => `╭─────────●◉◎◉●─────────╮
│    ▓▓ ${botName} ▓▓    │
│  ◢◤◢◤ COMMAND MATRIX ◥◣◥◣  │
╰─────────●◉◎◉●─────────╯`,
    
    categoryHeader: (cat, count) => `
╔═══════▓▓▓ ${cat} ▓▓▓═══════╗
║  ◆ ${count} Commands Available ◆  ║
╚═════════════════════════════╝`,
    
    commandItem: (cmd) => `▸ ⟨${cmd}⟩`,
    
    footer: `╭─────●◉ STATUS ◉●─────╮
│ SYSTEM: ONLINE ✓     │
│ CONNECTION: STABLE   │
╰─────────◉●◉─────────╯`
  },

  // Minimalist modern
  minimal: {
    header: (botName) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ${botName}
    Command Interface
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    
    categoryHeader: (cat, count) => `
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
   ${cat}  •  ${count} commands
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`,
    
    commandItem: (cmd) => `• ${cmd}`,
    
    footer: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  },

  // Futuristic hologram
  hologram: {
    header: (botName) => `
◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤
▓░  ░▒▓█ ${botName} █▓▒░  ░▓
◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢
┃ HOLOGRAPHIC INTERFACE ACTIVE ┃
◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤`,
    
    categoryHeader: (cat, count) => `
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓ ◆ ${cat} ◆
▓ ${count} functions loaded
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓`,
    
    commandItem: (cmd) => `▣ ${cmd}`,
    
    footer: `◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣◥◣`
  },

  // Elegant premium
  premium: {
    header: (botName) => `
╔═══════════════════════════╗
║  ◊ ◊ ◊  ${botName}  ◊ ◊ ◊  ║
║    Premium Command Suite   ║
╚═══════════════════════════╝`,
    
    categoryHeader: (cat, count) => `
┌─────────────────────────────┐
│   ▸ ${cat}
│   ▸ ${count} available commands
└─────────────────────────────┘`,
    
    commandItem: (cmd) => `◈ ${cmd}`,
    
    footer: `╚═══════════════════════════╝`
  },

  // Gaming/RGB style
  gaming: {
    header: (botName) => `
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
██ ░░░░░ ${botName} ░░░░░ ██
██ ▓▓▓ GAMING CONSOLE ▓▓▓ ██
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀`,
    
    categoryHeader: (cat, count) => `
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓   🎮 ${cat}
▓   🎯 ${count} Commands Ready
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓`,
    
    commandItem: (cmd) => `▶ ${cmd}`,
    
    footer: `▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀`
  }
}

// Get random design style
const getDesignStyle = () => {
  const styles = Object.keys(designs)
  return styles[Math.floor(Math.random() * styles.length)]
}

kord({
  cmd: "menu|help",
  desc: "list of commands",
  react: "💬",
  fromMe: wtype,
  type: "help",
}, async (m) => {
  try {
    const types = {}
    commands.forEach(({ cmd, type }) => {
      if (!cmd) return
      const main = cmd.split("|")[0].trim()
      const cat = type || "other"
      if (!types[cat]) types[cat] = []
      types[cat].push(main)
    })

    const requestedType = m.text ? m.text.toLowerCase().trim() : null
    const availableTypes = Object.keys(types).map(t => t.toLowerCase())
    
    const more = String.fromCharCode(8206)
    const readmore = more.repeat(4001)
    
    // Select random design style for variety
    const currentDesign = designs[getDesignStyle()]
    
    if (requestedType && availableTypes.includes(requestedType)) {
      const actualType = Object.keys(types).find(t => t.toLowerCase() === requestedType)
      
      const at = await changeFont(actualType.toUpperCase(), "monospace")
      const cmdList = types[actualType].map(cmd => 
        currentDesign.commandItem(`${prefix}${cmd.replace(/[^a-zA-Z0-9-+]/g, "")}`)
      ).join('\n')
      const formattedCmds = await changeFont(cmdList, getRandomFont())
      
      let menu = `${currentDesign.header(config().BOT_NAME)}
${readmore}

${currentDesign.categoryHeader(actualType.toUpperCase(), types[actualType].length)}

${formattedCmds}

${currentDesign.footer}

💡 Tip: Use ${prefix}menu to see all categories`
      
      return m.send(menu)
    }
    
    const date = new Date().toLocaleDateString()
    const time = new Date().toLocaleTimeString()
    const uptime = await secondsToHms(process.uptime())
    const memoryUsage = format(os.totalmem() - os.freemem())
    
    // Premium stats header with different style
    let menu = `
╔══════════════════════════════╗
║     ✦ ${config().BOT_NAME} CONTROL PANEL ✦     ║
╠══════════════════════════════╣
║ 👤 User: ${m.pushName}
║ 🏆 Owner: ${config().OWNER_NAME}
║ 📊 Plugins: ${commands.length}
║ ⏱️ Uptime: ${uptime}
║ 💾 Memory: ${memoryUsage}
║ 🔖 Version: v${version}
║ 📱 Platform: ${m.client.platform()}
╚══════════════════════════════╝
${readmore}

`

    const categoryList = Object.keys(types).map(async (type) => {
      const cmdList = types[type].map(cmd => 
        `│ ▫️ ${prefix}${cmd.replace(/[^a-zA-Z0-9-+]/g, "")}`
      ).join('\n')
      const formattedCmds = await changeFont(cmdList, getRandomFont())
      const tty = await changeFont(type.toUpperCase(), "monospace")
      
      // Different category styles - alternating for visual variety
      const categoryStyles = [
        // Style 1: Modern boxes
        `╭─────────────────────────────╮
│  🎯 ${tty} (${types[type].length})
├─────────────────────────────┤
${formattedCmds}
╰─────────────────────────────╯`,
        
        // Style 2: Neon borders
        `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓ ⚡ ${tty} • ${types[type].length} commands
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
${formattedCmds}
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀`,
        
        // Style 3: Clean minimal
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔥 ${tty} • ${types[type].length} available
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${formattedCmds}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        
        // Style 4: Gaming style
        `████████████████████████████████
██ 🎮 ${tty} - ${types[type].length} READY ██
████████████████████████████████
${formattedCmds}
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀`
      ]
      
      const typeIndex = Object.keys(types).indexOf(type)
      return categoryStyles[typeIndex % categoryStyles.length]
    })

    const resolvedCategoryList = await Promise.all(categoryList)
    menu += resolvedCategoryList.join('\n\n')

    // Premium footer
    menu += `

╔═══════════════════════════════╗
║           💎 PREMIUM TIPS 💎           ║
╠═══════════════════════════════╣
║ • Use ${prefix}menu [category] for details
║ • Commands update automatically
║ • Type ${prefix}help for quick access
║ • Enjoying the bot? Rate us! ⭐
╚═══════════════════════════════╝

⚡ Powered by Advanced AI • Built with ❤️`

    const final = menu.trim()
 try {
  if (config().MENU_IMAGE)
    return m.send(config().MENU_IMAGE, { caption: final }, "image")
   } catch (e) {}

   return m.send(final)
  } catch (e) {
    console.log("cmd error", e)
    return await m.sendErr(e)
  }
})
