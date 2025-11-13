import { Router } from "express";
import { verifyExtension,createOA ,getOAstatusH,getOAstatusA,deleteOA,submitAptitudeAnswer,submitAptitudeSection,submitDsaSection,validateSubmission,getOAhistoryH,getOAhistoryA,endOA} from "../controller/OA.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {verifyAdmin} from "../middlewares/admin.middleware.js";

const router = Router();

router.route("/test").post(verifyExtension);
router.route("/create").post(verifyJWT, createOA);
router.route("/status-h").get(verifyJWT, getOAstatusH);
router.route("/status-a").get(verifyJWT, getOAstatusA);
router.route("/submit-aptitude").post(verifyJWT, submitAptitudeAnswer);
router.route("/submit-aptitude-section").post(verifyJWT, submitAptitudeSection);
router.route("/submit-dsa-section").post(verifyJWT, submitDsaSection);
router.route("/submit").post(validateSubmission);
router.route("/delete").delete(verifyJWT, verifyAdmin, deleteOA);
router.route("/end").post(verifyJWT, endOA);
router.route("/history-h").get(verifyJWT, getOAhistoryH);
router.route("/history-a").get(verifyJWT, getOAhistoryA);

export default router;