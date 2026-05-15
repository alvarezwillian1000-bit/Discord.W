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
import { db, verificationsTable, ticketsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import { addVerificationJson, addTicketJson, closeTicketJson } from "../utils/db-json.js";

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
      logger.error(err, `Error ejecutando comando /${interaction.commandName}`);
      const msg = { content: "❌ Ocurrió un error ejecutando este comando. Inténtalo de nuevo.", ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
    return;
  }

  // ── Buttons ─────────────────────────────────────────────────────────────
  if (interaction.isButton()) {

    // — Verificación v1 (bienvenida para nuevos) —
    if (interaction.customId.startsWith("verify_") && !interaction.customId.startsWith("verify2")) {
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

    // — Verificación v2 (para todos los usuarios del servidor) — muestra modal con Roblox
    if (interaction.customId === "verify2") {
      const config = await getGuildConfig(interaction.guildId!);
      const guild = interaction.guild!;
      const member = await guild.members.fetch(interaction.user.id).catch(() => null);

      if (!member) {
        await interaction.reply({ content: "❌ No pude encontrarte en el servidor.", ephemeral: true });
        return;
      }

      // Si ya tiene el rol, informar
      if (config.verifiedRoleId2 && member.roles.cache.has(config.verifiedRoleId2)) {
        await interaction.reply({ content: "✅ Ya estás verificado en este servidor.", ephemeral: true });
        return;
      }

      // Mostrar modal pidiendo usuario de Roblox
      const modal = new ModalBuilder()
        .setCustomId("verify2_modal")
        .setTitle("🔰 Verificación del Servidor");

      const robloxInput = new TextInputBuilder()
        .setCustomId("roblox_username")
        .setLabel("Tu nombre de usuario en Roblox")
        .setPlaceholder("Ej: CoolPlayer123")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(3)
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

      const channelId = interaction.channel.id;
      try {
        await db
          .update(ticketsTable)
          .set({ status: "closed", closedAt: new Date() })
          .where(eq(ticketsTable.channelId, channelId));
      } catch {
        await closeTicketJson(channelId);
      }

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

    // — Modal verificación v1 (bienvenida) —
    if (interaction.customId.startsWith("verify_modal_")) {
      await interaction.deferReply({ ephemeral: true });
      const username = interaction.fields.getTextInputValue("roblox_username").trim();
      const roblox = await getRobloxUser(username);

      if (!roblox) {
        await interaction.editReply({
          content: `❌ No encontré el usuario de Roblox **${username}**. Verifica que el nombre sea correcto y vuelve a intentarlo.`,
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
            logger.error(e, "Error añadiendo rol verificado v1");
            roleMention = "\n⚠️ No pude asignarte el rol automáticamente. Contacta a un admin.";
          }
        }
      }

      try {
        await db.insert(verificationsTable).values({
          guildId: interaction.guildId!,
          discordUserId: interaction.user.id,
          discordUserTag: interaction.user.tag,
          robloxUsername: roblox.name,
          robloxUserId: String(roblox.id),
          robloxProfileUrl: roblox.profileUrl,
        });
      } catch {
        await addVerificationJson({
          guildId: interaction.guildId!,
          discordUserId: interaction.user.id,
          discordUserTag: interaction.user.tag,
          robloxUsername: roblox.name,
          robloxUserId: String(roblox.id),
          robloxProfileUrl: roblox.profileUrl,
        });
      }

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

    // — Modal verificación v2 (para todos) con Roblox —
    if (interaction.customId === "verify2_modal") {
      await interaction.deferReply({ ephemeral: true });
      const username = interaction.fields.getTextInputValue("roblox_username").trim();

      // Verificar que el usuario existe en Roblox
      const roblox = await getRobloxUser(username);

      if (!roblox) {
        await interaction.editReply({
          content: `❌ No encontré el usuario de Roblox **${username}**. Asegúrate de que el nombre sea exactamente correcto (respeta mayúsculas y minúsculas) y vuelve a intentarlo.`,
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

      // Asignar rol verificado
      let roleMention = "";
      if (config.verifiedRoleId2) {
        const role = guild.roles.cache.get(config.verifiedRoleId2);
        if (role) {
          try {
            await member.roles.add(role);
            roleMention = `Se te asignó el rol **${role.name}** ✅`;
          } catch (e) {
            logger.error(e, "Error asignando rol verificado v2");
            roleMention = "⚠️ No pude asignarte el rol automáticamente (el rol del bot debe estar por encima del rol Verificado).";
          }
        }
      } else {
        roleMention = "⚠️ No hay rol verificado configurado. Un admin debe usar `/setup-verificacion2`.";
      }

      // Guardar verificación
      try {
        await db.insert(verificationsTable).values({
          guildId: interaction.guildId!,
          discordUserId: interaction.user.id,
          discordUserTag: interaction.user.tag,
          robloxUsername: roblox.name,
          robloxUserId: String(roblox.id),
          robloxProfileUrl: roblox.profileUrl,
        });
      } catch {
        await addVerificationJson({
          guildId: interaction.guildId!,
          discordUserId: interaction.user.id,
          discordUserTag: interaction.user.tag,
          robloxUsername: roblox.name,
          robloxUserId: String(roblox.id),
          robloxProfileUrl: roblox.profileUrl,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ ¡Verificación exitosa!")
        .setDescription(
          `Te has verificado en el servidor como **[${roblox.displayName}](${roblox.profileUrl})** en Roblox.\n\n${roleMention}\n\n` +
          "Ahora tienes acceso a todos los comandos: `daily`, `trabajar`, `banco`, `balance`, `rank`, `perfil`, `dungeon` y muchos más. 🎉"
        )
        .setThumbnail(roblox.avatarUrl ?? member.user.displayAvatarURL({ size: 256 }))
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

      try {
        await db.insert(ticketsTable).values({
          guildId: guild.id,
          channelId: ticketChannel.id,
          discordUserId: interaction.user.id,
          discordUserTag: interaction.user.tag,
          robloxUsername: robloxName,
          robloxProfileUrl: roblox?.profileUrl ?? null,
          reason,
          status: "open",
        });
      } catch {
        await addTicketJson({
          guildId: guild.id,
          channelId: ticketChannel.id,
          discordUserId: interaction.user.id,
          discordUserTag: interaction.user.tag,
          robloxUsername: robloxName,
          robloxProfileUrl: roblox?.profileUrl ?? null,
          reason,
          status: "open",
        });
      }

      await interaction.editReply({
        content: `✅ Tu ticket fue creado en ${ticketChannel}. El staff te atenderá pronto.`,
      });
    }
  }
}
