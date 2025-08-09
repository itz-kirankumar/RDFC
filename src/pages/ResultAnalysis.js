import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Scorecard from '../components/Scorecard';

// --- Reusable Button Component ---
const Button = ({ onClick, children, className = '' }) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-md font-semibold transition-all ${className}`}>
        {children}
    </button>
);

// --- Answer Option Component for Display (Light Theme) ---
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

// --- Analysis View Component (Light Theme, 3-panel layout) ---
const AnalysisView = ({ 
    test, attempt, currentQuestion, setCurrentQuestion, 
    showPassagePanel, handleFullscreen, handleCloseToDashboard, setView, timeFormatted
}) => {
    const activeSection = test.sections[currentQuestion.secIdx];
    const activeQuestion = activeSection.questions[currentQuestion.qIdx];
    const originalUserAnswer = attempt.answers?.[currentQuestion.secIdx]?.[currentQuestion.qIdx];
    
    const [showCorrectAnswerHighlight, setShowCorrectAnswerHighlight] = useState(false);
    const [showExplanationContent, setShowExplanationContent] = useState(false);
    
    useEffect(() => {
        setShowCorrectAnswerHighlight(false);
        setShowExplanationContent(false);
    }, [currentQuestion.secIdx, currentQuestion.qIdx]);

    const handleRevealAnswer = () => {
        setShowCorrectAnswerHighlight(true);
    };

    const handleShowExplanation = () => {
        setShowExplanationContent(true);
    };
    
    const isOriginalUnattempted = originalUserAnswer === null || originalUserAnswer === undefined || originalUserAnswer === '';
    const isOriginalCorrect = activeQuestion.type === 'TITA' 
        ? String(originalUserAnswer || '').toLowerCase() === String(activeQuestion.correctOption).toLowerCase()
        : originalUserAnswer === activeQuestion.correctOption;

    const handleNavigation = (direction) => {
        let newSecIdx = currentQuestion.secIdx;
        let newQIdx = currentQuestion.qIdx;

        if (direction === 'next') {
            if (newQIdx < test.sections[newSecIdx].questions.length - 1) {
                newQIdx++;
            } else if (newSecIdx < test.sections.length - 1) {
                newSecIdx++;
                newQIdx = 0;
            } else {
                setView('summary');
                return;
            }
        } else if (direction === 'prev') {
            if (newQIdx > 0) {
                newQIdx--;
            } else if (newSecIdx > 0) {
                newSecIdx--;
                newQIdx = test.sections[newSecIdx].questions.length - 1;
            } else {
                setView('summary');
                return;
            }
        }
        setCurrentQuestion({ secIdx: newSecIdx, qIdx: newQIdx });
    };

    const isFirstQuestion = currentQuestion.secIdx === 0 && currentQuestion.qIdx === 0;
    const isLastQuestion = currentQuestion.secIdx === test.sections.length - 1 && currentQuestion.qIdx === test.sections[test.sections.length - 1].questions.length - 1;
    const panel2WidthClass = showPassagePanel ? 'md:w-1/2' : 'flex-1';

    return (
        <div className="h-screen flex flex-col bg-white text-gray-800 font-sans full-screen-container">
            {/* Header for Analysis View - Fixed and smaller */}
            <div className="fixed top-16 left-0 right-0 bg-gray-100 shadow-md p-2 flex-shrink-0 z-40">
                <div className="max-w-full mx-auto px-4 flex justify-between items-center h-12">
                    <h1 className="text-lg font-bold">Analysis: {test.title}</h1>
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
            
            {/* Main content area, now fixed height between header and footer */}
            <div className="fixed top-32 bottom-20 left-0 right-0 overflow-hidden">
                <div className="h-full flex flex-col md:flex-row max-w-full mx-auto p-2 md:p-4 gap-4">
                    {/* Panel 1: Passage Panel */}
                    {showPassagePanel && (
                        <div className="w-full md:w-1/2 bg-white shadow-md rounded-lg p-6 flex-1 overflow-y-auto min-h-0">
                            <h2 className="font-bold mb-2 text-gray-900">Directions for question {currentQuestion.qIdx + 1}</h2>
                            {activeQuestion.passageImageUrl && <img src={activeQuestion.passageImageUrl} alt="Passage" className="mb-4 rounded max-w-full"/>}
                            <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">{activeQuestion.passage}</div>
                        </div>
                    )}
                    {/* Panel 2: Question/Answer Area */}
                    <div className={`${panel2WidthClass} w-full bg-white shadow-md rounded-lg p-6 flex-1 overflow-y-auto min-h-0`}>
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
                                 <div className="flex items-start p-3 border-2 rounded-lg border-gray-300">
                                    <p className="flex-1 text-gray-700">{originalUserAnswer || 'Not Attempted'}</p>
                                </div>
                            ) : (
                                activeQuestion.options.map((option, index) => (
                                    <AnswerOption
                                        key={index}
                                        option={option}
                                        index={index}
                                        isUserAnswer={originalUserAnswer === index}
                                        isCorrectAnswer={index === activeQuestion.correctOption}
                                        showCorrectAnswerHighlight={showCorrectAnswerHighlight}
                                    />
                                ))
                            )}
                        </div>
                       
                        <div className="mt-6 border-t border-gray-200 pt-4">
                            {!showCorrectAnswerHighlight ? (
                                <Button onClick={handleRevealAnswer} className="bg-gray-900 text-white hover:bg-gray-700 w-full">Show Correct Answer</Button>
                            ) : (
                                <>
                                    {!showExplanationContent && activeQuestion.solution && (
                                        <Button onClick={handleShowExplanation} className="bg-gray-900 text-white hover:bg-gray-700 w-full">Show Explanation</Button>
                                    )}
                                </>
                            )}
                            {showExplanationContent && (
                                <div className="mt-4 p-4 bg-gray-100 rounded-md border border-gray-200">
                                    <p className="font-semibold text-sm text-gray-800">Explanation:</p>
                                    {activeQuestion.solutionImageUrl && <img src={activeQuestion.solutionImageUrl} alt="Solution" className="mt-2 rounded max-w-full"/>}
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{activeQuestion.solution}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel 3: Question Palette and Time Panel */}
                    <div className="w-full md:w-80 bg-gray-100 shadow-md rounded-lg p-6 flex-shrink-0 overflow-y-auto min-h-0">
                        {test.sections.map((section, secIdx) => (
                            <div key={secIdx} className="mb-4">
                                <p className="font-bold text-center mb-2 text-gray-900">{section.name}</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {section.questions.map((q, qIdx) => {
                                        const userAnswer = attempt.answers?.[secIdx]?.[qIdx];
                                        const isCorrect = q.type === 'TITA' 
                                            ? String(userAnswer || '').toLowerCase() === String(q.correctOption).toLowerCase() 
                                            : userAnswer === q.correctOption;
                                        const isAttempted = userAnswer !== null && userAnswer !== undefined && userAnswer !== '';
                                        
                                        let colorClass = 'bg-gray-300 text-gray-800';
                                        if (isAttempted) {
                                            colorClass = isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
                                        }

                                        if (currentQuestion.secIdx === secIdx && currentQuestion.qIdx === qIdx) {
                                            colorClass += ' ring-2 ring-offset-2 ring-blue-500 ring-offset-gray-100';
                                        }

                                        return <button key={qIdx} onClick={() => setCurrentQuestion({secIdx, qIdx})} className={`h-9 w-9 flex items-center justify-center rounded-md font-semibold transition-all ${colorClass}`}>{qIdx + 1}</button>
                                    })}
                                </div>
                            </div>
                        ))}
                        <div className="text-center mt-auto border-t border-gray-300 pt-4">
                             <p className="text-sm font-medium text-gray-600">Time spent on this question: <span className="text-gray-900 font-bold">{timeFormatted}</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Footer for Navigation Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-100 shadow-lg p-4 flex justify-between items-center z-40 border-t border-gray-200">
                <Button
                    onClick={() => handleNavigation('prev')}
                    disabled={isFirstQuestion}
                    className="bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:opacity-50"
                >
                    &larr; Previous
                </Button>
                <div className="flex space-x-4">
                    
                    <Button
                        onClick={() => handleNavigation('next')}
                        disabled={isLastQuestion}
                        className="bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                        Next &rarr;
                    </Button>
                    <Button
                        onClick={handleCloseToDashboard}
                        className="bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700"
                    >
                        Back to Dashboard
                    </Button>
                </div>
            </div>
             <style jsx>{`
                :fullscreen {
                    background-color: #ffffff;
                    width: 100vw;
                    height: 100vh;
                    margin: 0;
                    padding: 0;
                }
                :fullscreen .fixed {
                    position: static;
                }
                :fullscreen .fixed-height-container {
                    position: static !important;
                    height: auto !important;
                    display: block !important;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                    overflow: auto !important;
                }
                :fullscreen .max-w-7xl {
                    max-width: 100% !important;
                }
                :fullscreen .overflow-y-auto {
                    overflow-y: auto;
                }
                :fullscreen .full-screen-container {
                    padding: 0 !important;
                    margin: 0 !important;
                }
            `}</style>
        </div>
    );
};

const ResultAnalysis = ({ navigate, attemptId }) => {
    const [attempt, setAttempt] = useState(null);
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('summary');
    const [currentQuestion, setCurrentQuestion] = useState({ secIdx: 0, qIdx: 0 });
    const analysisContainerRef = useRef(null);

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

    const fetchData = useCallback(async () => {
        if (!attemptId) {
            console.error("No attempt ID provided. Navigating back to home.");
            navigate('home');
            return;
        }
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
    }, [attemptId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCloseToDashboard = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        navigate('home');
    };

    if (loading) {
        return <div className="text-center text-gray-400 p-8">Loading Analysis...</div>;
    }

    if (!attempt || !test) {
        return <div className="text-center text-gray-400 p-8">Could not load analysis data.</div>;
    }

    const sectionWiseResults = test.sections.map((section, secIdx) => {
        let correct = 0, incorrect = 0, unattempted = 0, time = 0;
        section.questions.forEach((q, qIdx) => {
            const userAnswer = attempt.answers?.[secIdx]?.[qIdx];
            const correctAnswer = q.type === 'TITA' ? String(q.correctOption).toLowerCase() : q.correctOption;
            const userAnsNormalized = q.type === 'TITA' ? String(userAnswer || '').toLowerCase() : userAnswer;

            if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
                unattempted++;
            } else if (userAnsNormalized === correctAnswer) {
                correct++;
            } else {
                incorrect++;
            }
            time += attempt.timeTaken?.[secIdx]?.[qIdx] || 0;
        });
        const score = (correct * 3) - (incorrect * 1);
        const accuracy = (correct + incorrect) > 0 ? (correct / (correct + incorrect)) * 100 : 0;
        const timeInSeconds = time;
        const totalQuestions = section.questions.length;
        const attemptedQuestions = correct + incorrect;

        return { 
            name: section.name, 
            score, 
            correct, 
            incorrect, 
            unattempted, 
            time: timeInSeconds, 
            accuracy: accuracy.toFixed(2),
            totalQuestions,
            attemptedQuestions
        };
    });

    const totalScore = sectionWiseResults.reduce((acc, sec) => acc + sec.score, 0);
    const totalCorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.correct, 0);
    const totalIncorrect = sectionWiseResults.reduce((acc, sec) => acc + sec.incorrect, 0);
    const totalAttempted = totalCorrect + totalIncorrect;
    const totalQuestions = test.sections.reduce((acc, sec) => acc + sec.questions.length, 0);
    const totalAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
    const totalTime = sectionWiseResults.reduce((acc, sec) => acc + sec.time, 0);

    const timeFormatted = `${Math.floor((attempt.timeTaken?.[currentQuestion.secIdx]?.[currentQuestion.qIdx] || 0) / 60)}m ${Math.round((attempt.timeTaken?.[currentQuestion.secIdx]?.[currentQuestion.qIdx] || 0) % 60)}s`;

    const activeSection = test.sections[currentQuestion.secIdx];
    const activeQuestion = activeSection.questions[currentQuestion.qIdx];
    const showPassagePanel = activeSection?.name !== 'QA' && (activeQuestion?.passage || activeQuestion?.passageImageUrl);

    return (
        <div ref={analysisContainerRef} className="h-screen flex flex-col bg-white text-gray-800 font-sans">
            {view === 'summary' ? (
                <Scorecard
                    test={test}
                    sectionWiseResults={sectionWiseResults}
                    totalScore={totalScore}
                    totalAccuracy={totalAccuracy}
                    totalTime={totalTime}
                    totalAttempted={totalAttempted}
                    totalQuestions={totalQuestions}
                    setView={setView}
                    handleCloseToDashboard={handleCloseToDashboard}
                />
            ) : (
                <AnalysisView
                    test={test}
                    attempt={attempt}
                    currentQuestion={currentQuestion}
                    setCurrentQuestion={setCurrentQuestion}
                    timeFormatted={timeFormatted}
                    showPassagePanel={showPassagePanel}
                    handleFullscreen={handleFullscreen}
                    handleCloseToDashboard={handleCloseToDashboard}
                    setView={setView}
                />
            )}
        </div>
    );
};

export default ResultAnalysis;