require('dotenv').config();
const { Client, GatewayIntentBits} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const DISCORD_API = process.env.DISCORD_API
const CHANNEL_ID = process.env.CHANNEL_ID;

client.login(DISCORD_API)
client.on('ready', () => {
    console.log("Alive");

    // Loop berdasarkan interval 10 detik
    setInterval(() => {
        const channel = client.channels.cache.get(CHANNEL_ID);
        if (channel) {
            channel.send('test message'); //send tanpa mention
        } else {
            console.log("Channel not found!");
        }
    }, 10000); 
})
client.on('messageCreate', async (msg) =>{
    if (msg.author.bot) return;
    ping(msg);    
});

// const ping = (msg) => {
//     const messageContent = msg.content.toLowerCase();
//     if (messageContent === 'ping') {
//         msg.reply('pong');
//     }
// }


