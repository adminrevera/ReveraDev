import { NextResponse } from "next/server";
import { z } from "zod";
import { READ_TOOLS, WRITE_TOOLS, WRITE_TOOL_NAMES, describeAction, runTool, type AssistantMode } from "@/lib/admin-assistant";
import { requireAdminAction } from "@/lib/auth/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `Tu es l'assistant d'administration d'une plateforme de révision (Collège de Paris Lomé). Tu réponds en français, brièvement.
Règles : tu n'inventes aucune donnée (utilise les outils pour lire l'état réel) ; tu ne peux ni publier ni approuver de contenu, c'est toujours un administrateur qui le fait ; tu n'as pas accès aux données personnelles des étudiants.
Quand tu proposes ou exécutes une action, explique en une phrase pourquoi.`;

type Block = { type: string; [key: string]: unknown };
type Message = { role: "user" | "assistant"; content: string | Block[] };

const bodySchema = z.object({
  mode: z.enum(["ask", "manual", "auto"]),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(30),
});
const applySchema = z.object({ apply: z.object({ name: z.string(), input: z.record(z.string(), z.unknown()) }) });

export async function POST(request: Request) {
  try { await requireAdminAction(); } catch { return NextResponse.json({ error: "Accès refusé." }, { status: 403 }); }
  const json: unknown = await request.json().catch(() => null);

  // Application d'une action proposée en mode « manuel » (clic de l'administrateur).
  const applying = applySchema.safeParse(json);
  if (applying.success) {
    if (!WRITE_TOOL_NAMES.includes(applying.data.apply.name)) return NextResponse.json({ error: "Action non autorisée." }, { status: 400 });
    try { return NextResponse.json({ result: await runTool(applying.data.apply.name, applying.data.apply.input) }); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Échec." }, { status: 400 }); }
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY n’est pas configurée sur le serveur." }, { status: 503 });

  const mode: AssistantMode = parsed.data.mode;
  const tools = mode === "ask" ? [...READ_TOOLS] : [...READ_TOOLS, ...WRITE_TOOLS];
  const messages: Message[] = parsed.data.messages.map((message) => ({ role: message.role, content: message.content }));
  const proposals: { name: string; input: Record<string, unknown>; summary: string }[] = [];
  const executed: { name: string; summary: string; ok: boolean }[] = [];

  for (let turn = 0; turn < 6; turn++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ADMIN_ASSISTANT_MODEL || "claude-sonnet-5-5", max_tokens: 1200, system: SYSTEM, tools, messages }),
    });
    if (!response.ok) return NextResponse.json({ error: `Le service d’IA a répondu ${response.status}.` }, { status: 502 });
    const data = (await response.json()) as { content: Block[]; stop_reason: string };
    messages.push({ role: "assistant", content: data.content });
    const uses = data.content.filter((block) => block.type === "tool_use");
    if (data.stop_reason !== "tool_use" || uses.length === 0) {
      const reply = data.content.filter((block) => block.type === "text").map((block) => String(block.text)).join("\n").trim();
      return NextResponse.json({ reply: reply || "Fait.", proposals, executed });
    }
    const results: Block[] = [];
    for (const use of uses) {
      const name = String(use.name);
      const input = (use.input && typeof use.input === "object" ? use.input : {}) as Record<string, unknown>;
      let content: string;
      let isError = false;
      if (WRITE_TOOL_NAMES.includes(name)) {
        if (mode === "ask") { content = "Mode lecture seule : aucune modification possible."; isError = true; }
        else if (mode === "manual") {
          proposals.push({ name, input, summary: describeAction(name, input) });
          content = "Proposition enregistrée : elle sera appliquée seulement si l’administrateur la valide.";
        } else {
          try { content = JSON.stringify(await runTool(name, input)); executed.push({ name, summary: describeAction(name, input), ok: true }); }
          catch (error) { content = error instanceof Error ? error.message : "Échec."; isError = true; executed.push({ name, summary: describeAction(name, input), ok: false }); }
        }
      } else {
        try { content = JSON.stringify(await runTool(name, input)); }
        catch (error) { content = error instanceof Error ? error.message : "Échec."; isError = true; }
      }
      results.push({ type: "tool_result", tool_use_id: use.id, content: content.slice(0, 12_000), ...(isError ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });
  }
  return NextResponse.json({ reply: "Je n’ai pas pu terminer en un nombre raisonnable d’étapes.", proposals, executed });
}
