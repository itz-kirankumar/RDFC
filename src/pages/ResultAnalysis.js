import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Scorecard from '../components/Scorecard';
import { FaChartPie, FaCheckCircle, FaStopwatch, FaExpand } from 'react-icons/fa';

// --- Reusable Button Component ---
const Button = ({ children, className = '', ...props }) => (
    <button {...props} className={`px-4 py-2 rounded-md font-semibold transition-all ${className}`}>
        {children}
    </button>
);

// --- Answer Option Component for Display ---
const AnswerOption = ({ option, index, isUserAnswer, isCorrectAnswer, showCorrectAnswerHighlight }) => {
    let borderClass = 'border-gray-300';
    if (isUserAnswer) borderClass = 'border-blue-500';
    if (showCorrectAnswerHighlight) {
        if (isCorrectAnswer) borderClass = 'border-green-500';
        else if (isUserAnswer && !isCorrectAnswer) borderClass = 'border-red-500';
    }
    return (
        <div className={`flex items-start p-3 border-2 rounded-lg transition-all ${borderClass} bg-white`}>
            <input type="radio" checked={isUserAnswer} readOnly className="mt-1 mr-3 h-4 w-4 accent-blue-500 cursor-not-allowed" />
            <label className={`flex-1 select-none`}>{option}</label>
        </div>
    );
};

