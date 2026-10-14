"use client";

import { useState, type SyntheticEvent } from "react";
import { createContentRevision, getContentVersionBodyHtml } from "@/app/admin/actions";
import { adminButton, adminInput } from "./AdminShell";

export default function ContentRevisionDisclosure({
  versionId,
  itemId,
  title,
}: {
  versionId: string;
  itemId: string;
  title: string;
}) {
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open || loaded || loading) return;

    setLoading(true);
    setError("");
    try {
      setBody((await getContentVersionBodyHtml(versionId)) ?? "");
      setLoaded(true);
    } catch {
      setError("Impossible de charger le texte du cours. Referme puis réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details onToggle={handleToggle} className="mt-4 border-t border-line pt-3">
      <summary className="cursor-pointer text-sm text-muted">Créer une nouvelle version corrigée</summary>
      {loading ? (
        <p className="mt-3 text-sm text-muted" role="status">Chargement du texte du cours…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>
      ) : loaded ? (
        <form action={createContentRevision} className="mt-3 grid gap-3">
          <input type="hidden" name="itemId" value={itemId} />
          <label className="grid gap-1 text-xs text-muted">
            Titre
            <input className={adminInput} name="title" defaultValue={title} required maxLength={180} />
          </label>
          <label className="grid gap-1 text-xs text-muted">
            Texte du cours
            <textarea
              className={`${adminInput} min-h-36 py-3`}
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={100000}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted">
            Résumé de la correction
            <input className={adminInput} name="note" required minLength={3} maxLength={500} placeholder="Ex. Clarification de la définition…" />
          </label>
          <p className="text-xs leading-relaxed text-muted">Les questions et fiches de la version précédente sont reprises. Cette saisie est du texte ; l’import HTML ou PDF et la génération Claude sont à connecter.</p>
          <button className={adminButton}>Enregistrer en « à relire »</button>
        </form>
      ) : null}
    </details>
  );
}
