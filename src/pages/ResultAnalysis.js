import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { 
    FaCheck, FaTimes, FaArrowLeft, FaChevronLeft, FaChevronRight, 
    FaChartPie, FaListOl, FaTrophy, FaEye, FaTh, FaClock, FaChevronDown,
    FaBookOpen, FaQuestionCircle, FaExpand, FaCompress, FaChartBar, FaStar, 
    FaInfoCircle, FaStopwatch, FaCheckCircle, FaFilter 
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';


// --- 1. UI Helper Components ---

const Button = ({ children, className = '', ...props }) => (
    <button {...props} className={`px-4 py-2 rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 active:scale-95 ${className}`}>
        {children}
    </button>
);

const PerformanceMetric = ({ label, value, colorClass, iconBgClass, icon: Icon }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center justify-center text-center transition-all hover:shadow-md hover:-translate-y-1">
        {Icon && (
            <div className={`p-3 rounded-xl mb-3 ${iconBgClass}`}>
                <Icon className={`text-2xl ${colorClass}`} />
            </div>
        )}
        <span className="text-3xl font-extrabold text-slate-800">{value}</span>
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{label}</span>
    </div>
);

// --- 2. Advanced Stats Components ---

const QuestionStatsPanel = ({ metrics }) => {
    if (!metrics) return null;

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
        <div className="bg-white shadow-sm rounded-lg border border-slate-200 p-3">
            <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FaChartBar className="text-slate-500" /> Question Stats
            </h3>
            <div className="grid grid-cols-[auto,1fr,1fr,1fr] gap-x-3 items-center">
                {/* Headers */}
                <HeaderCell />
                <HeaderCell>YOU</HeaderCell>
                <HeaderCell>TOPPERS</HeaderCell>
                <HeaderCell>AVG</HeaderCell>

                {/* Time Row */}
                <LabelCell icon={<FaStopwatch />} >Time</LabelCell>
                <MetricCell className="font-bold text-blue-600">{formatTime(metrics.userTimeTaken)}</MetricCell>
                <MetricCell>{metrics.toppersAvailable ? formatTime(metrics.toppersTimeTaken) : '–'}</MetricCell>
                <MetricCell>{formatTime(metrics.overallTimeTaken)}</MetricCell>

                {/* Accuracy Row */}
                <LabelCell icon={<FaChartPie />} >Accuracy</LabelCell>
                <MetricCell className={`font-bold ${metrics.userCorrectnessStatus === 'Correct' ? 'text-emerald-600' : (metrics.userCorrectnessStatus === 'Incorrect' ? 'text-rose-600' : 'text-slate-400')}`}>{metrics.userCorrectnessStatus || '–'}</MetricCell>
                <MetricCell>{metrics.toppersAvailable ? formatPercent(metrics.toppersAccuracy) : '–'}</MetricCell>
                <MetricCell>{formatPercent(metrics.overallAccuracy)}</MetricCell>
                
                {/* Attempt Row */}
                <LabelCell icon={<FaCheckCircle />} >Attempt</LabelCell>
                <MetricCell className="font-bold text-blue-600">{metrics.userAttemptStatus}</MetricCell>
                <MetricCell>{metrics.toppersAvailable ? formatPercent(metrics.toppersAttemptPercent) : '–'}</MetricCell>
                <MetricCell>{formatPercent(metrics.overallAttemptPercent)}</MetricCell>
            </div>
            <div className="border-t border-slate-200 mt-3 pt-3 text-[10px] text-slate-400 flex items-start gap-2">
                <FaInfoCircle className="flex-shrink-0 mt-0.5" />
                <div>
                    {!metrics.toppersAvailable ? "Topper stats enabled after required no of participants." : "Stats updated in real-time."}
                </div>
            </div>
        </div>
    );
};

