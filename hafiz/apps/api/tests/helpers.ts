import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";

export async function makeToken(opts: { sub?: string; email?: string; expiresIn?: string; secret?: string } = {}) {
  const sub = opts.sub ?? randomUUID();
  const token = await new SignJWT({
    email: opts.email ?? `${sub.slice(0, 8)}@test.hafiz`,
    role: "authenticated",
    user_metadata: { display_name: "Testeur" },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
    .setIssuer(`${process.env.SUPABASE_URL}/auth/v1`)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? "1h")
    .sign(new TextEncoder().encode(opts.secret ?? process.env.SUPABASE_JWT_SECRET));
  return { sub, token };
}

/** Découpe un corps SSE en événements JSON. */
export function parseSse(body: string) {
  return body
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => JSON.parse(chunk.slice("data: ".length)));
}
