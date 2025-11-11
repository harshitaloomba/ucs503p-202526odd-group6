
import React, { useEffect, useState,useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import Selector from '../components/Topic_Company_wise/Selector';
import FiltersAndSorting from '../components/Topic_Company_wise/FiltersAndSorting';
import ProgressBar from '../components/Topic_Company_wise/ProgressBar';
import QuestionCard from '../components/Topic_Company_wise/QuesCard';
import AptitudeQuiz from '../components/Aptitude/AptitudeQuiz';
import API from '../api/axios';
import TcSkeleton from '../skeleton/tcSkeleton';

export default function Topic() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState([]);
  const [mode, setMode] = useState('dsa'); // 'dsa' or 'aptitude'

  const selectedTopic = searchParams.get('topic') || (mode === 'dsa' ? 'Array' : null);
  const statusFilter = searchParams.get('status') || null;
  const difficultyFilter = searchParams.get('difficulty') || null;

  const topics = [
        "Array",
        "Backtracking",
        "Binary Indexed Tree",
        "Binary Search",
        "Binary Search Tree",
        "Binary Tree",
        "Bit Manipulation",
        "Bitmask",
        "Biconnected Component",
        "Brainteaser",
        "Breadth-First Search",
        "Bucket Sort",
        "Combinatorics",
        "Concurrency",
        "Counting",
        "Counting Sort",
        "Database",
        "Data Stream",
        "Design",
        "Depth-First Search",
        "Divide and Conquer",
        "Doubly-Linked List",
        "Dynamic Programming",
        "Enumeration",
        "Eulerian Circuit",
        "Game Theory",
        "Geometry",
        "Graph",
        "Greedy",
        "Hash Function",
        "Hash Table",
        "Heap (Priority Queue)",
        "Interactive",
        "Iterator",
        "Line Sweep",
        "Linked List",
        "Math",
        "Matrix",
        "Memoization",
        "Merge Sort",
        "Minimum Spanning Tree",
        "Monotonic Queue",
        "Monotonic Stack",
        "Number Theory",
        "Ordered Set",
        "Prefix Sum",
        "Probability and Statistics",
        "Quickselect",
        "Queue",
        "Radix Sort",
        "Recursion",
        "Rejection Sampling",
        "Reservoir Sampling",
        "Rolling Hash",
        "Segment Tree",
        "Shell",
        "Shortest Path",
        "Simulation",
        "Sliding Window",
        "Sorting",
        "Stack",
        "String",
        "String Matching",
        "Strongly Connected Component",
        "Suffix Array",
        "Topological Sort",
        "Tree",
        "Trie",
        "Two Pointers",
        "Union Find"
    ];

  const setParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  useEffect(() => {
    const controller = new AbortController();

    const topic = selectedTopic;
    const cacheKey = `topic_${topic}`;
    const cacheTimeKey = `${cacheKey}_time`;

    const cached = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheTimeKey);
    const isFresh = cachedTime && dayjs().diff(dayjs(cachedTime), 'minute') < 1;

    if (cached && isFresh) {
      try {
        const parsed = JSON.parse(cached);
        setResponse(parsed);
        setAllQuestions(parsed.questions);
        setLoading(false);
        return;
      } catch (err) {
        console.error("Failed to parse cache", err);
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(cacheTimeKey);
      }
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const endpoint = `/topics/${topic}`;
        const res = await API.get(endpoint, { signal: controller.signal });
        setResponse(res.data.statusCode);
        setAllQuestions(res.data.statusCode.questions);
        // console.log("Response:", res.data.statusCode.total);
        
        sessionStorage.setItem(cacheKey, JSON.stringify(res.data.statusCode));
        sessionStorage.setItem(cacheTimeKey, dayjs().toISOString());
      } catch (err) {
        if (err.name !== 'CanceledError') {
          console.error("Error fetching stats:", err);
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
        statusFilter === "solved" ? q.solved === true : q.solved === false
      );
    }
    
    if (difficultyFilter) {
      filtered = filtered.filter((q) => q.difficulty === difficultyFilter);
    }

    return filtered;
  }, [allQuestions, statusFilter, difficultyFilter]);


  return (
    <div className="bg-[#0f0f1c] min-h-screen">
      {/* Toggle Button */}
      <div className="flex justify-center pt-4 pb-1">
        <div className="inline-flex rounded-full bg-[#1a1b2e] p-0.5 border border-[#2b2b3e]">
          <button
            onClick={() => setMode('dsa')}
            className={`px-6 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 ${
              mode === 'dsa'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            DSA
          </button>
          <button
            onClick={() => setMode('aptitude')}
            className={`px-6 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 ${
              mode === 'aptitude'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Aptitude
          </button>
        </div>
      </div>

      {mode === 'dsa' ? (
        <div className="p-6 flex gap-6">
          <div className="w-64 shrink-0">
            <Selector
              topics={topics}
              selectedTopic={selectedTopic}
              onSelect={(topic) => setParam('topic', topic)}
            />
          </div>

          { !loading && response ? (
            
            <div className="flex-1 mt-8">
              <h1 className="text-3xl pl-2 font-bold text-white mb-6">{selectedTopic}</h1>

              <ProgressBar
                topic="Progress"
                completed={response.solvedCount}
                total={response.total}
              />

              <FiltersAndSorting
                statusFilter={statusFilter}
                setStatusFilter={(status) => setParam('status', status)}
                difficultyFilter={difficultyFilter}
                setDifficultyFilter={(difficulty) => setParam('difficulty', difficulty)}
                onSelect={(topic) => setParam('topic', topic)}
              />

              <div className="mt-6 h-[70vh] overflow-y-auto flex flex-col gap-4 hide-scrollbar">
                {Array.isArray(filteredQuestions) && filteredQuestions.length > 0 ? (
                  filteredQuestions.map((q) => (
                    <QuestionCard
                      key={q.Qid}
                      Qid={q.Qid}
                      title={q.title}
                      slug={q.slug}
                      difficulty={q.difficulty}
                      solved={q.solved}
                      topics={q.topics}
                      companyTags={q.companyTags}
                    />
                  ))
                ): (
                  <p className="text-white">No questions found.</p>
                )}
              </div>
            </div>
          ):(
            <TcSkeleton />
          )}
        </div>
      ) : (
        <AptitudeQuiz />
      )}
    </div>
  );
}