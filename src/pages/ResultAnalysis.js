import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Scorecard from '../components/Scorecard';
import { FaBook, FaTimes, FaStopwatch, FaCheckCircle, FaChartPie } from 'react-icons/fa';

// --- Reusable Button Component ---
const Button = ({ children, className = '', ...props }) => (
    <button {...props} className={`px-4 py-2 rounded-md font-semibold transition-all ${className}`}>
        {children}
    </button>
);

// --- Answer Option Component for Display ---
const AnswerOption = ({ option, index, isUserAnswer, isCorrectAnswer, showCorrectAnswerHighlight }) => {
    let borderClass = 'border-gray-300';
    let textClass = 'text-gray-700';
    if (isUserAnswer) {
        borderClass = 'border-blue-500';
        textClass = 'text-gray-900 font-semibold';
    }
    if (showCorrectAnswerHighlight) {
        if (isCorrectAnswer) {
            borderClass = 'border-green-500';
            textClass = 'text-green-700 font-semibold';
        } else if (isUserAnswer && !isCorrectAnswer) {
            borderClass = 'border-red-500';
            textClass = 'text-red-700 font-semibold';
        }
    }
    return (
        <div className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${borderClass} bg-white`}>
            <input type="radio" checked={isUserAnswer} readOnly className="mt-1 mr-3 h-4 w-4 accent-blue-500 cursor-not-allowed" />
            <label className={`flex-1 ${textClass} select-none`}>{option}</label>
        </div>
    );
};

// --- New Performance Metrics Table Component ---
const PerformanceMetricsTable = ({ metrics }) => {
    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined || isNaN(seconds)) return 'NA';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    };
    
    const getStatusColor = (status) => {
        if (status === 'Answered' || status === 'Correct') {
            return '#22C55E'; // Green
        }
        if (status === 'Incorrect' || status === 'Not Answered') {
            return '#EF4444'; // Red
        }
        return 'inherit';
    };

    const formatPercent = (value) => {
        return value !== null ? `${value.toFixed(2)}%` : 'NA';
    };

    const userAccuracyDisplay = metrics.userCorrectnessStatus ? metrics.userCorrectnessStatus : 'NA';

    return (
        <div className="bg-white shadow-md rounded-lg border border-gray-200 mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance Parameter</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">You</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toppers</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall test takers</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                            <div className="flex items-center space-x-2">
                                <FaCheckCircle className="text-blue-500" />
                                <span>Attempt</span>
                            </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold" style={{ color: getStatusColor(metrics.userAttemptStatus) }}>{metrics.userAttemptStatus || 'NA'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(metrics.toppersAttemptPercent)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(metrics.overallAttemptPercent)}</td>
                    </tr>
                    <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                            <div className="flex items-center space-x-2">
                                <FaChartPie className="text-blue-500" />
                                <span>Accuracy</span>
                            </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold" style={{ color: getStatusColor(userAccuracyDisplay) }}>{userAccuracyDisplay}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(metrics.toppersAccuracy)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(metrics.overallAccuracy)}</td>
                    </tr>
                    <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                            <div className="flex items-center space-x-2">
                                <FaStopwatch className="text-blue-500" />
                                <span>Time Taken</span>
                            </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-semibold">{formatTime(metrics.userTimeTaken)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatTime(metrics.toppersTimeTaken)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatTime(metrics.overallTimeTaken)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

// --- Analysis View Component ---
const AnalysisView = ({
    test, attempt, currentQuestion, setCurrentQuestion,
    showPassagePanel, handleFullscreen, setView,
    handleCloseToDashboard, otherMetrics
}) => {
    const activeSection = test.sections[currentQuestion.secIdx];
    const activeQuestion = activeSection.questions[currentQuestion.qIdx];
    const originalUserAnswer = attempt.answers?.[currentQuestion.secIdx]?.[currentQuestion.qIdx];
    
    const [showCorrectAnswerHighlight, setShowCorrectAnswerHighlight] = useState(false);
    const [showExplanationContent, setShowExplanationContent] = useState(false);
    const [mobileView, setMobileView] = useState('question');
    
    useEffect(() => {
        setShowCorrectAnswerHighlight(false);
        setShowExplanationContent(false);
        setMobileView('question');
    }, [currentQuestion.secIdx, currentQuestion.qIdx]);

    const handleRevealAnswer = () => setShowCorrectAnswerHighlight(true);
    const handleShowExplanation = () => setShowExplanationContent(true);
    
    const isOriginalUnattempted = originalUserAnswer === null || originalUserAnswer === undefined || originalUserAnswer === '';
    const isOriginalCorrect = activeQuestion.type === 'TITA'
        ? String(originalUserAnswer || '').toLowerCase() === String(activeQuestion.correctOption).toLowerCase()
        : originalUserAnswer === activeQuestion.correctOption;

    const handleNavigation = (direction) => {
        let newSecIdx = currentQuestion.secIdx;
        let newQIdx = currentQuestion.qIdx;
        if (direction === 'next') {
            if (newQIdx < test.sections[newSecIdx].questions.length - 1) newQIdx++;
            else if (newSecIdx < test.sections.length - 1) { newSecIdx++; newQIdx = 0; }
            else { setView('summary'); return; }
        } else if (direction === 'prev') {
            if (newQIdx > 0) newQIdx--;
            else if (newSecIdx > 0) { newSecIdx--; newQIdx = test.sections[newSecIdx].questions.length - 1; }
            else { setView('summary'); return; }
        }
        setCurrentQuestion({ secIdx: newSecIdx, qIdx: newQIdx });
    };

    const isFirstQuestion = currentQuestion.secIdx === 0 && currentQuestion.qIdx === 0;
    const isLastQuestion = currentQuestion.secIdx === test.sections.length - 1 && currentQuestion.qIdx === test.sections[test.sections.length - 1].questions.length - 1;

    // Determine user's performance metrics for the table
    const userTimeTaken = attempt.timeTaken?.[currentQuestion.secIdx]?.[currentQuestion.qIdx] || null;
    const userAttemptStatus = !isOriginalUnattempted ? 'Answered' : 'Not Answered';
    const userCorrectnessStatus = !isOriginalUnattempted ? (isOriginalCorrect ? 'Correct' : 'Incorrect') : null;

    const performanceMetrics = {
        userTimeTaken,
        userAttemptStatus,
        userCorrectnessStatus,
        toppersTimeTaken: otherMetrics.toppersTimeTaken,
        toppersAttemptPercent: otherMetrics.toppersAttemptPercent,
        toppersAccuracy: otherMetrics.toppersAccuracy,
        overallTimeTaken: otherMetrics.overallTimeTaken,
        overallAttemptPercent: otherMetrics.overallAttemptPercent,
        overallAccuracy: otherMetrics.overallAccuracy,
    };
    
    return (
        <div className="h-screen flex flex-col bg-gray-200 text-gray-800 font-sans">
            {/* Header */}
            <div className="bg-white shadow-md p-2 flex-shrink-0 z-20">
                <div className="max-w-full mx-auto px-4 flex justify-between items-center h-12">
                    <h1 className="text-md md:text-lg font-bold truncate">Analysis: {test.title}</h1>
                    <div className="flex space-x-2 items-center">
                        <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-500 hover:text-gray-900">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg>
                        </button>
                        <Button onClick={() => setView('summary')} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                            &larr; Back to Summary
                        </Button>
                    </div>
                </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-full p-2 md:p-4 gap-4">
                {showPassagePanel && (
                    <div className={`bg-white shadow-md rounded-lg p-4 md:p-6 flex-1 overflow-y-auto min-h-0 ${mobileView === 'passage' ? 'flex' : 'hidden'} md:flex flex-col`}>
                        <h2 className="font-bold mb-2 text-gray-900">Directions for question {currentQuestion.qIdx + 1}</h2>
                        {activeQuestion.passageImageUrl && <img src={activeQuestion.passageImageUrl} alt="Passage" className="mb-4 rounded max-w-full"/>}
                        <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">{activeQuestion.passage}</div>
                    </div>
                )}
                <div className={`bg-white shadow-md rounded-lg p-4 md:p-6 flex-1 overflow-y-auto min-h-0 ${mobileView === 'question' ? 'flex' : 'hidden'} md:flex flex-col`}>
                    <div className="flex justify-between items-center mb-4">
                        <p className="font-semibold text-gray-900">Question {currentQuestion.qIdx + 1}:</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${isOriginalUnattempted ? 'bg-gray-400 text-gray-800' : (isOriginalCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white')}`}>
                            {isOriginalUnattempted ? 'Not Attempted' : (isOriginalCorrect ? 'Correct' : 'Incorrect')}
                        </span>
                    </div>
                    {activeQuestion.questionImageUrl && <img src={activeQuestion.questionImageUrl} alt="Question" className="mb-4 rounded max-w-full"/>}
                    <p className="text-gray-900 whitespace-pre-wrap mb-6">{activeQuestion.questionText}</p>
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Answer:</h3>
                        {activeQuestion.type === 'TITA' ? (
                             <div className={`flex items-start p-3 border-2 rounded-lg ${showCorrectAnswerHighlight ? (isOriginalCorrect ? 'border-green-500' : 'border-red-500') : (isOriginalUnattempted ? 'border-gray-300' : 'border-blue-500')}`}>
                                <p className={`flex-1 font-semibold ${showCorrectAnswerHighlight ? (isOriginalCorrect ? 'text-green-700' : 'text-red-700') : (isOriginalUnattempted ? 'text-gray-700' : 'text-gray-900')}`}>{originalUserAnswer || 'Not Attempted'}</p>
                            </div>
                        ) : (
                            activeQuestion.options.map((option, index) => (
                                <AnswerOption key={index} option={option} index={index} isUserAnswer={originalUserAnswer === index} isCorrectAnswer={index === activeQuestion.correctOption} showCorrectAnswerHighlight={showCorrectAnswerHighlight}/>
                            ))
                        )}
                    </div>
                    {showCorrectAnswerHighlight && activeQuestion.type === 'TITA' && (
                        <div className="mt-4 space-y-3">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Correct Answer:</h3>
                            <div className="flex items-start p-3 border-2 rounded-lg border-green-500 bg-white">
                                <p className="flex-1 text-green-700 font-semibold">{activeQuestion.correctOption}</p>
                            </div>
                        </div>
                    )}
                    <div className="mt-6 border-t border-gray-200 pt-4">
                        {!showCorrectAnswerHighlight ? <Button onClick={handleRevealAnswer} className="bg-gray-900 text-white hover:bg-gray-700 w-full">Show Correct Answer</Button> : (!showExplanationContent && activeQuestion.solution && <Button onClick={handleShowExplanation} className="bg-gray-900 text-white hover:bg-gray-700 w-full">Show Explanation</Button>)}
                        {showExplanationContent && (
                            <div className="mt-4 p-4 bg-gray-100 rounded-md border border-gray-200">
                                <p className="font-semibold text-sm text-gray-800">Explanation:</p>
                                {activeQuestion.solutionImageUrl && <img src={activeQuestion.solutionImageUrl} alt="Solution" className="mt-2 rounded max-w-full"/>}
                                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{activeQuestion.solution}</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className={`bg-white md:bg-gray-100 shadow-md rounded-lg p-4 md:p-6 md:w-80 flex-shrink-0 overflow-y-auto min-h-0 ${mobileView === 'palette' ? 'flex' : 'hidden'} md:flex flex-col`}>
                    {test.sections.map((section, secIdx) => (
                        <div key={secIdx} className="mb-4">
                            <p className="font-bold text-center mb-2 text-gray-900">{section.name}</p>
                            <div className="grid grid-cols-5 gap-2">
                                {section.questions.map((q, qIdx) => {
                                    const userAnswer = attempt.answers?.[secIdx]?.[qIdx];
                                    const isCorrect = q.type === 'TITA' ? String(userAnswer || '').toLowerCase() === String(q.correctOption).toLowerCase() : userAnswer === q.correctOption;
                                    const isAttempted = userAnswer !== null && userAnswer !== undefined && userAnswer !== '';
                                    let colorClass = isAttempted ? (isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-300 text-gray-800';
                                    if (currentQuestion.secIdx === secIdx && currentQuestion.qIdx === qIdx) colorClass += ' ring-2 ring-offset-2 ring-blue-500 ring-offset-gray-100';
                                    return <button key={qIdx} onClick={() => setCurrentQuestion({secIdx, qIdx})} className={`h-9 w-9 flex items-center justify-center rounded-md font-semibold transition-all ${colorClass}`}>{qIdx + 1}</button>
                                })}
                            </div>
                        </div>
                    ))}
                    <div className="text-center mt-auto">
                         <PerformanceMetricsTable metrics={performanceMetrics} />
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex-shrink-0">
                <div className="md:hidden p-2 flex justify-between items-center bg-white border-t border-gray-200">
                    <Button onClick={() => handleNavigation('prev')} disabled={isFirstQuestion} className="bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50 text-sm">&larr; Prev</Button>
                    <Button onClick={handleCloseToDashboard} className="bg-gray-600 hover:bg-gray-700 text-white text-sm">Dashboard</Button>
                    <Button onClick={() => handleNavigation('next')} disabled={isLastQuestion} className="bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 text-sm">Next &rarr;</Button>
                </div>
                <div className="md:hidden flex justify-around bg-gray-800 text-white">
                    {showPassagePanel && <button onClick={() => setMobileView('passage')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'passage' ? 'bg-gray-600' : ''}`}>Passage</button>}
                    <button onClick={() => setMobileView('question')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'question' ? 'bg-gray-600' : ''}`}>Question</button>
                    <button onClick={() => setMobileView('palette')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'palette' ? 'bg-gray-600' : ''}`}>Palette</button>
                </div>
                <div className="hidden md:flex bg-white shadow-lg p-4 justify-between items-center z-10 border-t border-gray-200">
                    <Button onClick={() => handleNavigation('prev')} disabled={isFirstQuestion} className="bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50">&larr; Previous</Button>
                    <div className="flex space-x-4 items-center">
                        <Button onClick={() => handleNavigation('next')} disabled={isLastQuestion} className="bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">Next &rarr;</Button>
                        <Button onClick={handleCloseToDashboard} className="bg-gray-700 hover:bg-gray-800 text-white">Back to Dashboard</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResultAnalysis = ({ navigate, attemptId }) => {
    const [attempt, setAttempt] = useState(null);
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('summary');
    const [currentQuestion, setCurrentQuestion] = useState({ secIdx: 0, qIdx: 0 });
    const [otherMetrics, setOtherMetrics] = useState({
        userTimeTaken: null,
        userAttemptStatus: null,
        userCorrectnessStatus: null,
        toppersTimeTaken: null,
        toppersAttemptPercent: null,
        toppersAccuracy: null,
        overallTimeTaken: null,
        overallAttemptPercent: null,
        overallAccuracy: null,
    });
    const analysisContainerRef = useRef(null);

    const handleFullscreen = useCallback(() => {
        if (analysisContainerRef.current) {
            if (!document.fullscreenElement) analysisContainerRef.current.requestFullscreen().catch(err => console.error(`Fullscreen Error: ${err.message}`));
            else document.exitFullscreen();
        }
    }, []);

    const fetchOtherMetrics = useCallback(async () => {
        if (!test || !test.id || currentQuestion.secIdx === null || currentQuestion.qIdx === null) {
            setOtherMetrics(prev => ({ ...prev,
                toppersTimeTaken: null,
                toppersAttemptPercent: null,
                toppersAccuracy: null,
                overallTimeTaken: null,
                overallAttemptPercent: null,
                overallAccuracy: null,
            }));
            return;
        }

        const testId = test.id;
        const secIdx = currentQuestion.secIdx;
        const qIdx = currentQuestion.qIdx;

        try {
            const attemptsRef = collection(db, 'attempts');
            const q = query(attemptsRef, where('testId', '==', testId), where('status', '==', 'completed'));
            const querySnapshot = await getDocs(q);

            let overallCorrectCount = 0;
            let overallAttemptCount = 0;
            let overallTimeSum = 0;
            
            let toppersCorrectCount = 0;
            let toppersAttemptCount = 0;
            let toppersTimeSum = 0;

            const allAttempts = querySnapshot.docs.map(docSnap => docSnap.data());
            const totalTestTakers = allAttempts.length;
            const question = test.sections[secIdx].questions[qIdx];
            
            let top10PercentUsers = [];
            
            // Calculate Overall Metrics
            allAttempts.forEach(data => {
                const userAnswer = data.answers?.[secIdx]?.[qIdx];
                const timeTaken = data.timeTaken?.[secIdx]?.[qIdx];
                const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';

                if (isAttempted) {
                    overallAttemptCount++;
                    overallTimeSum += timeTaken || 0;
                    const isCorrect = question.type === 'TITA'
                        ? String(userAnswer || '').toLowerCase() === String(question.correctOption).toLowerCase()
                        : userAnswer === question.correctOption;
                    if (isCorrect) {
                        overallCorrectCount++;
                    }
                }
            });

            // Calculate Toppers Metrics only if there are at least 50 test takers
            if (totalTestTakers >= 50) {
                allAttempts.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
                top10PercentUsers = allAttempts.slice(0, Math.ceil(totalTestTakers * 0.1) || 1);

                top10PercentUsers.forEach(data => {
                    const userAnswer = data.answers?.[secIdx]?.[qIdx];
                    const timeTaken = data.timeTaken?.[secIdx]?.[qIdx];
                    const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
                    if (isAttempted) {
                        toppersAttemptCount++;
                        toppersTimeSum += timeTaken || 0;
                        const isCorrect = question.type === 'TITA'
                            ? String(userAnswer || '').toLowerCase() === String(question.correctOption).toLowerCase()
                            : userAnswer === question.correctOption;
                        if (isCorrect) {
                            toppersCorrectCount++;
                        }
                    }
                });
            }

            // Set state with calculated metrics
            setOtherMetrics(prev => ({
                ...prev,
                toppersTimeTaken: toppersAttemptCount > 0 ? toppersTimeSum / toppersAttemptCount : null,
                toppersAttemptPercent: totalTestTakers >= 50 ? (toppersAttemptCount / top10PercentUsers.length) * 100 : null,
                toppersAccuracy: toppersAttemptCount > 0 ? (toppersCorrectCount / toppersAttemptCount) * 100 : null,
                overallTimeTaken: overallAttemptCount > 0 ? overallTimeSum / overallAttemptCount : null,
                overallAttemptPercent: totalTestTakers > 0 ? (overallAttemptCount / totalTestTakers) * 100 : null,
                overallAccuracy: overallAttemptCount > 0 ? (overallCorrectCount / overallAttemptCount) * 100 : null,
            }));

        } catch (error) {
            console.error("Error fetching other metrics:", error);
            setOtherMetrics(prev => ({ ...prev,
                toppersTimeTaken: null, toppersAttemptPercent: null, toppersAccuracy: null,
                overallTimeTaken: null, overallAttemptPercent: null, overallAccuracy: null,
            }));
        }
    }, [test, currentQuestion.secIdx, currentQuestion.qIdx]);


    const fetchData = useCallback(async () => {
        if (!attemptId) { console.error("No attempt ID provided."); navigate('home'); return; }
        setLoading(true);
        try {
            const attemptRef = doc(db, 'attempts', attemptId);
            const attemptSnap = await getDoc(attemptRef);
            if (attemptSnap.exists()) {
                const attemptData = attemptSnap.data();
                setAttempt(attemptData);
                const testRef = doc(db, 'tests', attemptData.testId);
                const testSnap = await getDoc(testRef);
                if (testSnap.exists()) {
                    const testData = testSnap.data();
                    setTest(testData);
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
    }, [attemptId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (test && view === 'analysis') {
            fetchOtherMetrics();
        }
    }, [test, view, currentQuestion, fetchOtherMetrics]);

    const handleCloseToDashboard = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        navigate('home');
    };

    if (loading) return <div className="text-center text-gray-400 p-8">Loading Analysis...</div>;
    if (!attempt || !test) return <div className="text-center text-gray-400 p-8">Could not load analysis data.</div>;

    const sectionWiseResults = test.sections.map((section, secIdx) => {
        let correct = 0, incorrect = 0, unattempted = 0, time = 0;
        let incorrectMcq = 0;

        section.questions.forEach((q, qIdx) => {
            const userAnswer = attempt.answers?.[secIdx]?.[qIdx];
            const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';

            if (!isAttempted) {
                unattempted++;
            } else {
                const isCorrect = q.type === 'TITA'
                    ? String(userAnswer).toLowerCase() === String(q.correctOption).toLowerCase()
                    : userAnswer === q.correctOption;

                if (isCorrect) {
                    correct++;
                } else {
                    incorrect++;
                    if (q.type !== 'TITA') {
                        incorrectMcq++;
                    }
                }
            }
            time += attempt.timeTaken?.[secIdx]?.[qIdx] || 0;
        });

        const score = (correct * 3) - (incorrectMcq * 1);
        const attemptedCount = correct + incorrect;
        const accuracy = attemptedCount > 0 ? (correct / attemptedCount) * 100 : 0;

        return {
            name: section.name, score, correct, incorrect, unattempted,
            time, accuracy: accuracy.toFixed(2),
            totalQuestions: section.questions.length,
            attemptedQuestions: attemptedCount
        };
    });

    const totalScore = sectionWiseResults.reduce((acc, sec) => acc + sec.score, 0);
    const totalCorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.correct, 0);
    const totalIncorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.incorrect, 0);
    const totalAttempted = totalCorrect + totalIncorrect;
    const totalQuestions = test.sections.reduce((acc, sec) => acc + sec.questions.length, 0);
    const totalAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
    const totalTime = sectionWiseResults.reduce((acc, sec) => acc + sec.time, 0);

    return (
        <div ref={analysisContainerRef} className="h-screen flex flex-col bg-white text-gray-800 font-sans">
            {view === 'summary' ? (
                <Scorecard test={test} sectionWiseResults={sectionWiseResults} totalScore={totalScore} totalAccuracy={totalAccuracy} totalTime={totalTime} totalAttempted={totalAttempted} totalQuestions={totalQuestions} setView={setView} handleCloseToDashboard={handleCloseToDashboard}/>
            ) : (
                <AnalysisView test={test} attempt={attempt} currentQuestion={currentQuestion} setCurrentQuestion={setCurrentQuestion} handleFullscreen={handleFullscreen} setView={setView} handleCloseToDashboard={handleCloseToDashboard} otherMetrics={otherMetrics} />
            )}
        </div>
    );
    
};

export default ResultAnalysis;