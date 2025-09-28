import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Scorecard from '../components/Scorecard';
import { FaChartPie, FaCheckCircle, FaStopwatch, FaExpand, FaStar, FaLightbulb, FaCheck, FaInfoCircle, FaChartBar } from 'react-icons/fa';

// --- Reusable Button Component ---
const Button = ({ children, className = '', ...props }) => (
    <button {...props} className={`px-4 py-2 rounded-md font-semibold transition-all ${className}`}>
        {children}
    </button>
);

// --- Answer Option Component ---
const AnswerOption = ({ option, isUserAnswer, isCorrectAnswer, showCorrectAnswerHighlight, choicePercentage, isToppersChoice }) => {
    const isRevealed = showCorrectAnswerHighlight;
    const isCorrect = isCorrectAnswer;
    
    let bgColorClass = 'bg-slate-50 hover:bg-slate-100';
    let textColorClass = 'text-slate-800';
    let ringClass = 'ring-1 ring-slate-200';

    if (isUserAnswer && !isRevealed) {
        ringClass = 'ring-2 ring-sky-500';
    }

    if (isRevealed) {
        if (isCorrect) {
            bgColorClass = 'bg-teal-50';
            textColorClass = 'text-teal-900';
            ringClass = 'ring-1 ring-teal-300';
        } else {
            bgColorClass = 'bg-rose-50';
            textColorClass = 'text-rose-900';
            ringClass = 'ring-1 ring-rose-300';
        }
        if (isUserAnswer) {
             ringClass = 'ring-2 ' + (isCorrect ? 'ring-teal-500' : 'ring-rose-500');
        }
    }
    
    const barColorClass = isCorrect ? 'bg-teal-200' : 'bg-rose-200';

    return (
        <div className={`relative flex items-center justify-between p-3.5 ${bgColorClass} ${ringClass} rounded-lg transition-all overflow-hidden`}>
            {isRevealed && (
                <div
                    className={`absolute top-0 left-0 h-full transition-width duration-700 ease-in-out opacity-40 ${barColorClass}`}
                    style={{ width: `${choicePercentage}%` }}
                    aria-hidden="true"
                />
            )}
            <div className="relative z-10 flex items-center justify-between w-full">
                <div className="flex items-start">
                    <input type="radio" checked={isUserAnswer} readOnly className={`mt-1 mr-4 h-4 w-4 cursor-not-allowed accent-sky-600`} />
                    <label className={`flex-1 select-none flex items-center pr-4 ${textColorClass}`}>
                        {option}
                    </label>
                </div>
                <div className="relative z-10 flex flex-col items-end space-y-1">
                    
                     {isRevealed && isToppersChoice && !isCorrect && (
                         <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center ring-1 ring-inset ring-amber-200">
                            <FaStar className="mr-1.5" /> Toppers' Pick
                        </span>
                      )}
                    {isRevealed && choicePercentage !== null && (
                        <span className={`text-sm font-semibold ml-4 ${isCorrect ? 'text-teal-700' : 'text-rose-700'}`}>
                            {choicePercentage.toFixed(0)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Key Insights Card Component ---
const KeyInsightsCard = ({ insights }) => {
    if (!insights) return null;
    const { message, color } = insights;
    let bgColorClass = 'bg-slate-100';
    let textColorClass = 'text-slate-800';
    if (color === 'green') { bgColorClass = 'bg-teal-50'; textColorClass = 'text-teal-800'; }
    if (color === 'red') { bgColorClass = 'bg-rose-50'; textColorClass = 'text-rose-800'; }
    if (color === 'yellow') { bgColorClass = 'bg-amber-50'; textColorClass = 'text-amber-800'; }

    return (
        <div className={`p-4 rounded-lg border-l-4 ${bgColorClass} ${textColorClass.replace('text-', 'border-')}`}>
            <p className="font-semibold flex items-center"><FaLightbulb className="mr-2"/> Key Insight</p>
            <p className="text-sm mt-1">{message}</p>
        </div>
    );
};

// --- Question Stats Panel Component ---
const QuestionStatsPanel = ({ metrics }) => {
    const formatPercent = (value) => value !== null && value !== undefined ? `${parseFloat(value).toFixed(0)}%` : '–';
    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined) return '–';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const HeaderCell = ({ children }) => <div className="text-slate-500 text-[11px] font-bold pb-2 text-center tracking-wider">{children}</div>;
    const MetricCell = ({ children, className = '' }) => <div className={`text-slate-700 text-xs text-center py-2 ${className}`}>{children}</div>;
    const LabelCell = ({ icon, children }) => <div className="text-slate-500 text-xs font-semibold flex items-center gap-2 py-2"><div className="w-4 flex justify-center">{icon}</div>{children}</div>;

    return (
        <div className="bg-white shadow-md rounded-lg border border-slate-200 p-3">
            <h3 className="text-md font-bold text-center text-slate-800 mb-3 flex items-center justify-center gap-2">
                <FaChartBar />
                <span>Question Stats</span>
            </h3>
            <div className="grid grid-cols-[auto,1fr,1fr,1fr] gap-x-3 items-center">
                {/* Headers */}
                <HeaderCell />
                <HeaderCell>YOU</HeaderCell>
                <HeaderCell>TOPPERS</HeaderCell>
                <HeaderCell>AVERAGE</HeaderCell>

                {/* Time Row */}
                <LabelCell icon={<FaStopwatch />} >Time</LabelCell>
                <MetricCell className="font-bold text-sky-600">{formatTime(metrics.userTimeTaken)}</MetricCell>
                <MetricCell>{metrics.toppersAvailable ? formatTime(metrics.toppersTimeTaken) : '–'}</MetricCell>
                <MetricCell>{formatTime(metrics.overallTimeTaken)}</MetricCell>

                {/* Accuracy Row */}
                <LabelCell icon={<FaChartPie />} >Accuracy</LabelCell>
                <MetricCell className={`font-bold ${metrics.userCorrectnessStatus === 'Correct' ? 'text-teal-600' : 'text-rose-600'}`}>{metrics.userCorrectnessStatus || '–'}</MetricCell>
                <MetricCell>{metrics.toppersAvailable ? formatPercent(metrics.toppersAccuracy) : '–'}</MetricCell>
                <MetricCell>{formatPercent(metrics.overallAccuracy)}</MetricCell>
                
                {/* Attempt Row */}
                <LabelCell icon={<FaCheckCircle />} >Attempt</LabelCell>
                <MetricCell className="font-bold text-sky-600">{metrics.userAttemptStatus}</MetricCell>
                <MetricCell>{metrics.toppersAvailable ? formatPercent(metrics.toppersAttemptPercent) : '–'}</MetricCell>
                <MetricCell>{formatPercent(metrics.overallAttemptPercent)}</MetricCell>
            </div>
            <div className="border-t border-slate-200 mt-3 pt-3 text-xs text-slate-500 flex items-start gap-2">
                <FaInfoCircle className="flex-shrink-0 mt-0.5" />
                <div>
                    Difficulty is calculated in real-time.
                    {!metrics.toppersAvailable && " Topper stats are enabled after required number of participants."}
                </div>
            </div>
        </div>
    );
};


// --- Analysis View Component (MODIFIED with Section-wise Palette) ---
const AnalysisView = ({ test, attempt, allAttempts, currentQuestion, setCurrentQuestion, showPassagePanel, handleFullscreen, setView, handleCloseToDashboard }) => {
    const [showCorrectAnswerHighlight, setShowCorrectAnswerHighlight] = useState(false);
    const [showExplanationContent, setShowExplanationContent] = useState(false);
    const [mobileView, setMobileView] = useState('question');
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [optionChoicePercentages, setOptionChoicePercentages] = useState(null);
    const [questionInsights, setQuestionInsights] = useState(null);

    useEffect(() => {
    const MIN_ATTEMPTS_FOR_TOPPERS = 15;
    const { secIdx, qIdx } = currentQuestion;
    const activeQuestion = test.sections[secIdx].questions[qIdx];
    const originalUserAnswer = attempt.answers?.[secIdx]?.[qIdx];
    const isOriginalUnattempted = originalUserAnswer === null || originalUserAnswer === undefined || originalUserAnswer === '';
    
    const isCorrect = (userAnswer) => {
        if (userAnswer === null || userAnswer === undefined || userAnswer === '') return false;
        return activeQuestion.type === 'TITA' ? String(userAnswer || '').toLowerCase() === String(activeQuestion.correctOption).toLowerCase() : userAnswer === activeQuestion.correctOption;
    };

    // ... (rest of the data calculation logic remains the same)
    const attemptedThisQ = allAttempts.filter(a => a.answers?.[secIdx]?.[qIdx] !== null && a.answers?.[secIdx]?.[qIdx] !== undefined && a.answers?.[secIdx]?.[qIdx] !== '');
    const totalAttemptedCount = attemptedThisQ.length;
    const correctAttemptedCount = attemptedThisQ.filter(a => isCorrect(a.answers?.[secIdx]?.[qIdx])).length;
    const overallAccuracy = totalAttemptedCount > 0 ? (correctAttemptedCount / totalAttemptedCount) * 100 : 0;
    
    const toppersAvailable = allAttempts.length >= MIN_ATTEMPTS_FOR_TOPPERS;
    let toppersStats = { time: null, accuracy: null, attemptPercent: null, mostCommonAnswer: null };

    if (toppersAvailable) {
        const sortedAttempts = [...allAttempts].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
        const toppersCount = Math.ceil(sortedAttempts.length * 0.1);
        const toppersGroup = sortedAttempts.slice(0, toppersCount);
        
        const calculateGroupStats = (group) => {
            if (!group || group.length === 0) return { time: 0, accuracy: 0, attemptPercent: 0, mostCommonAnswer: null };
            const groupAttempted = group.filter(a => a.answers?.[secIdx]?.[qIdx] !== null && a.answers?.[secIdx]?.[qIdx] !== undefined && a.answers?.[secIdx]?.[qIdx] !== '');
            if (groupAttempted.length === 0) return { time: 0, accuracy: 0, attemptPercent: 0, mostCommonAnswer: null };
            const totalTime = groupAttempted.reduce((sum, a) => sum + (a.timeTaken?.[secIdx]?.[qIdx] || 0), 0);
            const correctCount = groupAttempted.filter(a => isCorrect(a.answers?.[secIdx]?.[qIdx])).length;
            const answerCounts = groupAttempted.reduce((acc, a) => { const ans = a.answers?.[secIdx]?.[qIdx]; acc[ans] = (acc[ans] || 0) + 1; return acc; }, {});
            const mostCommonAnswer = Object.keys(answerCounts).length > 0 ? parseInt(Object.entries(answerCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]) : null;
            return { time: totalTime / groupAttempted.length, accuracy: (correctCount / groupAttempted.length) * 100, attemptPercent: (groupAttempted.length / group.length) * 100, mostCommonAnswer };
        };
        toppersStats = calculateGroupStats(toppersGroup);
    }
    
    const overallTime = totalAttemptedCount > 0 ? attemptedThisQ.reduce((sum, a) => sum + (a.timeTaken?.[secIdx]?.[qIdx] || 0), 0) / totalAttemptedCount : 0;

    setPerformanceMetrics({
        userTimeTaken: attempt.timeTaken?.[secIdx]?.[qIdx] || 0,
        userAttemptStatus: isOriginalUnattempted ? 'Unattempted' : 'Attempted',
        userCorrectnessStatus: isOriginalUnattempted ? null : (isCorrect(originalUserAnswer) ? 'Correct' : 'Incorrect'),
        toppersTimeTaken: toppersStats.time,
        toppersAttemptPercent: toppersStats.attemptPercent,
        toppersAccuracy: toppersStats.accuracy,
        overallTimeTaken: overallTime,
        overallAttemptPercent: (totalAttemptedCount / allAttempts.length) * 100,
        overallAccuracy: overallAccuracy,
        toppersAvailable: toppersAvailable,
    });

    let difficulty = { text: 'Medium', color: 'bg-amber-400 text-amber-900', raw: 'Medium' };
    if (overallAccuracy >= 75) difficulty = { text: 'Easy', color: 'bg-teal-400 text-teal-900', raw: 'Easy' };
    else if (overallAccuracy < 40) difficulty = { text: 'Hard', color: 'bg-rose-400 text-rose-900', raw: 'Hard' };
    
    let mostCommonWrongAnswer = null;
    if (activeQuestion.type !== 'TITA') {
        const counts = new Array(activeQuestion.options.length).fill(0);
        attemptedThisQ.forEach(a => { const ans = a.answers?.[secIdx]?.[qIdx]; if (typeof ans === 'number') counts[ans]++; });
        const percentages = totalAttemptedCount > 0 ? counts.map(c => (c / totalAttemptedCount) * 100) : counts.map(() => 0);
        setOptionChoicePercentages({ percentages: percentages, toppersChoice: toppersStats.mostCommonAnswer });
        let maxPercent = -1;
        percentages.forEach((p, i) => { if (i !== activeQuestion.correctOption && p > maxPercent) { maxPercent = p; mostCommonWrongAnswer = { index: i, percent: p }; } });
    } else { setOptionChoicePercentages(null); }

    const userTime = attempt.timeTaken?.[secIdx]?.[qIdx] || 0;
    const isUserCorrect = isCorrect(originalUserAnswer);
    
    let insightMsg = { message: '', color: 'gray' };
    
    // --- CORRECTED INSIGHT LOGIC ---
    if (isOriginalUnattempted) {
        switch (difficulty.raw) {
            case 'Easy':
                insightMsg = { message: `You skipped this 'Easy' question. These are great opportunities to maximize your score.`, color: 'yellow' };
                break;
            case 'Medium':
                insightMsg = { message: `You skipped this 'Medium' question. Depending on your strategy, you might consider attempting these in the future.`, color: 'yellow' };
                break;
            case 'Hard':
                insightMsg = { message: `You skipped this 'Hard' question. This was a tough one for many, so skipping it can be a valid strategic choice to save time.`, color: 'yellow' };
                break;
            default:
                insightMsg = { message: `You skipped this question.`, color: 'gray' };
        }
    } else if (isUserCorrect) {
        let timeComparison = toppersAvailable && userTime < toppersStats.time ? "faster than the toppers' average" : "efficiently";
        insightMsg = { message: `Correct! You answered this '${difficulty.raw}' question ${timeComparison}. Well done!`, color: 'green' };
    } else { 
        if (mostCommonWrongAnswer && originalUserAnswer === mostCommonWrongAnswer.index) {
            insightMsg = { message: `You fell for the most common distractor, which fooled ${mostCommonWrongAnswer.percent.toFixed(0)}% of students. Review the concept to avoid this trap.`, color: 'red' };
        } else {
            insightMsg = { message: `Incorrect. This was a '${difficulty.raw}' question. Analyze the solution to understand where you went wrong.`, color: 'red' };
        }
    }

    setQuestionInsights({ difficulty, message: insightMsg.message, color: insightMsg.color });
    
    setShowCorrectAnswerHighlight(false);
    setShowExplanationContent(false);
    setMobileView('question');
}, [currentQuestion, allAttempts, test, attempt]);

    if (!test || !attempt || !performanceMetrics || !questionInsights) {
        return <div className="text-center p-8">Loading analysis...</div>;
    }

    const activeQuestion = test.sections[currentQuestion.secIdx].questions[currentQuestion.qIdx];
    const originalUserAnswer = attempt.answers?.[currentQuestion.secIdx]?.[currentQuestion.qIdx];
    const isOriginalUnattempted = originalUserAnswer === null || originalUserAnswer === undefined || originalUserAnswer === '';
    const isOriginalCorrect = !isOriginalUnattempted && (activeQuestion.type === 'TITA' ? String(originalUserAnswer || '').toLowerCase() === String(activeQuestion.correctOption).toLowerCase() : originalUserAnswer === activeQuestion.correctOption);
    
    const handleNavigation = (direction) => { let { secIdx, qIdx } = currentQuestion; if (direction === 'next') { if (qIdx < test.sections[secIdx].questions.length - 1) qIdx++; else if (secIdx < test.sections.length - 1) { secIdx++; qIdx = 0; } else { setView('summary'); return; } } else if (direction === 'prev') { if (qIdx > 0) qIdx--; else if (secIdx > 0) { secIdx--; qIdx = test.sections[secIdx].questions.length - 1; } else { setView('summary'); return; } } setCurrentQuestion({ secIdx, qIdx }); };
    const isFirstQuestion = currentQuestion.secIdx === 0 && currentQuestion.qIdx === 0;
    const isLastQuestion = currentQuestion.secIdx === test.sections.length - 1 && currentQuestion.qIdx === test.sections[test.sections.length - 1].questions.length - 1;

    const activeSection = test.sections[currentQuestion.secIdx];

    return (
        <div className="h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
             <div className="bg-white shadow-sm p-2 flex-shrink-0 z-20 border-b border-slate-200">
                <div className="max-w-full mx-auto px-4 flex justify-between items-center h-12">
                    <h1 className="text-md md:text-lg font-semibold truncate">Analysis: {test.title}</h1>
                    <div className="flex space-x-4 items-center">
                        <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-slate-500 hover:text-slate-900 p-1"><FaExpand className="h-5 w-5" /></button>
                        <Button onClick={() => setView('summary')} className="text-sky-600 hover:text-sky-800 text-xs font-semibold !p-0">&larr; Back to Summary</Button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-full p-2 md:p-4 gap-4">
                {showPassagePanel && (
                    <div className={`bg-white shadow-sm rounded-lg p-4 md:p-6 flex-1 overflow-y-auto min-h-0 ${mobileView === 'passage' ? 'flex' : 'hidden'} md:flex flex-col border border-slate-200`}>
                        <h2 className="font-semibold mb-2 text-slate-900">Directions for question {currentQuestion.qIdx + 1}</h2>
                        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap mb-4">{activeQuestion.passage}</div>
                        {activeQuestion.passageImageUrl && <img src={activeQuestion.passageImageUrl} alt="Passage" className="rounded max-w-full"/>}
                    </div>
                )}
                <div className={`bg-white shadow-sm rounded-lg p-4 md:p-6 flex-1 overflow-y-auto min-h-0 ${mobileView === 'question' ? 'flex' : 'hidden'} md:flex flex-col border border-slate-200`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                           <p className="font-semibold text-slate-900">Question {currentQuestion.qIdx + 1}</p>
                           {questionInsights.difficulty && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${questionInsights.difficulty.color}`}>{questionInsights.difficulty.text}</span>}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${isOriginalUnattempted ? 'bg-slate-400 text-white' : (isOriginalCorrect ? 'bg-teal-500 text-white' : 'bg-rose-500 text-white')}`}>{isOriginalUnattempted ? 'Not Attempted' : (isOriginalCorrect ? 'Correct' : 'Incorrect')}</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap mb-6">{activeQuestion.questionText}</p>
                    {activeQuestion.questionImageUrl && <img src={activeQuestion.questionImageUrl} alt="Question" className="mb-6 rounded max-w-full"/>}
                    
                    <div className="space-y-3">
                        {activeQuestion.type === 'TITA' ? (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Your Answer</h3>
                                <div className={`flex items-start p-3 ring-1 rounded-lg ${showCorrectAnswerHighlight ? (isOriginalCorrect ? 'ring-teal-300 bg-teal-50' : 'ring-rose-300 bg-rose-50') : 'ring-sky-500 bg-slate-50'}`}>
                                    <p className={`flex-1 font-semibold`}>{originalUserAnswer || 'Not Attempted'}</p>
                                </div>
                            </div>
                        ) : (
                            activeQuestion.options.map((option, index) => (
                                <AnswerOption key={index} option={option} isUserAnswer={originalUserAnswer === index} isCorrectAnswer={index === activeQuestion.correctOption} showCorrectAnswerHighlight={showCorrectAnswerHighlight} choicePercentage={optionChoicePercentages?.percentages?.[index] ?? 0} isToppersChoice={optionChoicePercentages?.toppersChoice === index} />
                            ))
                        )}
                    </div>
                    
                    {showCorrectAnswerHighlight && (
                        <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                            {activeQuestion.type === 'TITA' && (
                                <div>
                                    <h3 className="text-md font-semibold text-slate-900 mb-2">Correct Answer</h3>
                                    <div className="flex items-start p-3 ring-1 rounded-lg ring-teal-300 bg-teal-50">
                                        <p className="flex-1 font-semibold text-teal-800">{activeQuestion.correctOption}</p>
                                    </div>
                                </div>
                            )}
                            <KeyInsightsCard insights={questionInsights} />
                            {activeQuestion.solution && (
                                <>
                                {!showExplanationContent ? ( <Button onClick={() => setShowExplanationContent(true)} className="bg-slate-200 text-slate-700 hover:bg-slate-300 w-full">Show Explanation</Button> ) 
                                : (
                                    <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
                                        <p className="font-semibold text-sm text-slate-800">Explanation:</p>
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap mt-2">{activeQuestion.solution}</p>
                                        {activeQuestion.solutionImageUrl && <img src={activeQuestion.solutionImageUrl} alt="Solution" className="mt-2 rounded max-w-full"/>}
                                    </div>
                                )}
                                </>
                            )}
                        </div>
                    )}
                    
                     <div className="mt-auto pt-6">
                        {!showCorrectAnswerHighlight && (<Button onClick={() => setShowCorrectAnswerHighlight(true)} className="bg-slate-800 text-white hover:bg-slate-700 w-full">Show Detailed Analysis</Button>)}
                    </div>
                </div>

                <div className={`bg-slate-50 md:bg-transparent p-0 md:w-80 flex-shrink-0 overflow-y-auto min-h-0 ${mobileView === 'palette' ? 'flex' : 'hidden'} md:flex flex-col space-y-4`}>
                    {test.sections.length > 1 && (
                        <div className="flex bg-slate-200/60 rounded-lg p-1">
                            {test.sections.map((section, secIdx) => (
                                <button
                                    key={secIdx}
                                    onClick={() => setCurrentQuestion({ secIdx, qIdx: 0 })}
                                    className={`flex-1 text-center text-xs font-semibold py-1.5 rounded-md transition-all ${
                                        currentQuestion.secIdx === secIdx
                                            ? 'bg-white text-sky-600 shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-600 hover:bg-white/50'
                                    }`}
                                >
                                    {section.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="bg-white shadow-sm rounded-lg border border-slate-200 p-3">
                        <p className="font-semibold text-center mb-3 text-slate-900 text-sm">{activeSection.name}</p>
                        <div className="grid grid-cols-5 gap-2">
                            {activeSection.questions.map((q, qIdx) => {
                                const userAnswer = attempt.answers?.[currentQuestion.secIdx]?.[qIdx]; 
                                const isCorrect = q.type === 'TITA' ? String(userAnswer || '').toLowerCase() === String(q.correctOption).toLowerCase() : userAnswer === q.correctOption; 
                                const isAttempted = userAnswer !== null && userAnswer !== undefined && userAnswer !== '';
                                let colorClass = isAttempted ? (isCorrect ? 'bg-teal-500 text-white' : 'bg-rose-500 text-white') : 'bg-slate-300 text-slate-700';
                                if (currentQuestion.qIdx === qIdx) {
                                    colorClass += ' ring-2 ring-offset-1 ring-sky-500';
                                }
                                return <button 
                                    key={qIdx} 
                                    onClick={() => setCurrentQuestion({ secIdx: currentQuestion.secIdx, qIdx })} 
                                    className={`h-8 w-8 flex items-center justify-center rounded-md font-semibold transition-all text-xs ${colorClass}`}
                                >
                                    {qIdx + 1}
                                </button>
                            })}
                        </div>
                    </div>
                    
                    <div className="mt-auto"><QuestionStatsPanel metrics={performanceMetrics} /></div>
                </div>
            </div>

            <div className="flex-shrink-0">
                <div className="md:hidden p-2 flex justify-between items-center bg-white border-t border-slate-200"><Button onClick={() => handleNavigation('prev')} disabled={isFirstQuestion} className="bg-slate-200 text-slate-800 hover:bg-slate-300 disabled:opacity-50 text-sm">&larr; Prev</Button><Button onClick={handleCloseToDashboard} className="bg-slate-600 hover:bg-slate-700 text-white text-sm">Dashboard</Button><Button onClick={() => handleNavigation('next')} disabled={isLastQuestion} className="bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 text-sm">Next &rarr;</Button></div>
                <div className="md:hidden flex justify-around bg-slate-800 text-white">{showPassagePanel && <button onClick={() => setMobileView('passage')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'passage' ? 'bg-slate-600' : ''}`}>Passage</button>}<button onClick={() => setMobileView('question')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'question' ? 'bg-slate-600' : ''}`}>Question</button><button onClick={() => setMobileView('palette')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'palette' ? 'bg-slate-600' : ''}`}>Palette</button></div>
                <div className="hidden md:flex bg-white shadow-lg p-3 justify-between items-center z-10 border-t border-slate-200"><Button onClick={() => handleNavigation('prev')} disabled={isFirstQuestion} className="bg-slate-200 text-slate-800 hover:bg-slate-300 disabled:opacity-50">&larr; Previous</Button><div className="flex items-center space-x-4"><Button onClick={() => handleNavigation('next')} disabled={isLastQuestion} className="bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50">Next &rarr;</Button><Button onClick={handleCloseToDashboard} className="bg-slate-600 hover:bg-slate-700 text-white">Back to Dashboard</Button></div></div>
            </div>
        </div>
    );
};

// --- Main ResultAnalysis Component ---
const ResultAnalysis = ({ navigate, attemptId }) => {
    const [attempt, setAttempt] = useState(null); const [test, setTest] = useState(null); const [allAttempts, setAllAttempts] = useState([]); const [loading, setLoading] = useState(true); const [view, setView] = useState('summary'); const [currentQuestion, setCurrentQuestion] = useState({ secIdx: 0, qIdx: 0 }); const analysisContainerRef = useRef(null);
    useEffect(() => { const hC = (e) => e.preventDefault(); const hS = (e) => e.preventDefault(); document.addEventListener('contextmenu', hC); document.addEventListener('selectstart', hS); return () => { document.removeEventListener('contextmenu', hC); document.removeEventListener('selectstart', hS); }; }, []);
    const handleFullscreen = useCallback(() => { if (analysisContainerRef.current) { if (!document.fullscreenElement) { analysisContainerRef.current.requestFullscreen().catch(err => console.error(err)); } else { document.exitFullscreen(); } } }, []);
    useEffect(() => { if (!attemptId) { if (navigate) navigate('home'); return; } const fetchData = async () => { setLoading(true); try { const aRef = doc(db, 'attempts', attemptId); const aSnap = await getDoc(aRef); if (!aSnap.exists()) throw new Error("Attempt not found."); const aData = { ...aSnap.data(), id: aSnap.id }; setAttempt(aData); const tRef = doc(db, 'tests', aData.testId); const tSnap = await getDoc(tRef); if (!tSnap.exists()) throw new Error("Test not found."); const tData = { id: tSnap.id, ...tSnap.data() }; setTest(tData); const q = query(collection(db, 'attempts'), where('testId', '==', aData.testId), where('status', '==', 'completed')); const qSnap = await getDocs(q); const allAData = qSnap.docs.map(d => ({ ...d.data(), id: d.id })); setAllAttempts(allAData); } catch (error) { console.error(error); alert(error.message); } finally { setLoading(false); } }; fetchData(); }, [attemptId, navigate]);
    const analysisData = useMemo(() => {
        if (!attempt || !test) return { /* ... initial empty state ... */ };
        
        const markingScheme = test.markingScheme;
        let totalUnattemptedForPenalty = 0;

        const sWR = test.sections.map((sec, sIdx) => {
            let c = 0, i = 0, u = 0, t = 0, iM = 0;
            sec.questions.forEach((q, qIdx) => {
                const uA = attempt.answers?.[sIdx]?.[qIdx];
                const isAtt = uA !== undefined && uA !== null && uA !== '';
                if (!isAtt) { u++; } else {
                    const isC = q.type === 'TITA' ? String(uA).toLowerCase() === String(q.correctOption).toLowerCase() : uA === q.correctOption;
                    if (isC) c++; else { i++; if (q.type !== 'TITA') iM++; }
                }
                t += attempt.timeTaken?.[sIdx]?.[qIdx] || 0;
            });

            totalUnattemptedForPenalty += u;
            
            let score;
            if (markingScheme) {
                const { marksForCorrect = 3, negativeMarksMCQ = 1, sectionsWithNoNegativeMarking = [] } = markingScheme;
                score = c * marksForCorrect;
                if (!sectionsWithNoNegativeMarking.includes(sec.name)) {
                    score -= iM * negativeMarksMCQ;
                }
            } else {
                score = (c * 3) - (iM * 1); // Default logic
            }

            return { name: sec.name, score, correct: c, incorrect: i, unattempted: u, time: t, totalQuestions: sec.questions.length };
        });

        let finalTotalScore = sWR.reduce((acc, sec) => {
            // Exclude sections from final total if specified in the scheme
            if (markingScheme?.sectionsExcludedFromTotal?.includes(sec.name)) {
                return acc;
            }
            return acc + sec.score;
        }, 0);

        // Apply skip penalty if applicable
        if (markingScheme?.hasSkipPenalty && totalUnattemptedForPenalty > markingScheme.skipPenaltyAfter) {
            const questionsToPenalize = totalUnattemptedForPenalty - markingScheme.skipPenaltyAfter;
            const penalty = questionsToPenalize * (markingScheme.skipPenaltyMarks || 0);
            finalTotalScore -= penalty;
        }
        
        const tS = finalTotalScore;
        const tC = sWR.reduce((acc, sec) => acc + sec.correct, 0);
        const tI = sWR.reduce((acc, sec) => acc + sec.incorrect, 0);
        const tA = tC + tI;
        const tQ = test.sections.reduce((acc, sec) => acc + sec.questions.length, 0);
        const tAcc = tA > 0 ? (tC / tA) * 100 : 0;
        const tT = sWR.reduce((acc, sec) => acc + sec.time, 0);
        const sAA = allAttempts.map(a => a.id === attempt.id ? { ...a, totalScore: tS } : a);

        return { sectionWiseResults: sWR, totalScore: tS, totalCorrect: tC, totalIncorrect: tI, totalAttempted: tA, totalQuestions: tQ, totalAccuracy: tAcc, totalTime: tT, synchronizedAllAttempts: sAA };
    }, [attempt, test, allAttempts]);
    
    useEffect(() => { const backfill = async () => { if (attempt && !attempt.hasOwnProperty('totalScore') && attemptId) { try { await updateDoc(doc(db, 'attempts', attemptId), { totalScore: analysisData.totalScore }); } catch (error) { console.error(error); } } }; backfill(); }, [attempt, attemptId, analysisData.totalScore]);
    const handleCloseToDashboard = () => { if (document.fullscreenElement) document.exitFullscreen(); if (navigate) navigate('home'); };
    if (loading) return <div className="text-center text-slate-400 p-8">Loading Analysis...</div>;
    if (!attempt || !test) return <div className="text-center text-rose-500 p-8">Could not load analysis data.</div>;
    const showPassagePanel = (test.sections[currentQuestion.secIdx]?.questions[currentQuestion.qIdx]?.passage || test.sections[currentQuestion.secIdx]?.questions[currentQuestion.qIdx]?.passageImageUrl);
    return ( <div ref={analysisContainerRef} className="h-screen flex flex-col bg-white text-slate-800 font-sans" style={{ userSelect: 'none' }}> {view === 'summary' ? ( <Scorecard test={test} sectionWiseResults={analysisData.sectionWiseResults} totalScore={analysisData.totalScore} totalAccuracy={analysisData.totalAccuracy} totalTime={analysisData.totalTime} totalAttempted={analysisData.totalAttempted} totalQuestions={analysisData.totalQuestions} setView={setView} handleCloseToDashboard={handleCloseToDashboard} /> ) : ( <AnalysisView test={test} attempt={attempt} allAttempts={analysisData.synchronizedAllAttempts} currentQuestion={currentQuestion} setCurrentQuestion={setCurrentQuestion} setView={setView} handleCloseToDashboard={handleCloseToDashboard} showPassagePanel={showPassagePanel} handleFullscreen={handleFullscreen} /> )} </div> );
};

export default ResultAnalysis;