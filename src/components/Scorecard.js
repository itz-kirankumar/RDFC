import React, { useState, useEffect } from 'react';
import { FaTrophy, FaBullseye, FaClock, FaCheckSquare, FaTimes, FaChartLine, FaStar } from 'react-icons/fa';
import { collection, query, where, getDocs, doc, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const PerformanceMetric = ({ icon, value, label, textColor }) => (
    <div className="p-4 rounded-lg text-center bg-white/5">
        <div className={`text-3xl mx-auto ${textColor}`}>{icon}</div>
        <div className={`text-3xl font-bold mt-2 ${textColor}`}>{value}</div>
        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{label}</div>
    </div>
);

const Scorecard = ({ test, sectionWiseResults, totalScore, totalAccuracy, totalTime, totalAttempted, totalQuestions, setView, handleCloseToDashboard }) => {
    const { userData } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!test?.id) {
                console.warn("Test ID is undefined, skipping leaderboard fetch.");
                setLoadingLeaderboard(false);
                return;
            }
            setLoadingLeaderboard(true);
            try {
                // --- OPTIMIZATION 1: Efficient Leaderboard Query ---
                const attemptsRef = collection(db, 'attempts');
                const q = query(
                    attemptsRef,
                    where('testId', '==', test.id),
                    where('status', '==', 'completed'),
                    orderBy('totalScore', 'desc'),
                    limit(10)
                );
                
                const querySnapshot = await getDocs(q);
                const topAttempts = querySnapshot.docs.map(doc => doc.data());

                if (topAttempts.length === 0) {
                    setLeaderboard([]);
                    return;
                }
                
                // --- OPTIMIZATION 2: Targeted User Data Fetching ---
                const userPromises = topAttempts.map(attempt => 
                    getDoc(doc(db, "users", attempt.userId))
                );

                const userSnapshots = await Promise.all(userPromises);
                
                const usersMap = {};
                userSnapshots.forEach(userDoc => {
                    if (userDoc.exists()) {
                        usersMap[userDoc.id] = userDoc.data().displayName || 'Anonymous';
                    }
                });

                const finalLeaderboard = topAttempts.map(attempt => ({
                    name: usersMap[attempt.userId] || 'Anonymous',
                    score: attempt.totalScore,
                    userId: attempt.userId,
                }));

                setLeaderboard(finalLeaderboard);

            } catch (error) {
                console.error("Error fetching leaderboard:", error.message);
                setLeaderboard([]);
            } finally {
                setLoadingLeaderboard(false);
            }
        };

        fetchLeaderboard();
    }, [test]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm">
            {/* Added max-h-[90vh] and overflow-y-auto for smaller screens */}
            <div className="w-full max-w-6xl bg-gray-800 rounded-xl shadow-2xl p-4 md:p-8 relative animate-fade-in-up flex flex-col md:flex-row gap-6 md:gap-8 max-h-[90vh] overflow-y-auto">
                
                {/* Scorecard Content */}
                {/* On mobile, this will take full width and stack on top of the leaderboard */}
                <div className="flex-1">
                    <button onClick={handleCloseToDashboard} title="Close" className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10">
                        <FaTimes className="h-5 w-5" />
                    </button>
                    {/* Responsive text size */}
                    <h1 className="text-xl md:text-3xl font-bold text-purple-400 text-center mb-6">Scorecard: {test?.title || 'Unknown Test'}</h1>
                    
                    <h2 className="text-sm font-semibold text-center text-gray-400 uppercase tracking-widest mb-4">Overall Performance</h2>
                    {/* Responsive grid: 2 columns on mobile, 4 on medium screens and up */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <PerformanceMetric 
                            icon={<FaTrophy />} 
                            value={totalScore} 
                            label="Total Score"
                            textColor="text-amber-400"
                        />
                        <PerformanceMetric 
                            icon={<FaBullseye />} 
                            value={`${totalAccuracy.toFixed(2)}%`} 
                            label="Accuracy"
                            textColor="text-green-400"
                        />
                        <PerformanceMetric 
                            icon={<FaClock />} 
                            value={`${Math.floor(totalTime / 60)}m ${Math.round(totalTime % 60)}s`}
                            label="Time Taken"
                            textColor="text-sky-400"
                        />
                        <PerformanceMetric 
                            icon={<FaCheckSquare />} 
                            value={`${totalAttempted}/${totalQuestions}`}
                            label="Attempted"
                            textColor="text-violet-400"
                        />
                    </div>
    
                    <h2 className="text-sm font-semibold text-center text-gray-400 uppercase tracking-widest mt-8 mb-4">Sectional Breakdown</h2>
                    
                    <div className="bg-gray-900/50 rounded-lg shadow-inner overflow-hidden">
                        {/* overflow-x-auto makes the table scrollable horizontally on small screens */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-center">
                                <thead>
                                    <tr>
                                        <th className="py-3 px-4 font-semibold text-xs text-gray-400 uppercase">Section</th>
                                        <th className="py-3 px-4 font-semibold text-xs text-gray-400 uppercase">Score</th>
                                        <th className="py-3 px-4 font-semibold text-xs text-gray-400 uppercase">Correct</th>
                                        <th className="py-3 px-4 font-semibold text-xs text-gray-400 uppercase">Incorrect</th>
                                        <th className="py-3 px-4 font-semibold text-xs text-gray-400 uppercase">Unattempted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {sectionWiseResults.map(sec => (
                                        <tr key={sec.name}>
                                            <td className="py-3 px-4 text-sm text-white whitespace-nowrap">
                                                <span className="bg-gray-600 px-3 py-1 rounded-full font-semibold">{sec.name}</span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-white font-bold">{sec.score}</td>
                                            <td className="py-3 px-4 text-sm text-green-400">{sec.correct}</td>
                                            <td className="py-3 px-4 text-sm text-red-400">{sec.incorrect}</td>
                                            <td className="py-3 px-4 text-sm text-gray-400">{sec.unattempted}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="mt-8 flex justify-center">
                        <button 
                            onClick={() => setView('analysis')} 
                            className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all flex items-center space-x-2 shadow-lg"
                        >
                            <FaChartLine />
                            <span>Analyze Questions</span>
                        </button>
                    </div>
                </div>

                {/* Leaderboard Section */}
                {/* On mobile, this will stack below the scorecard */}
                <div className="flex-1 w-full mt-8 md:mt-0">
                    <h2 className="text-xl font-bold text-gray-200 text-center mb-4">Leaderboard</h2>
                    <div className="bg-gray-900/50 rounded-lg shadow-inner overflow-hidden">
                        {loadingLeaderboard ? (
                            <div className="flex items-center justify-center p-4 text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mr-3"></div>
                                <span>Loading...</span>
                            </div>
                        ) : (
                            // overflow-x-auto for smaller screens if names are too long
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-white">
                                    <thead>
                                        <tr className="bg-gray-700">
                                            <th className="py-3 px-4 font-semibold text-xs text-gray-400 uppercase">Rank</th>
                                            <th className="py-3 px-4 font-semibold text-xs text-gray-400 uppercase">Name</th>
                                            <th className="py-3 px-4 font-semibold text-xs text-gray-400 uppercase">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {leaderboard.length > 0 ? (
                                            leaderboard.map((user, index) => (
                                                <tr key={user.userId} className={user.userId === userData?.uid ? 'bg-blue-900/40' : ''}>
                                                    <td className="py-3 px-4 text-sm">{index + 1}</td>
                                                    <td className="py-3 px-4 text-sm whitespace-nowrap">
                                                        {index === 0 && <FaStar className="inline-block text-yellow-400 mr-2" />}
                                                        {user.name}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm font-bold">{user.score}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="py-4 text-center text-gray-400">No other completed attempts yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style jsx global>{`
                @keyframes fade-in-up {
                    0% {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Scorecard;