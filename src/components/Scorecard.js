import React from 'react';

// Reusable Button Component
const Button = ({ onClick, children, className = '' }) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-md font-semibold transition-all ${className}`}>
        {children}
    </button>
);

const Scorecard = ({ test, sectionWiseResults, totalScore, totalAccuracy, totalTime, totalAttempted, totalQuestions, setView, handleCloseToDashboard }) => {
    return (
        // FIX: Main container now has a white background on mobile and dark on desktop.
        // It fills the screen on mobile and centers on desktop.
        <div className="bg-white md:bg-gray-900 text-gray-800 md:text-white min-h-screen md:p-8 md:flex md:flex-col md:justify-center md:items-center">
            {/* FIX: Inner container is responsive, full-width on mobile, max-width on desktop */}
            <div className="w-full max-w-4xl mx-auto relative bg-white md:bg-gray-800 md:rounded-lg md:shadow-2xl p-4 md:p-8">
                <button onClick={handleCloseToDashboard} title="Back to Dashboard" className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 md:hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 md:text-white text-center mb-6 md:mb-8">Scorecard: {test.title}</h1>
                
                <h2 className="text-lg md:text-xl font-semibold p-4 text-center border-b border-gray-200 md:border-gray-600">Overall Performance</h2>
                {/* FIX: Grid is 2 columns on mobile, 4 on desktop for better readability */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 text-center mt-4">
                    <div className="p-4 md:p-6 bg-gray-100 md:bg-gray-700 rounded-xl shadow-inner border border-gray-200 md:border-gray-600">
                        <div className="text-3xl md:text-4xl font-bold text-gray-900 md:text-white">{totalScore}</div>
                        <div className="text-xs md:text-sm text-gray-500 md:text-gray-300 mt-1">Total Score</div>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-100 md:bg-gray-700 rounded-xl shadow-inner border border-gray-200 md:border-gray-600">
                        <div className="text-3xl md:text-4xl font-bold text-gray-900 md:text-white">{totalAccuracy.toFixed(2)}%</div>
                        <div className="text-xs md:text-sm text-gray-500 md:text-gray-300 mt-1">Accuracy</div>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-100 md:bg-gray-700 rounded-xl shadow-inner border border-gray-200 md:border-gray-600">
                        <div className="text-3xl md:text-4xl font-bold text-gray-900 md:text-white">{Math.floor(totalTime / 60)}m {Math.round(totalTime % 60)}s</div>
                        <div className="text-xs md:text-sm text-gray-500 md:text-gray-300 mt-1">Time Taken</div>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-100 md:bg-gray-700 rounded-xl shadow-inner border border-gray-200 md:border-gray-600">
                        <div className="text-3xl md:text-4xl font-bold text-gray-900 md:text-white">{totalAttempted}/{totalQuestions}</div>
                        <div className="text-xs md:text-sm text-gray-500 md:text-gray-300 mt-1">Attempted</div>
                    </div>
                </div>

                <h2 className="text-lg md:text-xl font-semibold p-4 text-center border-b border-gray-200 md:border-gray-600 mt-6 md:mt-8">Sectional Breakdown</h2>
                
                {/* FIX: Desktop Table View (hidden on mobile) */}
                <div className="bg-gray-700 rounded-lg shadow-inner overflow-hidden mt-4 hidden md:block">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-center divide-y divide-gray-600">
                            <thead className="bg-gray-600">
                                <tr>
                                    <th className="py-2 px-3 font-semibold text-xs text-white">Section</th>
                                    <th className="py-2 px-3 font-semibold text-xs text-white">Score</th>
                                    <th className="py-2 px-3 font-semibold text-xs text-white">Correct</th>
                                    <th className="py-2 px-3 font-semibold text-xs text-white">Incorrect</th>
                                    <th className="py-2 px-3 font-semibold text-xs text-white">Unattempted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {sectionWiseResults.map(sec => (
                                    <tr key={sec.name}>
                                        <td className="py-2 px-3 font-bold text-sm text-white">{sec.name}</td>
                                        <td className="py-2 px-3 text-sm text-white">{sec.score}</td>
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
                        <div key={sec.name} className="bg-gray-100 rounded-lg shadow-inner p-4 border border-gray-200">
                            <h3 className="text-lg font-bold text-center mb-3 text-gray-900">{sec.name}</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="font-semibold text-gray-600">Score:</div>
                                <div className="text-right font-bold text-gray-900">{sec.score}</div>

                                <div className="font-semibold text-gray-600">Correct:</div>
                                <div className="text-right text-green-600 font-bold">{sec.correct}</div>

                                <div className="font-semibold text-gray-600">Incorrect:</div>
                                <div className="text-right text-red-600 font-bold">{sec.incorrect}</div>

                                <div className="font-semibold text-gray-600">Unattempted:</div>
                                <div className="text-right text-gray-500 font-bold">{sec.unattempted}</div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="text-center mt-8">
                    <Button onClick={() => setView('analysis')} className="bg-gray-800 text-white hover:bg-gray-700 md:bg-white md:text-gray-900 md:hover:bg-gray-200 shadow-xl transform hover:scale-105">
                        Analyze Questions &rarr;
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Scorecard;