// --- Performance Metrics Table Component ---
const PerformanceMetricsTable = ({ metrics }) => {
    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const getStatusColor = (status) => {
        if (status === 'Correct') return '#22C55E';
        if (status === 'Incorrect') return '#EF4444';
        return 'inherit';
    };

    const formatPercent = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return `${parseFloat(value).toFixed(2)}%`;
    };

    return (
        <div className="bg-white shadow-md rounded-lg border border-gray-200 mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">You</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toppers</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium"><FaCheckCircle className="inline mr-2 text-blue-500" />Attempt %</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold">{metrics.userAttemptStatus}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(metrics.toppersAttemptPercent)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(metrics.overallAttemptPercent)}</td>
                    </tr>
                    <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium"><FaChartPie className="inline mr-2 text-blue-500" />Accuracy</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold" style={{ color: getStatusColor(metrics.userCorrectnessStatus) }}>{metrics.userCorrectnessStatus || 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(metrics.toppersAccuracy)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatPercent(metrics.overallAccuracy)}</td>
                    </tr>
                    <tr>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium"><FaStopwatch className="inline mr-2 text-blue-500" />Time Taken</td>
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
const AnalysisView = ({ test, attempt, allAttempts, currentQuestion, setCurrentQuestion, showPassagePanel, handleFullscreen, setView, handleCloseToDashboard }) => {
    const [showCorrectAnswerHighlight, setShowCorrectAnswerHighlight] = useState(false);
    const [showExplanationContent, setShowExplanationContent] = useState(false);
    const [mobileView, setMobileView] = useState('question');
    const [performanceMetrics, setPerformanceMetrics] = useState({});

    useEffect(() => {
        const { secIdx, qIdx } = currentQuestion;
        const activeQuestion = test.sections[secIdx].questions[qIdx];
        const originalUserAnswer = attempt.answers?.[secIdx]?.[qIdx];
        const isOriginalUnattempted = originalUserAnswer === null || originalUserAnswer === undefined || originalUserAnswer === '';
        
        const isCorrect = (userAnswer) => {
            if (userAnswer === null || userAnswer === undefined || userAnswer === '') return false;
            return activeQuestion.type === 'TITA'
                ? String(userAnswer || '').toLowerCase() === String(activeQuestion.correctOption).toLowerCase()
                : userAnswer === activeQuestion.correctOption;
        };

        const calculateMetricsForGroup = (group) => {
            if (!group || group.length === 0) return { attemptPercent: null, accuracy: null, timeTaken: null };

            let attemptedCount = 0;
            let correctCount = 0;
            let totalTime = 0;

            group.forEach(atmpt => {
                const userAnswer = atmpt.answers?.[secIdx]?.[qIdx];
                const isAttempted = userAnswer !== null && userAnswer !== undefined && userAnswer !== '';
                if (isAttempted) {
                    attemptedCount++;
                    if (isCorrect(userAnswer)) correctCount++;
                    totalTime += atmpt.timeTaken?.[secIdx]?.[qIdx] || 0;
                }
            });

            return {
                attemptPercent: (attemptedCount / group.length) * 100,
                accuracy: attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0,
                timeTaken: attemptedCount > 0 ? totalTime / attemptedCount : 0,
            };
        };

        const overallMetrics = allAttempts.length >= 2 ? calculateMetricsForGroup(allAttempts) : { attemptPercent: null, accuracy: null, timeTaken: null };

        let toppersMetrics = { attemptPercent: null, accuracy: null, timeTaken: null };
        if (allAttempts.length >= 10) {
            const sortedAttempts = [...allAttempts].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
            const toppersCount = Math.ceil(sortedAttempts.length * 0.1);
            const toppersGroup = sortedAttempts.slice(0, toppersCount);
            toppersMetrics = calculateMetricsForGroup(toppersGroup);
        }

        setPerformanceMetrics({
            userTimeTaken: attempt.timeTaken?.[secIdx]?.[qIdx] || 0,
            userAttemptStatus: isOriginalUnattempted ? 'Unattempted' : 'Attempted',
            userCorrectnessStatus: isOriginalUnattempted ? null : (isCorrect(originalUserAnswer) ? 'Correct' : 'Incorrect'),
            toppersTimeTaken: toppersMetrics.timeTaken,
            toppersAttemptPercent: toppersMetrics.attemptPercent,
            toppersAccuracy: toppersMetrics.accuracy,
            overallTimeTaken: overallMetrics.timeTaken,
            overallAttemptPercent: overallMetrics.attemptPercent,
            overallAccuracy: overallMetrics.accuracy,
        });
        
        setShowCorrectAnswerHighlight(false);
        setShowExplanationContent(false);
        setMobileView('question');

    }, [currentQuestion, allAttempts, test, attempt]);

    if (!test || !attempt || !test.sections || !attempt.answers) return <div className="text-center text-red-500 p-8">Error: Data for analysis is incomplete.</div>;
    const activeSection = test.sections[currentQuestion.secIdx];
    const activeQuestion = activeSection.questions[currentQuestion.qIdx];
    const originalUserAnswer = attempt.answers?.[currentQuestion.secIdx]?.[currentQuestion.qIdx];
    const isOriginalUnattempted = originalUserAnswer === null || originalUserAnswer === undefined || originalUserAnswer === '';
    const isOriginalCorrect = activeQuestion.type === 'TITA'
        ? String(originalUserAnswer || '').toLowerCase() === String(activeQuestion.correctOption).toLowerCase()
        : originalUserAnswer === activeQuestion.correctOption;

    const handleNavigation = (direction) => {
        let { secIdx, qIdx } = currentQuestion;
        if (direction === 'next') {
            if (qIdx < test.sections[secIdx].questions.length - 1) qIdx++;
            else if (secIdx < test.sections.length - 1) { secIdx++; qIdx = 0; }
            else { setView('summary'); return; }
        } else if (direction === 'prev') {
            if (qIdx > 0) qIdx--;
            else if (secIdx > 0) { secIdx--; qIdx = test.sections[secIdx].questions.length - 1; }
            else { setView('summary'); return; }
        }
        setCurrentQuestion({ secIdx, qIdx });
    };

    const isFirstQuestion = currentQuestion.secIdx === 0 && currentQuestion.qIdx === 0;
    const isLastQuestion = currentQuestion.secIdx === test.sections.length - 1 && currentQuestion.qIdx === test.sections[test.sections.length - 1].questions.length - 1;

    return (
        <div className="h-screen flex flex-col bg-gray-200 text-gray-800 font-sans">
             <div className="bg-white shadow-md p-2 flex-shrink-0 z-20">
                <div className="max-w-full mx-auto px-4 flex justify-between items-center h-12">
                    <h1 className="text-md md:text-lg font-bold truncate">Analysis: {test.title}</h1>
                    <div className="flex space-x-4 items-center">
                        <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-500 hover:text-gray-900 p-1">
                            <FaExpand className="h-5 w-5" />
                        </button>
                        <Button onClick={() => setView('summary')} className="text-blue-600 hover:text-blue-800 text-xs font-semibold !p-0">
                            &larr; Back to Summary
                        </Button>
                    </div>
                </div>
            </div>
            
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
                                <p className={`flex-1 font-semibold`}>{originalUserAnswer || 'Not Attempted'}</p>
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
                        {!showCorrectAnswerHighlight ? <Button onClick={() => setShowCorrectAnswerHighlight(true)} className="bg-gray-900 text-white hover:bg-gray-700 w-full">Show Correct Answer</Button> : (!showExplanationContent && activeQuestion.solution && <Button onClick={() => setShowExplanationContent(true)} className="bg-gray-900 text-white hover:bg-gray-700 w-full">Show Explanation</Button>)}
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
                    <div className="flex items-center space-x-4">
                        <Button onClick={() => handleNavigation('next')} disabled={isLastQuestion} className="bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">Next &rarr;</Button>
                        <Button onClick={handleCloseToDashboard} className="bg-gray-600 hover:bg-gray-700 text-white">Back to Dashboard</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResultAnalysis = ({ navigate, attemptId }) => {
    const [attempt, setAttempt] = useState(null);
    const [test, setTest] = useState(null);
    const [allAttempts, setAllAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('summary');
    const [currentQuestion, setCurrentQuestion] = useState({ secIdx: 0, qIdx: 0 });
    const analysisContainerRef = useRef(null);

    const handleFullscreen = useCallback(() => {
        if (analysisContainerRef.current) {
            if (!document.fullscreenElement) {
                analysisContainerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        }
    }, []);

    useEffect(() => {
        if (!attemptId) {
            console.error("No attempt ID provided.");
            if(navigate) navigate('home');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const attemptRef = doc(db, 'attempts', attemptId);
                const attemptSnap = await getDoc(attemptRef);
                if (!attemptSnap.exists()) throw new Error("Attempt data not found.");
                const attemptData = { ...attemptSnap.data(), id: attemptSnap.id };
                setAttempt(attemptData);

                const testRef = doc(db, 'tests', attemptData.testId);
                const testSnap = await getDoc(testRef);
                if (!testSnap.exists()) throw new Error("Test data not found for this attempt.");
                const testData = { id: testSnap.id, ...testSnap.data() };
                setTest(testData);

                const attemptsQuery = query(
                    collection(db, 'attempts'),
                    where('testId', '==', attemptData.testId),
                    where('status', '==', 'completed')
                );
                const querySnapshot = await getDocs(attemptsQuery);
                const allAttemptsData = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
                setAllAttempts(allAttemptsData);

            } catch (error) {
                console.error("Error fetching analysis data:", error);
                alert(`Error: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [attemptId, navigate]);
    

    // --- FIX: Centralized all calculations in a top-level useMemo hook to fix conditional hook error ---
    const analysisData = useMemo(() => {
        if (!attempt || !test) {
            return {
                sectionWiseResults: [], totalScore: 0, totalCorrect: 0, totalIncorrect: 0,
                totalAttempted: 0, totalQuestions: 0, totalAccuracy: 0, totalTime: 0,
                synchronizedAllAttempts: [],
            };
        }

        const sectionWiseResults = test.sections.map((section, secIdx) => {
            let correct = 0, incorrect = 0, unattempted = 0, time = 0, incorrectMcq = 0;
            section.questions.forEach((q, qIdx) => {
                const userAnswer = attempt.answers?.[secIdx]?.[qIdx];
                const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
                if (!isAttempted) { unattempted++; } 
                else {
                    const isCorrect = q.type === 'TITA'
                        ? String(userAnswer).toLowerCase() === String(q.correctOption).toLowerCase()
                        : userAnswer === q.correctOption;
                    if (isCorrect) correct++;
                    else {
                        incorrect++;
                        if (q.type !== 'TITA') incorrectMcq++;
                    }
                }
                time += attempt.timeTaken?.[secIdx]?.[qIdx] || 0;
            });
            const score = (correct * 3) - (incorrectMcq * 1);
            return { name: section.name, score, correct, incorrect, unattempted, time, totalQuestions: section.questions.length };
        });

        const totalScore = attempt.totalScore ?? sectionWiseResults.reduce((acc, sec) => acc + sec.score, 0);
        const totalCorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.correct, 0);
        const totalIncorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.incorrect, 0);
        const totalAttempted = totalCorrect + totalIncorrect;
        const totalQuestions = test.sections.reduce((acc, sec) => acc + sec.questions.length, 0);
        const totalAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
        const totalTime = sectionWiseResults.reduce((acc, sec) => acc + sec.time, 0);

        const synchronizedAllAttempts = allAttempts.map(a => 
            a.id === attempt.id 
                ? { ...a, totalScore: totalScore } 
                : a
        );
        
        return {
            sectionWiseResults, totalScore, totalCorrect, totalIncorrect, totalAttempted,
            totalQuestions, totalAccuracy, totalTime, synchronizedAllAttempts
        };

    }, [attempt, test, allAttempts]);

    useEffect(() => {
        const backfillScore = async () => {
            // Check if attempt is loaded and if totalScore property is missing
            if (attempt && !attempt.hasOwnProperty('totalScore') && attemptId) {
                try {
                    const attemptRef = doc(db, 'attempts', attemptId);
                    // Use the score calculated by the useMemo hook above
                    await updateDoc(attemptRef, {
                        totalScore: analysisData.totalScore
                    });
                } catch (error) {
                    console.error("Failed to backfill total score:", error);
                }
            }
        };

        backfillScore();
    }, [attempt, attemptId, analysisData.totalScore]);

    const handleCloseToDashboard = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        if(navigate) navigate('home');
    };

    if (loading) return <div className="text-center text-gray-400 p-8">Loading Analysis...</div>;
    if (!attempt || !test) return <div className="text-center text-red-500 p-8">Could not load analysis data.</div>;
    
    const showPassagePanel = (test.sections[currentQuestion.secIdx]?.questions[currentQuestion.qIdx]?.passage || test.sections[currentQuestion.secIdx]?.questions[currentQuestion.qIdx]?.passageImageUrl);

    return (
        <div ref={analysisContainerRef} className="h-screen flex flex-col bg-white text-gray-800 font-sans">
            {view === 'summary' ? (
                <Scorecard 
                    test={test} 
                    sectionWiseResults={analysisData.sectionWiseResults} 
                    totalScore={analysisData.totalScore} 
                    totalAccuracy={analysisData.totalAccuracy} 
                    totalTime={analysisData.totalTime} 
                    totalAttempted={analysisData.totalAttempted} 
                    totalQuestions={analysisData.totalQuestions} 
                    setView={setView} 
                    handleCloseToDashboard={handleCloseToDashboard}
                />
            ) : (
                <AnalysisView 
                    test={test} 
                    attempt={attempt} 
                    allAttempts={analysisData.synchronizedAllAttempts}
                    currentQuestion={currentQuestion} 
                    setCurrentQuestion={setCurrentQuestion} 
                    setView={setView} 
                    handleCloseToDashboard={handleCloseToDashboard} 
                    showPassagePanel={showPassagePanel}
                    handleFullscreen={handleFullscreen}
                />
            )}
        </div>
    );
};

export default ResultAnalysis;