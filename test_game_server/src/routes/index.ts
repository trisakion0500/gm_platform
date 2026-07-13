import { Router } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import currencyRouter from "./currency";
import cardRouter from "./card";

const router = Router();

router.use("/", healthRouter);
router.use("/", userRouter);
router.use("/", currencyRouter);
router.use("/", cardRouter);

export default router;
