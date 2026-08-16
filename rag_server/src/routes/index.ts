import { Router } from "express";
import healthRouter from "./health";
import docSearchRouter from "./docSearch";
import apiSearchRouter from "./apiSearch";
import logAuditSearchRouter from "./logAuditSearch";

const router = Router();

router.use("/", healthRouter);
router.use("/", docSearchRouter);
router.use("/", apiSearchRouter);
router.use("/", logAuditSearchRouter);

export default router;
