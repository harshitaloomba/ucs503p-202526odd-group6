import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { TrendingUp, Award, Clock, Target, Calendar, BarChart3 } from "lucide-react";
import API from "../api/axios";
import toast, { Toaster } from "react-hot-toast";

dayjs.extend(relativeTime);

export default function OADashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState({ recent: [], aggregate: {} });
  const [activeOA, setActiveOA] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, statusRes] = await Promise.all([
          API.get("/oa/history"),
          API.get("/oa/status").catch(() => ({ status: 204 }))
        ]);

        console.log("History response:", historyRes.data);
        
        // Try multiple paths to get the data
        const historyData = historyRes.data.data || historyRes.data.statusCode || historyRes.data;
        console.log("Parsed history data:", historyData);
        
        setHistory(historyData);

        if (statusRes.status !== 204) {
          const statusData = statusRes.data.statusCode || statusRes.data.data || statusRes.data;
          if (statusData.status === "ongoing") {
            setActiveOA(statusData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch OA data:", err);
        toast.error("Failed to load OA data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    const agg = history.aggregate || {};
    return {
      totalSessions: agg.sessions || 0,
      totalQuestions: agg.totalQuestions || 0,
      totalCompleted: agg.totalCompleted || 0,
      completionRate: agg.completionRatePercent || 0,
      avgDuration: agg.avgSessionDurationMinutes || 0,
      difficultyBreakdown: agg.difficultyBreakdown || {}
    };
  }, [history]);

  const handleStartOA = async () => {
    try {
      toast.loading("Creating OA...");
      await API.post("/oa/create");
      toast.dismiss();
      toast.success("OA created! Redirecting...");
      setTimeout(() => navigate("/practice"), 1000);
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || "Failed to create OA");
    }
  };

  const handleJoinOA = () => {
    navigate("/practice");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1c] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1c] p-6">
      <Toaster position="top-right" reverseOrder={false} />
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-[#1a1b2e] rounded-2xl p-6 border border-[#2b2b3e] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Online Assessment Dashboard</h1>
              <p className="text-[#a0aec0] mt-2">
                {activeOA 
                  ? "You have an ongoing OA. Continue your assessment now!"
                  : "Track your performance and start new assessments"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeOA ? (
                <>
                  <div className="flex items-center gap-2 bg-[#23253b] px-4 py-2 rounded-lg border border-[#2b2b3e]">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-medium">OA in Progress</span>
                  </div>
                  <button
                    onClick={handleJoinOA}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold shadow-sm transition"
                  >
                    Continue OA
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartOA}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold shadow-sm transition"
                >
                  Start New OA
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Calendar className="h-6 w-6 text-[#a0aec0]" />}
            label="Total Sessions"
            value={stats.totalSessions}
          />
          <StatCard
            icon={<Target className="h-6 w-6 text-[#a0aec0]" />}
            label="Questions Solved"
            value={`${stats.totalCompleted}/${stats.totalQuestions}`}
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-[#a0aec0]" />}
            label="Completion Rate"
            value={`${stats.completionRate}%`}
          />
          <StatCard
            icon={<Clock className="h-6 w-6 text-[#a0aec0]" />}
            label="Avg Duration"
            value={`${stats.avgDuration}m`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Difficulty Breakdown */}
          <div className="bg-[#1a1b2e] rounded-xl p-6 border border-[#2b2b3e] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#a0aec0]" />
              <h3 className="text-lg font-semibold text-white">Difficulty Breakdown</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(stats.difficultyBreakdown).map(([difficulty, count]) => {
                const colors = {
                  Easy: { bg: "bg-green-500", text: "text-green-400" },
                  Medium: { bg: "bg-yellow-500", text: "text-yellow-400" },
                  Hard: { bg: "bg-red-500", text: "text-red-400" }
                };
                const color = colors[difficulty] || colors.Easy;
                const percentage = stats.totalQuestions > 0 
                  ? Math.round((count / stats.totalQuestions) * 100) 
                  : 0;

                return (
                  <div key={difficulty}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-medium ${color.text}`}>{difficulty}</span>
                      <span className="text-[#a0aec0]">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-[#2b2b3e] rounded-full h-2.5">
                      <div
                        className={`${color.bg} h-2.5 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Trend */}
          <div className="bg-[#1a1b2e] rounded-xl p-6 border border-[#2b2b3e] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-[#a0aec0]" />
              <h3 className="text-lg font-semibold text-white">Performance Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#23253b] rounded-lg border border-[#2b2b3e]">
                <div>
                  <div className="text-sm text-[#a0aec0]">Total Attempts</div>
                  <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#a0aec0]">Success Rate</div>
                  <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
                </div>
              </div>
              
              <div className="p-4 bg-[#23253b] rounded-lg border border-[#2b2b3e]">
                <div className="text-sm text-[#a0aec0] mb-2">Overall Progress</div>
                <div className="relative w-full h-32 flex items-end justify-around gap-2">
                  {history.recent?.slice(0, 5).reverse().map((session, idx) => {
                    const height = session.completionRatePercent || 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-orange-500 to-orange-600 rounded-t transition-all duration-300 hover:opacity-80"
                          style={{ height: `${height}%` }}
                        />
                        <div className="text-xs text-[#a0aec0] mt-2">{height}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-[#1a1b2e] rounded-xl p-6 border border-[#2b2b3e] shadow-sm">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Sessions</h3>
          <div className="space-y-3">
            {history.recent?.length > 0 ? (
              history.recent.map((session) => (
                <SessionCard key={session.oaId} session={session} />
              ))
            ) : (
              <div className="text-center py-8 text-[#a0aec0]">
                <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No OA sessions yet. Start your first assessment!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-[#1a1b2e] rounded-xl p-5 border border-[#2b2b3e] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        {icon}
        <div className="text-xs text-[#a0aec0]">{label}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function SessionCard({ session }) {
  const statusColors = {
    completed: "bg-green-900/30 text-green-400 border-green-500/50",
    aborted: "bg-red-900/30 text-red-400 border-red-500/50"
  };

  const statusColor = statusColors[session.status] || statusColors.aborted;

  return (
    <div className="bg-[#23253b] rounded-lg p-4 border border-[#2b2b3e] hover:border-[#3c3c56] transition">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-xs px-3 py-1 rounded-full border ${statusColor}`}>
              {session.status}
            </span>
            <span className="text-sm text-[#a0aec0]">
              {dayjs(session.createdAt).format("MMM D, YYYY")}
            </span>
            <span className="text-sm text-[#a0aec0]">
              • {session.durationMinutes}m
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[#a0aec0]">Aptitude</div>
              <div className="text-white font-semibold">
                {session.aptitudeCorrect || 0}/{session.totalAptitudeQuestions || 25}
              </div>
            </div>
            <div>
              <div className="text-[#a0aec0]">DSA</div>
              <div className="text-white font-semibold">
                {session.dsaCompletedCount || 0}/{session.totalDsaQuestions || 4}
              </div>
            </div>
            <div>
              <div className="text-[#a0aec0]">Completion</div>
              <div className="text-white font-semibold">{session.completionRatePercent || 0}%</div>
            </div>
            <div>
              <div className="text-[#a0aec0]">Ended</div>
              <div className="text-white font-semibold">{dayjs(session.endedAt).fromNow()}</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.location.href = `/oa/${session.oaId}`}
          className="px-4 py-2 bg-[#2b2b3e] hover:bg-[#3c3c56] text-white rounded-lg text-sm font-medium transition border border-[#2b2b3e]"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
