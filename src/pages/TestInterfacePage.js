import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBook, FaTimes } from 'react-icons/fa';

// --- Helper Hook for reliable intervals ---
function useInterval(callback, delay) {
    const savedCallback = useRef();
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

// --- Offline Warning Modal ---
const OfflineModal = () => (
    <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-[100]" style={{ backdropFilter: 'blur(5px)' }}>
        <div className="text-center p-8 max-w-lg rounded-lg shadow-2xl bg-white">
            <svg className="mx-auto h-20 w-20 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-3xl font-bold text-gray-800">Connection Issue</h2>
            <p className="mt-2 text-gray-600">
                You appear to be offline. Don't worry, <strong className="font-semibold text-gray-700">your progress is being saved automatically</strong> to this device.
                The test will sync with our servers once you're back online.
            </p>
        </div>
    </div>
);

// --- Question Paper Modal Component ---
const QuestionPaperModal = ({ isOpen, onClose, section }) => {
    if (!section) return null;
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ y: '-100vh', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100vh', opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()} className="bg-gray-100 rounded-lg shadow-xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col">
                        <header className="flex items-center justify-between p-4 bg-white border-b sticky top-0">
                            <h2 className="text-lg font-bold text-gray-800">Question Paper: {section.name}</h2>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FaTimes size={24} /></button>
                        </header>
                        <div className="p-6 overflow-y-auto">
                            {section.questions.map((q, index) => (
                                <div key={index} className="mb-6 pb-6 border-b last:border-b-0">
                                    {(q.passage || q.passageImageUrl) && (
                                        <div className="mb-4 p-3 bg-gray-200 rounded">
                                            <h3 className="font-bold mb-2 text-gray-900">Directions for Question {index + 1}:</h3>
                                            {q.passageImageUrl && <img src={q.passageImageUrl} alt={`Passage for Q${index + 1}`} className="max-w-full h-auto mb-2 rounded"/>}
                                            {q.passage && <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">{q.passage}</div>}
                                        </div>
                                    )}
                                    <p className="font-semibold text-gray-900 mb-2">Question {index + 1}:</p>
                                    {q.questionImageUrl && <img src={q.questionImageUrl} alt={`Question ${index + 1}`} className="max-w-full h-auto mb-4 rounded"/>}
                                    <p className="text-gray-800 whitespace-pre-wrap mb-4">{q.questionText}</p>
                                    {q.type !== 'TITA' && q.options && (<div className="space-y-2 text-sm">{q.options.map((option, optIndex) => (<p key={optIndex} className="text-gray-600 ml-4">{String.fromCharCode(97 + optIndex)}) {option}</p>))}</div>)}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- UPDATED Calculator Component to match the reference image ---
const Calculator = ({ setIsCalculatorOpen }) => {
    const [currentValue, setCurrentValue] = useState('0');
    const [previousValue, setPreviousValue] = useState(null);
    const [operator, setOperator] = useState(null);
    const [expression, setExpression] = useState('');
    const [memory, setMemory] = useState(null);
    const [isNewEntry, setIsNewEntry] = useState(true);
    const calculatorRef = useRef(null);

    useEffect(() => {
        const el = calculatorRef.current;
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const dragMouseDown = (e) => { e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; };
        const elementDrag = (e) => { e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; el.style.top = (el.offsetTop - pos2) + "px"; el.style.left = (el.offsetLeft - pos1) + "px"; };
        const closeDragElement = () => { document.onmouseup = null; document.onmousemove = null; };
        const header = el.querySelector(".calculator-header");
        if(header) header.onmousedown = dragMouseDown;
    }, []);

    const clear = () => {
        setCurrentValue('0');
        setPreviousValue(null);
        setOperator(null);
        setExpression('');
        setIsNewEntry(true);
    };

    const handleNumber = (num) => {
        if (isNewEntry) {
            setCurrentValue(num);
            setIsNewEntry(false);
        } else {
            if (num === '.' && currentValue.includes('.')) return;
            setCurrentValue(prev => prev + num);
        }
    };

    const handleOperator = (op) => {
        if (operator && !isNewEntry) {
            const result = calculate(previousValue, currentValue, operator);
            setPreviousValue(result);
            setCurrentValue(result);
            setExpression(`${result} ${op}`);
        } else {
            setPreviousValue(currentValue);
            setExpression(`${currentValue} ${op}`);
        }
        setOperator(op);
        setIsNewEntry(true);
    };

    const calculate = (val1, val2, op) => {
        const prev = parseFloat(val1);
        const current = parseFloat(val2);
        if (isNaN(prev) || isNaN(current)) return 'Error';
        let result;
        switch (op) {
            case '+': result = prev + current; break;
            case '-': result = prev - current; break;
            case '*': result = prev * current; break;
            case '/': result = current === 0 ? 'Error' : prev / current; break;
            default: return current;
        }
        return String(result);
    };

    const handleEquals = () => {
        if (!operator || previousValue === null) return;
        const result = calculate(previousValue, currentValue, operator);
        setExpression(`${previousValue} ${operator} ${currentValue} =`);
        setCurrentValue(result);
        setPreviousValue(null);
        setOperator(null);
        setIsNewEntry(true);
    };

    const handleUnaryOperator = (op) => {
        const current = parseFloat(currentValue);
        if (isNaN(current)) return;
        let result;
        switch(op) {
            case '+/-': result = current * -1; break;
            case '√': result = current < 0 ? 'Error' : Math.sqrt(current); break;
            case '%': result = current / 100; break;
            case '1/x': result = current === 0 ? 'Error' : 1 / current; break;
            default: return;
        }
        setCurrentValue(String(result));
    };

    const handleMemory = (memOp) => {
        const current = parseFloat(currentValue);
        if (isNaN(current) && memOp !== 'MR' && memOp !== 'MC') return;
        
        switch (memOp) {
            case 'MC': setMemory(null); break;
            case 'MR': if (memory !== null) { setCurrentValue(String(memory)); setIsNewEntry(true); } break;
            case 'MS': setMemory(current); break;
            case 'M+': setMemory((memory || 0) + current); break;
            case 'M-': setMemory((memory || 0) - current); break;
            default: break;
        }
    };

    const handleBackspace = () => {
        if (isNewEntry) return;
        setCurrentValue(prev => prev.slice(0, -1) || '0');
    };

    const Button = ({ value, onClick, className, gridClass }) => (
        <button onClick={() => onClick(value)} className={`h-10 rounded shadow-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${className} ${gridClass}`}>
            {value}
        </button>
    );

    const buttonConfig = [
        { value: 'MC', type: 'mem', onClick: handleMemory, className: "bg-gray-300 hover:bg-gray-400" },
        { value: 'MR', type: 'mem', onClick: handleMemory, className: "bg-gray-300 hover:bg-gray-400" },
        { value: 'MS', type: 'mem', onClick: handleMemory, className: "bg-gray-300 hover:bg-gray-400" },
        { value: 'M+', type: 'mem', onClick: handleMemory, className: "bg-gray-300 hover:bg-gray-400" },
        { value: 'M-', type: 'mem', onClick: handleMemory, className: "bg-gray-300 hover:bg-gray-400" },
        { value: '←', type: 'op', onClick: handleBackspace, className: "bg-red-500 hover:bg-red-600 text-white" },
        { value: 'C', type: 'op', onClick: clear, className: "bg-red-500 hover:bg-red-600 text-white" },
        { value: '+/-', type: 'op', onClick: handleUnaryOperator, className: "bg-red-500 hover:bg-red-600 text-white" },
        { value: '√', type: 'op', onClick: handleUnaryOperator, className: "bg-gray-300 hover:bg-gray-400" },
        { value: '%', type: 'op', onClick: handleUnaryOperator, className: "bg-gray-300 hover:bg-gray-400" },
        { value: '7', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '8', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '9', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '/', type: 'op', onClick: handleOperator, className: "bg-gray-300 hover:bg-gray-400" },
        { value: '1/x', type: 'op', onClick: handleUnaryOperator, className: "bg-gray-300 hover:bg-gray-400" },
        { value: '4', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '5', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '6', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '*', type: 'op', onClick: handleOperator, className: "bg-gray-300 hover:bg-gray-400" },
        { value: '=', type: 'eq', onClick: handleEquals, className: "bg-green-500 hover:bg-green-600 text-white row-span-2 !h-auto" },
        { value: '1', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '2', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '3', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '-', type: 'op', onClick: handleOperator, className: "bg-gray-300 hover:bg-gray-400" },
        { value: '0', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg col-span-2" },
        { value: '.', type: 'num', onClick: handleNumber, className: "bg-gray-200 hover:bg-gray-300 font-bold text-lg" },
        { value: '+', type: 'op', onClick: handleOperator, className: "bg-gray-300 hover:bg-gray-400" },
    ];

    return (
        <div ref={calculatorRef} className="fixed top-1/4 left-1/4 w-80 bg-gray-100 border-2 border-gray-400 rounded-lg shadow-2xl z-50 select-none">
            <div className="calculator-header bg-blue-600 text-white p-2 flex justify-between items-center cursor-move">
                <span className="font-bold">Calculator</span>
                <button onClick={() => setIsCalculatorOpen(false)} className="font-bold">X</button>
            </div>
            <div className="p-4 space-y-2">
                <input type="text" value={expression} readOnly className="w-full p-1 text-right bg-gray-100 text-gray-500 text-sm h-6 truncate" />
                <input type="text" value={currentValue} readOnly className="w-full p-2 text-right bg-white rounded border border-gray-300 text-2xl font-semibold h-12" />
                <div className="grid grid-cols-5 gap-1">
                    {buttonConfig.map(btn => <Button key={btn.value} {...btn} />)}
                </div>
            </div>
        </div>
    );
};

// --- Onscreen Number Pad Component ---
const NumberPad = ({ onNumberClick }) => {
    const handleButtonClick = (num) => { onNumberClick(num); };
    return (
        <div className="mt-4 p-2 bg-gray-100 rounded-lg shadow-md w-48 mx-auto">
            <div className="grid grid-cols-3 gap-1">
                <button onClick={() => handleButtonClick('backspace')} className="col-span-3 bg-gray-300 p-2 rounded-md shadow text-base font-bold hover:bg-gray-400 transition-colors">Backspace</button>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (<button key={num} onClick={() => handleButtonClick(num)} className="bg-white p-2 rounded-md shadow text-base font-bold hover:bg-gray-200 transition-colors">{num}</button>))}
                <button onClick={() => handleButtonClick('0')} className="bg-white p-2 rounded-md shadow text-base font-bold hover:bg-gray-200 transition-colors">0</button>
                <button onClick={() => handleButtonClick('.')} className="bg-white p-2 rounded-md shadow text-base font-bold hover:bg-gray-200 transition-colors">.</button>
                <button onClick={() => handleButtonClick('-')} className="bg-white p-2 rounded-md shadow text-base font-bold hover:bg-gray-200 transition-colors">-</button>
                <button onClick={() => handleButtonClick('clearall')} className="col-span-3 bg-red-500 text-white p-2 rounded-md shadow text-base font-bold hover:bg-red-600 transition-colors">Clear All</button>
            </div>
        </div>
    );
};


const TestInterfacePage = ({ navigate, testId }) => {
    const { user, userData } = useAuth();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
    const [isResumeConfirmOpen, setIsResumeConfirmOpen] = useState(false);
    const [isFullScreenActive, setIsFullScreenActive] = useState(false);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [sectionTimers, setSectionTimers] = useState([]);
    const [answers, setAnswers] = useState({});
    const [questionStatuses, setQuestionStatuses] = useState({}); 
    const [timeTaken, setTimeTaken] = useState({});
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [isQuestionPaperOpen, setIsQuestionPaperOpen] = useState(false);
    const [sectionTransitionMessage, setSectionTransitionMessage] = useState(''); 
    const [showNavigatorPanel, setShowNavigatorPanel] = useState(true); 
    const [attemptDocId, setAttemptDocId] = useState(null);
    const [mobileView, setMobileView] = useState('question');
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isMobileDevice, setIsMobileDevice] = useState(window.innerWidth < 1024);
    
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const lastSyncTimestamp = useRef(Date.now());

    const questionTimerRef = useRef(null);
    const testContainerRef = useRef(null);
    const exitingToDashboardRef = useRef(false);
    const submittingTestRef = useRef(false);
    const isResumeConfirmedRef = useRef(false);
    const navigateOnExitRef = useRef(false);
    
    const currentSection = test?.sections ? test.sections[currentSectionIndex] : null;
    const currentQuestion = currentSection ? currentSection.questions[currentQuestionIndex] : null;
    const showPassagePanel = currentSection && currentQuestion && (currentQuestion.passage || currentQuestion.passageImageUrl) && currentSection.name !== 'QA';

    // All logic functions below are unchanged
    const getLocalStorageKey = useCallback(() => {
        if (!user || !testId) return null;
        return `test_progress_${user.uid}_${testId}`;
    }, [user, testId]);
    
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        setShowOfflineModal(!isOnline && isFullScreenActive);
    }, [isOnline, isFullScreenActive]);


    useEffect(() => {
        const handleResize = () => setIsMobileDevice(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const startQuestionTimer = useCallback(() => {
        questionTimerRef.current = Date.now();
    }, []);

    const recordTimeTaken = useCallback(() => {
        if (questionTimerRef.current) {
            const timeSpent = (Date.now() - questionTimerRef.current) / 1000;
            setTimeTaken(prev => {
                const newTimeTaken = { ...prev };
                const secTime = newTimeTaken[currentSectionIndex] ? { ...newTimeTaken[currentSectionIndex] } : {};
                secTime[currentQuestionIndex] = (secTime[currentQuestionIndex] || 0) + timeSpent;
                newTimeTaken[currentSectionIndex] = secTime;
                return newTimeTaken;
            });
        }
    }, [currentSectionIndex, currentQuestionIndex]);
    
    useEffect(() => {
        if (test && !loading) {
            if (isFullScreenActive) {
                startQuestionTimer();
            } else {
                recordTimeTaken();
                questionTimerRef.current = null;
            }
        }
    }, [isFullScreenActive, test, loading, startQuestionTimer, recordTimeTaken]);

    const getProgressData = useCallback((status = 'in-progress') => {
        let finalTimeTaken = { ...timeTaken };
        if (questionTimerRef.current) {
            const timeSpent = (Date.now() - questionTimerRef.current) / 1000;
            const secIdx = currentSectionIndex;
            const qIdx = currentQuestionIndex;
            const sectionTimeTaken = finalTimeTaken[secIdx] ? { ...finalTimeTaken[secIdx] } : {};
            sectionTimeTaken[qIdx] = (sectionTimeTaken[qIdx] || 0) + timeSpent;
            finalTimeTaken[secIdx] = sectionTimeTaken;
        }
        return {
            status,
            answers,
            timeTaken: finalTimeTaken,
            questionStatuses,
            sectionTimers,
            currentSectionIndex,
            currentQuestionIndex,
            lastUpdatedAt: Date.now(),
        };
    }, [answers, timeTaken, questionStatuses, sectionTimers, currentSectionIndex, currentQuestionIndex]);

    useInterval(() => {
        if (!loading && test && isFullScreenActive) {
            const key = getLocalStorageKey();
            if (key) {
                const dataToSave = getProgressData();
                localStorage.setItem(key, JSON.stringify(dataToSave));
            }
        }
    }, 5000);

    const syncToFirestore = useCallback(async () => {
        if (!isOnline || !attemptDocId) return;
        const key = getLocalStorageKey();
        const localDataString = key ? localStorage.getItem(key) : null;
        if (localDataString) {
            const localData = JSON.parse(localDataString);
            if (localData.lastUpdatedAt > lastSyncTimestamp.current) {
                try {
                    const dataToSync = { ...localData, lastAccessedAt: serverTimestamp() };
                    delete dataToSync.lastUpdatedAt;
                    await updateDoc(doc(db, "attempts", attemptDocId), dataToSync);
                    lastSyncTimestamp.current = Date.now();
                } catch (error) {
                    console.error("Sync failed:", error);
                }
            }
        }
    }, [isOnline, attemptDocId, getLocalStorageKey]);
    
    useEffect(() => {
        if (isOnline) {
            syncToFirestore();
        }
    }, [isOnline, syncToFirestore]);
    
    const handleSubmitClick = useCallback(() => {
        submittingTestRef.current = true;
        if (document.fullscreenElement) document.exitFullscreen();
        setIsConfirmOpen(true);
    }, []);

    const handleSectionSubmit = useCallback(() => {
        recordTimeTaken();
        if (!currentSection || !test) return;
        if (currentSectionIndex < test.sections.length - 1) {
            const nextSectionIndex = currentSectionIndex + 1;
            setSectionTransitionMessage(`Submitting ${test.sections[currentSectionIndex].name} section... Loading next section: ${test.sections[nextSectionIndex].name}`);
            setCurrentSectionIndex(nextSectionIndex);
            setCurrentQuestionIndex(0); 
            startQuestionTimer();
            setTimeout(() => { setSectionTransitionMessage(''); }, 1500); 
        } else {
            handleSubmitClick();
        }
    }, [currentSectionIndex, test, recordTimeTaken, startQuestionTimer, handleSubmitClick, currentSection]);

    const submitTest = useCallback(async () => {
        const finalAttemptData = getProgressData('completed');
        const key = getLocalStorageKey();
        if (key) {
             localStorage.setItem(key, JSON.stringify(finalAttemptData));
        }
        if (!isOnline) {
            alert("You are offline. Your final result has been saved to this device and will be submitted automatically when you reconnect.");
            setIsConfirmOpen(false);
            return;
        }
        try {
            if (attemptDocId) {
                const dataToSync = { ...finalAttemptData, completedAt: serverTimestamp() };
                delete dataToSync.lastUpdatedAt;
                await updateDoc(doc(db, "attempts", attemptDocId), dataToSync);
            }
            if (key) localStorage.removeItem(key);
            navigate('results', { attemptId: attemptDocId });
        } catch (error) {
            console.error("Error submitting test:", error);
            alert("A connection error occurred while submitting. Your progress is saved locally. Please try again.");
            setIsConfirmOpen(false);
        }
    }, [getProgressData, getLocalStorageKey, isOnline, attemptDocId, navigate]);

    const saveProgressAndExit = useCallback(async () => {
        const progressData = getProgressData('in-progress');
        const key = getLocalStorageKey();
        if (key) localStorage.setItem(key, JSON.stringify(progressData));
        
        await syncToFirestore();
        
        navigateOnExitRef.current = true;
        
        if (!document.fullscreenElement) {
            navigate('home');
        } else {
             document.exitFullscreen();
        }
    }, [getProgressData, getLocalStorageKey, syncToFirestore, navigate]);

    
    useEffect(() => {
        const fetchAndPrepareTest = async () => {
            if (!testId || !user?.uid) { navigate('home'); return; }
            setLoading(true);
            const key = `test_progress_${user.uid}_${testId}`;
            const localDataString = localStorage.getItem(key);
            let localData = null;
            if (localDataString) {
                localData = JSON.parse(localDataString);
                setAnswers(localData.answers || {});
                setTimeTaken(localData.timeTaken || {});
                setQuestionStatuses(localData.questionStatuses || {});
                setSectionTimers(localData.sectionTimers || []);
                setCurrentSectionIndex(localData.currentSectionIndex || 0);
                setCurrentQuestionIndex(localData.currentQuestionIndex || 0);
            }
            try {
                const testRef = doc(db, 'tests', testId);
                const testSnap = await getDoc(testRef);
                if (!testSnap.exists()) { alert('Test not found.'); navigate('home'); return; }
                const testData = testSnap.data();
                setTest(testData);
                const attemptsRef = collection(db, 'attempts');
                const q = query(attemptsRef, where('userId', '==', user.uid), where('testId', '==', testId));
                const querySnapshot = await getDocs(q);
                let attemptDoc = !querySnapshot.empty ? querySnapshot.docs[0] : null;
                if (attemptDoc) {
                    const attemptData = attemptDoc.data();
                    setAttemptDocId(attemptDoc.id);
                    if (attemptData.status === 'completed') {
                        if (key) localStorage.removeItem(key);
                        navigate('results', { attemptId: attemptDoc.id });
                        return; 
                    }
                    const remoteTimestamp = attemptData.lastAccessedAt?.toDate().getTime() || 0;
                    const localTimestamp = localData?.lastUpdatedAt || 0;
                    if (remoteTimestamp > localTimestamp) {
                        setAnswers(attemptData.answers || {});
                        setTimeTaken(attemptData.timeTaken || {});
                        setQuestionStatuses(attemptData.questionStatuses || {});
                        setSectionTimers(attemptData.sectionTimers || testData.sections.map(s => s.duration * 60));
                        setCurrentSectionIndex(attemptData.currentSectionIndex || 0);
                        setCurrentQuestionIndex(attemptData.currentQuestionIndex || 0);
                    }
                    setIsResumeConfirmOpen(true);
                } else {
                    const initialSectionTimers = testData.sections.map(s => s.duration * 60);
                    const initialStatuses = {};
                    testData.sections.forEach((sec, secIdx) => { initialStatuses[secIdx] = {}; sec.questions.forEach((q, qIdx) => { initialStatuses[secIdx][qIdx] = 'not-visited'; }); });
                    setSectionTimers(initialSectionTimers);
                    setQuestionStatuses(initialStatuses);
                    const newAttemptData = { testId, testTitle: testData.title, userId: user.uid, startedAt: serverTimestamp(), status: 'in-progress', answers: {}, timeTaken: {}, sectionTimers: initialSectionTimers, questionStatuses: initialStatuses, lastAccessedAt: serverTimestamp() };
                    const newAttemptRef = await addDoc(collection(db, "attempts"), newAttemptData);
                    setAttemptDocId(newAttemptRef.id);
                    handleFullscreen();
                }
            } catch (error) {
                console.error("Error preparing test:", error);
                if (!localData) {
                    alert("Error loading test. Please check your connection and try again.");
                    navigate('home');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchAndPrepareTest();
    }, [testId, user, navigate]);


    const handleFullscreen = useCallback(() => {
        if (testContainerRef.current) {
            if (!document.fullscreenElement) testContainerRef.current.requestFullscreen().catch(err => console.error(`Fullscreen Error: ${err.message}`));
            else document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleNativeFullscreenChange = () => {
            const isFullscreen = document.fullscreenElement !== null;
            setIsFullScreenActive(isFullscreen);

            if (!isFullscreen) {
                if (navigateOnExitRef.current) {
                    navigateOnExitRef.current = false; 
                    navigate('home');
                    return; 
                }

                if (!exitingToDashboardRef.current && !submittingTestRef.current) {
                    setIsExitConfirmOpen(true);
                } else {
                    exitingToDashboardRef.current = false;
                }
            }
        };
        document.addEventListener('fullscreenchange', handleNativeFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleNativeFullscreenChange);
    }, [navigate]); 


    useEffect(() => {
        let timer = null; 
        if (!loading && test && currentSection && sectionTimers.length > 0 && isFullScreenActive) {
            timer = setInterval(() => {
                setSectionTimers(prevTimers => {
                    const newTimers = [...prevTimers];
                    if (currentSectionIndex < newTimers.length && newTimers[currentSectionIndex] > 0) {
                        newTimers[currentSectionIndex] -= 1;
                        return newTimers;
                    } else {
                        if (currentSectionIndex < test.sections.length - 1) {
                            recordTimeTaken(); 
                            const nextSectionIndex = currentSectionIndex + 1;
                            setSectionTransitionMessage(`Submitting ${test.sections[currentSectionIndex].name} section... Loading next section: ${test.sections[nextSectionIndex].name}`);
                            setCurrentSectionIndex(nextSectionIndex); 
                            setCurrentQuestionIndex(0); 
                            startQuestionTimer(); 
                            setTimeout(() => { setSectionTransitionMessage(''); }, 1500); 
                            return newTimers; 
                        } else {
                            if (document.fullscreenElement) document.exitFullscreen();
                            submitTest();
                            return newTimers; 
                        }
                    }
                });
            }, 1000);
        }
        return () => { if (timer) clearInterval(timer); };
    }, [loading, test, currentSectionIndex, submitTest, recordTimeTaken, startQuestionTimer, currentSection, sectionTimers, isFullScreenActive]);

    useEffect(() => {
        const disableSelectionAndRightClick = (event) => event.preventDefault();
        if (testContainerRef.current) {
            testContainerRef.current.style.userSelect = 'none';
            testContainerRef.current.addEventListener('contextmenu', disableSelectionAndRightClick);
        }
        return () => { if (testContainerRef.current) testContainerRef.current.removeEventListener('contextmenu', disableSelectionAndRightClick); };
    }, []);

    const changeQuestion = (newIndex) => {
        recordTimeTaken();
        setCurrentQuestionIndex(newIndex);
    };
    
    const updateQuestionStatus = useCallback((secIdx, qIdx, newStatus) => {
        setQuestionStatuses(prev => {
            const currentStatus = prev[secIdx]?.[qIdx];
            let finalStatus = newStatus;
            if (newStatus === 'marked') finalStatus = (currentStatus === 'answered' || currentStatus === 'answered-marked') ? 'answered-marked' : 'marked';
            else if (newStatus === 'answered') finalStatus = (currentStatus === 'marked' || currentStatus === 'answered-marked') ? 'answered-marked' : 'answered';
            else if (newStatus === 'not-answered') finalStatus = (currentStatus === 'answered-marked') ? 'marked' : 'not-answered';
            if (currentStatus === finalStatus) return prev;
            const updatedSec = { ...prev[secIdx], [qIdx]: finalStatus };
            return { ...prev, [secIdx]: updatedSec };
        });
    }, []);

    useEffect(() => {
        if (!loading && test) {
            const status = questionStatuses[currentSectionIndex]?.[currentQuestionIndex];
            if (status === 'not-visited') updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'not-answered');
            if (isFullScreenActive) {
                startQuestionTimer();
            }
        }
    }, [currentSectionIndex, currentQuestionIndex, loading, test, startQuestionTimer, updateQuestionStatus, questionStatuses, isFullScreenActive]);


    const handleOptionSelect = (optionIndex) => {
        setAnswers(prev => ({ ...prev, [currentSectionIndex]: { ...prev[currentSectionIndex], [currentQuestionIndex]: optionIndex } }));
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'answered');
    };
    
    const handleTitaChange = (value) => {
        setAnswers(prev => {
            const currentAnswer = prev[currentSectionIndex]?.[currentQuestionIndex] || '';
            let newAnswer = currentAnswer;
            if (value === 'backspace') newAnswer = currentAnswer.slice(0, -1);
            else if (value === 'clearall') newAnswer = '';
            else newAnswer += value;
            return { ...prev, [currentSectionIndex]: { ...prev[currentSectionIndex], [currentQuestionIndex]: newAnswer } };
        });
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'answered');
    };

    const handleSaveAndNext = () => {
        recordTimeTaken(); 
        if (!currentSection || !test) return; 
        const isLastQuestionOfTest = currentQuestionIndex === currentSection.questions.length - 1 && currentSectionIndex === test.sections.length - 1;
        if (isLastQuestionOfTest) return; 
        else if (currentQuestionIndex < currentSection.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            handleSectionSubmit();
        }
    };

    const handleClearResponse = () => {
        setAnswers(prev => {
            const newAnswers = { ...prev };
            if (newAnswers[currentSectionIndex]) delete newAnswers[currentSectionIndex][currentQuestionIndex];
            return newAnswers;
        });
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'not-answered');
        setIsMoreMenuOpen(false);
    };

    const handleMarkForReview = () => {
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'marked');
        handleSaveAndNext(); 
        setIsMoreMenuOpen(false);
    };

    const handleBackToDashboardClick = useCallback(() => {
        exitingToDashboardRef.current = true;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        setIsExitConfirmOpen(true);
    }, []);

    const handleConfirmResume = useCallback(() => {
        isResumeConfirmedRef.current = true;
        setIsResumeConfirmOpen(false);
        handleFullscreen();
    }, [handleFullscreen]);

    const isRestrictedType = test?.type === 'MOCK' || test?.type === 'SECTIONAL';
    if (isMobileDevice && isRestrictedType) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-lg">
                    <p className="text-gray-800">
                        Sectionals/Full-length tests are only available on laptop/desktop. If you are already using a laptop/desktop, 
                        maximize the browser window or decrease the zoom level by pressing the Control/Command and 
                        Minus buttons on the keyboard.
                    </p>
                </div>
            </div>
        );
    }
    
    if (loading || !test || !currentSection || !currentQuestion) {
        return <div className="text-center text-gray-400 p-8">Loading Test Interface...</div>;
    }

    const timerValue = sectionTimers[currentSectionIndex] || 0;
    const minutes = Math.floor(timerValue / 60);
    const seconds = timerValue % 60;
    const watermarkSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='rgba(0, 0, 0, 0.08)' font-size='16' font-family='Arial' transform='rotate(-45 150 150)'>${userData.email}</text></svg>`;
    const watermarkStyle = { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(watermarkSvg)}")`, backgroundRepeat: 'repeat' };
    const isLastQuestionOfCurrentSection = currentQuestionIndex === (currentSection.questions.length - 1);
    const isLastSectionOfTest = currentSectionIndex === (test.sections.length - 1);
    const shouldDisableSaveAndNext = isLastQuestionOfCurrentSection;

    return (
        <div ref={testContainerRef} className="bg-gray-200 h-screen flex flex-col text-gray-800 font-sans">
            <QuestionPaperModal
                isOpen={isQuestionPaperOpen}
                onClose={() => setIsQuestionPaperOpen(false)}
                section={currentSection}
            />
            {showOfflineModal && <OfflineModal />}
            <ConfirmModal isOpen={isConfirmOpen} setIsOpen={(val) => { setIsConfirmOpen(val); if (!val && submittingTestRef.current) { submittingTestRef.current = false; handleFullscreen(); } }} onConfirm={submitTest} title="Submit Test?">Are you sure you want to end the test? This action is final.</ConfirmModal>
            <ConfirmModal isOpen={isExitConfirmOpen} setIsOpen={(val) => { setIsExitConfirmOpen(val); if (!val && !navigateOnExitRef.current) { exitingToDashboardRef.current = false; handleFullscreen(); } }} onConfirm={saveProgressAndExit} title="Exit Test?">You are attempting to exit the test. Your progress will be saved. Do you wish to continue?</ConfirmModal>
            <ConfirmModal isOpen={isResumeConfirmOpen} setIsOpen={(val) => { setIsResumeConfirmOpen(val); if (!val && !isResumeConfirmedRef.current) navigate('home'); isResumeConfirmedRef.current = false; }} onConfirm={handleConfirmResume} title="Resume Test" confirmText="OK">Resuming previous test progress!</ConfirmModal>
            {isCalculatorOpen && <Calculator setIsCalculatorOpen={setIsCalculatorOpen} />}
            {sectionTransitionMessage && <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-lg shadow-xl text-center text-lg font-semibold animate-bounce">{sectionTransitionMessage}</div></div>}
            
            {!isFullScreenActive ? (
                <div className="flex flex-1 items-center justify-center text-center p-4"><div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full"><h2 className="text-2xl font-bold mb-4 text-gray-800">Test Requires Fullscreen</h2><p className="text-gray-600 mb-6">Please enter fullscreen mode to begin or continue the test.</p><button onClick={handleFullscreen} className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold text-lg hover:bg-blue-700 transition-colors">Enter Fullscreen</button></div></div>
            ) : (
                <>
                    <div className="bg-white shadow-md flex-shrink-0 h-16"><div className="max-w-full mx-auto px-4 flex justify-between items-center h-full">
                        <h1 className="text-lg md:text-xl font-bold">{test.title}</h1>
                        <div className="flex space-x-4 items-center">
                            <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-600 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg></button>
                            <button onClick={handleBackToDashboardClick} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-sm">Back to Dashboard</button>
                        </div>
                    </div></div>
                    <div className="bg-gray-100 border-b border-t border-gray-300 flex-shrink-0 h-12"><div className="max-w-full mx-auto px-4 flex justify-between items-center h-full">
                        <div className="flex overflow-x-auto">
                            <div className="flex">
                                {test.sections.map((section, index) => (<button key={section.name} disabled={true} className={`py-2 px-4 text-sm whitespace-nowrap ${index === currentSectionIndex ? 'bg-white border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500 bg-gray-200'}`}>{section.name}</button>))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setIsQuestionPaperOpen(true)} className="font-semibold px-4 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm flex items-center space-x-2 transition-colors">
                                <FaBook />
                                <span>Question Paper</span>
                            </button>
                            <div className="text-right flex-shrink-0">
                                <div className="text-xs text-gray-500">Time Left</div>
                                <div className="text-lg md:text-xl font-bold text-black">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
                            </div>
                        </div>
                    </div></div>

                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-full p-2 md:p-4 gap-4">
                        {showPassagePanel && (
                            <div className={`flex-1 bg-white shadow-md rounded-lg p-4 flex-col overflow-y-auto relative min-h-0 ${mobileView === 'passage' ? 'flex' : 'hidden'} md:flex`}>
                                <div className="absolute inset-0 z-0" style={watermarkStyle}></div>
                                <div className="relative z-10">
                                    <h2 className="font-bold mb-2">Directions</h2>
                                    {currentQuestion.passageImageUrl && <img src={currentQuestion.passageImageUrl} alt="Passage" className="max-w-full h-auto mb-4 rounded"/>}
                                    <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">{currentQuestion.passage}</div>
                                </div>
                            </div>
                        )}
                        
                        <div className={`flex-1 bg-white shadow-md rounded-lg p-4 flex-col overflow-y-auto relative min-h-0 ${mobileView === 'question' ? 'flex' : 'hidden'} md:flex`}>
                            <div className="absolute inset-0 z-0" style={watermarkStyle}></div><div className="relative z-10"><h2 className="font-bold mb-4">Question No. {currentQuestionIndex + 1}</h2>{currentQuestion.questionImageUrl && <img src={currentQuestion.questionImageUrl} alt="Question" className="max-w-full h-auto mb-4 rounded"/>}<div className="prose max-w-none text-gray-800 mb-6 whitespace-pre-wrap">{currentQuestion.questionText}</div>{currentQuestion.type === 'TITA' ? (<><input type="text" value={answers[currentSectionIndex]?.[currentQuestionIndex] || ''} readOnly className="p-2 border-2 rounded-md w-full" placeholder="Input answer using number pad..."/><NumberPad onNumberClick={handleTitaChange} /></>) : (<div className="space-y-3">{currentQuestion.options.map((option, index) => (<div key={index} onClick={() => handleOptionSelect(index)} className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${answers[currentSectionIndex]?.[currentQuestionIndex] === index ? 'bg-blue-50 border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}><input type="radio" name={`q_${currentQuestionIndex}`} checked={answers[currentSectionIndex]?.[currentQuestionIndex] === index} readOnly className="mt-1 mr-3 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/><label className="flex-1">{option}</label></div>))}</div>)}</div>
                        </div>

                        <div className={`w-full md:w-80 bg-white shadow-md rounded-lg p-4 flex-shrink-0 flex-col overflow-y-auto min-h-0 ${mobileView === 'navigator' ? 'flex' : 'hidden'} ${showNavigatorPanel ? 'md:flex' : 'md:hidden'}`}>
                            <div className="text-center border-b pb-2"><img src={userData.photoURL} alt="user" className="w-16 h-16 rounded-full mx-auto mb-2"/><p className="font-semibold">{userData.displayName}</p></div><div className="mt-4"><button onClick={() => setIsCalculatorOpen(true)} className="w-full mb-4 py-2 bg-gray-200 rounded-md font-semibold hover:bg-gray-300">View Calculator</button><p className="font-bold text-center mb-2">Question Palette: {currentSection.name}</p><div className="grid grid-cols-6 sm:grid-cols-5 gap-2">{currentSection.questions.map((_, index) => { const status = questionStatuses[currentSectionIndex]?.[index]; let colorClass = 'bg-gray-300 hover:bg-gray-400 text-gray-800'; if (status === 'answered') colorClass = 'bg-green-500 text-white'; else if (status === 'not-answered') colorClass = 'bg-red-500 text-white'; else if (status === 'marked') colorClass = 'bg-purple-500 text-white'; else if (status === 'answered-marked') colorClass = 'bg-purple-500 text-white relative'; if (index === currentQuestionIndex) colorClass += ' ring-2 ring-offset-2 ring-blue-500'; return (<button key={index} onClick={() => changeQuestion(index)} className={`h-8 w-8 md:h-9 md:w-9 flex items-center justify-center rounded-md font-semibold transition-all ${colorClass}`}>{index + 1}{status === 'answered-marked' && <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full"></div>}</button>); })}</div></div><div className="mt-4 border-t pt-4 text-xs text-gray-600 space-y-2"><div className="flex items-center"><div className="w-4 h-4 rounded-md bg-green-500 mr-2"></div> Answered</div><div className="flex items-center"><div className="w-4 h-4 rounded-md bg-red-500 mr-2"></div> Not Answered</div><div className="flex items-center"><div className="w-4 h-4 rounded-md bg-gray-300 mr-2"></div> Not Visited</div><div className="flex items-center"><div className="w-4 h-4 rounded-md bg-purple-500 mr-2"></div> Marked for Review</div><div className="flex items-center"><div className="w-4 h-4 rounded-md bg-purple-500 relative mr-2"><div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full"></div></div> Answered & Marked</div></div>
                        </div>
                    </div>

                    <div className="bg-white shadow-inner py-2 px-4 flex-shrink-0">
                        <div className="max-w-full mx-auto flex justify-between items-center">
                            <div className="hidden md:flex space-x-2">
                                <button onClick={handleMarkForReview} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Mark for Review & Next</button>
                                <button onClick={handleClearResponse} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Clear Response</button>
                                <button onClick={() => setShowNavigatorPanel(prev => !prev)} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">{showNavigatorPanel ? 'Hide Navigator' : 'Show Navigator'}</button>
                            </div>

                            <div className="md:hidden flex space-x-2 relative">
                                <button onClick={() => setIsMoreMenuOpen(prev => !prev)} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">More</button>
                                {isMoreMenuOpen && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-md shadow-lg border z-10">
                                        <button onClick={handleMarkForReview} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mark & Next</button>
                                        <button onClick={handleClearResponse} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Clear Response</button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex space-x-2">
                                {isLastQuestionOfCurrentSection && !isLastSectionOfTest ? (<button onClick={handleSectionSubmit} className="font-bold px-4 md:px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm md:text-base">SUBMIT SECTION</button>) : (<button onClick={handleSaveAndNext} disabled={shouldDisableSaveAndNext} className={`font-bold px-4 md:px-6 py-2 rounded-md text-sm md:text-base ${shouldDisableSaveAndNext ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>SAVE & NEXT</button>)}
                                {currentSectionIndex === test.sections.length - 1 && <button onClick={handleSubmitClick} className="font-bold px-4 md:px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm md:text-base">SUBMIT</button>}
                            </div>
                        </div>
                    </div>

                    <div className="md:hidden flex justify-around bg-gray-800 text-white flex-shrink-0 shadow-inner">
                        <button onClick={() => setMobileView('passage')} disabled={!showPassagePanel} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'passage' ? 'bg-gray-600' : 'bg-gray-800'} disabled:opacity-50 disabled:text-gray-500`}>Passage</button>
                        <button onClick={() => setMobileView('question')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'question' ? 'bg-gray-600' : 'bg-gray-800'}`}>Question</button>
                        {showNavigatorPanel && <button onClick={() => setMobileView('navigator')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'navigator' ? 'bg-gray-600' : 'bg-gray-800'}`}>Palette</button>}
                    </div>
                </>
            )}
            <style jsx>{`
                :fullscreen { width: 100vw; height: 100vh; display: flex; flex-direction: column; margin: 0; padding: 0; background-color: #f3f4f6; overflow: hidden; }
                :fullscreen > div { flex-shrink: 0; }
                :fullscreen > .flex-1 { flex-grow: 1; overflow: auto; }
            `}</style>
        </div>
    );
};

export default TestInterfacePage;