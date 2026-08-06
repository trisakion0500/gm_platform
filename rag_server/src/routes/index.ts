import { Router } from "express";
import healthRouter from "./health";
import searchRouter from "./search";

const router = Router();

router.use("/", healthRouter);
router.use("/", searchRouter);

export default router;
