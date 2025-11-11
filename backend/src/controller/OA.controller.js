import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { OA } from "../models/OA.models.js";
import { Question } from "../models/question.models.js";
import { Apti } from "../models/apti.models.js";
import { User } from "../models/user.model.js";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(isSameOrAfter);
dayjs.extend(utc);

const verifyExtension = asyncHandler(async (req, res) => {
  const username = req.body.username;
  const qid = req.body.qid;

  console.log("Username:", username);
  console.log("Question ID:", qid);
  console.log("Submission Time:", new Date().toISOString());

  return res.status(200).json(
    new ApiResponse(true, "Extension verified successfully", {
      username,
      qid,
    })
  );
});

const createOA = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const existingOA = await OA.findOne({ user: userId, status: "ongoing" });
  if (existingOA) {
    return res.status(400).json({
      success: false,
      message: "You already have an ongoing OA session.",
      oaId: existingOA._id,
    });
  }

  // Get all unique topics
  const allTopics = await Apti.distinct("topics");
  
  // Calculate questions per topic (distribute 25 questions across topics)
  const questionsPerTopic = Math.floor(25 / allTopics.length);
  const remainder = 25 % allTopics.length;
  
  // Fetch questions from each topic
  const aptiPromises = allTopics.map(async (topic, index) => {
    const count = questionsPerTopic + (index < remainder ? 1 : 0);
    return Apti.aggregate([
      { $match: { topics: topic } },
      { $sample: { size: count } }
    ]);
  });
  
  const aptiResults = await Promise.all(aptiPromises);
  const selectedApti = aptiResults.flat();
  
  // If we don't have enough, fill with random questions
  if (selectedApti.length < 25) {
    const needed = 25 - selectedApti.length;
    const existingIds = selectedApti.map(q => q._id);
    const additional = await Apti.aggregate([
      { $match: { _id: { $nin: existingIds } } },
      { $sample: { size: needed } }
    ]);
    selectedApti.push(...additional);
  }

  // Select DSA questions (1 Easy, 2 Medium, 1 Hard)
  const [easyQs, mediumQs, hardQs] = await Promise.all([
    Question.aggregate([{ $match: { difficulty: "Easy" } }, { $sample: { size: 1 } }]),
    Question.aggregate([{ $match: { difficulty: "Medium" } }, { $sample: { size: 2 } }]),
    Question.aggregate([{ $match: { difficulty: "Hard" } }, { $sample: { size: 1 } }]),
  ]);

  const selectedDsa = [...easyQs, ...mediumQs, ...hardQs];

  if (selectedApti.length < 25 || selectedDsa.length !== 4) {
    return res.status(400).json({
      success: false,
      message: "Not enough questions available to create OA.",
    });
  }

  const now = new Date();
  const oaData = {
    user: userId,
    aptitudeQuestions: selectedApti.map(q => ({
      question: q._id,
      status: "pending",
    })),
    dsaQuestions: selectedDsa.map(q => ({
      question: q._id,
      slug: q.slug,
      status: "pending",
    })),
    currentSection: "aptitude",
    aptitudeSectionEndTime: new Date(now.getTime() + 30 * 60 * 1000), // 30 mins
    startedAt: now,
    endedAt: new Date(now.getTime() + 120 * 60 * 1000), // 2 hours total
    status: "ongoing",
  };

  const newOA = await OA.create(oaData);

  res.status(201).json({
    success: true,
    message: "OA created successfully!",
    oa: {
      id: newOA._id,
      startedAt: newOA.startedAt,
      endsAt: newOA.endedAt,
      aptitudeSectionEndTime: newOA.aptitudeSectionEndTime,
      currentSection: newOA.currentSection,
      totalDuration: 120,
      aptitudeDuration: 30,
      dsaDuration: 90,
    },
  });
});

const submitAptitudeSection = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const oa = await OA.findOne({ user: userId, status: "ongoing" });
  
  if (!oa) {
    throw new ApiError(404, "No ongoing OA found");
  }

  if (oa.currentSection !== "aptitude") {
    throw new ApiError(400, "Aptitude section already completed");
  }

  // Move to DSA section
  oa.currentSection = "dsa";
  // Set DSA section to start now with 90 minutes
  const now = new Date();
  oa.endedAt = new Date(now.getTime() + 90 * 60 * 1000);
  await oa.save();

  res.status(200).json(
    new ApiResponse(200, "Aptitude section submitted successfully", {
      currentSection: oa.currentSection,
      endsAt: oa.endedAt,
    })
  );
});

