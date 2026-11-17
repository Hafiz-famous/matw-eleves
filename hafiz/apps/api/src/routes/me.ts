import { Router } from "express";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { toUserProfile } from "../lib/serializers.js";

export const meRouter = Router();

meRouter.get("/", async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.user!.id } });
  if (!profile) throw AppError.notFound("Profil introuvable");
  res.json(toUserProfile(profile));
});
