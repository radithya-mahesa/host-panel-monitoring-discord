import 'dotenv/config'; 
import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import client from '../client.js';
const APPLICATION_API_URL = 'https://panel.gta-samp.my.id/api/application/servers';
const CLIENT_API_BASE_URL = 'https://panel.gta-samp.my.id/api/client/servers';

const PTERODACTYL_APPLICATION_API_KEY = process.env.PTERODACTYL_APPLICATION_API_KEY;
const PTERODACTYL_CLIENT_API_KEY = process.env.PTERODACTYL_CLIENT_API_KEY;

const CHANNEL_ID = process.env.CHANNEL_ID;
/**
 * Fetches server status from Pterodactyl Application API and sends a summarized update to Discord.
 */

export async function getServersResourceUsageAndSendToDiscord() {
    const startTime = Date.now();
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);

    if (!channel) {
        console.error("Channel not found! Please check CHANNEL_ID in your .env file.");
        return;
    }

    if (!PTERODACTYL_APPLICATION_API_KEY || !PTERODACTYL_CLIENT_API_KEY) {
        console.error("Both PTERODACTYL_APPLICATION_API_KEY and PTERODACTYL_CLIENT_API_KEY must be set to fetch resource usage.");
        channel.send({
            embeds: [
                new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Konfigurasi API Error')
                .setDescription('Kedua kunci API (`PTERODACTYL_APPLICATION_API_KEY` dan `PTERODACTYL_CLIENT_API_KEY`) harus ditemukan untuk mengambil penggunaan resource.')
                .setFooter({
                    text: `Update terakhir pada ${new Date().toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta'
                    })}`
                })
            ]
        });
        return;
    }

    try {
        const appResponse = await fetch(APPLICATION_API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${PTERODACTYL_APPLICATION_API_KEY}`
            },
        });

        if (!appResponse.ok) {
            const errorText = await appResponse.text();
            throw new Error(`Failed to get server list from Application API: ${appResponse.status} - ${errorText}`);
        }

        const appData = await appResponse.json();
        const servers = appData.data;
        const totalServers = servers.length;

        let totalCpuAbsolute = 0;
        let totalMemoryUsed = 0;
        let totalMemoryLimit = 0;
        let totalDiskUsed = 0;
        let totalDiskLimit = 0;
        let totalNetworkRx = 0;
        let totalNetworkTx = 0;

        const resourcePromises = servers.map(async (server) => {
            const serverUuid = server.attributes.uuid;
            const serverName = server.attributes.name;
            const serverMemoryLimitBytes = server.attributes.limits.memory * 1024 * 1024;
            const serverDiskLimitBytes = server.attributes.limits.disk * 1024 * 1024;

            try {
                const resourceApiUrl = `${CLIENT_API_BASE_URL}/${serverUuid}/resources`;
                const resourceResponse = await fetch(resourceApiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${PTERODACTYL_CLIENT_API_KEY}`
                    },
                });

                if (resourceResponse.ok) {
                    const resourceData = await resourceResponse.json();
                    const resources = resourceData.attributes.resources;

                    totalCpuAbsolute += resources.cpu_absolute || 0;
                    totalMemoryUsed += (resources.memory_bytes || 0);
                    totalDiskUsed += (resources.disk_bytes || 0);
                    totalNetworkRx += (resources.network_rx_bytes || 0);
                    totalNetworkTx += (resources.network_tx_bytes || 0);

                    totalMemoryLimit += serverMemoryLimitBytes;
                    totalDiskLimit += serverDiskLimitBytes;

                } else {
                    console.warn(`Could not fetch resources for server ${serverName} (${serverUuid}): ${resourceResponse.status} - ${await resourceResponse.text()}`);
                }
            } catch (resourceError) {
                console.error(`Error fetching resources for server ${serverName} (${serverUuid}):`, resourceError.message);
            }
        });

        await Promise.allSettled(resourcePromises);

        const endTime = Date.now();
        const pingTime = endTime - startTime;

        const formatBytes = (bytes, decimals = 2) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        };

        const embedColor = 0x3498DB;

        const resourceEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('📊 **Server Usage Report 1** 📊')
            .setDescription('Ringkasan penggunaan CPU, Memori, Disk, dan Jaringan dari semua server aktif pada server 1.')
            .addFields(
                {
                    name: 'Total Server',
                    value: `\`${totalServers}\``,
                    inline: true
                },
                {
                    name: 'Total CPU Load',
                    value: `\`${totalCpuAbsolute.toFixed(2)}%\``,
                    inline: true
                },
                {
                    name: 'Total Memory',
                    value: `\`${formatBytes(totalMemoryUsed)} / ${formatBytes(totalMemoryLimit)}\``,
                    inline: true
                },
                {
                    name: 'Total Disk',
                    value: `\`${formatBytes(totalDiskUsed)} / ${formatBytes(totalDiskLimit)}\``,
                    inline: true
                },
                {
                    name: 'Total Network Inbound',
                    value: `\`${formatBytes(totalNetworkRx)}\``,
                    inline: true
                },
                {
                    name: 'Total Network Outbound',
                    value: `\`${formatBytes(totalNetworkTx)}\``,
                    inline: true
                },
                {
                    name: '',
                    value: 'Pesan ini akan dikirim setiap 1 jam sekali.',
                    inline: false 
                }
            )
            .setFooter({
                text: `Data diambil pada ${new Date().toLocaleString('id-ID', {
                    timeZone: 'Asia/Jakarta'
                })}`
            })

        channel.send({
            embeds: [resourceEmbed]
        });

    } catch (error) {
        const endTime = Date.now();
        const pingTime = endTime - startTime;
        console.error('Error fetching total resource data:', error);
        if (channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Kesalahan Mengambil Resource Total')
                .setDescription(`Terjadi kesalahan saat mencoba mendapatkan total penggunaan resource.\n\`\`\`${error.message}\`\`\``)
                .addFields({
                    name: 'API Latency (saat error)',
                    value: `\`${pingTime}ms\``,
                    inline: true
                })
                .setFooter({
                    text: `Update terakhir pada ${new Date().toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta'
                    })}`
                });
            channel.send({
                embeds: [errorEmbed]
            });
        }
    }
}