const submitDsaSection = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const oa = await OA.findOne({ user: userId, status: "ongoing" })
    .populate("aptitudeQuestions.question")
    .populate("dsaQuestions.question");
  
  if (!oa) {
    throw new ApiError(404, "No ongoing OA found");
  }

  if (oa.currentSection !== "dsa") {
    throw new ApiError(400, "Not in DSA section");
  }

  // Complete the OA
  oa.status = "completed";
  oa.currentSection = "completed";
  oa.endedAt = new Date();
  await oa.save();

  res.status(200).json(
    new ApiResponse(200, "OA completed successfully", {
      oaId: oa._id,
      status: oa.status,
      endedAt: oa.endedAt,
      stats: {
        aptitudeAttempted: oa.aptitudeAttempted,
        aptitudeCorrect: oa.aptitudeCorrect,
        dsaCompleted: oa.dsaCompletedCount,
      }
    })
  );
});

const endOA = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const oa = await OA.findOne({ user: userId, status: "ongoing" })
    .populate("aptitudeQuestions.question")
    .populate("dsaQuestions.question");
    
  if (!oa) {
    return res.status(204).json({ success: true, message: "No ongoing OA found for this user!" });
  }

  oa.status = "aborted";
  oa.currentSection = "completed";
  oa.endedAt = new Date();
  await oa.save();
  
  res.status(200).json( 
    new ApiResponse(true, "OA aborted successfully", {
      oaId: oa._id,
      endedAt: oa.endedAt,
      stats: {
        aptitudeAttempted: oa.aptitudeAttempted,
        aptitudeCorrect: oa.aptitudeCorrect,
        dsaCompleted: oa.dsaCompletedCount,
      }
    })
  );
});




const getOAstatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const oa = await OA.findOne({ user: userId, status: "ongoing" })
    .populate("aptitudeQuestions.question")
    .populate("dsaQuestions.question");
    
  if (!oa) {
    return res.status(204).json({ success: true, message: "No ongoing OA found for this user!" });
  }

  const now = dayjs();
  
  // Check if OA has expired (auto-abort)
  if (now.isSameOrAfter(dayjs(oa.endedAt))) {
    oa.status = "aborted";
    oa.currentSection = "completed";
    await oa.save();
    throw new ApiError(400, "The OA session has expired and been aborted.");
  }

  // Auto-transition from aptitude to DSA section if time is up
  if (oa.currentSection === "aptitude" && now.isSameOrAfter(dayjs(oa.aptitudeSectionEndTime))) {
    oa.currentSection = "dsa";
    // Reset timer to 90 minutes for DSA section
    oa.endedAt = new Date(now.toDate().getTime() + 90 * 60 * 1000);
    await oa.save();
  }

  // Only show correct answers if OA is completed or aborted
  const showAnswers = ["completed", "aborted"].includes(oa.status);

  res.status(200).json(
    new ApiResponse(true, "OA status retrieved successfully", {
      oaId: oa._id,
      status: oa.status,
      currentSection: oa.currentSection,
      startedAt: oa.startedAt,
      endsAt: oa.endedAt,
      aptitudeSectionEndTime: oa.aptitudeSectionEndTime,
      showAnswers,
      aptitudeQuestions: oa.aptitudeQuestions.map(q => {
        const baseData = {
          id: q.question._id,
          Qid: q.question.Qid,
          title: q.question.title,
          options: q.question.options,
          topics: q.question.topics,
          status: q.status,
          selectedAnswer: q.selectedAnswer,
          answeredOn: q.answeredOn,
        };
        
        // Only include correctness info if OA is completed
        if (showAnswers) {
          baseData.isCorrect = q.isCorrect;
          // Extract correct answer letter
          let correctAnswerLetter = q.question.correctAnswer.trim();
          const match = correctAnswerLetter.match(/^([A-D])/i);
          if (match) {
            correctAnswerLetter = match[1].toUpperCase();
          }
          baseData.correctAnswer = correctAnswerLetter;
        }
        
        return baseData;
      }),
      dsaQuestions: oa.dsaQuestions.map(q => ({
        id: q.question._id,
        title: q.question.title,
        slug: q.question.slug,
        difficulty: q.question.difficulty,
        status: q.status,
        completedOn: q.completedOn,
        url: `https://leetcode.com/problems/${q.question.slug}/`,
      })),
      stats: {
        aptitudeTotal: oa.totalAptitudeQuestions,
        aptitudeAttempted: oa.aptitudeAttempted,
        aptitudeCorrect: showAnswers ? oa.aptitudeCorrect : null,
        dsaTotal: oa.totalDsaQuestions,
        dsaCompleted: oa.dsaCompletedCount,
      }
    })
  );
});

