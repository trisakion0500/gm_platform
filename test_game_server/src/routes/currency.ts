import { Router } from "express";
import * as currencyController from "../controllers/currency.controller";

const router = Router();

router.post("/get-currency-list", currencyController.getCurrencyList);
router.post("/grant-currency", currencyController.grantCurrency);

export default router;
