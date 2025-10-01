const fetch = require("node-fetch");

// Envia notificação para motorista via Expo
exports.sendNotificationMotorista = async (pushToken, title, body) => {
  try {
    const message = {
      to: pushToken,
      sound: "default",
      title,
      body,
      data: { extra: "info" }
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });

    console.log("📲 Notificação enviada para motorista:", pushToken);
  } catch (err) {
    console.error("❌ Erro enviar notificação:", err);
  }
};
