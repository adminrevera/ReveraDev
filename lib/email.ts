// Envoi d'e-mails transactionnels (code de confirmation de paiement…).
// Fournisseur : Resend (https://resend.com) via l'API HTTP — variables : RESEND_API_KEY et EMAIL_FROM (ex. « Astyns <no-reply@ton-domaine.com> »).
// Sans clé : le message est seulement écrit dans les logs serveur (développement).

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.warn(`[email non configuré] à=${to} sujet="${subject}"\n${text}`);
    return { sent: false } as const;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) {
    console.error("Échec d'envoi d'e-mail:", response.status, await response.text().catch(() => ""));
    return { sent: false } as const;
  }
  return { sent: true } as const;
}
