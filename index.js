import 'dotenv/config';
import { getServersResourceUsageAndSendToDiscord } from './commands/serverUsageReport.js';
import './commands/serverPingReport.js';
import './commands/serverUsageReport.js';
import client from './client.js';
import { sendPingReport } from './commands/serverPingReport.js';

const DISCORD_API = process.env.DISCORD_API;
client.login(DISCORD_API);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log("Bot is ready ✅");

    getServersResourceUsageAndSendToDiscord();
    sendPingReport();
    setInterval(sendPingReport, 3600000);
    setInterval(getServersResourceUsageAndSendToDiscord, 3600000); 
    // 1 jam
});