const submitAptitudeAnswer = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { questionId, selectedAnswer } = req.body;

  if (!questionId || !selectedAnswer) {
    throw new ApiError(400, "Question ID and selected answer are required");
  }

  const oa = await OA.findOne({ user: userId, status: "ongoing" }).populate("aptitudeQuestions.question");
  if (!oa) {
    throw new ApiError(404, "No ongoing OA found");
  }

  if (oa.currentSection !== "aptitude") {
    throw new ApiError(400, "Aptitude section has ended");
  }

  const targetQ = oa.aptitudeQuestions.find(q => q.question._id.toString() === questionId);
  if (!targetQ) {
    throw new ApiError(404, "Question not found in this OA");
  }

  if (targetQ.status === "answered") {
    throw new ApiError(400, "Question already answered");
  }

  // Extract just the letter from correctAnswer
  let correctAnswerLetter = targetQ.question.correctAnswer.trim();
  const match = correctAnswerLetter.match(/^([A-D])/i);
  if (match) {
    correctAnswerLetter = match[1].toUpperCase();
  }

  const isCorrect = correctAnswerLetter === selectedAnswer.trim().toUpperCase();

  targetQ.selectedAnswer = selectedAnswer;
  targetQ.isCorrect = isCorrect;
  targetQ.status = "answered";
  targetQ.answeredOn = new Date();

  oa.aptitudeAttempted += 1;
  if (isCorrect) {
    oa.aptitudeCorrect += 1;
  }

  await oa.save();

  // Don't reveal correct answer until OA is completed
  res.status(200).json(
    new ApiResponse(200, "Answer submitted successfully", {
      submitted: true,
      aptitudeAttempted: oa.aptitudeAttempted,
    })
  );
});

const validateSubmission = asyncHandler(async (req, res) => {
  const { username, qid, completed_on } = req.body;

  if (!username || !qid) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).json({ success: true, message: "User not found." });
  }

  const oa = await OA.findOne({ user: user._id, status: "ongoing" });
  if (!oa) {
    return res.status(400).json({ success: false, message: "No ongoing OA found for this user." });
  }

  const question = await Question.findOne({ Qid: qid });
  if (!question) {
    return res.status(404).json({ success: false, message: "Question not found in DB." });
  }

  const targetQ = oa.dsaQuestions.find(q => q.question.toString() === question._id.toString());
  if (!targetQ) {
    return res.status(403).json({ success: false, message: "This question is not part of the active OA." });
  }

  if (targetQ.status === "pending") {
    targetQ.status = "completed";
    targetQ.completedOn = completed_on ? new Date(completed_on) : new Date();
    oa.dsaCompletedCount += 1;
  }

  if (oa.dsaCompletedCount >= oa.totalDsaQuestions && oa.aptitudeAttempted >= oa.totalAptitudeQuestions) {
    oa.status = "completed";
    oa.currentSection = "completed";
    oa.endedAt = new Date();
  }

  await oa.save();

  res.json({
    success: true,
    message: "Submission validated successfully.",
    oaStatus: oa.status,
    dsaCompletedCount: oa.dsaCompletedCount,
    totalDsaQuestions: oa.totalDsaQuestions,
  });
});

const deleteOA = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const deletedOA = await OA.findOneAndDelete({ user: userId });
  if (!deletedOA) {
    throw new ApiError(404, "No OA found to delete.");
  }

  res.status(200).json(
    new ApiResponse(true, "OA deleted successfully", {
      deletedOAId: deletedOA._id,
      deletedAt: new Date(),
    })
  );
});


const getOAhistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;


  const oas = await OA.find({
    user: userId,
    status: { $in: ["completed", "aborted"] }
  })
    .sort({ endedAt: -1, createdAt: -1 })
    .limit(5)
    .populate("aptitudeQuestions.question")
    .populate("dsaQuestions.question")
    .lean();


  const emptyAggregate = {
    sessions: 0,
    totalQuestions: 0,
    totalCompleted: 0,
    completionRatePercent: 0,
    totalTimeMinutes: 0,
    avgSessionDurationMinutes: 0,
    difficultyBreakdown: { Easy: 0, Medium: 0, Hard: 0 }
  };

  if (!oas || oas.length === 0) {
    return res.status(200).json(
      new ApiResponse(true, 200, "No OA history found", {
        recent: [],
        aggregate: emptyAggregate
      })
    );
  }

  const recent = [];
  const agg = {
    sessions: oas.length,
    totalQuestions: 0,
    totalCompleted: 0,
    totalTimeMinutes: 0,
    difficultyBreakdown: { Easy: 0, Medium: 0, Hard: 0 }
  };

  const safeDifficulty = (qDoc, qItem) => {
    if (qDoc && qDoc.difficulty) return qDoc.difficulty;
    if (qItem && qItem.difficulty) return qItem.difficulty;
  };

  for (const oa of oas) {
    let durationMinutes = null;
    if (oa.startedAt && oa.endedAt) {
      durationMinutes = Math.round((new Date(oa.endedAt) - new Date(oa.startedAt)) / 60000);
    } else if (oa.startedAt && !oa.endedAt) {
      durationMinutes = Math.round((Date.now() - new Date(oa.startedAt)) / 60000);
    }

    // DSA questions
    const dsaQuestions = (oa.dsaQuestions || []).map((q) => {
      const qDoc = q.question ?? null;
      const difficulty = safeDifficulty(qDoc, q);
      return {
        id: qDoc?._id ?? q.question,
        title: qDoc?.title ?? null,
        slug: q.slug ?? qDoc?.slug ?? null,
        difficulty,
        status: q.status,
        completedOn: q.completedOn ?? null,
        url: qDoc?.slug ? `https://leetcode.com/problems/${qDoc.slug}/` : null
      };
    });

    const sessionDifficultyCounts = { Easy: 0, Medium: 0, Hard: 0};
    for (const qq of dsaQuestions) {
      if (qq.difficulty === "Easy") sessionDifficultyCounts.Easy++;
      else if (qq.difficulty === "Medium") sessionDifficultyCounts.Medium++;
      else if (qq.difficulty === "Hard") sessionDifficultyCounts.Hard++;
    }

    const totalQuestions = (oa.totalAptitudeQuestions || 25) + (oa.totalDsaQuestions || 4);
    const totalCompleted = (oa.aptitudeCorrect || 0) + (oa.dsaCompletedCount || 0);
    const sessionCompletionRate = totalQuestions > 0
      ? Math.round((totalCompleted / totalQuestions) * 100)
      : 0;

    agg.totalQuestions += totalQuestions;
    agg.totalCompleted += totalCompleted;
    if (durationMinutes !== null) agg.totalTimeMinutes += durationMinutes;
    for (const k of Object.keys(sessionDifficultyCounts)) {
      agg.difficultyBreakdown[k] += sessionDifficultyCounts[k];
    }

    recent.push({
      oaId: oa._id,
      status: oa.status,
      startedAt: oa.startedAt,
      endedAt: oa.endedAt,
      durationMinutes,
      totalAptitudeQuestions: oa.totalAptitudeQuestions || 25,
      aptitudeAttempted: oa.aptitudeAttempted || 0,
      aptitudeCorrect: oa.aptitudeCorrect || 0,
      totalDsaQuestions: oa.totalDsaQuestions || 4,
      dsaCompletedCount: oa.dsaCompletedCount || 0,
      totalQuestions,
      completedCount: totalCompleted,
      completionRatePercent: sessionCompletionRate,
      difficultyCounts: sessionDifficultyCounts,
      dsaQuestions,
      createdAt: oa.createdAt,
      updatedAt: oa.updatedAt
    });
  }

  const aggregate = {
    sessions: agg.sessions,
    totalQuestions: agg.totalQuestions,
    totalCompleted: agg.totalCompleted,
    completionRatePercent: agg.totalQuestions > 0 ? Math.round((agg.totalCompleted / agg.totalQuestions) * 100) : 0,
    totalTimeMinutes: agg.totalTimeMinutes,
    avgSessionDurationMinutes: agg.sessions > 0 ? Math.round(agg.totalTimeMinutes / agg.sessions) : 0,
    difficultyBreakdown: agg.difficultyBreakdown
  };

  return res.status(200).json(
    new ApiResponse(
      {
        recent,
        aggregate
      },
      "Recent OA history retrieved",
      200
    )
  );
});


export { verifyExtension, createOA, getOAstatus, submitAptitudeSection, submitDsaSection, endOA, submitAptitudeAnswer, validateSubmission, deleteOA, getOAhistory };