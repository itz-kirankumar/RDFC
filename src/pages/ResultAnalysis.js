import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
// BarChart and related imports were not used in the provided code, so they are commented out
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ResultAnalysis = ({ navigate, attemptId }) => {
    const [attempt, setAttempt] = useState(null);
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('summary'); // 'summary' or 'analysis'
    const [currentQuestion, setCurrentQuestion] = useState({ secIdx: 0, qIdx: 0 });
    const [revealed, setRevealed] = useState({}); // Tracks reveal state: 'answer' or 'solution'

    const analysisContainerRef = React.useRef(null); // Ref for the main container

    const handleFullscreen = useCallback(() => {
        if (analysisContainerRef.current) {
            if (!document.fullscreenElement) {
                analysisContainerRef.current.requestFullscreen().catch(err => {
                    console.error(`Fullscreen Error: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        }
    }, []);

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
            // Ensure userAnswer is compared correctly for TITA (string) and MCQ (number)
            const correctAnswer = q.type === 'TITA' ? String(q.correctOption).toLowerCase() : q.correctOption;
            const userAnsNormalized = q.type === 'TITA' ? String(userAnswer || '').toLowerCase() : userAnswer;

            if (userAnswer === undefined || userAnswer === null || userAnswer === '') unattempted++;
            else if (userAnsNormalized === correctAnswer) correct++;
            else incorrect++;
            time += attempt.timeTaken[secIdx]?.[qIdx] || 0;
        });
        // Score calculation should be based on number of questions and marks per question/incorrect marks
        // Assuming 3 marks for correct, -1 for incorrect. Adjust if your scoring is different.
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

    const activeSection = test.sections[currentQuestion.secIdx];
    const activeQuestion = activeSection.questions[currentQuestion.qIdx];
    const userAnswer = attempt.answers[currentQuestion.secIdx]?.[currentQuestion.qIdx];
    const isCorrect = String(userAnswer).toLowerCase() === String(activeQuestion.correctOption).toLowerCase();
    const isUnattempted = userAnswer === null || userAnswer === undefined || userAnswer === '';
    const questionKey = `${currentQuestion.secIdx}-${currentQuestion.qIdx}`;
    const showPassagePanel = activeSection && activeQuestion && activeQuestion.passage && activeSection.name !== 'QA';

    // --- Views ---
    if (view === 'summary') {
        return (
            <div ref={analysisContainerRef} className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-white text-center flex-grow">Scorecard: {test.title}</h1>
                    <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg>
                    </button>
                </div>
                <div className="mt-8 bg-gray-700 rounded-lg p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-center">Overall Performance</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{totalScore}</div><div className="text-sm text-gray-300">Total Score</div></div>
                        <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{totalAccuracy.toFixed(2)}%</div><div className="text-sm text-gray-300">Accuracy</div></div>
                        <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{Math.floor(totalTime / 60)}m {Math.round(totalTime % 60)}s</div><div className="text-sm text-gray-300">Time Spent</div></div>
                        <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{totalAttempted}</div><div className="text-sm text-gray-300">Attempted</div></div>
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

    // Analysis View: Full-page layout
    return (
        <div ref={analysisContainerRef} className="h-screen flex flex-col bg-gray-200 text-gray-800 font-sans">
            {/* Header for Analysis View */}
            <div className="bg-white shadow-md p-4 flex-shrink-0">
                <div className="max-w-full mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">Analysis: {test.title}</h1>
                    <div className="flex space-x-4 items-center">
                        <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-600 hover:text-black">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg>
                        </button>
                        <button onClick={() => setView('summary')} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                            &larr; Back to Summary
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content area: flex-1 to fill remaining vertical space */}
            <div className="flex flex-col md:flex-row max-w-full mx-auto p-2 md:p-4 gap-4 flex-1 overflow-hidden">
                {showPassagePanel && (
                    <div className="w-full md:w-1/2 bg-white text-gray-800 shadow-md rounded-lg p-6 flex-1 overflow-y-auto min-h-0">
                        <h2 className="font-bold mb-2">Directions for question {currentQuestion.qIdx + 1}</h2>
                        <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">{activeQuestion.passage}</div>
                    </div>
                )}
                {/* Panel 2 (Question/Answer Area): 
                    - On smaller screens (no md:), always takes full width.
                    - On medium screens (md:), if passage panel is shown, takes md:w-1/2.
                    - On medium screens (md:), if passage panel is NOT shown, it takes flex-1 (fills remaining space).
                    - flex-1 in general for vertical fill, overflow-y-auto for scrolling, min-h-0 to prevent overflow.
                */}
                <div className={`${showPassagePanel ? 'md:w-1/2' : 'flex-1'} w-full bg-white text-gray-800 shadow-md rounded-lg p-6 flex-1 overflow-y-auto min-h-0`}>
                    <p className="font-semibold text-gray-600 mb-4">Question {currentQuestion.qIdx + 1}:</p>
                    <p className="text-black whitespace-pre-wrap mb-6">{activeQuestion.questionText}</p>
                    
                    {activeQuestion.type === 'TITA' ? (
                        <div className="space-y-3">
                            <div className="p-3 border-2 border-gray-300 rounded-lg"><strong>Your Answer:</strong> {isUnattempted ? <span className="text-gray-500">Not Attempted</span> : <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer}</span>}</div>
                            {revealed[questionKey] && <div className="p-3 border-2 border-green-500 rounded-lg bg-green-50"><strong>Correct Answer:</strong> {activeQuestion.correctOption}</div>}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeQuestion.options.map((option, index) => {
                                let indicatorClass = 'border-gray-300';
                                if (revealed[questionKey] && index === activeQuestion.correctOption) indicatorClass = 'border-green-500 bg-green-50';
                                else if (revealed[questionKey] && index === userAnswer && !isCorrect) indicatorClass = 'border-red-500 bg-red-50'; // Only mark user answer red if incorrect

                                return (
                                    <div key={index} className={`flex items-start p-3 border-2 rounded-lg ${indicatorClass}`}>
                                        <span className="mr-3">{index + 1}.</span>
                                        <p className="flex-1">{option}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 border-t border-gray-200 pt-4">
                        {!revealed[questionKey] ? (
                            <button onClick={() => setRevealed(prev => ({...prev, [questionKey]: 'answer'}))} className="bg-gray-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-300">Reveal Answer</button>
                        ) : (
                            <div>
                                {revealed[questionKey] !== 'solution' && <button onClick={() => setRevealed(prev => ({...prev, [questionKey]: 'solution'}))} className="bg-gray-200 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-300">Show Explanation</button>}
                            </div>
                        )}
                    </div>

                    {revealed[questionKey] === 'solution' && (
                        <div className="mt-4 p-4 bg-gray-100 rounded-md">
                            <p className="font-semibold text-sm text-gray-800">Explanation:</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{activeQuestion.solution}</p>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-80 bg-white text-gray-800 shadow-md rounded-lg p-4 flex-shrink-0 overflow-y-auto min-h-0">
                    {test.sections.map((section, secIdx) => (
                        <div key={secIdx} className="mb-4">
                            <p className="font-bold text-center mb-2">{section.name}</p>
                            <div className="grid grid-cols-5 gap-2">
                                {section.questions.map((q, qIdx) => {
                                    const userAnswer = attempt.answers[secIdx]?.[qIdx];
                                    const isCorrect = String(userAnswer).toLowerCase() === String(q.correctOption).toLowerCase();
                                    const isUnattempted = userAnswer === null || userAnswer === undefined || userAnswer === '';
                                    let colorClass = 'bg-yellow-400 text-black'; // Unattempted
                                    if (isCorrect) colorClass = 'bg-green-600 text-white';
                                    else if (!isUnattempted && !isCorrect) colorClass = 'bg-red-600 text-white'; // Mark red only if incorrect and attempted
                                    
                                    if (currentQuestion.secIdx === secIdx && currentQuestion.qIdx === qIdx) {
                                        colorClass += ' ring-2 ring-offset-2 ring-blue-500';
                                    }

                                    return <button key={qIdx} onClick={() => setCurrentQuestion({secIdx, qIdx})} className={`h-9 w-9 flex items-center justify-center rounded-md font-semibold transition-all text-white ${colorClass}`}>{qIdx+1}</button>
                                })}
                            </div>
                        </div>
                    ))}
                    <div className="text-center mt-8 border-t border-gray-200 pt-4">
                        <button onClick={() => navigate('home')} className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 w-full">Back to Dashboard</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultAnalysis;