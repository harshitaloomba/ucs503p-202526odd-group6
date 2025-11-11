import { Router } from "express";
import { verifyExtension,createOA ,getOAstatus,deleteOA,submitAptitudeAnswer,submitAptitudeSection,submitDsaSection,validateSubmission,getOAhistory,endOA} from "../controller/OA.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {verifyAdmin} from "../middlewares/admin.middleware.js";

const router = Router();

router.route("/test").post(verifyExtension);
router.route("/create").post(verifyJWT, createOA);
router.route("/status").get(verifyJWT, getOAstatus);
router.route("/submit-aptitude").post(verifyJWT, submitAptitudeAnswer);
router.route("/submit-aptitude-section").post(verifyJWT, submitAptitudeSection);
router.route("/submit-dsa-section").post(verifyJWT, submitDsaSection);
router.route("/submit").post(validateSubmission);
router.route("/delete").delete(verifyJWT, verifyAdmin, deleteOA);
router.route("/end").post(verifyJWT, endOA);
router.route("/history").get(verifyJWT, getOAhistory);

export default router;