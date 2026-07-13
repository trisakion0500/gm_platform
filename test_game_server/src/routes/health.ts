import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ result: 0, data: { status: "ok" } });
});

export default router;
