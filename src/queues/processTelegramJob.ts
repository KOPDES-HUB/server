import { TelegramJobData } from "./telegramQueue";

export async function processTelegramJob(data: TelegramJobData): Promise<void> {
  const { chatId, message, link } = data;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not configured in environment variables",
    );
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
  };

  if (link) {
    body.reply_markup = {
      inline_keyboard: [
        [
          {
            text: "🔗 Klik di sini untuk detail",
            url: link,
          },
        ],
      ],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Telegram API returned status ${response.status}: ${errorText}`,
    );
  }
}
