import { useEffect, useState } from "react";
import authService from "../services/Auth";
import Loader from "../components/Loader";
import Dashboard from "../components/Dashboard/Dashboard";
import AptitudeDashboard from "../components/Dashboard/AptitudeDashboard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dsa"); // "dsa" or "aptitude"

  useEffect(() => {
    let isMounted = true;

    authService.getCurrentUser()
      .then((res) => {
        if (isMounted) setUser(res);
      })
      .catch((err) => {
        console.error("❌ Auth error:", err?.response?.data?.message || err.message || err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false };
  }, []);

  if (loading) return (
    <>
      <Loader />
    </>
  );

  if (!user) {
    return (
      <div className="text-white text-center p-6">
        Failed to load user. Please{" "}
        <a href="/login" className="text-blue-400 underline">log in</a> again.
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f1c] min-h-screen">
      {/* Toggle Button */}
      <div className="flex justify-center pt-4 pb-1">
        <div className="inline-flex rounded-full bg-[#1a1b2e] p-0.5 border border-[#2b2b3e]">
          <button
            onClick={() => setActiveTab("dsa")}
            className={`px-6 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 ${
              activeTab === "dsa"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            DSA
          </button>
          <button
            onClick={() => setActiveTab("aptitude")}
            className={`px-6 py-1.5 rounded-full font-semibold text-sm transition-all duration-300 ${
              activeTab === "aptitude"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Aptitude
          </button>
        </div>
      </div>

      {/* Render Dashboard based on active tab */}
      {activeTab === "dsa" ? <Dashboard /> : <AptitudeDashboard />}
    </div>
  );
}