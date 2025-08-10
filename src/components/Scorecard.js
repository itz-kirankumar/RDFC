import React from 'react';

// Reusable Button Component
const Button = ({ onClick, children, className = '' }) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-md font-semibold transition-all ${className}`}>
        {children}
    </button>
);

const Scorecard = ({ test, sectionWiseResults, totalScore, totalAccuracy, totalTime, totalAttempted, totalQuestions, setView, handleCloseToDashboard }) => {
    return (
        <div className="bg-gray-900 text-white min-h-screen p-4 md:p-8 flex flex-col justify-center items-center">
            <div className="max-w-4xl mx-auto w-full relative bg-gray-800 rounded-lg shadow-2xl p-4 md:p-8">
                <button onClick={handleCloseToDashboard} title="Back to Dashboard" className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white text-center mb-6 md:mb-8">Scorecard: {test.title}</h1>
                
                <h2 className="text-lg md:text-xl font-semibold p-4 text-center border-b border-gray-600">Overall Performance</h2>
                {/* FIX: Grid is now 2 columns on mobile, 4 on desktop for better readability */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 text-center mt-4">
                    <div className="p-4 md:p-6 bg-gray-700 rounded-xl shadow-inner border border-gray-600">
                        <div className="text-3xl md:text-4xl font-bold text-white">{totalScore}</div>
                        <div className="text-xs md:text-sm text-gray-300 mt-1">Total Score</div>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-700 rounded-xl shadow-inner border border-gray-600">
                        <div className="text-3xl md:text-4xl font-bold text-white">{totalAccuracy.toFixed(2)}%</div>
                        <div className="text-xs md:text-sm text-gray-300 mt-1">Accuracy</div>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-700 rounded-xl shadow-inner border border-gray-600">
                        <div className="text-3xl md:text-4xl font-bold text-white">{Math.floor(totalTime / 60)}m {Math.round(totalTime % 60)}s</div>
                        <div className="text-xs md:text-sm text-gray-300 mt-1">Time Taken</div>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-700 rounded-xl shadow-inner border border-gray-600">
                        <div className="text-3xl md:text-4xl font-bold text-white">{totalAttempted}/{totalQuestions}</div>
                        <div className="text-xs md:text-sm text-gray-300 mt-1">Attempted</div>
                    </div>
                </div>

                <h2 className="text-lg md:text-xl font-semibold p-4 text-center border-b border-gray-600 mt-6 md:mt-8">Sectional Breakdown</h2>
                
                {/* FIX: Desktop Table View (hidden on mobile) */}
                <div className="bg-gray-700 rounded-lg shadow-inner overflow-hidden mt-4 hidden md:block">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-center divide-y divide-gray-600">
                            <thead className="bg-gray-600">
                                <tr>
                                    <th className="py-2 px-3 font-semibold text-xs">Section</th>
                                    <th className="py-2 px-3 font-semibold text-xs">Score</th>
                                    <th className="py-2 px-3 font-semibold text-xs">Correct</th>
                                    <th className="py-2 px-3 font-semibold text-xs">Incorrect</th>
                                    <th className="py-2 px-3 font-semibold text-xs">Unattempted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {sectionWiseResults.map(sec => (
                                    <tr key={sec.name}>
                                        <td className="py-2 px-3 font-bold text-sm">{sec.name}</td>
                                        <td className="py-2 px-3 text-sm">{sec.score}</td>
                                        <td className="py-2 px-3 text-sm text-green-400">{sec.correct}</td>
                                        <td className="py-2 px-3 text-sm text-red-400">{sec.incorrect}</td>
                                        <td className="py-2 px-3 text-sm text-gray-400">{sec.unattempted}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FIX: Mobile Card View (visible only on mobile) */}
                <div className="md:hidden mt-4 space-y-4">
                    {sectionWiseResults.map(sec => (
                        <div key={sec.name} className="bg-gray-700 rounded-lg shadow-inner p-4 border border-gray-600">
                            <h3 className="text-lg font-bold text-center mb-3">{sec.name}</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="font-semibold text-gray-300">Score:</div>
                                <div className="text-right font-bold">{sec.score}</div>

                                <div className="font-semibold text-gray-300">Correct:</div>
                                <div className="text-right text-green-400 font-bold">{sec.correct}</div>

                                <div className="font-semibold text-gray-300">Incorrect:</div>
                                <div className="text-right text-red-400 font-bold">{sec.incorrect}</div>

                                <div className="font-semibold text-gray-300">Unattempted:</div>
                                <div className="text-right text-gray-400 font-bold">{sec.unattempted}</div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="text-center mt-8">
                    <Button onClick={() => setView('analysis')} className="bg-white text-gray-900 hover:bg-gray-200 shadow-xl transform hover:scale-105">
                        Analyze Questions &rarr;
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Scorecard;
