import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { 
    FaCheck, FaTimes, FaArrowLeft, FaChevronLeft, FaChevronRight, 
    FaChartPie, FaListOl, FaTrophy, FaEye, FaTh, FaFilter, FaClock, FaChevronDown,
    FaBookOpen, FaQuestionCircle, FaExpand, FaCompress, FaChartBar, FaStar, FaLightbulb, 
    FaInfoCircle, FaStopwatch, FaCheckCircle
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- 1. UI Helper Components ---

const Button = ({ children, className = '', ...props }) => (
    <button {...props} className={`px-4 py-2 rounded-md font-semibold transition-all text-sm flex items-center justify-center gap-2 ${className}`}>
        {children}
    </button>
);

const PerformanceMetric = ({ label, value, color, subValue, icon: Icon }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center transition-transform hover:scale-105">
        {Icon && <Icon className={`text-3xl mb-2 ${color}`} />}
        <span className={`text-2xl md:text-3xl font-bold ${color}`}>{value}</span>
        <span className="text-sm text-slate-500 font-medium uppercase tracking-wider mt-1">{label}</span>
        {subValue && <span className="text-xs text-slate-400 mt-1">{subValue}</span>}
    </div>
);

// --- 2. Advanced Stats Components ---

const KeyInsightsCard = ({ insights }) => {
    if (!insights) return null;
    const { message, color } = insights;
    
    const colorStyles = {
        green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        red: 'bg-rose-50 text-rose-800 border-rose-200',
        yellow: 'bg-amber-50 text-amber-800 border-amber-200',
        gray: 'bg-slate-50 text-slate-800 border-slate-200'
    };
    
    const activeStyle = colorStyles[color] || colorStyles.gray;

    return (
        <div className={`p-4 rounded-lg border-l-4 ${activeStyle} mb-6`}>
            <p className="font-bold flex items-center mb-1 text-sm uppercase tracking-wide">
                <FaLightbulb className="mr-2"/> Key Insight
            </p>
            <p className="text-sm md:text-base leading-relaxed">{message}</p>
        </div>
    );
};

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

// --- 3. Leaderboard Component (Updated to Fetch Names) ---
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

            // 1. Sort & Rank (Locally first)
            const sorted = [...leaderboardData].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
            
            // Basic Ranking Logic
            const ranked = sorted.map((item, index) => {
                // If needed, handle ties here. For now, using simple index-based rank.
                return { ...item, rank: index + 1 };
            });

            // 2. Find Current User Rank (from the full list)
            const userEntry = ranked.find(u => u.userId === currentUserId);
            setMyRank(userEntry ? userEntry.rank : null);

            // 3. Prepare Display List (Top 10 + You)
            let itemsToShow = ranked.slice(0, 10); // Limit to Top 10
            
            // If current user exists and is NOT in the top 10, add them to the end
            if (myRank && myRank > 10) {
                const myEntry = ranked.find(u => u.userId === currentUserId);
                if (myEntry) {
                    itemsToShow.push(myEntry);
                }
            }

            // 4. Fetch Names from Users Collection
            try {
                const userPromises = itemsToShow.map(attempt => {
                    if (attempt.userId) {
                        return getDoc(doc(db, "users", attempt.userId));
                    }
                    return Promise.resolve(null);
                });

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
                // Fallback
                setDisplayData(itemsToShow.map(item => ({
                     ...item,
                     displayName: item.displayName || item.name || 'Anonymous'
                })));
            } finally {
                setLoading(false);
            }
        };

        processLeaderboard();
    }, [leaderboardData, currentUserId]);

    if (loading) return <div className="p-12 text-center text-slate-500 bg-white rounded-xl shadow-sm">Loading Leaderboard...</div>;
    if (!displayData || displayData.length === 0) return <div className="p-12 text-center text-slate-500 bg-white rounded-xl shadow-sm">No attempts recorded yet.</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <FaTrophy className="text-yellow-300 text-2xl" />
                    <h3 className="text-lg md:text-xl font-bold">Leaderboard</h3>
                </div>
                {myRank > 0 && (
                    <div className="bg-white/20 px-4 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                        Your Rank: #{myRank}
                    </div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-4 md:px-6 py-4 w-16 md:w-20 text-center">Rank</th>
                            <th className="px-4 md:px-6 py-4">Student</th>
                            <th className="px-4 md:px-6 py-4 text-center">Time (Mins)</th>
                            <th className="px-4 md:px-6 py-4 text-right">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
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
                                <tr key={user.userId} className={`hover:bg-slate-50 transition-colors ${user.userId === currentUserId ? 'bg-blue-50/60' : ''}`}>
                                    <td className="px-4 md:px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                            user.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                                            user.rank === 2 ? 'bg-gray-100 text-gray-700' : 
                                            user.rank === 3 ? 'bg-orange-100 text-orange-800' : 'text-slate-500'
                                        }`}>
                                            {user.rank}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 font-medium text-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden uppercase">
                                                {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover"/> : user.displayName.charAt(0)}
                                            </div>
                                            <span className="truncate max-w-[150px] md:max-w-none">{user.displayName}</span>
                                            {user.userId === currentUserId && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">You</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-center font-mono text-slate-500">{timeMins}m</td>
                                    <td className="px-4 md:px-6 py-4 text-right font-bold text-slate-800">{user.totalScore?.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- 4. Question Palette (With Stats at Bottom) ---

const QuestionPalette = ({ test, answers, currentQuestion, onNavigate, onClose, stats, isRevealed }) => {
    const [selectedSectionIdx, setSelectedSectionIdx] = useState(currentQuestion.secIdx);

    useEffect(() => {
        setSelectedSectionIdx(currentQuestion.secIdx);
    }, [currentQuestion.secIdx]);

    const activeSection = test.sections[selectedSectionIdx];

    return (
        <div className="flex flex-col h-full bg-white md:border-l border-slate-200 w-full md:w-80 flex-shrink-0 shadow-xl z-20">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-base"><FaTh /> Question Palette</h3>
                {onClose && <button onClick={onClose} className="md:hidden text-slate-500 hover:text-red-500 transition-colors"><FaTimes /></button>}
            </div>
            
            <div className="px-4 pt-4 pb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Select Section</label>
                <div className="relative">
                    <select 
                        value={selectedSectionIdx} 
                        onChange={(e) => setSelectedSectionIdx(parseInt(e.target.value))}
                        className="w-full appearance-none bg-slate-100 border border-slate-200 text-slate-700 py-2 px-3 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-sm"
                    >
                        {test.sections.map((sec, idx) => (
                            <option key={idx} value={idx}>{sec.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-600">
                        <FaChevronDown />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-300">
                <div className="grid grid-cols-5 gap-2 content-start">
                    {activeSection?.questions.map((q, qIdx) => {
                        const answer = answers[selectedSectionIdx]?.[qIdx];
                        const isAttempted = answer !== undefined && answer !== null && answer !== '';
                        let statusClass = "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"; 
                        
                        if (isAttempted) {
                            const isCorrect = q.type === 'TITA'
                                ? String(answer).trim().toLowerCase() === String(q.correctOption).trim().toLowerCase()
                                : parseInt(answer) === parseInt(q.correctOption);
                            statusClass = isCorrect 
                                ? "bg-emerald-100 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400" 
                                : "bg-rose-100 text-rose-700 border-rose-300 ring-1 ring-rose-400";
                        }

                        const isActive = currentQuestion.secIdx === selectedSectionIdx && currentQuestion.qIdx === qIdx;
                        
                        return (
                            <button
                                key={qIdx}
                                onClick={() => onNavigate(selectedSectionIdx, qIdx)}
                                className={`h-10 w-10 rounded-lg text-sm font-bold border transition-all shadow-sm ${statusClass} ${isActive ? 'ring-2 ring-blue-600 ring-offset-1 z-10 scale-110' : ''}`}
                            >
                                {qIdx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>
            {/* Legend */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div> Correct</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div> Wrong</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div> Skipped</div>
            </div>
            
            {/* Stats Panel moved here - Visible by default */}
            <div className="flex-shrink-0 bg-slate-50 border-t border-slate-200">
                {stats ? (
                    <div className="p-3">
                        <QuestionStatsPanel metrics={stats} />
                    </div>
                ) : (
                    <div className="p-3 text-center text-xs text-slate-400">Loading Stats...</div>
                )}
            </div>
        </div>
    );
};

// --- 5. Main Analysis View (Deep Dive) ---

const AnswerOption = ({ 
    label, 
    text, 
    isSelected, 
    isCorrectOption, 
    percentage, 
    isToppersChoice,
    isRevealed 
}) => {
    let containerClass = "border-slate-200 hover:bg-slate-50";
    let icon = null;
    let labelClass = "text-slate-500 border-slate-300";

    if (!isRevealed) {
        if (isSelected) {
            containerClass = "bg-blue-50 border-blue-400 ring-1 ring-blue-400";
            labelClass = "text-blue-600 border-blue-400 bg-blue-100";
            icon = <div className="w-3 h-3 rounded-full bg-blue-600"></div>; 
        }
    } else {
        if (isSelected && isCorrectOption) {
            containerClass = "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500";
            labelClass = "text-emerald-600 border-emerald-500";
            icon = <FaCheck className="text-emerald-600" />;
        } else if (isSelected && !isCorrectOption) {
            containerClass = "bg-rose-50 border-rose-500 ring-1 ring-rose-500";
            labelClass = "text-rose-600 border-rose-500";
            icon = <FaTimes className="text-rose-600" />;
        } else if (!isSelected && isCorrectOption) {
            containerClass = "bg-emerald-50/50 border-emerald-500 border-dashed";
            labelClass = "text-emerald-600 border-emerald-500";
            icon = <FaCheck className="text-emerald-600 opacity-50" />;
        }
    }

    return (
        <div className={`relative flex flex-col p-0 border rounded-lg transition-all mb-2 md:mb-3 overflow-hidden ${containerClass}`}>
            {isRevealed && (
                <div 
                    className={`absolute top-0 left-0 h-full opacity-10 transition-all duration-1000 ${isCorrectOption ? 'bg-emerald-500' : (isSelected ? 'bg-rose-500' : 'bg-slate-400')}`}
                    style={{ width: `${percentage}%`, opacity: 0.15 }}
                />
            )}
            
            {/* UPDATED: Reduced padding (p-3) and Text Size (text-sm md:text-base) */}
            <div className="relative z-10 flex items-center p-3 sm:p-4">
                <div className={`flex-shrink-0 h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-full border mr-3 bg-white ${labelClass}`}>
                    {icon || <span className="text-[10px] md:text-xs font-bold">{label}</span>}
                </div>
                <span className={`text-sm md:text-base text-slate-800 flex-1 leading-relaxed ${isSelected && !isRevealed ? 'font-medium' : ''} ${isRevealed && (isSelected || isCorrectOption) ? 'font-medium' : ''}`}>{text}</span>
                
                {isRevealed && (
                    <div className="flex flex-col items-end ml-2">
                        {percentage > 0 && <span className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">{percentage}%</span>}
                        {isToppersChoice && !isCorrectOption && (
                            <div className="flex items-center text-[9px] md:text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
                                 <FaStar className="mr-1" /> Top
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
    const [showSolution, setShowSolution] = useState(false);
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
        setShowSolution(false);
    }, [currentQuestion]);

    // --- Analytics Logic ---
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

        let insightMsg = { message: "Review this question carefully.", color: "gray" };
        if (!isAttempted) {
             if (difficulty === 'Easy') insightMsg = { message: "You skipped an 'Easy' question. Try to capitalize on these next time.", color: "yellow" };
             else if (difficulty === 'Hard') insightMsg = { message: "Skipping this 'Hard' question was likely a good strategic choice.", color: "yellow" };
             else insightMsg = { message: "You skipped this question.", color: "gray" };
        } else if (isUserCorrect) {
            const timeDiff = toppersAvailable ? userTime - topperStats.time : -1;
            if (timeDiff < 0) insightMsg = { message: "Great job! You answered faster than the toppers.", color: "green" };
            else insightMsg = { message: "Correct answer! Consistent accuracy builds high scores.", color: "green" };
        } else {
             insightMsg = { message: `Incorrect. This was a '${difficulty}' question. Review the solution below.`, color: "red" };
        }

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
            insight: insightMsg,
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
        statusColor = isCorrect ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200';
    } else {
        statusText = 'Unattempted';
        statusColor = 'text-slate-500 bg-slate-100 border-slate-200';
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
        <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors text-sm">
                        <FaArrowLeft /> <span className="hidden sm:inline">Summary</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[120px] sm:max-w-none">
                        {test.sections.map((sec, idx) => (
                            <button
                                key={idx}
                                onClick={() => navigateTo(idx, 0)}
                                className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-all ${currentQuestion.secIdx === idx ? 'bg-blue-600 text-white font-semibold shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {sec.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleFullscreen}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <FaCompress /> : <FaExpand />}
                    </button>
                    <button 
        onClick={onDashboard}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
    >
        <FaTimes /> Dashboard
    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* 1. Passage Panel */}
                {hasPassage && (
                    <div className={`
                        bg-white p-6 lg:p-8 overflow-y-auto border-r border-slate-200 border-b md:border-b-0 scrollbar-thin scrollbar-thumb-slate-300
                        ${mobileView === 'passage' ? 'flex flex-col flex-1' : 'hidden md:flex'}
                        ${hasPassage ? 'md:w-[45%] shrink-0' : ''} 
                    `}>
                        {activeQuestion.passage && <div className="prose prose-sm md:prose-lg max-w-none text-slate-800 whitespace-pre-wrap mb-6 leading-relaxed">{activeQuestion.passage}</div>}
        
        {activeQuestion.passageImageUrls?.map((url, i) => (
            <img key={i} src={url} alt={`Passage ${i}`} className="rounded-lg max-w-full mt-4 border border-slate-200 shadow-sm"/>
        ))}
                    </div>
                )}

                {/* 2. Question Panel */}
                <div className={`
                    bg-slate-50 p-4 md:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300
                    ${mobileView === 'question' ? 'flex flex-col flex-1' : 'hidden md:flex'}
                    ${hasPassage ? 'md:flex-1' : 'w-full'} 
                `}>
                    <div className="max-w-3xl mx-auto w-full">
                        
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Question {currentQuestion.qIdx + 1}</h3>
                                    {stats?.difficulty && showCorrectAnswerHighlight && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold 
                                            ${stats.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' : 
                                              stats.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800' : 
                                              'bg-rose-100 text-rose-800'}`}>
                                            {stats.difficulty}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${statusColor}`}>
                                        {statusText}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">{activeQuestion.type}</span>
                                </div>
                            </div>
                            
                            <p className="text-lg text-slate-900 whitespace-pre-wrap mb-8 leading-relaxed font-medium">{activeQuestion.questionText}</p>
                            
                            {activeQuestion.questionImageUrls?.map((url, i) => (
                                <img key={i} src={url} alt={`Question ${i}`} className="mb-6 rounded-lg max-w-full border border-gray-200 shadow-sm"/>
                            ))}

                            <div className="space-y-3">
                                {activeQuestion.type === 'TITA' ? (
                                    <div>
                                        <div className={`p-4 rounded-lg border mb-4 ${userAnswer ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className="text-sm text-slate-500 block mb-1">Your Answer:</span>
                                            <span className="font-mono text-lg font-bold text-slate-800">{userAnswer || '(No Answer)'}</span>
                                        </div>
                                        {showCorrectAnswerHighlight && (
                                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                                <span className="text-sm text-emerald-700 block mb-1">Correct Answer:</span>
                                                <span className="font-mono text-lg font-bold text-emerald-900">{activeQuestion.correctOption}</span>
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
                        <div className="mb-6">
                            {!showCorrectAnswerHighlight ? (
                                <Button onClick={() => setShowCorrectAnswerHighlight(true)} className="w-full bg-slate-800 text-white hover:bg-slate-700 py-3 text-base shadow-md">
                                    <FaEye className="mr-2" /> Reveal Answer & Explanation
                                </Button>
                            ) : (
                                <div className="animate-fade-in-up">
                                    {stats && <KeyInsightsCard insights={stats.insight} />}
                                    
                                    <AnimatePresence>
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            exit={{ opacity: 0, y: 10 }}
                                            className="p-6 bg-blue-50 rounded-xl border border-blue-100 shadow-inner mb-6"
                                        >
                                            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2 text-base"><FaFilter className="text-blue-500"/> Explanation</h4>
                                            <div className="text-blue-900 whitespace-pre-wrap leading-relaxed prose prose-blue max-w-none text-base">{activeQuestion.solution}</div>
                                            
                                            {activeQuestion.solutionImageUrls?.map((url, i) => (
                                                <img key={i} src={url} alt={`Solution ${i}`} className="mt-4 rounded-lg max-w-full border border-blue-200 shadow-sm"/>
                                            ))}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Palette Panel (Stats Visible at Bottom) */}
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
            <div className="hidden md:flex bg-white border-t border-slate-200 p-3 justify-between items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button onClick={handlePrev} className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-2 transition-colors">
                    <FaChevronLeft /> <span>Previous</span>
                </button>
                <div className="text-sm font-medium text-slate-500">
                    Question <span className="font-bold text-slate-800">{currentQuestion.qIdx + 1}</span> of {activeSection.questions.length}
                </div>
                <button onClick={handleNext} className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 transition-colors shadow-md shadow-blue-100">
                    <span>Next</span> <FaChevronRight />
                </button>
            </div>

             {/* Mobile Sticky Footer */}
             <div className="md:hidden flex flex-col z-50">
                <div className="flex justify-between items-center p-3 bg-white border-t border-slate-200">
                    <Button onClick={handlePrev} className="bg-slate-100 text-slate-800 text-sm py-2"><FaChevronLeft /></Button>
                    <span className="text-sm font-bold text-slate-500">Q {currentQuestion.qIdx + 1}</span>
                    <Button onClick={handleNext} className="bg-slate-800 text-white text-sm py-2"><FaChevronRight /></Button>
                </div>
                <div className="flex bg-slate-900 text-slate-300">
                    {hasPassage && (
                        <button 
                            onClick={() => setMobileView('passage')} 
                            className={`flex-1 py-3 text-xs font-bold uppercase flex flex-col items-center gap-1 ${mobileView === 'passage' ? 'bg-slate-800 text-white border-t-2 border-blue-500' : ''}`}
                        >
                            <FaBookOpen className="text-lg" /> Passage
                        </button>
                    )}
                    <button 
                        onClick={() => setMobileView('question')} 
                        className={`flex-1 py-3 text-xs font-bold uppercase flex flex-col items-center gap-1 ${mobileView === 'question' ? 'bg-slate-800 text-white border-t-2 border-blue-500' : ''}`}
                    >
                        <FaQuestionCircle className="text-lg"/> Question
                    </button>
                    <button 
                        onClick={() => setMobileView('palette')} 
                        className={`flex-1 py-3 text-xs font-bold uppercase flex flex-col items-center gap-1 ${mobileView === 'palette' ? 'bg-slate-800 text-white border-t-2 border-blue-500' : ''}`}
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
    if (!attempt || !test) return <div className="text-center text-rose-500 p-8">Could not load analysis data.</div>;
    
    return (
        <div ref={analysisContainerRef} className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col">
            {activeTab !== 'analysis' && (
                <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex justify-between items-center h-14 md:h-16">
                            <h1 className="text-lg font-bold text-slate-800 truncate pr-4 hidden sm:block">{test.title} Analysis</h1>
                            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => setActiveTab('summary')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Summary</button>
                                <button onClick={() => setActiveTab('leaderboard')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'leaderboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Leaderboard</button>
                            </div>
                            <button onClick={() => navigate('home')} className="ml-4 text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"><FaTimes /> Exit</button>
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
                    <div className="max-w-4xl mx-auto px-4 py-8 w-full animate-fade-in-up">
                        <LeaderboardView leaderboardData={allAttempts} currentUserId={userData?.uid} />
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto px-4 py-8 w-full animate-fade-in-up">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <PerformanceMetric label="Total Score" value={analysisData.totalScore} color="text-blue-600" icon={FaTrophy} />
                            <PerformanceMetric label="Accuracy" value={`${analysisData.overallAccuracy}%`} color="text-emerald-600" icon={FaChartPie} />
                            <PerformanceMetric label="Attempted" value={`${analysisData.totalAttempted}/${analysisData.totalQuestions}`} color="text-violet-600" icon={FaListOl} />
                            <PerformanceMetric label="Time Taken" value={`${Math.round(analysisData.totalTime / 60)} min`} color="text-slate-600" icon={FaClock} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
                                <h3 className="font-bold text-slate-700 mb-6 flex items-center text-base"><FaChartPie className="mr-2 text-slate-400 text-lg"/> Attempt Breakdown</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Correct', value: analysisData.totalCorrect, color: '#10b981' },
                                                    { name: 'Incorrect', value: analysisData.totalIncorrect, color: '#ef4444' },
                                                    { name: 'Unattempted', value: analysisData.totalQuestions - analysisData.totalAttempted, color: '#e2e8f0' }
                                                ]}
                                                cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Correct', value: analysisData.totalCorrect, color: '#10b981' },
                                                    { name: 'Incorrect', value: analysisData.totalIncorrect, color: '#ef4444' },
                                                    { name: 'Unattempted', value: analysisData.totalQuestions - analysisData.totalAttempted, color: '#e2e8f0' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg text-white flex flex-col justify-between transform transition-all hover:scale-[1.02]">
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Deep Dive Analysis</h3>
                                    <p className="text-blue-100 text-sm mb-6 leading-relaxed">Review every question in detail. See solutions, check your time, and understand where you can improve.</p>
                                </div>
                                <button 
                                    onClick={() => setActiveTab('analysis')}
                                    className="w-full bg-white text-blue-600 font-bold py-3 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-lg text-sm"
                                >
                                    <FaListOl className="text-lg mr-2" /> Start Question Analysis
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="font-bold text-slate-700 text-base">Sectional Performance</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4">Section</th>
                                            <th className="px-6 py-4 text-center">Score</th>
                                            <th className="px-6 py-4 text-center">Accuracy</th>
                                            <th className="px-6 py-4 text-center">Attempts</th>
                                            <th className="px-6 py-4 text-center text-green-600">Correct</th>
                                            <th className="px-6 py-4 text-center text-red-600">Wrong</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {analysisData.sectionWise.map((section, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-800">{section.name}</td>
                                                <td className="px-6 py-4 text-center font-bold text-blue-600">{section.score}</td>
                                                <td className="px-6 py-4 text-center">{section.accuracy}%</td>
                                                <td className="px-6 py-4 text-center">{section.attempted}/{section.questions}</td>
                                                <td className="px-6 py-4 text-center text-green-600 font-medium">{section.correct}</td>
                                                <td className="px-6 py-4 text-center text-red-500 font-medium">{section.incorrect}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultAnalysis;