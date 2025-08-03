import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ResultAnalysis = ({ navigate, attemptId }) => {
    const [attempt, setAttempt] = useState(null);
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);

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
                    } else {
                        throw new Error("Test data not found for this attempt.");
                    }
                } else {
                    throw new Error("Attempt data not found.");
                }
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

    // --- Calculate Scores ---
    const sectionWiseResults = test.sections.map((section, secIdx) => {
        let correct = 0, incorrect = 0, unattempted = 0;
        section.questions.forEach((q, qIdx) => {
            const userAnswer = attempt.answers[secIdx]?.[qIdx];
            if (userAnswer === undefined || userAnswer === null) unattempted++;
            else if (userAnswer === q.correctOption) correct++;
            else incorrect++;
        });
        const score = (correct * 3) - (incorrect * 1);
        return { name: section.name, score, correct, incorrect, unattempted };
    });

    const totalScore = sectionWiseResults.reduce((acc, sec) => acc + sec.score, 0);
    const totalCorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.correct, 0);
    const totalIncorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.incorrect, 0);
    const totalUnattempted = sectionWiseResults.reduce((acc, sec) => acc + sec.unattempted, 0);

    // --- Prepare Chart Data ---
    const chartData = test.sections.flatMap((section, secIdx) => 
        section.questions.map((q, qIdx) => ({
            name: `${section.name[0]}${qIdx + 1}`,
            time: attempt.timeTaken[secIdx]?.[qIdx] || 0,
        }))
    );

    return (
        <div className="max-w-4xl mx-auto bg-gray-800 p-4 sm:p-8 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold text-white text-center">Test Analysis: {test.title}</h1>
            
            <div className="mt-8 bg-gray-700 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4 text-center">Score Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-gray-600 rounded-lg"><div className="text-3xl font-bold text-white">{totalScore}</div><div className="text-sm text-gray-300">Total Score</div></div>
                    <div className="p-4 bg-green-800/50 rounded-lg"><div className="text-3xl font-bold text-green-300">{totalCorrect}</div><div className="text-sm text-green-400">Correct</div></div>
                    <div className="p-4 bg-red-800/50 rounded-lg"><div className="text-3xl font-bold text-red-300">{totalIncorrect}</div><div className="text-sm text-red-400">Incorrect</div></div>
                    <div className="p-4 bg-gray-600/50 rounded-lg"><div className="text-3xl font-bold text-gray-300">{totalUnattempted}</div><div className="text-sm text-gray-400">Unattempted</div></div>
                </div>
            </div>
            
            <div className="mt-8 bg-gray-700 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4 text-center">Time Analysis (per Question)</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                        <XAxis dataKey="name" stroke="#ccc" />
                        <YAxis stroke="#ccc" label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: '#ccc' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }} />
                        <Legend />
                        <Bar dataKey="time" fill="#8884d8" name="Time Taken (s)" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Detailed Solutions</h2>
                {test.sections.map((section, secIdx) => (
                    <div key={secIdx} className="mb-8">
                        <h3 className="text-xl font-bold p-3 bg-gray-700 rounded-t-lg">{section.name} Summary</h3>
                        <div className="grid grid-cols-4 gap-px bg-gray-700 text-center rounded-b-lg overflow-hidden">
                             <div className="p-2 bg-gray-800"><div className="font-bold text-white">{sectionWiseResults[secIdx].score}</div><div className="text-xs text-gray-400">Score</div></div>
                             <div className="p-2 bg-gray-800"><div className="font-bold text-green-400">{sectionWiseResults[secIdx].correct}</div><div className="text-xs text-gray-400">Correct</div></div>
                             <div className="p-2 bg-gray-800"><div className="font-bold text-red-400">{sectionWiseResults[secIdx].incorrect}</div><div className="text-xs text-gray-400">Incorrect</div></div>
                             <div className="p-2 bg-gray-800"><div className="font-bold text-gray-300">{sectionWiseResults[secIdx].unattempted}</div><div className="text-xs text-gray-400">Unattempted</div></div>
                        </div>

                        {section.questions.map((q, qIdx) => {
                            const userAnswerIndex = attempt.answers[secIdx]?.[qIdx];
                            const isCorrect = userAnswerIndex === q.correctOption;
                            const isUnattempted = userAnswerIndex === null || userAnswerIndex === undefined;
                            
                            return (
                                <div key={qIdx} className={`border-x border-b border-gray-700 p-4 ${isCorrect ? 'bg-green-900/20' : isUnattempted ? 'bg-gray-800' : 'bg-red-900/20'}`}>
                                    <p className="font-semibold text-gray-300">Q{qIdx + 1}: {q.questionText}</p>
                                    {q.questionImageUrl && <img src={q.questionImageUrl} alt="Question" className="my-4 rounded-lg max-w-md"/>}
                                    <div className="mt-3 text-sm space-y-2">
                                        <p><strong>Your Answer:</strong> <span className={isCorrect ? 'text-green-400' : isUnattempted ? 'text-gray-500' : 'text-red-400'}>{isUnattempted ? 'Not Attempted' : q.options[userAnswerIndex]}</span></p>
                                        <p><strong>Correct Answer:</strong> <span className="text-green-400">{q.options[q.correctOption]}</span></p>
                                    </div>
                                    <div className="mt-4 p-3 bg-gray-900/50 rounded-md">
                                        <p className="font-semibold text-sm text-gray-300">Solution:</p>
                                        <p className="text-sm text-gray-400 whitespace-pre-wrap">{q.solution}</p>
                                        {q.solutionImageUrl && <img src={q.solutionImageUrl} alt="Solution" className="my-4 rounded-lg max-w-md"/>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="text-center mt-8"><button onClick={() => navigate('home')} className="bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600">Back to Dashboard</button></div>
        </div>
    );
};

export default ResultAnalysis;