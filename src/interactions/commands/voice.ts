import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import { Client, CommandInteraction, GuildMember } from "discord.js";
import mp3Duration from 'mp3-duration';
import fs from 'fs';
import { Config } from '../../config';


export default {
    name: 'voice',
    run: async (client: Client, interaction: CommandInteraction) => {

        if (!interaction.guildId) return interaction.reply({
            content: '<:dnd_status:949003440091201587> This command can only be used inside of a server.',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: 'Learn about Waya',
                            url: `https://waya.one`
                        },
                        {
                            type: 2,
                            style: 5,
                            label: 'Invite Auditional Text',
                            url: 'https://discord.com/api/oauth2/authorize?client_id=985213199248924722&permissions=3197952&scope=bot%20applications.commands'
                        },
                        {
                            type: 2,
                            style: 5,
                            label: 'Vote for us',
                            url: 'https://top.gg/bot/985213199248924722/vote'
                        }
                    ]
                }
            ],
            ephemeral: true
        });

        if (!interaction.guild?.members.me?.permissionsIn(interaction.channel?.id || '').has(['ViewChannel', 'SendMessages'])) return interaction.reply({
            content: '<:dnd_status:949003440091201587> I\'m not able to send messages in this channel.',
            ephemeral: true
        });

        const member: GuildMember | undefined | null = interaction.guild?.members.cache.get(interaction.user.id) || await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
        if (!member?.voice.channelId) return interaction.reply({
            content: '<:dnd_status:949003440091201587> You\'re not connexted to any Voice Channels.',
            ephemeral: true
        });

        if (!interaction.guild?.members.me?.permissionsIn(member.voice.channelId).has(['ViewChannel', 'Connect', 'Speak'])) return interaction.reply({
            content: '<:dnd_status:949003440091201587> I\'m not able to Connect/Speak in your Voice Channel.',
            ephemeral: true
        });

        if ((client as any)._playing[interaction.guild?.id || '']) return interaction.reply({
            content: `<:dnd_status:949003440091201587> Please wait until the current audio by <@${interaction.user.id}> is done playing.`,
            ephemeral: true
        });

        await interaction.deferReply();
        //@ts-ignore
        const textInput: string = interaction.options.getString('text');
        //@ts-ignore
        const speaker: string = interaction.options.getString('speaker');

        const res = await fetch(Config.api + (speaker || 'en_us_002') + '&req_text=' + textInput.replace(/ +/g, '%20').slice(0, 300), { method: 'POST' });
        const data = await res.json();

        const name: string = `${interaction.user.id}.mp3`;
        await fs.writeFileSync(name, Buffer.from(data.data.v_str.replace('data:audio/mp3; codecs=opus;base64,', ''), 'base64'))

        mp3Duration(name, async (err: any, duration: number) => {

            if (!interaction.guild?.voiceAdapterCreator) return;
            const connection = joinVoiceChannel({
                channelId: member?.voice.channelId || '',
                guildId: interaction.guildId || '',
                adapterCreator: interaction.guild?.voiceAdapterCreator
            });

            (client as any)._playing[interaction.guild?.id || ''] = interaction.user.id;
            (client as any)._disconnect[interaction.guild?.id || ''] = new Date().getTime();

            const player = await createAudioPlayer();
            const resource = await createAudioResource((client as any).path.replace("dist", "") + `${interaction.user.id}.mp3`)

            await connection.subscribe(player);
            await player.play(resource);

            await interaction.editReply({ content: `<:online_status:949003338186383491> Now playing in <#${member?.voice.channelId}>, ${duration} seconds long` });
            setTimeout(() => {
                fs.unlink(`./${name}`, () => null);
                delete (client as any)._playing[interaction.guild?.id || ''];
            }, (duration * 1000) + 1000);

            setTimeout(() => {
                if (((client as any)._disconnect[interaction.guild?.id || ''] + ((duration * 1000) + 10000)) < new Date().getTime()) {
                    return connection.disconnect();
                }
            }, (duration * 1000) + 10000);

        });

    }
};