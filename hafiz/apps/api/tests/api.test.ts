import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { makeTitle } from "../src/services/conversation.service.js";
import { makeToken, parseSse } from "./helpers.js";

const app = createApp();
const createdUsers: string[] = [];

let alice: { sub: string; token: string };
let bob: { sub: string; token: string };

beforeAll(async () => {
  alice = await makeToken();
  bob = await makeToken();
  createdUsers.push(alice.sub, bob.sub);
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe("santé & authentification", () => {
  it("GET /api/health est public", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("refuse les requêtes sans jeton", async () => {
    const res = await request(app).get("/api/conversations");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("refuse un jeton signé avec un autre secret", async () => {
    const { token } = await makeToken({ secret: "un-autre-secret-de-plus-de-32-caracteres" });
    const res = await request(app).get("/api/conversations").set(auth(token));
    expect(res.status).toBe(401);
  });

  it("refuse un jeton expiré", async () => {
    const { token } = await makeToken({ expiresIn: "-1m" });
    const res = await request(app).get("/api/conversations").set(auth(token));
    expect(res.status).toBe(401);
  });

  it("crée le profil au premier appel (GET /api/me)", async () => {
    const res = await request(app).get("/api/me").set(auth(alice.token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(alice.sub);
    expect(res.body.displayName).toBe("Testeur");
  });
});

describe("conversations", () => {
  let conversationId: string;

  it("crée une conversation", async () => {
    const res = await request(app).post("/api/conversations").set(auth(alice.token)).send({});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Nouvelle conversation");
    conversationId = res.body.id;
  });

  it("liste les conversations de l'utilisateur", async () => {
    const res = await request(app).get("/api/conversations").set(auth(alice.token));
    expect(res.status).toBe(200);
    expect(res.body.map((c: { id: string }) => c.id)).toContain(conversationId);
  });

  it("envoie un message et diffuse la réponse en SSE", async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(auth(alice.token))
      .send({ content: "Explique-moi la photosynthèse simplement s'il te plaît, avec un exemple" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    const events = parseSse(res.text);
    const types = events.map((e) => e.type);
    expect(types[0]).toBe("user_message");
    expect(types).toContain("delta");
    expect(types).toContain("assistant_message");
    expect(types.at(-1)).toBe("done");

    const deltas = events.filter((e) => e.type === "delta").map((e) => e.content).join("");
    const assistant = events.find((e) => e.type === "assistant_message").message;
    expect(assistant.content).toBe(deltas);
    expect(assistant.content).toContain("photosynthèse");

    const conv = events.find((e) => e.type === "conversation").conversation;
    expect(conv.title).toBe(makeTitle("Explique-moi la photosynthèse simplement s'il te plaît, avec un exemple"));
  });

  it("conserve l'historique et le transmet à l'IA", async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(auth(alice.token))
      .send({ content: "Et la respiration ?" });
    const assistant = parseSse(res.text).find((e) => e.type === "assistant_message").message;
    // Le fournisseur simulé compte les messages utilisateur reçus (historique compris).
    expect(assistant.content).toContain("conversation : 2");

    const detail = await request(app).get(`/api/conversations/${conversationId}`).set(auth(alice.token));
    expect(detail.status).toBe(200);
    expect(detail.body.messages.map((m: { role: string }) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
  });

  it("renvoie un événement d'erreur si l'IA échoue, sans enregistrer de réponse", async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(auth(alice.token))
      .send({ content: "[[mock-error]]" });
    const events = parseSse(res.text);
    expect(events.find((e) => e.type === "error").error.code).toBe("AI_UNAVAILABLE");
    expect(events.find((e) => e.type === "assistant_message")).toBeUndefined();
  });

  it("valide les messages (vide, trop long)", async () => {
    const empty = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(auth(alice.token))
      .send({ content: "   " });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe("VALIDATION_ERROR");

    const tooLong = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(auth(alice.token))
      .send({ content: "a".repeat(8001) });
    expect(tooLong.status).toBe(400);
  });

  it("renomme une conversation", async () => {
    const res = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .set(auth(alice.token))
      .send({ title: "Biologie" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Biologie");
  });

  it("isole les données : un autre utilisateur ne peut ni lire, ni écrire, ni supprimer", async () => {
    const list = await request(app).get("/api/conversations").set(auth(bob.token));
    expect(list.body).toEqual([]);

    const read = await request(app).get(`/api/conversations/${conversationId}`).set(auth(bob.token));
    expect(read.status).toBe(404);

    const write = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set(auth(bob.token))
      .send({ content: "intrusion" });
    expect(write.status).toBe(404);

    const rename = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .set(auth(bob.token))
      .send({ title: "piraté" });
    expect(rename.status).toBe(404);

    const del = await request(app).delete(`/api/conversations/${conversationId}`).set(auth(bob.token));
    expect(del.status).toBe(404);
  });

  it("rejette un identifiant invalide", async () => {
    const res = await request(app).get("/api/conversations/pas-un-uuid").set(auth(alice.token));
    expect(res.status).toBe(400);
  });

  it("supprime une conversation et ses messages", async () => {
    const del = await request(app).delete(`/api/conversations/${conversationId}`).set(auth(alice.token));
    expect(del.status).toBe(204);
    const read = await request(app).get(`/api/conversations/${conversationId}`).set(auth(alice.token));
    expect(read.status).toBe(404);
    expect(await prisma.message.count({ where: { conversationId } })).toBe(0);
  });
});

describe("utilitaires", () => {
  it("makeTitle tronque proprement", () => {
    expect(makeTitle("  Bonjour   HAFIZ ")).toBe("Bonjour HAFIZ");
    const t = makeTitle("mot ".repeat(40));
    expect(t.length).toBeLessThanOrEqual(61);
    expect(t.endsWith("…")).toBe(true);
  });
});
