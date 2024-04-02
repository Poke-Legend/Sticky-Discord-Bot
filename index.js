const { Client, Intents, MessageEmbed } = require("discord.js");
const { createPool } = require('mysql2/promise');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
    ],
});

const db = createPool({
    host: 'Database Host',
    user: 'Database Username',
    password: 'Database Password',
    database: 'Database Name',
});

const PREFIX = '!'; // Set your desired prefix here

let lastStickyMessageSent = new Map();
let lastStickyMessageID = new Map();

const allowedRoles = ['Role ID', 'Role ID 2', 'Role ID 3']; // Add your second role ID here

const embedFooter = {
    text: '© 2022 - 2024 PokémonLegends',
    iconURL: 'https://i.imgur.com/NyAz7sw.png'
};

client.once('ready', () => {
    console.log('BOT ONLINE!');
    console.log('CODED BY DEVRY!');
});

client.on('messageCreate', async (message) => {
   try {
        const channelID = message.channel.id;

        // Check if the sticky message needs to be reposted after 5 seconds
        if (!lastStickyMessageSent.has(channelID) || Date.now() - lastStickyMessageSent.get(channelID) > 5000) {
            fetchStickyMessage(channelID, message.channel);
            lastStickyMessageSent.set(channelID, Date.now());
        }

        if (message.content.startsWith(PREFIX)) {
            const args = message.content.slice(PREFIX.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            
            if (command === 'help') {
                const embed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('Command Help')
                    .setDescription('Here are the available commands:')
                    .addFields(
                        { name: '!setcolor <color>', value: 'Set the embed color for sticky messages.' },
                        { name: '!setimage <imageURL>', value: 'Set the embed image for sticky messages.' },
                        { name: '!settitle <title>', value: 'Set the title for sticky messages.' },
                        { name: '!stick <message>', value: 'Stick a message to the channel.' },
                        { name: '!unstick', value: 'Unstick the current sticky message.' }
                    )
                    .setFooter(embedFooter);

                message.delete(); // Delete the command message after processing
                deleteLastUserMessage(message); // Delete the last user message

                message.channel.send({ embeds: [embed] });
            } else if (command === 'setcolor') {
                handleSetColorCommand(message, args);
                 message.delete(); // Delete the command message after processing
                deleteLastUserMessage(message); // Delete the last user message
            } else if (command === 'setimage') {
                handleSetImageCommand(message, args);
                 message.delete(); // Delete the command message after processing
                deleteLastUserMessage(message); // Delete the last user message
            } else if (command === 'settitle') {
                handleSetTitleCommand(message, args);
                 message.delete(); // Delete the command message after processing
                deleteLastUserMessage(message); // Delete the last user message
            } else if (command === 'stick') {
                handleStickCommand(message, args);
                 message.delete(); // Delete the command message after processing
                deleteLastUserMessage(message); // Delete the last user message
            } else if (command === 'unstick') {
                handleUnstickCommand(message);
                 message.delete(); // Delete the command message after processing
                deleteLastUserMessage(message); // Delete the last user message
            }
        } else {
            const channelID = message.channel.id;

            // Check if the sticky message needs to be reposted after 5 seconds
            if (!lastStickyMessageSent.has(channelID) || Date.now() - lastStickyMessageSent.get(channelID) > 5000) {
                fetchStickyMessage(channelID, message.channel);
                lastStickyMessageSent.set(channelID, Date.now());
            }
        }
    } catch (error) {
        console.error('Error executing command:', error);
    }
});

async function deleteLastUserMessage(message) {
    try {
        const messages = await message.channel.messages.fetch({ limit: 2 });
        const lastUserMessage = messages.filter(m => m.author.id === message.author.id && !m.author.bot).first();

        if (lastUserMessage) { // Check if the message exists
            await lastUserMessage.delete();
        }
    } catch (error) {
        // Handle specific error code here if needed
    }
}

async function fetchStickyMessage(channelID, channel) {
    try {
        // Fetch the updated sticky message content, embed color, image URL, and title from the database
        const [rows] = await db.query('SELECT message_content, embed_color, embed_image, title FROM sticky_messages WHERE channel_id = ? LIMIT 1', [channelID]);
        if (rows.length > 0) {
            const stickyContent = rows[0].message_content;
            const embedColor = rows[0].embed_color || '#0099ff'; // Default to blue if no color is set
            const embedImage = rows[0].embed_image; // Get the image URL
            const embedTitle = rows[0].title || 'Professor Turo'; // Default to 'Professor Turo' if no title is set

            // Create an embed message with the sticky content, embed color, and title
            const embed = new MessageEmbed()
                .setColor(embedColor)
                .setTitle(embedTitle)
                .setDescription(stickyContent)
                .setThumbnail(embedImage)
                .setFooter(embedFooter);

            // Check if there's a previous sticky message ID in the map
            if (lastStickyMessageID.has(channelID)) {
                const previousStickyMessageID = lastStickyMessageID.get(channelID);
                const previousStickyMessage = await channel.messages.fetch({ around: previousStickyMessageID, limit: 1 });
                if (previousStickyMessage && previousStickyMessage.first().author.bot) {
                    await previousStickyMessage.first().delete(); // Delete the previous bot sticky message
                }
            }

            // Post the new sticky message as an embed
            const newStickyMessage = await channel.send({ embeds: [embed] });
            lastStickyMessageID.set(channelID, newStickyMessage.id); // Update the map with the new sticky message ID
        }
    } catch (error) {
        console.error('Error fetching sticky message:', error);
    }
}

async function handleSetColorCommand(message, args) {
    const color = args[0];
    const channelID = message.channel.id;

    // Check if the user has the required role ID to use the setcolor command
    if (!message.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
        return message.reply('You do not have permission to use this command.');
    }

    // Update the embed color setting in the database for the channel
    await db.execute('UPDATE sticky_messages SET embed_color = ? WHERE channel_id = ?', [color, channelID]);
    message.channel.send('Embed color updated successfully!');
}

async function handleSetImageCommand(message, args) {
    const imageURL = args[0];
    const channelID = message.channel.id;

    // Check if the user has the required role ID to use the setimage command
    if (!message.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
        return message.reply('You do not have permission to use this command.');
    }

    // Update the image URL in the database for the channel
    await db.execute('UPDATE sticky_messages SET embed_image = ? WHERE channel_id = ?', [imageURL, channelID]);
    message.channel.send('Embed image updated successfully!');
}

async function handleSetTitleCommand(message, args) {
    const newTitle = args.join(' ');
    const channelID = message.channel.id;

    // Check if the user has the required role ID to use the settitle command
    if (!message.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
        return message.reply('You do not have permission to use this command.');
    }

    // Update the title in the database for the channel
    await db.execute('UPDATE sticky_messages SET title = ? WHERE channel_id = ?', [newTitle, channelID]);
    message.channel.send('Sticky message title updated successfully!');
}

async function handleStickCommand(message, args) {
    const stickyMessage = args.join(' ');
    const channelID = message.channel.id;

    // Check if the user has the required role ID to use the stick command
    if (!message.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
        return message.reply('You do not have permission to use this command.');
    }

    // Update or insert the sticky message content in the database for the channel
    await db.execute('INSERT INTO sticky_messages (channel_id, message_content) VALUES (?, ?) ON DUPLICATE KEY UPDATE message_content = ?', [channelID, stickyMessage, stickyMessage]);
    message.channel.send('Sticky message updated successfully!');
}

async function handleUnstickCommand(message) {
    const channelID = message.channel.id;

    // Check if the user has the required role ID to use the unstick command
    if (!message.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
        return message.reply('You do not have permission to use this command.');
    }

    // Delete the sticky message from the database for the channel
    await db.execute('DELETE FROM sticky_messages WHERE channel_id = ?', [channelID]);
    message.channel.send('Sticky message removed successfully!');
}

client.login('Token Here');
