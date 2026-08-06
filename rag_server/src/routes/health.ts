import { Router } from "express";
import { isReady } from "../readiness";
import { success } from "../utils/response";

const router = Router();

router.get("/health", (_req, res) => {
  success(res, [{ status: isReady() ? "ok" : "loading" }]);
});

export default router;
