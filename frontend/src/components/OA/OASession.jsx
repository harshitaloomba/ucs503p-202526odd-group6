import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import API from "../../api/axios";
import toast, { Toaster } from "react-hot-toast";

export default function OASession({ activeOA, onEnd }) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [remaining, setRemaining] = useState("00:00:00");
  const [sectionRemaining, setSectionRemaining] = useState("00:00:00");

  // Timer for total OA
  useEffect(() => {
    if (!activeOA?.endsAt) return;
    
    const updateTimer = () => {
      const diff = new Date(activeOA.endsAt) - new Date();
      if (diff <= 0) {
        setRemaining("00:00:00");
        return;
      }
      const sec = Math.floor(diff / 1000);
      const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
      const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
      const ss = String(sec % 60).padStart(2, "0");
      setRemaining(`${hh}:${mm}:${ss}`);
    };
    
    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [activeOA]);

  // Timer for aptitude section
  useEffect(() => {
    if (activeOA?.currentSection !== "aptitude" || !activeOA?.aptitudeSectionEndTime) {
      setSectionRemaining("00:00:00");
      return;
    }
    
    const updateTimer = () => {
      const diff = new Date(activeOA.aptitudeSectionEndTime) - new Date();
      if (diff <= 0) {
        setSectionRemaining("00:00:00");
        window.location.reload(); // Reload to transition to DSA
        return;
      }
      const sec = Math.floor(diff / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, "0");
      const ss = String(sec % 60).padStart(2, "0");
      setSectionRemaining(`${mm}:${ss}`);
    };
    
    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [activeOA]);

  const handleAnswerSelect = (questionId, answer) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitAptitude = async (questionId) => {
    const selectedAnswer = selectedAnswers[questionId];
    if (!selectedAnswer) return;

    try {
      const res = await API.post("/oa/submit-aptitude", {
        questionId,
        selectedAnswer
      });
      
      // Mark as submitted but don't show if correct/incorrect yet
      setSubmittedAnswers(prev => ({
        ...prev,
        [questionId]: { submitted: true }
      }));
      toast.success("Answer submitted successfully!");
    } catch (err) {
      console.error("Failed to submit answer:", err);
      toast.error("Failed to submit answer. Please try again.");
    }
  };

  const handleSubmitAptitudeSection = async () => {
    if (activeOA.stats.aptitudeAttempted < activeOA.stats.aptitudeTotal) {
      const unanswered = activeOA.stats.aptitudeTotal - activeOA.stats.aptitudeAttempted;
      if (!window.confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    try {
      toast.loading("Submitting aptitude section...");
      await API.post("/oa/submit-aptitude-section");
      toast.dismiss();
      toast.success("Aptitude section submitted! Moving to DSA section...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error("Failed to submit section:", err);
      toast.dismiss();
      toast.error("Failed to submit section. Please try again.");
    }
  };

  const handleSubmitDsaSection = async () => {
    if (!window.confirm("Are you sure you want to submit and complete the OA?")) {
      return;
    }

    try {
      toast.loading("Submitting OA...");
      await API.post("/oa/submit-dsa-section");
      toast.dismiss();
      toast.success("OA completed successfully!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error("Failed to submit OA:", err);
      toast.dismiss();
      toast.error("Failed to submit OA. Please try again.");
    }
  };

  if (activeOA.currentSection === "aptitude") {
    return (
      <div className="space-y-4">
        <Toaster position="top-right" reverseOrder={false} />
        {/* Section Header */}
        <div className="bg-[#181825] rounded-xl p-4 border border-[#2b2b3e]">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-xl font-bold text-white">📝 Aptitude Section</h2>
              <p className="text-sm text-gray-400">25 questions • Maximum 30 minutes</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Section Time</div>
              <div className="text-2xl font-mono text-orange-400">{sectionRemaining}</div>
            </div>
          </div>
          <button
            onClick={handleSubmitAptitudeSection}
            className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
          >
            Submit Aptitude Section & Continue to DSA
          </button>
        </div>

        {/* Progress */}
        <div className="bg-[#181825] rounded-xl p-4 border border-[#2b2b3e]">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-semibold">{activeOA.stats.aptitudeAttempted} / {activeOA.stats.aptitudeTotal}</span>
          </div>
          <div className="w-full bg-[#2b2b3e] rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-orange-500 to-orange-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(activeOA.stats.aptitudeAttempted / activeOA.stats.aptitudeTotal) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {activeOA.stats.aptitudeTotal - activeOA.stats.aptitudeAttempted} questions remaining
          </div>
          {activeOA.showAnswers && activeOA.stats.aptitudeCorrect !== null && (
            <div className="mt-2 text-sm text-green-400 font-semibold">
              Score: {activeOA.stats.aptitudeCorrect} / {activeOA.stats.aptitudeAttempted} ({Math.round((activeOA.stats.aptitudeCorrect / activeOA.stats.aptitudeAttempted) * 100)}%)
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {activeOA.aptitudeQuestions.map((q, idx) => {
            const submitted = submittedAnswers[q.id] || (q.status === "answered" ? { submitted: true } : null);
            const selectedAnswer = selectedAnswers[q.id] || q.selectedAnswer;
            
            // Only show correct/incorrect if OA is completed
            const showResults = activeOA.showAnswers && q.status === "answered";

            return (
              <div key={q.id} className="bg-[#181825] rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  {showResults ? (
                    q.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    )
                  ) : submitted ? (
                    <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-gray-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm text-gray-400 mb-1">Question {idx + 1}</div>
                    <p className="text-white">{q.title}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {q.options.map((option, optIdx) => {
                    const optionLabel = String.fromCharCode(65 + optIdx);
                    const isSelected = selectedAnswer === optionLabel;
                    const isCorrect = showResults && q.correctAnswer === optionLabel;
                    const isWrong = showResults && isSelected && !q.isCorrect;

                    let optionClass = "bg-[#23253b] border-[#2b2b3e] hover:bg-[#2b2d45]";
                    if (showResults) {
                      if (isCorrect) optionClass = "bg-green-900/30 border-green-500";
                      else if (isWrong) optionClass = "bg-red-900/30 border-red-500";
                    } else if (submitted && isSelected) {
                      optionClass = "bg-blue-600/30 border-blue-500";
                    } else if (isSelected) {
                      optionClass = "bg-orange-600/30 border-orange-500";
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => !submitted && handleAnswerSelect(q.id, optionLabel)}
                        disabled={!!submitted}
                        className={`w-full text-left p-2.5 rounded-lg border-2 transition text-sm ${optionClass} ${
                          submitted ? "cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        <span className="font-semibold text-white">{optionLabel}. </span>
                        <span className="text-white">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {!submitted ? (
                  <button
                    onClick={() => handleSubmitAptitude(q.id)}
                    disabled={!selectedAnswer}
                    className={`w-full py-2 rounded-lg font-semibold text-sm ${
                      selectedAnswer
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Submit
                  </button>
                ) : showResults ? (
                  <div className={`p-2 rounded-lg text-sm ${
                    q.isCorrect ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                  }`}>
                    {q.isCorrect ? "✓ Correct!" : `✗ Incorrect - Answer: ${q.correctAnswer}`}
                  </div>
                ) : (
                  <div className="p-2 rounded-lg text-sm bg-blue-900/30 text-blue-400">
                    ✓ Submitted - Results will be shown after OA completion
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // DSA Section
  return (
    <div className="space-y-4">
      <Toaster position="top-right" reverseOrder={false} />
      {/* Section Header */}
      <div className="bg-[#181825] rounded-xl p-4 border border-[#2b2b3e]">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xl font-bold text-white">💻 DSA Section</h2>
            <p className="text-sm text-gray-400">4 questions • 90 minutes</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Time Remaining</div>
            <div className="text-2xl font-mono text-emerald-400">{remaining}</div>
          </div>
        </div>
        <button
          onClick={handleSubmitDsaSection}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition"
        >
          Submit DSA Section & Complete OA
        </button>
      </div>

      {/* Progress */}
      <div className="bg-[#181825] rounded-xl p-4 border border-[#2b2b3e]">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress</span>
          <span className="text-white font-semibold">{activeOA.stats.dsaCompleted} / {activeOA.stats.dsaTotal}</span>
        </div>
        <div className="w-full bg-[#2b2b3e] rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(activeOA.stats.dsaCompleted / activeOA.stats.dsaTotal) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {activeOA.stats.dsaTotal - activeOA.stats.dsaCompleted} questions remaining
        </div>
      </div>

      {/* DSA Questions */}
      <div className="bg-[#181825] rounded-xl p-4 border border-[#2b2b3e]">
        <h3 className="text-lg font-semibold text-white mb-3">Questions</h3>
        <div className="space-y-3">
          {activeOA.dsaQuestions.map((q, idx) => {
            const difficultyColors = {
              Easy: "text-green-400 bg-green-900/30",
              Medium: "text-yellow-400 bg-yellow-900/30",
              Hard: "text-red-400 bg-red-900/30"
            };
            
            return (
              <div key={q.id} className="flex items-center justify-between bg-[#1b1b29] p-3 rounded-lg border border-[#2b2b3e]">
                <div className="flex items-center gap-3 flex-1">
                  {q.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">Q{idx + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[q.difficulty]}`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <a
                      href={q.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`font-medium ${
                        q.status === "completed"
                          ? "text-gray-400 line-through"
                          : "text-white hover:text-emerald-400"
                      } transition`}
                    >
                      {q.title}
                    </a>
                  </div>
                </div>
                <a
                  href={q.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition flex-shrink-0"
                >
                  Solve
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-[#181825] rounded-xl p-4 border border-[#2b2b3e]">
        <h4 className="text-sm font-semibold text-white mb-2">📋 Instructions</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
          <li>Click "Solve" to open the problem on LeetCode</li>
          <li>Browser extension will automatically track your submissions</li>
          <li>Complete all questions within the time limit</li>
          <li>Click "Submit DSA Section" when done to complete the OA</li>
        </ul>
      </div>
    </div>
  );
}