// --- 3. Leaderboard Component ---
const LeaderboardView = ({ leaderboardData, currentUserId }) => {
    const [displayData, setDisplayData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myRank, setMyRank] = useState(null);

    useEffect(() => {
        const processLeaderboard = async () => {
            if (!leaderboardData || leaderboardData.length === 0) {
                setLoading(false);
                return;
            }

            const sorted = [...leaderboardData].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
            const ranked = sorted.map((item, index) => ({ ...item, rank: index + 1 }));

            const userEntry = ranked.find(u => u.userId === currentUserId);
            setMyRank(userEntry ? userEntry.rank : null);

            let itemsToShow = ranked.slice(0, 10);
            
            if (myRank && myRank > 10) {
                const myEntry = ranked.find(u => u.userId === currentUserId);
                if (myEntry) itemsToShow.push(myEntry);
            }

            try {
                const userPromises = itemsToShow.map(attempt => attempt.userId ? getDoc(doc(db, "users", attempt.userId)) : Promise.resolve(null));
                const userSnapshots = await Promise.all(userPromises);
                const usersMap = {};
                userSnapshots.forEach(docSnap => {
                    if (docSnap && docSnap.exists()) {
                        usersMap[docSnap.id] = docSnap.data().displayName || 'Anonymous';
                    }
                });

                const enrichedData = itemsToShow.map(item => ({
                    ...item,
                    displayName: usersMap[item.userId] || item.displayName || item.name || item.userName || 'Anonymous'
                }));

                setDisplayData(enrichedData);
            } catch (error) {
                console.error("Error fetching leaderboard names:", error);
                setDisplayData(itemsToShow.map(item => ({ ...item, displayName: item.displayName || item.name || 'Anonymous' })));
            } finally {
                setLoading(false);
            }
        };

        processLeaderboard();
    }, [leaderboardData, currentUserId]);

    if (loading) return <div className="p-12 text-center text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-200">Loading Leaderboard...</div>;
    if (!displayData || displayData.length === 0) return <div className="p-12 text-center text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-200">No attempts recorded yet.</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden animate-fade-in-up">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                        <FaTrophy className="text-xl" />
                    </div>
                    <h3 className="text-lg md:text-xl font-extrabold text-slate-800">Leaderboard</h3>
                </div>
                {myRank > 0 && (
                    <div className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-200">
                        Your Rank: #{myRank}
                    </div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-white text-xs uppercase font-extrabold text-slate-400 border-b border-slate-100 tracking-wider">
                        <tr>
                            <th className="px-4 md:px-6 py-4 w-16 md:w-20 text-center">Rank</th>
                            <th className="px-4 md:px-6 py-4">Student</th>
                            <th className="px-4 md:px-6 py-4 text-center">Time (Mins)</th>
                            <th className="px-4 md:px-6 py-4 text-right">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 text-sm">
                        {displayData.map((user) => {
                            let totalTime = 0;
                            if (user.timeTaken) {
                                try {
                                    Object.values(user.timeTaken).forEach(section => {
                                        if (typeof section === 'object') {
                                            Object.values(section).forEach(t => totalTime += (Number(t) || 0));
                                        }
                                    });
                                } catch (e) { console.warn(e); }
                            }
                            const timeMins = Math.round(totalTime / 60);

                            return (
                                <tr key={user.userId} className={`hover:bg-slate-50 transition-colors ${user.userId === currentUserId ? 'bg-blue-50/50 hover:bg-blue-50/80' : ''}`}>
                                    <td className="px-4 md:px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                            user.rank === 1 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200' : 
                                            user.rank === 2 ? 'bg-slate-100 text-slate-700 ring-2 ring-slate-200' : 
                                            user.rank === 3 ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-200' : 'text-slate-500 bg-slate-50'
                                        }`}>
                                            {user.rank}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 font-bold text-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden uppercase shrink-0">
                                                {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover"/> : user.displayName.charAt(0)}
                                            </div>
                                            <span className="truncate max-w-[150px] md:max-w-none">{user.displayName}</span>
                                            {user.userId === currentUserId && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">You</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-center font-mono text-slate-500 font-medium">{timeMins}m</td>
                                    <td className="px-4 md:px-6 py-4 text-right font-extrabold text-slate-800">{user.totalScore?.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- 4. Question Palette ---

const QuestionPalette = ({ test, answers, currentQuestion, onNavigate, onClose, stats, isRevealed }) => {
    const [selectedSectionIdx, setSelectedSectionIdx] = useState(currentQuestion.secIdx);

    useEffect(() => {
        setSelectedSectionIdx(currentQuestion.secIdx);
    }, [currentQuestion.secIdx]);

    const activeSection = test.sections[selectedSectionIdx];

    return (
        <div className="flex flex-col h-full bg-slate-50 md:border-l border-slate-200 w-full md:w-80 flex-shrink-0 z-20">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-base">
                    <FaTh className="text-slate-400" /> Palette
                </h3>
                {onClose && <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-800 transition-colors bg-slate-100 p-2 rounded-full"><FaTimes /></button>}
            </div>
            
            <div className="px-5 pt-5 pb-3">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Section</label>
                <div className="relative">
                    <select 
                        value={selectedSectionIdx} 
                        onChange={(e) => setSelectedSectionIdx(parseInt(e.target.value))}
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-10 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm shadow-sm transition-all hover:border-slate-300 cursor-pointer"
                    >
                        {test.sections.map((sec, idx) => (
                            <option key={idx} value={idx}>{sec.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                        <FaChevronDown className="text-xs" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pt-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-300">
                <div className="grid grid-cols-5 gap-2.5 content-start">
                    {activeSection?.questions.map((q, qIdx) => {
                        const answer = answers[selectedSectionIdx]?.[qIdx];
                        const isAttempted = answer !== undefined && answer !== null && answer !== '';
                        let statusClass = "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"; 
                        
                        if (isAttempted) {
                            const isCorrect = q.type === 'TITA'
                                ? String(answer).trim().toLowerCase() === String(q.correctOption).trim().toLowerCase()
                                : parseInt(answer) === parseInt(q.correctOption);
                            statusClass = isCorrect 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500" 
                                : "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500";
                        }

                        const isActive = currentQuestion.secIdx === selectedSectionIdx && currentQuestion.qIdx === qIdx;
                        
                        return (
                            <button
                                key={qIdx}
                                onClick={() => onNavigate(selectedSectionIdx, qIdx)}
                                className={`h-11 w-11 rounded-xl text-sm font-bold border transition-all shadow-sm flex items-center justify-center
                                    ${statusClass} 
                                    ${isActive ? '!ring-2 !ring-blue-600 ring-offset-2 z-10 scale-105 shadow-md' : ''}`}
                            >
                                {qIdx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>
            
            <div className="p-5 border-t border-slate-200 bg-white">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full border border-emerald-600/20"></div> Correct</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-full border border-rose-600/20"></div> Wrong</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div> Skipped</div>
                </div>
                {stats ? (
                    <QuestionStatsPanel metrics={stats} />
                ) : (
                    <div className="p-4 text-center text-xs font-medium text-slate-400 bg-slate-50 rounded-xl border border-slate-100">Loading Stats...</div>
                )}
            </div>
        </div>
    );
};

// --- 5. Main Analysis View (Deep Dive) ---

const AnswerOption = ({ 
    label, text, isSelected, isCorrectOption, percentage, isToppersChoice, isRevealed 
}) => {
    let containerClass = "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300";
    let icon = null;
    let labelClass = "text-slate-500 border-slate-200 bg-slate-50";

    if (!isRevealed) {
        if (isSelected) {
            containerClass = "bg-blue-50/50 border-blue-300 ring-1 ring-blue-500";
            labelClass = "text-blue-700 border-blue-300 bg-blue-100";
            icon = <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>; 
        }
    } else {
        if (isSelected && isCorrectOption) {
            containerClass = "bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-500";
            labelClass = "text-emerald-700 border-emerald-400 bg-emerald-100";
            icon = <FaCheck className="text-emerald-600 text-sm" />;
        } else if (isSelected && !isCorrectOption) {
            containerClass = "bg-rose-50/80 border-rose-300 ring-1 ring-rose-500";
            labelClass = "text-rose-700 border-rose-300 bg-rose-100";
            icon = <FaTimes className="text-rose-600 text-sm" />;
        } else if (!isSelected && isCorrectOption) {
            containerClass = "bg-emerald-50/40 border-emerald-400 border-dashed";
            labelClass = "text-emerald-700 border-emerald-400 bg-emerald-100";
            icon = <FaCheck className="text-emerald-600 text-sm opacity-60" />;
        }
    }

    return (
        <div className={`relative flex flex-col p-0 border rounded-2xl transition-all mb-3 overflow-hidden shadow-sm ${containerClass}`}>
            {isRevealed && percentage > 0 && (
                <div 
                    className={`absolute top-0 left-0 h-full opacity-10 transition-all duration-1000 ease-out rounded-l-2xl ${isCorrectOption ? 'bg-emerald-500' : (isSelected ? 'bg-rose-500' : 'bg-slate-400')}`}
                    style={{ width: `${percentage}%` }}
                />
            )}
            
            <div className="relative z-10 flex items-center p-4">
                <div className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-xl border mr-4 shadow-sm ${labelClass}`}>
                    {icon || <span className="text-xs font-extrabold">{label}</span>}
                </div>
                <span className={`text-[15px] text-slate-800 flex-1 leading-relaxed ${isRevealed && (isSelected || isCorrectOption) ? 'font-bold' : 'font-medium'}`}>{text}</span>
                
                {isRevealed && (
                    <div className="flex flex-col items-end ml-4 gap-1.5">
                        {percentage > 0 && <span className="text-xs font-extrabold text-slate-500">{percentage}%</span>}
                        {isToppersChoice && !isCorrectOption && (
                            <div className="flex items-center text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                 <FaStar className="mr-1 text-amber-500" /> Top Choice
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const AnalysisView = ({ test, attempt, allAttempts, onBack, toggleFullscreen, isFullscreen, onDashboard }) => {
    const [currentQuestion, setCurrentQuestion] = useState({ secIdx: 0, qIdx: 0 });
    const [mobileView, setMobileView] = useState('question');
    const [stats, setStats] = useState(null);
    const [showCorrectAnswerHighlight, setShowCorrectAnswerHighlight] = useState(false); 

    const { secIdx, qIdx } = currentQuestion;
    const activeSection = test.sections[secIdx];
    const activeQuestion = activeSection.questions[qIdx];
    const userAnswer = attempt.answers?.[secIdx]?.[qIdx];
    const answers = attempt.answers || {};

    const hasPassage = Boolean(activeQuestion.passage || (activeQuestion.passageImageUrls && activeQuestion.passageImageUrls.length > 0));

    useEffect(() => {
        if (!hasPassage && mobileView === 'passage') {
            setMobileView('question');
        }
    }, [hasPassage, mobileView]);

    useEffect(() => {
        setShowCorrectAnswerHighlight(false);
    }, [currentQuestion]);

    // Analytics processing
    useEffect(() => {
        if (!allAttempts || allAttempts.length === 0) return;

        const MIN_ATTEMPTS_FOR_TOPPERS = 15;
        const optionCounts = {};
        
        const attemptsWithThisQ = allAttempts.filter(a => a.answers?.[secIdx]?.[qIdx] !== undefined && a.answers?.[secIdx]?.[qIdx] !== '');
        const totalAttemptedQ = attemptsWithThisQ.length;
        
        attemptsWithThisQ.forEach(att => {
            const ans = att.answers?.[secIdx]?.[qIdx];
            optionCounts[ans] = (optionCounts[ans] || 0) + 1;
        });

        const optionPercentages = {};
        if (activeQuestion.type !== 'TITA') {
            activeQuestion.options.forEach((_, idx) => {
                optionPercentages[idx] = totalAttemptedQ > 0 ? Math.round(((optionCounts[idx] || 0) / totalAttemptedQ) * 100) : 0;
            });
        }

        const sortedAttempts = [...allAttempts].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        
        const toppersAvailable = allAttempts.length >= MIN_ATTEMPTS_FOR_TOPPERS;
        let topperStats = { time: 0, accuracy: 0, attemptPercent: 0, mostCommonAnswer: null };

        if (toppersAvailable) {
            const toppersCount = Math.ceil(sortedAttempts.length * 0.1);
            const toppersGroup = sortedAttempts.slice(0, toppersCount);
            
            const groupAttempted = toppersGroup.filter(a => a.answers?.[secIdx]?.[qIdx] !== undefined && a.answers?.[secIdx]?.[qIdx] !== '');
            const attemptCount = groupAttempted.length;
            
            if (attemptCount > 0) {
                 const totalTime = groupAttempted.reduce((acc, a) => acc + (a.timeTaken?.[secIdx]?.[qIdx] || 0), 0);
                 const correctCount = groupAttempted.filter(a => {
                    const ans = a.answers?.[secIdx]?.[qIdx];
                    return activeQuestion.type === 'TITA' 
                        ? String(ans).toLowerCase() === String(activeQuestion.correctOption).toLowerCase()
                        : parseInt(ans) === parseInt(activeQuestion.correctOption);
                 }).length;

                 const groupCounts = {};
                 groupAttempted.forEach(a => {
                    const ans = a.answers?.[secIdx]?.[qIdx];
                    groupCounts[ans] = (groupCounts[ans] || 0) + 1;
                 });
                 
                 const mostCommon = Object.keys(groupCounts).length > 0 
                    ? parseInt(Object.entries(groupCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]) 
                    : null;
                 
                 topperStats = {
                    time: totalTime / attemptCount,
                    accuracy: (correctCount / attemptCount) * 100,
                    attemptPercent: (attemptCount / toppersGroup.length) * 100,
                    mostCommonAnswer: mostCommon
                 };
            }
        }
        
        const correctAttemptedCount = attemptsWithThisQ.filter(a => {
            const ans = a.answers?.[secIdx]?.[qIdx];
            return activeQuestion.type === 'TITA' 
                ? String(ans).toLowerCase() === String(activeQuestion.correctOption).toLowerCase()
                : parseInt(ans) === parseInt(activeQuestion.correctOption);
        }).length;
        
        const overallAccuracy = totalAttemptedQ > 0 ? (correctAttemptedCount / totalAttemptedQ) * 100 : 0;
        const overallTime = totalAttemptedQ > 0 ? attemptsWithThisQ.reduce((sum, a) => sum + (a.timeTaken?.[secIdx]?.[qIdx] || 0), 0) / totalAttemptedQ : 0;
        const overallAttemptPercent = (totalAttemptedQ / allAttempts.length) * 100;

        let difficulty = 'Medium';
        if (overallAccuracy >= 75) difficulty = 'Easy';
        if (overallAccuracy < 40) difficulty = 'Hard';

        const userTime = attempt.timeTaken?.[secIdx]?.[qIdx] || 0;
        const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
        const isUserCorrect = activeQuestion.type === 'TITA' 
            ? String(userAnswer).toLowerCase() === String(activeQuestion.correctOption).toLowerCase()
            : parseInt(userAnswer) === parseInt(activeQuestion.correctOption);

        setStats({
            optionPercentages,
            topperStats,
            toppersAvailable,
            userTimeTaken: userTime,
            userCorrectnessStatus: isAttempted ? (isUserCorrect ? 'Correct' : 'Incorrect') : null,
            userAttemptStatus: isAttempted ? 'Attempted' : 'Unattempted',
            toppersTimeTaken: topperStats.time,
            toppersAccuracy: topperStats.accuracy,
            toppersAttemptPercent: topperStats.attemptPercent,
            overallTimeTaken: overallTime,
            overallAccuracy: overallAccuracy,
            overallAttemptPercent: overallAttemptPercent,
            difficulty,
            toppersChoice: topperStats.mostCommonAnswer
        });

    }, [currentQuestion, allAttempts, activeQuestion, attempt]);


    const isTita = activeQuestion.type === 'TITA';
    let statusText = 'Unattempted';
    let statusColor = 'text-slate-500 bg-slate-100 border-slate-200';

    if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
        const isCorrect = isTita 
            ? String(userAnswer).trim().toLowerCase() === String(activeQuestion.correctOption).trim().toLowerCase()
            : parseInt(userAnswer) === parseInt(activeQuestion.correctOption);
        
        statusText = isCorrect ? 'Correct' : 'Incorrect';
        statusColor = isCorrect ? 'text-emerald-700 bg-emerald-50 border-emerald-300' : 'text-rose-700 bg-rose-50 border-rose-300';
    }

    const navigateTo = (secIdx, qIdx) => {
        setCurrentQuestion({ secIdx, qIdx });
        setMobileView('question');
    };

    const handleNext = () => {
        const nextQ = currentQuestion.qIdx + 1;
        if (nextQ < activeSection.questions.length) {
            navigateTo(currentQuestion.secIdx, nextQ);
        } else if (currentQuestion.secIdx + 1 < test.sections.length) {
            navigateTo(currentQuestion.secIdx + 1, 0);
        }
    };

    const handlePrev = () => {
        const prevQ = currentQuestion.qIdx - 1;
        if (prevQ >= 0) {
            navigateTo(currentQuestion.secIdx, prevQ);
        } else if (currentQuestion.secIdx > 0) {
            const prevSecIdx = currentQuestion.secIdx - 1;
            navigateTo(prevSecIdx, test.sections[prevSecIdx].questions.length - 1);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-30">
                <div className="flex items-center gap-5">
                    <button onClick={onBack} className="text-slate-500 hover:text-blue-600 font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors text-sm">
                        <FaArrowLeft /> <span className="hidden sm:inline">Summary</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[150px] sm:max-w-none">
                        {test.sections.map((sec, idx) => (
                            <button
                                key={idx}
                                onClick={() => navigateTo(idx, 0)}
                                className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap font-bold transition-all ${currentQuestion.secIdx === idx ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                            >
                                {sec.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleFullscreen}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <FaCompress className="text-lg"/> : <FaExpand className="text-lg"/>}
                    </button>
                    <button 
                        onClick={onDashboard}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                        <FaTimes /> Exit
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* 1. Passage Panel */}
                {hasPassage && (
                    <div className={`
                        bg-white p-6 lg:p-10 overflow-y-auto border-r border-slate-200 shadow-sm
                        ${mobileView === 'passage' ? 'flex flex-col flex-1' : 'hidden md:flex'}
                        ${hasPassage ? 'md:w-5/12 shrink-0' : ''} 
                    `}>
                        {activeQuestion.passage && <div className="prose prose-slate prose-p:leading-loose max-w-none text-slate-700 whitespace-pre-wrap mb-8 font-medium">{activeQuestion.passage}</div>}
                        {activeQuestion.passageImageUrls?.map((url, i) => (
                            <img key={i} src={url} alt={`Passage ${i}`} className="rounded-xl max-w-full mt-4 border border-slate-200 shadow-sm"/>
                        ))}
                    </div>
                )}

                {/* 2. Question Panel */}
                <div className={`
                    bg-slate-50/50 p-4 md:p-8 overflow-y-auto
                    ${mobileView === 'question' ? 'flex flex-col flex-1' : 'hidden md:flex'}
                    ${hasPassage ? 'md:flex-1' : 'w-full'} 
                `}>
                    <div className="max-w-4xl mx-auto w-full">
                        
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 md:p-8 mb-8">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 px-3 py-1.5 rounded-lg">
                                        <span className="text-sm font-extrabold text-slate-600 uppercase tracking-wider">Q. {currentQuestion.qIdx + 1}</span>
                                    </div>
                                    {stats?.difficulty && showCorrectAnswerHighlight && (
                                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider border
                                            ${stats.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                              stats.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                              'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                            {stats.difficulty}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColor}`}>
                                        {statusText}
                                    </span>
                                    <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider">{activeQuestion.type}</span>
                                </div>
                            </div>
                            
                            <p className="text-lg md:text-xl text-slate-800 whitespace-pre-wrap mb-8 leading-relaxed font-semibold">{activeQuestion.questionText}</p>
                            
                            {activeQuestion.questionImageUrls?.map((url, i) => (
                                <img key={i} src={url} alt={`Question ${i}`} className="mb-8 rounded-xl max-w-full border border-slate-200 shadow-sm"/>
                            ))}

                            <div className="space-y-3">
                                {activeQuestion.type === 'TITA' ? (
                                    <div className="grid gap-4">
                                        <div className={`p-5 rounded-2xl border ${userAnswer ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Your Answer</span>
                                            <span className="font-mono text-xl font-bold text-slate-800">{userAnswer || '(No Answer)'}</span>
                                        </div>
                                        {showCorrectAnswerHighlight && (
                                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200">
                                                <span className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest block mb-2">Correct Answer</span>
                                                <span className="font-mono text-xl font-bold text-emerald-700">{activeQuestion.correctOption}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    activeQuestion.options.map((opt, idx) => (
                                        <AnswerOption 
                                            key={idx}
                                            label={String.fromCharCode(65 + idx)}
                                            text={opt}
                                            isSelected={userAnswer === idx}
                                            isCorrectOption={idx === parseInt(activeQuestion.correctOption)}
                                            percentage={stats?.optionPercentages?.[idx]}
                                            isToppersChoice={stats?.toppersChoice === idx}
                                            isRevealed={showCorrectAnswerHighlight}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Analysis Footer */}
                        <div className="mb-12">
                            {!showCorrectAnswerHighlight ? (
                                <Button onClick={() => setShowCorrectAnswerHighlight(true)} className="w-full bg-slate-800 text-white hover:bg-slate-700 py-4 text-base shadow-lg shadow-slate-200 rounded-2xl">
                                    <FaEye className="mr-2 text-lg" /> Reveal Solution & Analysis
                                </Button>
                            ) : (
                                <div className="animate-fade-in-up">
                                    <AnimatePresence>
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            exit={{ opacity: 0, y: 10 }}
                                            className="p-6 md:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm mb-8"
                                        >
                                            <h4 className="font-extrabold text-slate-800 mb-6 flex items-center gap-3 text-lg">
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FaFilter /></div> 
                                                Solution Explanation
                                            </h4>
                                            <div className="text-slate-600 whitespace-pre-wrap leading-relaxed prose prose-slate prose-p:leading-loose max-w-none font-medium">{activeQuestion.solution}</div>
                                            
                                            {activeQuestion.solutionImageUrls?.map((url, i) => (
                                                <img key={i} src={url} alt={`Solution ${i}`} className="mt-6 rounded-xl max-w-full border border-slate-200 shadow-sm"/>
                                            ))}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Palette Panel */}
                <div className={`
                    bg-white border-l border-slate-200 shadow-xl
                    ${mobileView === 'palette' ? 'flex flex-col w-full' : 'hidden md:flex md:w-80'}
                `}>
                     <QuestionPalette 
                        test={test} 
                        answers={answers} 
                        currentQuestion={currentQuestion} 
                        onNavigate={navigateTo} 
                        onClose={() => setMobileView('question')}
                        stats={stats}
                        isRevealed={showCorrectAnswerHighlight}
                    />
                </div>
            </div>

            {/* Desktop Bottom Bar */}
            <div className="hidden md:flex bg-white border-t border-slate-200 p-4 justify-between items-center z-30">
                <Button onClick={handlePrev} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700">
                    <FaChevronLeft className="text-xs" /> Previous
                </Button>
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Question <span className="text-slate-800 mx-1">{currentQuestion.qIdx + 1}</span> of {activeSection.questions.length}
                </div>
                <Button onClick={handleNext} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20">
                    Next <FaChevronRight className="text-xs" />
                </Button>
            </div>

             {/* Mobile Sticky Footer */}
             <div className="md:hidden flex flex-col z-50 bg-white">
                <div className="flex justify-between items-center p-3 border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                    <Button onClick={handlePrev} className="bg-slate-100 text-slate-700 py-3 px-5 rounded-xl"><FaChevronLeft /></Button>
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Q {currentQuestion.qIdx + 1}</span>
                    <Button onClick={handleNext} className="bg-blue-600 text-white py-3 px-5 rounded-xl shadow-md shadow-blue-500/20"><FaChevronRight /></Button>
                </div>
                <div className="flex bg-slate-50 border-t border-slate-200 text-slate-500">
                    {hasPassage && (
                        <button 
                            onClick={() => setMobileView('passage')} 
                            className={`flex-1 py-3 text-[10px] font-extrabold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-colors ${mobileView === 'passage' ? 'text-blue-600 bg-blue-50/50' : 'hover:bg-slate-100'}`}
                        >
                            <FaBookOpen className="text-lg" /> Passage
                        </button>
                    )}
                    <button 
                        onClick={() => setMobileView('question')} 
                        className={`flex-1 py-3 text-[10px] font-extrabold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-colors ${mobileView === 'question' ? 'text-blue-600 bg-blue-50/50' : 'hover:bg-slate-100'}`}
                    >
                        <FaQuestionCircle className="text-lg"/> Question
                    </button>
                    <button 
                        onClick={() => setMobileView('palette')} 
                        className={`flex-1 py-3 text-[10px] font-extrabold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-colors ${mobileView === 'palette' ? 'text-blue-600 bg-blue-50/50' : 'hover:bg-slate-100'}`}
                    >
                        <FaTh className="text-lg"/> Palette
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 6. Main ResultAnalysis Component ---

const ResultAnalysis = ({ navigate, attemptId }) => {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState(null);
    const [test, setTest] = useState(null);
    const [allAttempts, setAllAttempts] = useState([]);
    const [activeTab, setActiveTab] = useState('summary'); 
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const analysisContainerRef = useRef(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            analysisContainerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!attemptId) { navigate('home'); return; }
            setLoading(true);
            try {
                const attemptRef = doc(db, 'attempts', attemptId);
                const attemptDoc = await getDoc(attemptRef);
                if (!attemptDoc.exists()) throw new Error("Attempt not found");
                const attemptData = attemptDoc.data();
                setAttempt(attemptData);

                const testRef = doc(db, 'tests', attemptData.testId);
                const testDoc = await getDoc(testRef);
                if (!testDoc.exists()) throw new Error("Test not found");
                const testData = { id: testDoc.id, ...testDoc.data() };
                setTest(testData);

                const allAttemptsQuery = query(
                    collection(db, 'attempts'),
                    where('testId', '==', attemptData.testId),
                    where('status', '==', 'completed')
                );
                const allAttemptsSnap = await getDocs(allAttemptsQuery);
                const allAttemptsData = allAttemptsSnap.docs.map(d => d.data());
                setAllAttempts(allAttemptsData);

            } catch (error) {
                console.error("Error loading results:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [attemptId, navigate]);

    const analysisData = useMemo(() => {
        if (!test || !attempt) return null;
        let totalQuestions = 0, totalAttempted = 0, totalCorrect = 0, totalIncorrect = 0, totalScore = 0, totalTime = 0;
        
        const sectionWise = test.sections.map((section, secIdx) => {
            let secCorrect = 0, secIncorrect = 0, secAttempted = 0, secScore = 0, secTime = 0;
            section.questions.forEach((q, qIdx) => {
                const answer = attempt.answers?.[secIdx]?.[qIdx];
                const time = attempt.timeTaken?.[secIdx]?.[qIdx] || 0;
                secTime += time;
                if (answer !== undefined && answer !== null && answer !== '') {
                    secAttempted++;
                    const isCorrect = q.type === 'TITA' 
                        ? String(answer).trim().toLowerCase() === String(q.correctOption).trim().toLowerCase()
                        : parseInt(answer) === parseInt(q.correctOption);
                    if (isCorrect) secCorrect++; else secIncorrect++;
                }
            });
            
            const scheme = test.markingScheme || { marksForCorrect: 3, negativeMarksMCQ: 1, negativeMarksTITA: 0 };
            const hasNegative = !scheme.sectionsWithNoNegativeMarking?.includes(section.name);
            let raw = secCorrect * (scheme.marksForCorrect || 3);
            if(hasNegative) raw -= (secIncorrect * (scheme.negativeMarksMCQ || 1));
            secScore = raw;
            totalQuestions += section.questions.length; totalAttempted += secAttempted; totalCorrect += secCorrect; 
            totalIncorrect += secIncorrect; totalTime += secTime; totalScore += secScore;

            return { name: section.name, score: parseFloat(secScore.toFixed(2)), accuracy: secAttempted > 0 ? ((secCorrect / secAttempted) * 100).toFixed(1) : 0, correct: secCorrect, incorrect: secIncorrect, attempted: secAttempted, questions: section.questions.length };
        });

        const overallAccuracy = totalAttempted > 0 ? ((totalCorrect / totalAttempted) * 100).toFixed(1) : 0;
        return { totalQuestions, totalAttempted, totalCorrect, totalIncorrect, totalScore: parseFloat(totalScore.toFixed(2)), overallAccuracy, totalTime, sectionWise };
    }, [attempt, test]);

    useEffect(() => {
        const backfill = async () => {
            if (attempt && !attempt.hasOwnProperty('totalScore') && attemptId && analysisData) {
                try {
                    await updateDoc(doc(db, 'attempts', attemptId), { totalScore: analysisData.totalScore });
                } catch (error) { console.error(error); }
            }
        };
        backfill();
    }, [attempt, attemptId, analysisData]);

    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (!attempt || !test) return <div className="text-center text-rose-500 p-8 font-semibold">Could not load analysis data.</div>;
    
    return (
        <div ref={analysisContainerRef} className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
            {activeTab !== 'analysis' && (
                <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16 md:h-20">
                            <h1 className="text-lg md:text-xl font-extrabold text-slate-800 truncate pr-4 hidden sm:block">{test.title} Analysis</h1>
                            <div className="flex space-x-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
                                <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Summary</button>
                                <button onClick={() => setActiveTab('leaderboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Leaderboard</button>
                            </div>
                            <button onClick={() => navigate('home')} className="ml-4 text-sm font-bold text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
                                <FaTimes /> Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col">
                {activeTab === 'analysis' ? (
                    <AnalysisView 
                        test={test} 
                        attempt={attempt}
                        allAttempts={allAttempts}
                        onBack={() => setActiveTab('summary')}
                        toggleFullscreen={toggleFullscreen}
                        isFullscreen={isFullscreen}
                        onDashboard={() => navigate('home')}
                    />
                ) : activeTab === 'leaderboard' ? (
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 w-full animate-fade-in-up">
                        <LeaderboardView leaderboardData={allAttempts} currentUserId={userData?.uid} />
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full animate-fade-in-up">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
                            <PerformanceMetric label="Total Score" value={analysisData.totalScore} colorClass="text-blue-600" iconBgClass="bg-blue-50" icon={FaTrophy} />
                            <PerformanceMetric label="Accuracy" value={`${analysisData.overallAccuracy}%`} colorClass="text-emerald-500" iconBgClass="bg-emerald-50" icon={FaChartPie} />
                            <PerformanceMetric label="Attempted" value={`${analysisData.totalAttempted}/${analysisData.totalQuestions}`} colorClass="text-violet-500" iconBgClass="bg-violet-50" icon={FaListOl} />
                            <PerformanceMetric label="Time Taken" value={`${Math.round(analysisData.totalTime / 60)} min`} colorClass="text-amber-500" iconBgClass="bg-amber-50" icon={FaClock} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/60 lg:col-span-2">
                                <h3 className="font-extrabold text-slate-800 mb-6 flex items-center text-lg gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><FaChartPie /></div> 
                                    Attempt Breakdown
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Correct', value: analysisData.totalCorrect, color: '#10b981' },
                                                    { name: 'Incorrect', value: analysisData.totalIncorrect, color: '#f43f5e' },
                                                    { name: 'Unattempted', value: analysisData.totalQuestions - analysisData.totalAttempted, color: '#e2e8f0' }
                                                ]}
                                                cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {[
                                                    { name: 'Correct', value: analysisData.totalCorrect, color: '#10b981' },
                                                    { name: 'Incorrect', value: analysisData.totalIncorrect, color: '#f43f5e' },
                                                    { name: 'Unattempted', value: analysisData.totalQuestions - analysisData.totalAttempted, color: '#e2e8f0' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-8 rounded-3xl shadow-lg text-white flex flex-col justify-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-extrabold mb-3 leading-tight">Deep Dive Analysis</h3>
                                    <p className="text-blue-100 text-sm mb-8 leading-relaxed font-medium">Review every question in detail. See solutions, check your time, and understand exactly where you can improve.</p>
                                    <Button 
                                        onClick={() => setActiveTab('analysis')}
                                        className="w-full bg-white text-blue-600 py-3.5 hover:bg-blue-50 shadow-xl shadow-blue-900/20"
                                    >
                                        <FaListOl className="text-lg" /> Start Question Analysis
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
                            <div className="p-6 md:p-8 border-b border-slate-100">
                                <h3 className="font-extrabold text-slate-800 text-lg">Sectional Performance</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-[11px] uppercase font-extrabold text-slate-400 tracking-wider border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">Section</th>
                                            <th className="px-6 py-4 text-center">Score</th>
                                            <th className="px-6 py-4 text-center">Accuracy</th>
                                            <th className="px-6 py-4 text-center">Attempts</th>
                                            <th className="px-6 py-4 text-center text-emerald-500">Correct</th>
                                            <th className="px-6 py-4 text-center text-rose-500">Wrong</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/80">
                                        {analysisData.sectionWise.map((section, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5 font-bold text-slate-800">{section.name}</td>
                                                <td className="px-6 py-5 text-center font-extrabold text-blue-600 text-base">{section.score}</td>
                                                <td className="px-6 py-5 text-center font-semibold">{section.accuracy}%</td>
                                                <td className="px-6 py-5 text-center font-medium">{section.attempted}/{section.questions}</td>
                                                <td className="px-6 py-5 text-center text-emerald-500 font-bold">{section.correct}</td>
                                                <td className="px-6 py-5 text-center text-rose-500 font-bold">{section.incorrect}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default ResultAnalysis;