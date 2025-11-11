import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import DashSkeleton from "../../skeleton/dashSkeleton";
import { CircularProgress } from "./Features";

export default function AptitudeDashboard() {
  const [stats, setStats] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, topicsRes] = await Promise.all([
        API.get("/apti/stats"),
        API.get("/apti/topics")
      ]);
      
      const statsData = statsRes.data.statusCode.stats;
      const topicsData = topicsRes.data.statusCode.topics;
      
      setStats(statsData);
      setTopics(topicsData);
      
      console.log("Fetched aptitude stats:", statsData);
      console.log("Fetched topics:", topicsData);
    } catch (err) {
      console.error("Error fetching aptitude data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalSolved = stats?.totalSolved || 0;
  const totalQuestions = useMemo(() => {
    return topics.reduce((sum, t) => sum + t.count, 0);
  }, [topics]);

  const topTopics = useMemo(() => {
    if (!stats?.topicStats) return [];
    return Object.entries(stats.topicStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));
  }, [stats]);

  if (loading) return <DashSkeleton />;
  if (!stats) return <div className="text-white">Failed to load aptitude dashboard.</div>;

  return (
    <div className="bg-[#0f0f1c] text-white p-6">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl text-white font-bold tracking-tight">Aptitude Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#1a1b2e] border border-[#2b2b3e] rounded-xl p-5 shadow-sm flex flex-col gap-2">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm text-[#a0aec0] mb-1">Total Solved</p>
          <p className="text-xl font-semibold text-white leading-snug mb-1">{totalSolved} questions</p>
        </div>

        <div className="bg-[#1a1b2e] border border-[#2b2b3e] rounded-xl p-5 shadow-sm flex flex-col gap-2">
          <div className="text-2xl mb-2">🎯</div>
          <p className="text-sm text-[#a0aec0] mb-1">Topics Covered</p>
          <p className="text-xl font-semibold text-white leading-snug mb-1">
            {Object.keys(stats.topicStats || {}).length} topics
          </p>
        </div>

        <div className="bg-[#1a1b2e] border border-[#2b2b3e] rounded-xl p-5 shadow-sm flex flex-col gap-2">
          <div className="text-2xl mb-2">📚</div>
          <p className="text-sm text-[#a0aec0] mb-1">Available Questions</p>
          <p className="text-xl font-semibold text-white leading-snug mb-1">{totalQuestions} questions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[#1a1b2e] p-6 shadow-sm border border-[#2b2b3e] flex flex-col justify-between">
          <div className="flex items-center gap-8">
            <CircularProgress value={totalSolved} total={totalQuestions} />
            <div>
              <p className="text-2xl text-[#a0aec0]">Questions Solved</p>
              <p className="text-3xl font-bold">{totalSolved} / {totalQuestions}</p>
              <p className="text-md text-[#718096] mt-1">
                {totalQuestions - totalSolved} problems remaining
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[#1a1b2e] p-6 shadow-sm border border-[#2b2b3e]">
          <h2 className="font-semibold text-2xl text-white mb-4">Top Topics</h2>
          <div className="space-y-3">
            {topTopics.length > 0 ? (
              topTopics.map(({ topic, count }) => (
                <div
                  key={topic}
                  onClick={() => navigate(`/aptitude/topic/${topic}`)}
                  className="flex justify-between items-center p-3 bg-[#23253b] hover:bg-[#2b2d45] rounded-lg cursor-pointer transition border border-[#2b2b3e]"
                >
                  <span className="text-white font-medium">{topic}</span>
                  <span className="text-orange-400 font-semibold">{count} solved</span>
                </div>
              ))
            ) : (
              <p className="text-[#a0aec0] text-center py-4">No topics solved yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-[#1a1b2e] p-6 shadow-sm border border-[#2b2b3e]">
        <h2 className="font-semibold text-2xl text-white mb-4">All Topics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map(({ topic, count }) => {
            const solved = stats.topicStats?.[topic] || 0;
            const percentage = count > 0 ? Math.round((solved / count) * 100) : 0;
            
            return (
              <div
                key={topic}
                onClick={() => navigate(`/aptitude/topic/${topic}`)}
                className="p-4 bg-[#23253b] hover:bg-[#2b2d45] rounded-lg cursor-pointer transition border border-[#2b2b3e]"
              >
                <h3 className="text-white font-semibold mb-2">{topic}</h3>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-[#a0aec0]">{solved} / {count}</span>
                  <span className="text-orange-400 font-medium">{percentage}%</span>
                </div>
                <div className="w-full bg-[#2b2b3e] rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stats.recentSolved && stats.recentSolved.length > 0 && (
        <div className="mt-6 rounded-xl bg-[#1a1b2e] p-6 shadow-sm border border-[#2b2b3e]">
          <h2 className="font-semibold text-2xl text-white mb-4">Recently Solved</h2>
          <div className="space-y-2">
            {stats.recentSolved.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-3 bg-[#23253b] rounded-lg border border-[#2b2b3e]"
              >
                <span className="text-white font-medium">{item.title}</span>
                <span className="text-[#a0aec0] text-sm">
                  {new Date(item.solvedOn).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
