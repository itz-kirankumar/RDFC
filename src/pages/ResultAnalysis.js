import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ResultAnalysis = ({ navigate, attemptId }) => {
    const [attempt, setAttempt] = useState(null);
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('summary'); // 'summary' or 'analysis'
    const [currentQuestion, setCurrentQuestion] = useState({ secIdx: 0, qIdx: 0 });
    const [revealed, setRevealed] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            if (!attemptId) { navigate('home'); return; }
            try {
                const attemptRef = doc(db, 'attempts', attemptId);
                const attemptSnap = await getDoc(attemptRef);

                if (attemptSnap.exists()) {
                    const attemptData = attemptSnap.data();
                    setAttempt(attemptData);

                    const testRef = doc(db, 'tests', attemptData.testId);
                    const testSnap = await getDoc(testRef);
                    if (testSnap.exists()) {
                        setTest(testSnap.data());
                    } else { throw new Error("Test data not found for this attempt."); }
                } else { throw new Error("Attempt data not found."); }
            } catch (error) {
                console.error("Error fetching results:", error);
                alert(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [attemptId, navigate]);

    if (loading) return <div className="text-center text-gray-400">Loading Analysis...</div>;
    if (!attempt || !test) return <div className="text-center text-gray-400">Could not load analysis data.</div>;

    // --- Calculations ---
    const sectionWiseResults = test.sections.map((section, secIdx) => {
        let correct = 0, incorrect = 0, unattempted = 0, time = 0;
        section.questions.forEach((q, qIdx) => {
            const userAnswer = attempt.answers[secIdx]?.[qIdx];
            if (userAnswer === undefined || userAnswer === null) unattempted++;
            else if (userAnswer === q.correctOption) correct++;
            else incorrect++;
            time += attempt.timeTaken[secIdx]?.[qIdx] || 0;
        });
        const score = (correct * 3) - (incorrect * 1);
        const accuracy = (correct + incorrect) > 0 ? (correct / (correct + incorrect)) * 100 : 0;
        return { name: section.name, score, correct, incorrect, unattempted, time, accuracy };
    });

    const totalScore = sectionWiseResults.reduce((acc, sec) => acc + sec.score, 0);
    const totalCorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.correct, 0);
    const totalIncorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.incorrect, 0);
    const totalAttempted = totalCorrect + totalIncorrect;
    const totalAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
    const totalTime = sectionWiseResults.reduce((acc, sec) => acc + sec.time, 0);

    const activeQuestion = test.sections[currentQuestion.secIdx].questions[currentQuestion.qIdx];
    const userAnswerIndex = attempt.answers[currentQuestion.secIdx]?.[currentQuestion.qIdx];
    const isCorrect = userAnswerIndex === activeQuestion.correctOption;
    const isUnattempted = userAnswerIndex === null || userAnswerIndex === undefined;
    const questionKey = `${currentQuestion.secIdx}-${currentQuestion.qIdx}`;

    // --- Views ---
    if (view === 'summary') {
        return (
            <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg animate-fade-in">
                <h1 className="text-3xl font-bold text-white text-center">Scorecard: {test.title}</h1>
                <div className="mt-8 bg-gray-700 rounded-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-center">Overall Performance</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{totalScore}</div><div className="text-sm text-gray-300">Total Score</div></div>
                        <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{totalAccuracy.toFixed(2)}%</div><div className="text-sm text-gray-300">Accuracy</div></div>
                        <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{Math.floor(totalTime / 60)}m {Math.round(totalTime % 60)}s</div><div className="text-sm text-gray-300">Time Spent</div></div>
                        <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{totalCorrect}/{totalAttempted}</div><div className="text-sm text-gray-300">Attempted</div></div>
                    </div>
                </div>
                <div className="mt-8">
                     <h2 className="text-2xl font-semibold mb-4 text-center">Sectional Breakdown</h2>
                     <div className="bg-gray-700 rounded-lg overflow-hidden">
                        <table className="min-w-full text-center">
                            <thead className="bg-gray-600">
                                <tr>
                                    <th className="py-3 px-4 font-semibold text-sm">Section</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Score</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Correct</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Incorrect</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Unattempted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-600">
                                {sectionWiseResults.map(sec => (
                                    <tr key={sec.name}>
                                        <td className="py-4 px-4 font-bold">{sec.name}</td>
                                        <td className="py-4 px-4">{sec.score}</td>
                                        <td className="py-4 px-4 text-green-400">{sec.correct}</td>
                                        <td className="py-4 px-4 text-red-400">{sec.incorrect}</td>
                                        <td className="py-4 px-4 text-gray-400">{sec.unattempted}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
                <div className="text-center mt-12">
                    <button onClick={() => setView('analysis')} className="bg-white text-gray-900 px-8 py-3 rounded-md font-semibold hover:bg-gray-200 shadow transition-all transform hover:scale-105">
                        Analyze Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-gray-800 shadow-md rounded-lg p-6 overflow-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <p className="font-semibold text-gray-300 mb-4">Question {currentQuestion.qIdx + 1}:</p>
                <p className="text-white whitespace-pre-wrap mb-6">{activeQuestion.questionText}</p>
                
                <div className="space-y-3">
                    {activeQuestion.options.map((option, index) => {
                        let borderColor = 'border-gray-700';
                        if (revealed[questionKey] && index === activeQuestion.correctOption) borderColor = 'border-green-500';
                        else if (revealed[questionKey] && index === userAnswerIndex) borderColor = 'border-red-500';

                        return (
                            <div key={index} className={`flex items-start p-3 border-2 rounded-lg ${borderColor}`}>
                                <span className="mr-3">{index + 1}.</span>
                                <p className="flex-1">{option}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 border-t border-gray-700 pt-4">
                    {!revealed[questionKey] ? (
                        <button onClick={() => setRevealed(prev => ({...prev, [questionKey]: 'answer'}))} className="bg-gray-700 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-600">Reveal Answer</button>
                    ) : (
                        <div>
                            <p><strong>Your Answer:</strong> <span className={isCorrect ? 'text-green-400' : isUnattempted ? 'text-gray-500' : 'text-red-400'}>{isUnattempted ? 'Not Attempted' : activeQuestion.options[userAnswerIndex]}</span></p>
                            <p><strong>Correct Answer:</strong> <span className="text-green-400">{activeQuestion.options[activeQuestion.correctOption]}</span></p>
                            {revealed[questionKey] !== 'solution' && <button onClick={() => setRevealed(prev => ({...prev, [questionKey]: 'solution'}))} className="mt-4 bg-gray-700 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-600">Show Explanation</button>}
                        </div>
                    )}
                </div>

                {revealed[questionKey] === 'solution' && (
                    <div className="mt-4 p-4 bg-gray-900/50 rounded-md">
                        <p className="font-semibold text-sm text-gray-300">Explanation:</p>
                        <p className="text-sm text-gray-400 whitespace-pre-wrap mt-2">{activeQuestion.solution}</p>
                    </div>
                )}
            </div>

            <div className="w-full md:w-80 bg-gray-800 shadow-md rounded-lg p-4">
                {test.sections.map((section, secIdx) => (
                    <div key={secIdx} className="mb-4">
                        <p className="font-bold text-center mb-2">{section.name}</p>
                        <div className="grid grid-cols-5 gap-2">
                            {section.questions.map((q, qIdx) => {
                                const userAnswer = attempt.answers[secIdx]?.[qIdx];
                                const isCorrect = userAnswer === q.correctOption;
                                const isUnattempted = userAnswer === null || userAnswer === undefined;
                                let colorClass = 'bg-gray-600 hover:bg-gray-500'; // Unattempted
                                if (isCorrect) colorClass = 'bg-green-600 hover:bg-green-500';
                                else if (!isUnattempted) colorClass = 'bg-red-600 hover:bg-red-500';
                                
                                if (currentQuestion.secIdx === secIdx && currentQuestion.qIdx === qIdx) {
                                    colorClass += ' ring-2 ring-offset-2 ring-offset-gray-800 ring-white';
                                }

                                return <button key={qIdx} onClick={() => setCurrentQuestion({secIdx, qIdx})} className={`h-9 w-9 flex items-center justify-center rounded-md font-semibold transition-all text-white ${colorClass}`}>{qIdx+1}</button>
                            })}
                        </div>
                    </div>
                ))}
                 <div className="text-center mt-8 border-t border-gray-700 pt-4">
                    <button onClick={() => navigate('home')} className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 w-full">Back to Dashboard</button>
                </div>
            </div>
        </div>
    );
};

export default ResultAnalysis;
