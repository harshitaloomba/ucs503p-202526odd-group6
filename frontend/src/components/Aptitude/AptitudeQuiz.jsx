import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import API from '../../api/axios';
import Selector from '../Topic_Company_wise/Selector';
import ProgressBar from '../Topic_Company_wise/ProgressBar';
import TcSkeleton from '../../skeleton/tcSkeleton';
import { CheckCircle, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function AptitudeQuiz() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [topics, setTopics] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [validatedAnswers, setValidatedAnswers] = useState({});
  const [submitting, setSubmitting] = useState({});

  const selectedTopic = searchParams.get('topic') || null;
  const statusFilter = searchParams.get('status') || null;

  const setParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  // Fetch topics on mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await API.get('/apti/topics');
        const topicsData = res.data.statusCode.topics.map(t => t.topic);
        setTopics(topicsData);
        
        // Set default topic if none selected
        if (!selectedTopic && topicsData.length > 0) {
          setParam('topic', topicsData[0]);
        }
      } catch (err) {
        console.error('Error fetching topics:', err);
      }
    };
    fetchTopics();
  }, []);

  // Fetch questions when topic changes
  useEffect(() => {
    if (!selectedTopic) return;

    const controller = new AbortController();
    const cacheKey = `apti_topic_${selectedTopic}`;
    const cacheTimeKey = `${cacheKey}_time`;

    const cached = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheTimeKey);
    const isFresh = cachedTime && dayjs().diff(dayjs(cachedTime), 'minute') < 5;

    if (cached && isFresh) {
      try {
        const parsed = JSON.parse(cached);
        setResponse(parsed);
        setAllQuestions(parsed.questions);
        setLoading(false);
        return;
      } catch (err) {
        console.error('Failed to parse cache', err);
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(cacheTimeKey);
      }
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const endpoint = `/apti/topics/${selectedTopic}`;
        const res = await API.get(endpoint, { signal: controller.signal });
        setResponse(res.data.statusCode);
        setAllQuestions(res.data.statusCode.questions);

        sessionStorage.setItem(cacheKey, JSON.stringify(res.data.statusCode));
        sessionStorage.setItem(cacheTimeKey, dayjs().toISOString());
      } catch (err) {
        if (err.name !== 'CanceledError') {
          console.error('Error fetching questions:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [selectedTopic]);

  const filteredQuestions = useMemo(() => {
    if (!allQuestions || !Array.isArray(allQuestions)) return [];
    let filtered = [...allQuestions];

    if (statusFilter) {
      filtered = filtered.filter((q) =>
        statusFilter === 'solved' ? q.solved === true : q.solved === false
      );
    }

    return filtered;
  }, [allQuestions, statusFilter]);

  const handleAnswerSelect = (Qid, answer) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [Qid]: answer
    }));
  };

  const handleSubmit = async (Qid) => {
    const selectedAnswer = selectedAnswers[Qid];
    if (!selectedAnswer) return;

    setSubmitting(prev => ({ ...prev, [Qid]: true }));

    try {
      const res = await API.post('/apti/validate', {
        Qid,
        selectedAnswer
      });

      const result = res.data.statusCode;
      setValidatedAnswers(prev => ({
        ...prev,
        [Qid]: result
      }));

      // Update the question's solved status in the local state
      if (result.isCorrect) {
        setAllQuestions(prev =>
          prev.map(q => q.Qid === Qid ? { ...q, solved: true } : q)
        );
        toast.success('Correct answer!');
      } else {
        toast.error('Incorrect answer');
      }
    } catch (err) {
      console.error('Error validating answer:', err);
      toast.error('Failed to validate answer. Please try again.');
    } finally {
      setSubmitting(prev => ({ ...prev, [Qid]: false }));
    }
  };

  return (
    <div className="p-6 flex gap-6">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="w-64 shrink-0">
        <Selector
          topics={topics}
          selectedTopic={selectedTopic}
          onSelect={(topic) => setParam('topic', topic)}
        />
      </div>

      {!loading && response ? (
        <div className="flex-1">
          <div className="pb-4">
            <h1 className="text-3xl pl-2 font-bold text-white mb-4 mt-8">{selectedTopic}</h1>

            <ProgressBar
              topic="Progress"
              completed={response.solvedCount}
              total={response.total}
            />

            {/* Status Filter */}
            <div className="mt-4 flex gap-3">
            <button
              onClick={() => setParam('status', null)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                !statusFilter
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#1a1b2e] text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setParam('status', 'solved')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFilter === 'solved'
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#1a1b2e] text-slate-400 hover:text-white'
              }`}
            >
              Solved
            </button>
            <button
              onClick={() => setParam('status', 'unsolved')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFilter === 'unsolved'
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#1a1b2e] text-slate-400 hover:text-white'
              }`}
            >
              Unsolved
            </button>
            </div>
          </div>
          

          <div className="mt-2 h-[70vh] overflow-y-auto flex flex-col gap-4 hide-scrollbar">
            {Array.isArray(filteredQuestions) && filteredQuestions.length > 0 ? (
              filteredQuestions.map((q) => {
                const validated = validatedAnswers[q.Qid];
                const isSubmitted = !!validated;
                const selectedAnswer = selectedAnswers[q.Qid];

                return (
                  <div
                    key={q.Qid}
                    className="p-4 rounded-xl bg-[#1a1b2e] shadow-md border border-white/10"
                  >
                    {/* Question Header */}
                    <div className="flex items-start gap-2 mb-3">
                      {q.solved ? (
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-gray-500 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-white text-base leading-snug">{q.title}</p>
                    </div>

                    {/* Options */}
                    <div className="space-y-2 mb-3">
                      {q.options.map((option, idx) => {
                        const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D
                        const isSelected = selectedAnswer === optionLabel;
                        const isCorrect = validated?.correctAnswer === optionLabel;
                        const isWrong = isSubmitted && isSelected && !validated?.isCorrect;

                        let optionClass = 'bg-[#23253b] border-[#2b2b3e] hover:bg-[#2b2d45]';
                        if (isSubmitted) {
                          if (isCorrect) {
                            optionClass = 'bg-green-900/30 border-green-500';
                          } else if (isWrong) {
                            optionClass = 'bg-red-900/30 border-red-500';
                          }
                        } else if (isSelected) {
                          optionClass = 'bg-orange-600/30 border-orange-500';
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => !isSubmitted && handleAnswerSelect(q.Qid, optionLabel)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-2.5 rounded-lg border-2 transition ${optionClass} ${
                              isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">{optionLabel}.</span>
                              <span className="text-white text-sm">{option}</span>
                              {isSubmitted && isCorrect && (
                                <CheckCircle className="h-4 w-4 text-green-400 ml-auto" />
                              )}
                              {isSubmitted && isWrong && (
                                <XCircle className="h-4 w-4 text-red-400 ml-auto" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Submit Button or Result */}
                    {!isSubmitted ? (
                      <button
                        onClick={() => handleSubmit(q.Qid)}
                        disabled={!selectedAnswer || submitting[q.Qid]}
                        className={`w-full py-2 rounded-lg font-semibold text-sm transition ${
                          selectedAnswer && !submitting[q.Qid]
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-gray-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {submitting[q.Qid] ? 'Submitting...' : 'Submit Answer'}
                      </button>
                    ) : (
                      <div
                        className={`p-3 rounded-lg ${
                          validated.isCorrect
                            ? 'bg-green-900/30 border border-green-500'
                            : 'bg-red-900/30 border border-red-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {validated.isCorrect ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              <span className="text-green-400 font-semibold text-sm">Correct!</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-400" />
                              <span className="text-red-400 font-semibold text-sm">Incorrect</span>
                            </>
                          )}
                        </div>
                        <p className="text-white text-xs">
                          Correct answer: <span className="font-semibold">{validated.correctAnswer}</span>
                        </p>
                        {validated.explanation && (
                          <p className="text-gray-300 text-xs mt-1">{validated.explanation}</p>
                        )}
                      </div>
                    )}

                    {/* Topics */}
                    {q.topics && q.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {q.topics.map((topic, idx) => (
                          <span
                            key={idx}
                            className="bg-[#2b2c3c] text-slate-300 text-xs px-2 py-0.5 rounded-full"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-white">No questions found.</p>
            )}
          </div>
        </div>
      ) : (
        <TcSkeleton />
      )}
    </div>
  );
}
