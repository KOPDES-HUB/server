import { prisma } from "../lib/prisma";
import { redisConnection } from "../config/redis";

let isPolling = false;
let pollingOffset = 0;

export async function initializeTelegramMenu() {
  try {
    const existing = await prisma.menu.findUnique({
      where: { id: "b5a5be74-104c-4e1d-ac6b-d868cc7a6935" },
    });
    if (!existing) {
      await prisma.menu.create({
        data: {
          id: "b5a5be74-104c-4e1d-ac6b-d868cc7a6935",
          name: "Notifikasi Telegram",
          url: "/settings/notification",
          icon: "BellRing",
          sequence: 11,
          module: "menu",
          type: "MENU",
          permId: "624c3a96-84fa-4c33-b04c-1a311e282d37", // HOME permission
        },
      });
      console.log("✅ Telegram Notification menu initialized in database");
    }
  } catch (err: any) {
    console.error("❌ Failed to initialize Telegram menu:", err.message);
  }
}

export async function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const enablePolling = process.env.TELEGRAM_POLLING === "true";

  if (!token) {
    console.warn(
      "⚠️ TELEGRAM_BOT_TOKEN is not defined. Telegram Bot service is disabled.",
    );
    return;
  }

  await initializeTelegramMenu();

  if (!enablePolling) {
    console.log(
      "ℹ️ Telegram Bot polling is disabled in .env (TELEGRAM_POLLING=false).",
    );
    return;
  }

  if (isPolling) return;
  isPolling = true;

  console.log("🤖 Starting Telegram Bot Long Polling...");

  // Run polling loop asynchronously
  (async () => {
    try {
      console.log("🧹 Clearing Telegram Webhook for polling...");
      const deleteWebhookUrl = `https://api.telegram.org/bot${token}/deleteWebhook`;
      const delResponse = await fetch(deleteWebhookUrl);
      if (delResponse.ok) {
        console.log("✅ Webhook cleared successfully");
      } else {
        console.warn(
          `⚠️ Failed to clear Webhook: status ${delResponse.status}`,
        );
      }
    } catch (err: any) {
      console.warn("⚠️ Failed to clear Webhook:", err.message);
    }

    while (isPolling) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${pollingOffset}&timeout=30`;
        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            `❌ Telegram getUpdates returned status ${response.status}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        const data = await response.json();
        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            pollingOffset = update.update_id + 1;
            await handleUpdate(update);
          }
        }
      } catch (err: any) {
        console.error("❌ Error in Telegram polling loop:", err.message);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  })();
}

export async function handleWebhookUpdate(update: any) {
  await handleUpdate(update);
}

export function stopTelegramBot() {
  isPolling = false;
}

async function handleUpdate(update: any) {
  const message = update.message;
  if (!message || !message.text) return;

  const text = message.text.trim();
  const chatId = String(message.chat.id);
  const username = message.from?.username || message.from?.first_name || "User";

  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    if (parts.length < 2) {
      await sendBotMessage(
        chatId,
        "Selamat datang! Untuk menautkan akun, silakan scan QR code dari halaman Pengaturan Notifikasi di web aplikasi.",
      );
      return;
    }

    const regToken = parts[1];
    const redisKey = `telegram_reg:${regToken}`;
    const userId = await redisConnection.get(redisKey);

    if (!userId) {
      await sendBotMessage(
        chatId,
        "❌ Link registrasi tidak valid atau sudah kedaluwarsa. Silakan muat ulang halaman Pengaturan Notifikasi dan scan QR Code baru.",
      );
      return;
    }

    try {
      // Update database
      await prisma.authUser.update({
        where: { id: userId },
        data: {
          telegramChatId: chatId,
          telegramUsername: username,
        },
      });

      // Clear token
      await redisConnection.del(redisKey);

      await sendBotMessage(
        chatId,
        `✅ <b>Registrasi Berhasil!</b>\n\nHalo <b>${username}</b>, akun Anda berhasil ditautkan ke sistem <b></b>. Anda akan menerima notifikasi penugasan dan aktivitas proyek di sini.`,
      );

      console.log(
        `✅ Linked Telegram chatId ${chatId} (${username}) with userId ${userId}`,
      );
    } catch (err: any) {
      console.error("❌ Failed to update user Telegram data:", err.message);
      await sendBotMessage(
        chatId,
        "❌ Terjadi kesalahan internal saat menautkan akun Anda. Silakan coba beberapa saat lagi.",
      );
    }
  } else if (text === "/help") {
    await sendBotMessage(
      chatId,
      "ℹ️ <b>Bantuan Bot</b>\n\nBot ini berfungsi untuk mengirimkan notifikasi dari sistem . Jika ingin memutus tautan akun, silakan lakukan melalui menu Pengaturan Notifikasi di aplikasi web.",
    );
  } else {
    await sendBotMessage(
      chatId,
      "🤖 Saya adalah bot notifikasi otomatis. Saya tidak dapat menanggapi pesan obrolan. Silakan gunakan aplikasi web untuk manajemen proyek.",
    );
  }
}

async function sendBotMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    });
  } catch (err: any) {
    console.error("❌ Failed to send response from bot:", err.message);
  }
}
