import 'dotenv/config';
import { EmbedBuilder } from 'discord.js';
import { exec } from 'child_process';
import os from 'os';
import client from '../client.js';

// isi variabelnya, sesuaikan sama yang di .env
const ip = process.env.IP_ADDRESS;
const DISCORD_API = process.env.DISCORD_API;
const CHANNEL_ID = process.env.CHANNEL_ID;

// pengecekan apakah platform adalah Windows
const isWindows = os.platform() === 'win32';
// ini variable eksekusi perintah
const cmd = isWindows ? `ping -n 4 ${ip}` : `ping -c 4 ${ip}`;

client.login(DISCORD_API);

// ini trigger manual ping report dengan command
client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;
    if (msg.content.toLowerCase() === '!pingcheck') {
        const channel = msg.channel;
        sendPingReport(channel);
    }
});

// parsing output ping yang Windows
function parseWindowsPing(output) {
    return {
        loss: output.match(/Lost = \d+ \((\d+)% loss\)/)?.[1] + '%' || 'unknown',
        avgPing: output.match(/Average = (\d+)ms/)?.[1] + 'ms' || 'unknown',
        min: output.match(/Minimum = (\d+)ms/)?.[1] + 'ms' || 'unknown',
        max: output.match(/Maximum = (\d+)ms/)?.[1] + 'ms' || 'unknown',
        sent: output.match(/Sent = (\d+)/)?.[1] || '4',
        received: output.match(/Received = (\d+)/)?.[1] || '4',
        lost: output.match(/Lost = (\d+)/)?.[1] || '0',
    };
}

// parsing output ping yang Linux
function parseLinuxPing(output) {
    const statsMatch = output.match(/(\d+) packets transmitted, (\d+) received, .* (\d+\.?\d*)% packet loss/);
    const avgMatch = output.match(/rtt .* = .*\/(.*?)\//);

    return {
        loss: statsMatch?.[3] + '%' || 'unknown',
        avgPing: avgMatch?.[1] + 'ms' || 'unknown',
        min: 'unknown', 
        max: 'unknown',
        sent: statsMatch?.[1] || '4',
        received: statsMatch?.[2] || '4',
        lost: ((parseInt(statsMatch?.[1]) || 4) - (parseInt(statsMatch?.[2]) || 0)).toString(),
    };
}

// fungsi ini untuk pilih parser yang sesuai berdasarkan platform (Windows atau Linux)
function parsePingOutput(output) {
    return isWindows ? parseWindowsPing(output) : parseLinuxPing(output);
}

// fungsi yang akan kirim laporan ping ke channel discord
export async function sendPingReport(channelOverride) {
    const channel = channelOverride || await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!channel) return;

    // eksekusi perintah variable cmd
    exec(cmd, (err, stdout, stderr) => {
        // operator if untuk menangani error
        if (err) {
            console.error('Ping error:', err.message);
            channel.send('❌ Gagal melakukan ping ke host.');
            return;
        }

        // untuk menangkap output stdout dan stderr
        const output = stdout.toString()
        const { loss, avgPing, min, max, sent, received, lost } = parsePingOutput(output)

        // chat yg dikirim dalam bentuk embed
        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("📡 Ping & Packet Loss Report")
            .addFields(
                {
                    name: "PING 🏓 :",
                    value: `**Minimum =** \`${min},\` **Maximum =** \`${max},\`\n(avg. \`${avgPing}\`)`,
                    inline: true,
                },
                {
                    name: "Packet Loss 📩 :",
                    value: `**Sent =** \`${sent}\`, **Received =** \`${received}\`, **Lost =** \`${lost}\` \n(avg. \`${loss}\`)`,
                    inline: false,
                }
            )
            .setFooter({
                text: `Data diambil pada ${new Date().toLocaleString('id-ID', {
                    timeZone: 'Asia/Jakarta'
                })}`
            });

        channel.send({ embeds: [embed] });
    });
}
