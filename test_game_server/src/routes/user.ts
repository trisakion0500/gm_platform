import { Router } from "express";
import * as userController from "../controllers/user.controller";

const router = Router();

router.post("/get-user", userController.getUser);
router.post("/get-user-list", userController.getUserList);
router.post("/update-user-status", userController.updateUserStatus);

export default router;
