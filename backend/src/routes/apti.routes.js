import { Router } from "express";
import { 
    getAll, 
    getById, 
    addQues, 
    addBulk, 
    giveTopics, 
    giveSubtopics, 
    markSolved, 
    unmarkSolved, 
    getAptiStats,
    getAllTopics,
    getAllSubtopics,
    validateAnswer
} from "../controller/apti.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Question CRUD
router.route("/getAll").get(verifyJWT, getAll);
router.route("/get/:Qid").get(verifyJWT, getById);
router.route("/addQues").post(verifyJWT, addQues);
router.route("/addBulk").post(verifyJWT, addBulk);

// Topics and Subtopics
router.route("/topics").get(verifyJWT, getAllTopics);
router.route("/subtopics").get(verifyJWT, getAllSubtopics);
router.route("/topics/:topic").get(verifyJWT, giveTopics);
router.route("/subtopics/:subtopic").get(verifyJWT, giveSubtopics);

// Quiz functionality
router.route("/validate").post(verifyJWT, validateAnswer);

// Solved tracking
router.route("/mark/:Qid").post(verifyJWT, markSolved);
router.route("/unmark/:Qid").delete(verifyJWT, unmarkSolved);
router.route("/stats").get(verifyJWT, getAptiStats);

export default router;