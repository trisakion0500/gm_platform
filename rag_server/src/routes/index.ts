import { Router } from "express";
import healthRouter from "./health";
import searchRouter from "./search";
import apiSearchRouter from "./apiSearch";

const router = Router();

router.use("/", healthRouter);
router.use("/", searchRouter);
router.use("/", apiSearchRouter);

export default router;
