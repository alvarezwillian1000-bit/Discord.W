import {
  Events,
  type Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { getGuildConfig } from "../utils/config.js";
import { getRobloxUser } from "../utils/roblox.js";
import { activeGiveaways, buildGiveawayEmbed } from "../utils/giveaways.js";
import { db } from "@workspace/db";
import { verificationsTable, ticketsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger.js";

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction) {
  // ── Slash commands ──────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const command = (interaction.client as any).commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(err, "Error ejecutando comando");
      const msg = { content: "❌ Ocurrió un error ejecutando este comando.", ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
    return;
  }

  // ── Buttons ─────────────────────────────────────────────────────────────
  if (interaction.isButton()) {

    // — Verificación —
    if (interaction.customId.startsWith("verify_")) {
      const targetUserId = interaction.customId.split("_")[1];
      if (interaction.user.id !== targetUserId) {
        await interaction.reply({ content: "❌ Este botón de verificación no es tuyo.", ephemeral: true });
        return;
      }
      const modal = new ModalBuilder()
        .setCustomId(`verify_modal_${interaction.user.id}`)
        .setTitle("🔰 Verificación con Roblox");
      const robloxInput = new TextInputBuilder()
        .setCustomId("roblox_username")
        .setLabel("Tu nombre de usuario en Roblox")
        .setPlaceholder("Ej: CoolPlayer123")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(robloxInput));
      await interaction.showModal(modal);
      return;
    }

    // — Abrir ticket —
    if (interaction.customId === "open_ticket") {
      const modal = new ModalBuilder()
        .setCustomId("ticket_modal")
        .setTitle("📩 Crear Ticket de Soporte");
      const nameInput = new TextInputBuilder()
        .setCustomId("ticket_roblox_name")
        .setLabel("Tu nombre de usuario en Roblox")
        .setPlaceholder("Ej: CoolPlayer123")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);
      const reasonInput = new TextInputBuilder()
        .setCustomId("ticket_reason")
        .setLabel("¿Con qué necesitas ayuda?")
        .setPlaceholder("Describe brevemente tu problema...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );
      await interaction.showModal(modal);
      return;
    }

    // — Cerrar ticket —
    if (interaction.customId === "close_ticket") {
      if (!interaction.channel) return;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔒 Ticket cerrado")
        .setDescription(`Ticket cerrado por ${interaction.user}. El canal se eliminará en 5 segundos.`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

      // Marcar ticket como cerrado en DB
      const channelId = interaction.channel.id;
      await db
        .update(ticketsTable)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(ticketsTable.channelId, channelId))
        .catch(() => {});

      setTimeout(() => interaction.channel?.delete().catch(() => {}), 5000);
      return;
    }

    // — Participar en sorteo —
    if (interaction.customId === "giveaway_join") {
      const message = interaction.message;
      const giveaway = activeGiveaways.get(message.id);
      if (!giveaway || giveaway.ended) {
        await interaction.reply({ content: "❌ Este sorteo ya ha finalizado.", ephemeral: true });
        return;
      }
      if (giveaway.participants.includes(interaction.user.id)) {
        giveaway.participants = giveaway.participants.filter((id) => id !== interaction.user.id);
        await message.edit({ embeds: [buildGiveawayEmbed(giveaway)] });
        await interaction.reply({ content: "↩️ Has salido del sorteo.", ephemeral: true });
      } else {
        giveaway.participants.push(interaction.user.id);
        await message.edit({ embeds: [buildGiveawayEmbed(giveaway)] });
        await interaction.reply({ content: "🎉 ¡Te has unido al sorteo! Pulsa de nuevo para salir.", ephemeral: true });
      }
      return;
    }

    // — Ver participantes del sorteo —
    if (interaction.customId === "giveaway_info") {
      const giveaway = activeGiveaways.get(interaction.message.id);
      if (!giveaway) {
        await interaction.reply({ content: "❌ No encontré información de este sorteo.", ephemeral: true });
        return;
      }
      const count = giveaway.participants.length;
      const list =
        count > 0
          ? giveaway.participants.slice(0, 20).map((id) => `<@${id}>`).join(", ") +
            (count > 20 ? ` y ${count - 20} más...` : "")
          : "Nadie ha participado aún.";
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`👥 Participantes — ${giveaway.prize}`)
        .setDescription(list)
        .addFields({ name: "Total", value: String(count), inline: true })
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  }

  // ── Modals ───────────────────────────────────────────────────────────────
  if (interaction.isModalSubmit()) {

    // — Modal verificación —
    if (interaction.customId.startsWith("verify_modal_")) {
      await interaction.deferReply({ ephemeral: true });
      const username = interaction.fields.getTextInputValue("roblox_username").trim();
      const roblox = await getRobloxUser(username);

      if (!roblox) {
        await interaction.editReply({
          content: `❌ No encontré el usuario de Roblox **${username}**. Verifica que el nombre sea correcto.`,
        });
        return;
      }

      const config = await getGuildConfig(interaction.guildId!);
      const guild = interaction.guild!;
      const member = await guild.members.fetch(interaction.user.id).catch(() => null);

      if (!member) {
        await interaction.editReply({ content: "❌ No pude encontrarte en el servidor." });
        return;
      }

      let roleMention = "";
      if (config.verifiedRoleId) {
        const role = guild.roles.cache.get(config.verifiedRoleId);
        if (role) {
          try {
            await member.roles.add(role);
            roleMention = `\nSe te asignó el rol **${role.name}** ✅`;
          } catch (e) {
            logger.error(e, "Error añadiendo rol verificado");
            roleMention =
              "\n⚠️ No pude asignarte el rol (asegúrate de que el rol del bot esté por encima del rol Verificado).";
          }
        }
      } else {
        roleMention = "\n⚠️ No hay rol verificado configurado. Un admin debe usar `/setup-bienvenida`.";
      }

      // Guardar verificación en DB
      await db
        .insert(verificationsTable)
        .values({
          guildId: interaction.guildId!,
          discordUserId: interaction.user.id,
          discordUserTag: interaction.user.tag,
          robloxUsername: roblox.name,
          robloxUserId: String(roblox.id),
          robloxProfileUrl: roblox.profileUrl,
        })
        .catch((e) => logger.error(e, "Error guardando verificación en DB"));

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ ¡Verificación exitosa!")
        .setDescription(
          `Te has verificado como **[${roblox.displayName}](${roblox.profileUrl})** en Roblox.${roleMention}`
        )
        .setThumbnail(roblox.avatarUrl ?? null)
        .addFields(
          { name: "🎮 Usuario Roblox", value: `[${roblox.name}](${roblox.profileUrl})`, inline: true },
          { name: "🆔 ID Roblox", value: String(roblox.id), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // — Modal ticket —
    if (interaction.customId === "ticket_modal") {
      await interaction.deferReply({ ephemeral: true });
      const robloxName = interaction.fields.getTextInputValue("ticket_roblox_name").trim();
      const reason = interaction.fields.getTextInputValue("ticket_reason").trim();
      const guild = interaction.guild!;
      const config = await getGuildConfig(guild.id);
      const roblox = await getRobloxUser(robloxName);

      const ticketChannel = await guild.channels.create({
        name: `ticket-${robloxName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId ?? undefined,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      const staffRoles = guild.roles.cache.filter(
        (r) => r.permissions.has(PermissionFlagsBits.ManageChannels) && !r.managed
      );
      for (const [, role] of staffRoles) {
        await ticketChannel.permissionOverwrites.create(role, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
      }

      const robloxField = roblox
        ? `[${roblox.name}](${roblox.profileUrl})`
        : `${robloxName} *(no encontrado en Roblox)*`;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📩 Ticket de ${robloxName}`)
        .setDescription(`**${interaction.user}** ha abierto un ticket.`)
        .addFields(
          { name: "👤 Usuario Discord", value: interaction.user.tag, inline: true },
          { name: "🎮 Cuenta Roblox", value: robloxField, inline: true },
          { name: "📝 Motivo", value: reason }
        )
        .setThumbnail(roblox?.avatarUrl ?? interaction.user.displayAvatarURL())
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Cerrar Ticket")
        .setStyle(ButtonStyle.Danger);

      await ticketChannel.send({
        content: `${interaction.user} | Staff: revisa este ticket.`,
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton)],
      });

      // Guardar ticket en DB
      await db
        .insert(ticketsTable)
        .values({
          guildId: guild.id,
          channelId: ticketChannel.id,
          discordUserId: interaction.user.id,
          discordUserTag: interaction.user.tag,
          robloxUsername: robloxName,
          robloxProfileUrl: roblox?.profileUrl ?? null,
          reason,
          status: "open",
        })
        .catch((e) => logger.error(e, "Error guardando ticket en DB"));

      await interaction.editReply({
        content: `✅ Tu ticket fue creado en ${ticketChannel}. El staff te atenderá pronto.`,
      });
    }
  }
}
