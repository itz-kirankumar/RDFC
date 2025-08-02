import React, { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const TestInterfacePage = ({ navigate, testId }) => {
    const { user, userData } = useAuth();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [sectionTimers, setSectionTimers] = useState([]);
    
    const [answers, setAnswers] = useState({});
    const [questionStatuses, setQuestionStatuses] = useState({});
    const [timeTaken, setTimeTaken] = useState({}); 
    
    const questionTimerRef = useRef(null);
    const testContainerRef = useRef(null);

    const currentSection = test?.sections ? test.sections[currentSectionIndex] : null;
    const currentQuestion = currentSection ? currentSection.questions[currentQuestionIndex] : null;

    const startQuestionTimer = useCallback(() => {
        questionTimerRef.current = Date.now();
    }, []);

    const recordTimeTaken = useCallback(() => {
        if (questionTimerRef.current) {
            const timeSpent = (Date.now() - questionTimerRef.current) / 1000; // in seconds
            setTimeTaken(prev => {
                const newTimeTaken = { ...prev };
                if (!newTimeTaken[currentSectionIndex]) newTimeTaken[currentSectionIndex] = {};
                newTimeTaken[currentSectionIndex][currentQuestionIndex] = (newTimeTaken[currentSectionIndex][currentQuestionIndex] || 0) + timeSpent;
                return newTimeTaken;
            });
        }
    }, [currentSectionIndex, currentQuestionIndex]);
    
    const submitTest = useCallback(async () => {
        recordTimeTaken(); 
        
        const attemptData = {
            testId,
            testTitle: test.title,
            userId: user.uid,
            completedAt: serverTimestamp(),
            answers,
            timeTaken
        };
        
        try {
            const attemptRef = await addDoc(collection(db, "attempts"), attemptData);
            
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                [`testsAttempted.${testId}`]: attemptRef.id,
                ...(test.isFree && { [`freeTestsTaken.${test.sections[0].name}`]: true })
            });

            navigate('results', { attemptId: attemptRef.id });

        } catch (error) {
            console.error("Error submitting test:", error);
            alert("There was an error submitting your test. Please try again.");
        }
    }, [test, answers, timeTaken, user, testId, navigate, recordTimeTaken]);

    useEffect(() => {
        const fetchTest = async () => {
            if (!testId) { navigate('home'); return; }
            try {
                const testRef = doc(db, 'tests', testId);
                const testSnap = await getDoc(testRef);
                if (testSnap.exists()) {
                    const testData = testSnap.data();
                    setTest(testData);
                    setSectionTimers(testData.sections.map(s => s.duration * 60));
                    
                    const initialAnswers = {};
                    const initialStatuses = {};
                    const initialTimeTaken = {};
                    testData.sections.forEach((sec, secIdx) => {
                        initialAnswers[secIdx] = {};
                        initialStatuses[secIdx] = {};
                        initialTimeTaken[secIdx] = {};
                         sec.questions.forEach((q, qIdx) => { 
                            initialStatuses[secIdx][qIdx] = 'not-visited'; 
                        });
                    });
                    setAnswers(initialAnswers);
                    setQuestionStatuses(initialStatuses);
                    setTimeTaken(initialTimeTaken);

                } else { alert('Test not found.'); navigate('home'); }
            } catch (error) { console.error("Error fetching test: ", error); } 
            finally { setLoading(false); }
        };
        fetchTest();
    }, [testId, navigate]);

    useEffect(() => {
        if (loading || !test) return;

        const timer = setInterval(() => {
            setSectionTimers(prevTimers => {
                const newTimers = [...prevTimers];
                if (newTimers[currentSectionIndex] > 0) {
                    newTimers[currentSectionIndex] -= 1;
                    return newTimers;
                } else {
                    if (currentSectionIndex < test.sections.length - 1) {
                        recordTimeTaken();
                        setCurrentSectionIndex(prev => prev + 1);
                        setCurrentQuestionIndex(0);
                        startQuestionTimer();
                    } else {
                        clearInterval(timer);
                        submitTest();
                    }
                    return newTimers;
                }
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, test, currentSectionIndex, submitTest, recordTimeTaken, startQuestionTimer]);

    const changeQuestion = (newIndex) => {
        recordTimeTaken();
        setCurrentQuestionIndex(newIndex);
        startQuestionTimer();
    };
    
    const updateQuestionStatus = useCallback((secIdx, qIdx, newStatus) => {
        setQuestionStatuses(prev => {
            const currentStatus = prev[secIdx][qIdx];
            let finalStatus = newStatus;
            
            if (newStatus === 'marked') {
                finalStatus = currentStatus === 'answered' ? 'answered-marked' : 'marked';
            } else if (newStatus === 'answered') {
                 finalStatus = currentStatus === 'marked' || currentStatus === 'answered-marked' ? 'answered-marked' : 'answered';
            } else if (currentStatus === 'not-visited') {
                 finalStatus = 'not-answered';
            } else if (currentStatus !== 'answered' && currentStatus !== 'answered-marked' && currentStatus !== 'marked') {
                finalStatus = 'not-answered';
            } else {
                return prev; // No change needed
            }
            
            return { ...prev, [secIdx]: { ...prev[secIdx], [qIdx]: finalStatus } };
        });
    }, []);

    useEffect(() => {
        if(!loading && test) {
            updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'not-visited');
            startQuestionTimer();
        }
    }, [currentSectionIndex, currentQuestionIndex, loading, test, startQuestionTimer, updateQuestionStatus]);


    const handleOptionSelect = (optionIndex) => {
        setAnswers(prev => ({ ...prev, [currentSectionIndex]: { ...prev[currentSectionIndex], [currentQuestionIndex]: optionIndex } }));
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'answered');
    };

    const handleSaveAndNext = () => {
        if (currentQuestionIndex < currentSection.questions.length - 1) {
            changeQuestion(currentQuestionIndex + 1);
        }
    };

    const handleClearResponse = () => {
        setAnswers(prev => {
            const newAnswers = { ...prev };
            delete newAnswers[currentSectionIndex][currentQuestionIndex];
            return newAnswers;
        });
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'not-answered');
    };

    const handleMarkForReview = () => {
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'marked');
        handleSaveAndNext();
    };

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            testContainerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (loading || !test || !currentQuestion) {
        return <div className="text-center text-gray-400">Loading Test Interface...</div>;
    }

    const timerValue = sectionTimers[currentSectionIndex] || 0;
    const minutes = Math.floor(timerValue / 60);
    const seconds = timerValue % 60;

    return (
        <div ref={testContainerRef} className="bg-gray-200 min-h-screen text-gray-800 font-sans">
            <ConfirmModal isOpen={isConfirmOpen} setIsOpen={setIsConfirmOpen} onConfirm={submitTest} title="Submit Test?">Are you sure you want to end the test? This action is final.</ConfirmModal>
            
            <div className="bg-white shadow-md">
                <div className="max-w-full mx-auto px-4 flex justify-between items-center h-16">
                    <h1 className="text-xl font-bold">{test.title}</h1>
                    <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-600 hover:text-black">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg>
                    </button>
                </div>
                <div className="bg-gray-100 border-b border-t border-gray-300">
                    <div className="max-w-full mx-auto px-4 flex justify-between items-center">
                         <div className="flex">
                            {test.sections.map((section, index) => (
                                <button key={section.name} disabled={true} className={`py-3 px-6 font-semibold text-sm ${index === currentSectionIndex ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 bg-gray-200'}`}>{section.name}</button>
                            ))}
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Time Left</div>
                            <div className="text-2xl font-bold text-black">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row max-w-full mx-auto p-2 md:p-4 gap-4">
                <div className="flex-1 bg-white shadow-md rounded-lg p-4 relative overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    <div className="absolute inset-0 flex items-center justify-center z-0">
                        <span className="text-7xl md:text-9xl font-bold text-gray-200 opacity-50 select-none transform -rotate-12">{userData.email}</span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="font-bold mb-4">Question No. {currentQuestionIndex + 1}</h2>
                        {currentQuestion.questionImageUrl && <img src={currentQuestion.questionImageUrl} alt="Question" className="max-w-full h-auto mb-4 rounded"/>}
                        <div className="prose max-w-none text-gray-800 mb-6 whitespace-pre-wrap">{currentQuestion.questionText}</div>
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, index) => (
                                <div key={index} onClick={() => handleOptionSelect(index)} className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${answers[currentSectionIndex]?.[currentQuestionIndex] === index ? 'bg-blue-50 border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}>
                                    <input type="radio" name={`q_${currentQuestionIndex}`} checked={answers[currentSectionIndex]?.[currentQuestionIndex] === index} readOnly className="mt-1 mr-3 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                                    <label className="flex-1">{option}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-80 bg-white shadow-md rounded-lg p-4">
                    <div className="text-center border-b pb-2">
                        <img src={userData.photoURL} alt="user" className="w-16 h-16 rounded-full mx-auto mb-2"/>
                        <p className="font-semibold">{userData.displayName}</p>
                    </div>
                    <div className="mt-4">
                        <p className="font-bold text-center mb-2">Question Palette: {currentSection.name}</p>
                        <div className="grid grid-cols-5 gap-2">
                            {currentSection.questions.map((_, index) => {
                                const status = questionStatuses[currentSectionIndex]?.[index];
                                let colorClass = 'bg-gray-300 hover:bg-gray-400 text-gray-800'; // Not Visited
                                if (status === 'answered') colorClass = 'bg-green-500 text-white';
                                else if (status === 'not-answered') colorClass = 'bg-red-500 text-white';
                                else if (status === 'marked') colorClass = 'bg-purple-500 text-white';
                                else if (status === 'answered-marked') colorClass = 'bg-purple-500 text-white relative';

                                if (index === currentQuestionIndex) {
                                    colorClass += ' ring-2 ring-offset-2 ring-blue-500';
                                }

                                return (
                                    <button key={index} onClick={() => changeQuestion(index)} className={`h-9 w-9 flex items-center justify-center rounded-md font-semibold transition-all ${colorClass}`}>
                                        {index + 1}
                                        {status === 'answered-marked' && <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-400 rounded-full"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-4 border-t pt-4 text-xs text-gray-600 space-y-2">
                        <div className="flex items-center"><div className="w-4 h-4 rounded-md bg-green-500 mr-2"></div> Answered</div>
                        <div className="flex items-center"><div className="w-4 h-4 rounded-md bg-red-500 mr-2"></div> Not Answered</div>
                        <div className="flex items-center"><div className="w-4 h-4 rounded-md bg-gray-300 mr-2"></div> Not Visited</div>
                        <div className="flex items-center"><div className="w-4 h-4 rounded-md bg-purple-500 mr-2"></div> Marked for Review</div>
                        <div className="flex items-center"><div className="w-4 h-4 rounded-md bg-purple-500 relative mr-2"><div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full"></div></div> Answered & Marked</div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-inner py-3 px-4 fixed bottom-0 left-0 right-0">
                <div className="max-w-full mx-auto flex justify-between items-center">
                    <div className="flex space-x-2">
                        <button onClick={handleMarkForReview} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Mark for Review & Next</button>
                        <button onClick={handleClearResponse} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Clear Response</button>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={handleSaveAndNext} className="font-bold px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">SAVE & NEXT</button>
                        {currentSectionIndex === test.sections.length - 1 && 
                            <button onClick={() => setIsConfirmOpen(true)} className="font-bold px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">SUBMIT</button>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestInterfacePage;
