import React from 'react';
import { FaTrophy, FaBullseye, FaClock, FaCheckSquare, FaTimes, FaChartLine } from 'react-icons/fa';

const PerformanceMetric = ({ icon, value, label, textColor }) => (
    <div className="p-4 rounded-lg text-center bg-white/5">
        <div className={`text-3xl mx-auto ${textColor}`}>{icon}</div>
        <div className={`text-3xl font-bold mt-2 ${textColor}`}>{value}</div>
        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{label}</div>
    </div>
);

const Scorecard = ({ test, sectionWiseResults, totalScore, totalAccuracy, totalTime, totalAttempted, totalQuestions, setView, handleCloseToDashboard }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8 relative animate-fade-in-up">
                <button onClick={handleCloseToDashboard} title="Close" className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <FaTimes className="h-5 w-5" />
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-purple-400 text-center mb-6">Scorecard: {test.title}</h1>
                
                <h2 className="text-sm font-semibold text-center text-gray-400 uppercase tracking-widest mb-4">Overall Performance</h2>
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
                                        <td className="py-3 px-4 text-sm text-white">
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
                
                {/* UPDATED: This div now uses flexbox to perfectly center the button */}
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
            {/* A simple animation class for the modal appearing */}
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