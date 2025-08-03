import React, { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

// --- Draggable Calculator Component ---
const Calculator = ({ setIsCalculatorOpen }) => {
    const [input, setInput] = useState('');
    const calculatorRef = useRef(null);

    // Drag logic
    useEffect(() => {
        const el = calculatorRef.current;
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        const dragMouseDown = (e) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
        };

        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
        };
        
        const header = el.querySelector(".calculator-header");
        if(header) header.onmousedown = dragMouseDown;

    }, []);


    const handleClick = (value) => setInput(input + value);
    const handleClear = () => setInput('');
    const handleCalculate = () => {
        try {
            // Using Function constructor for safer evaluation than direct eval()
            const result = new Function('return ' + input)();
            setInput(result.toString());
        } catch (error) {
            setInput('Error');
        }
    };

    return (
        <div ref={calculatorRef} className="fixed top-1/4 left-1/4 w-64 bg-gray-200 border-2 border-gray-400 rounded-lg shadow-2xl z-50 select-none">
            <div className="calculator-header bg-gray-300 p-2 flex justify-between items-center cursor-move">
                <span className="font-bold text-gray-700">Calculator</span>
                <button onClick={() => setIsCalculatorOpen(false)} className="text-red-500 font-bold">X</button>
            </div>
            <div className="p-4">
                <input type="text" value={input} readOnly className="w-full mb-4 p-2 text-right bg-white rounded border border-gray-300" />
                <div className="grid grid-cols-4 gap-2">
                    {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(btn => (
                        <button key={btn} onClick={() => btn === '=' ? handleCalculate() : handleClick(btn)} className="bg-white p-2 rounded shadow text-xl font-bold hover:bg-gray-100">{btn}</button>
                    ))}
                    <button onClick={handleClear} className="col-span-4 bg-red-500 text-white p-2 rounded shadow hover:bg-red-600">Clear</button>
                </div>
            </div>
        </div>
    );
};


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
    
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [sectionTransitionMessage, setSectionTransitionMessage] = useState(''); 
    const [showNavigatorPanel, setShowNavigatorPanel] = useState(true); // New state for navigator panel visibility
    
    const questionTimerRef = useRef(null);
    const testContainerRef = useRef(null);

    const currentSection = test?.sections ? test.sections[currentSectionIndex] : null;
    const currentQuestion = currentSection ? currentSection.questions[currentQuestionIndex] : null;
    const showPassagePanel = currentSection && currentQuestion && currentQuestion.passage && currentSection.name !== 'QA';

    const startQuestionTimer = useCallback(() => {
        questionTimerRef.current = Date.now();
    }, []);

    const recordTimeTaken = useCallback(() => {
        if (questionTimerRef.current) {
            const timeSpent = (Date.now() - questionTimerRef.current) / 1000;
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
            testId, testTitle: test.title, userId: user.uid,
            completedAt: serverTimestamp(), answers, timeTaken
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
            alert("There was an error submitting your test.");
        }
    }, [test, answers, timeTaken, user, testId, navigate, recordTimeTaken]);

    const handleFullscreen = useCallback(() => {
        if (testContainerRef.current) {
            if (!document.fullscreenElement) {
                testContainerRef.current.requestFullscreen().catch(err => {
                    console.error(`Fullscreen Error: ${err.message} (${err.name})`);
                    // This often happens if not triggered directly by user, or security policies.
                    // We'll proceed without fullscreen if it fails, but log the error.
                });
            } else {
                document.exitFullscreen();
            }
        }
    }, []);

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
                    
                    const initialAnswers = {}, initialStatuses = {}, initialTimeTaken = {};
                    testData.sections.forEach((sec, secIdx) => {
                        initialAnswers[secIdx] = {};
                        initialStatuses[secIdx] = {};
                        initialTimeTaken[secIdx] = {};
                         sec.questions.forEach((q, qIdx) => { initialStatuses[secIdx][qIdx] = 'not-visited'; });
                    });
                    setAnswers(initialAnswers);
                    setQuestionStatuses(initialStatuses);
                    setTimeTaken(initialTimeTaken);
                    handleFullscreen(); // Attempt fullscreen on load
                } else { alert('Test not found.'); navigate('home'); }
            } catch (error) { console.error("Error fetching test: ", error); } 
            finally { setLoading(false); }
        };
        fetchTest();
    }, [testId, navigate, handleFullscreen]);

    // Timer and Section Transition Logic
    useEffect(() => {
        if (loading || !test) return;

        // Clear any existing timer to prevent multiple intervals running
        let timer = null; 
        
        // Only set a new interval if currentSection is valid
        if (currentSection) {
            timer = setInterval(() => {
                setSectionTimers(prevTimers => {
                    const newTimers = [...prevTimers];
                    // Ensure the current section timer is valid before decrementing
                    if (currentSectionIndex < newTimers.length && newTimers[currentSectionIndex] > 0) {
                        newTimers[currentSectionIndex] -= 1;
                        return newTimers;
                    } else {
                        // Current section timer has run out or is invalid
                        recordTimeTaken(); // Record time for the last question of this section
                        
                        if (currentSectionIndex < test.sections.length - 1) {
                            // Move to the next section
                            const nextSectionIndex = currentSectionIndex + 1;
                            
                            setSectionTransitionMessage(`Submitting ${test.sections[currentSectionIndex].name} section... Loading next section: ${test.sections[nextSectionIndex].name}`);
                            
                            // Immediately update the state to the next section and question 0
                            setCurrentSectionIndex(nextSectionIndex); 
                            setCurrentQuestionIndex(0); 
                            startQuestionTimer(); 
                            
                            // Clear the message after a delay
                            setTimeout(() => {
                                setSectionTransitionMessage(''); 
                            }, 1500); 
                            
                            // When currentSectionIndex changes, this useEffect will clean up the old timer
                            // and a new one will be set for the next section automatically.
                            return newTimers; // Still return to update the timer display
                        } else {
                            // This is the last section, time is up for the entire test
                            // The outer useEffect cleanup will handle clearInterval.
                            if (document.fullscreenElement) document.exitFullscreen();
                            submitTest(); // Submit the entire test
                            return newTimers; // Still return to update state one last time
                        }
                    }
                });
            }, 1000);
        }

        // Cleanup function for the effect
        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [loading, test, currentSectionIndex, submitTest, recordTimeTaken, startQuestionTimer, currentSection]); // Added currentSection to dependencies

    const changeQuestion = (newIndex) => {
        recordTimeTaken();
        setCurrentQuestionIndex(newIndex);
        startQuestionTimer();
    };
    
    const updateQuestionStatus = useCallback((secIdx, qIdx, newStatus) => {
        setQuestionStatuses(prev => {
            const currentStatus = prev[secIdx]?.[qIdx];
            let finalStatus = newStatus;
            
            if (newStatus === 'marked') finalStatus = currentStatus === 'answered' ? 'answered-marked' : 'marked';
            else if (newStatus === 'answered') finalStatus = currentStatus === 'marked' || currentStatus === 'answered-marked' ? 'answered-marked' : 'answered';
            else if (currentStatus === 'not-visited') finalStatus = 'not-answered';
            else if (!['answered', 'answered-marked', 'marked'].includes(currentStatus)) finalStatus = 'not-answered';
            else return prev;
            
            // Ensure the section object exists before setting the question status
            const updatedSec = { ...prev[secIdx], [qIdx]: finalStatus };
            return { ...prev, [secIdx]: updatedSec };
        });
    }, []);

    useEffect(() => {
        if(!loading && test) {
            // When section or question changes, mark as not-visited initially
            // Ensure test.sections[currentSectionIndex] and its questions exist before accessing
            if (test.sections[currentSectionIndex] && test.sections[currentSectionIndex].questions[currentQuestionIndex]) {
                updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'not-visited');
                startQuestionTimer();
            }
        }
    }, [currentSectionIndex, currentQuestionIndex, loading, test, startQuestionTimer, updateQuestionStatus]);


    const handleOptionSelect = (optionIndex) => {
        setAnswers(prev => ({ ...prev, [currentSectionIndex]: { ...prev[currentSectionIndex], [currentQuestionIndex]: optionIndex } }));
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'answered');
    };
    
    const handleTitaChange = (e) => {
        setAnswers(prev => ({ ...prev, [currentSectionIndex]: { ...prev[currentSectionIndex], [currentQuestionIndex]: e.target.value } }));
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'answered');
    };

    const handleSaveAndNext = () => {
        // Record time for the current question before moving
        recordTimeTaken(); 

        if (!currentSection || !test) return; // Add safeguard

        if (currentQuestionIndex < currentSection.questions.length - 1) {
            // Move to the next question in the current section
            setCurrentQuestionIndex(prev => prev + 1);
            startQuestionTimer();
        } else if (currentSectionIndex < test.sections.length - 1) {
            // Last question of the current section, move to next section
            const nextSectionIndex = currentSectionIndex + 1;

            setSectionTransitionMessage(`Submitting ${test.sections[currentSectionIndex].name} section... Loading next section: ${test.sections[nextSectionIndex].name}`);
            
            // Immediately update the state to the next section and question 0
            setCurrentSectionIndex(nextSectionIndex);
            setCurrentQuestionIndex(0); 
            startQuestionTimer();

            // Clear the message after a delay
            setTimeout(() => {
                setSectionTransitionMessage('');
            }, 1500); 
            
        } else {
            // Last question of the last section, submit the test
            submitTest();
        }
    };

    const handleClearResponse = () => {
        setAnswers(prev => {
            const newAnswers = { ...prev };
            if (newAnswers[currentSectionIndex]) { 
                delete newAnswers[currentSectionIndex][currentQuestionIndex];
            }
            return newAnswers;
        });
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'not-answered');
    };

    const handleMarkForReview = () => {
        updateQuestionStatus(currentSectionIndex, currentQuestionIndex, 'marked');
        handleSaveAndNext();
    };

    const handleSubmitClick = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        setIsConfirmOpen(true);
    };

    if (loading || !test || !currentSection || !currentQuestion) {
        return <div className="text-center text-gray-400">Loading Test Interface...</div>;
    }

    const timerValue = sectionTimers[currentSectionIndex] || 0;
    const minutes = Math.floor(timerValue / 60);
    const seconds = timerValue % 60;

    const watermarkSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='rgba(0, 0, 0, 0.08)' font-size='16' font-family='Arial' transform='rotate(-45 150 150)'>${userData.email}</text></svg>`;
    const watermarkStyle = { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(watermarkSvg)}")`, backgroundRepeat: 'repeat' };

    return (
        // Main container: h-screen makes it fill viewport height, flex-col arranges children vertically
        <div ref={testContainerRef} className="bg-gray-200 h-screen flex flex-col text-gray-800 font-sans">
            <ConfirmModal isOpen={isConfirmOpen} setIsOpen={setIsConfirmOpen} onConfirm={submitTest} title="Submit Test?">Are you sure you want to end the test? This action is final.</ConfirmModal>
            {isCalculatorOpen && <Calculator setIsCalculatorOpen={setIsCalculatorOpen} />}

            {/* Section Transition Message Popup */}
            {sectionTransitionMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl text-center text-lg font-semibold animate-bounce">
                        {sectionTransitionMessage}
                    </div>
                </div>
            )}
            
            {/* Header: Fixed height, does not shrink */}
            <div className="bg-white shadow-md flex-shrink-0"> 
                <div className="max-w-full mx-auto px-4 flex justify-between items-center h-16">
                    <h1 className="text-xl font-bold">{test.title}</h1>
                    <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-600 hover:text-black">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg>
                    </button>
                </div>
                <div className="bg-gray-100 border-b border-t border-gray-300 flex-shrink-0"> 
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

            {/* Main content area: flex-1 to fill remaining vertical space between header and footer */}
            {/* overflow-hidden is crucial for flex parents when children might scroll */}
            <div className="flex flex-col md:flex-row max-w-full mx-auto p-2 md:p-4 gap-4 flex-1 overflow-hidden"> 
                {showPassagePanel && (
                    // Passage Panel: md:w-1/2 for horizontal width on medium screens+, flex-1 for vertical growth, 
                    // overflow-y-auto for vertical scrolling, min-h-0 to prevent flex item from overflowing its parent
                    <div className="w-full md:w-1/2 bg-white shadow-md rounded-lg p-4 flex-1 overflow-y-auto relative min-h-0">
                        <div className="absolute inset-0 z-0" style={watermarkStyle}></div>
                        <div className="relative z-10">
                            <h2 className="font-bold mb-2">Directions</h2>
                            <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">{currentQuestion.passage}</div>
                        </div>
                    </div>
                )}
                {/* Question Panel: flex-1 for horizontal growth (or w-full md:w-1/2 if passage panel visible),
                    overflow-y-auto for vertical scrolling, min-h-0 to prevent flex item from overflowing its parent */}
                <div className={`${showPassagePanel ? 'w-full md:w-1/2' : 'flex-1'} bg-white shadow-md rounded-lg p-4 flex-1 overflow-y-auto relative min-h-0`}>
                    <div className="absolute inset-0 z-0" style={watermarkStyle}></div>
                    <div className="relative z-10">
                        <h2 className="font-bold mb-4">Question No. {currentQuestionIndex + 1}</h2>
                        {currentQuestion.questionImageUrl && <img src={currentQuestion.questionImageUrl} alt="Question" className="max-w-full h-auto mb-4 rounded"/>}
                        <div className="prose max-w-none text-gray-800 mb-6 whitespace-pre-wrap">{currentQuestion.questionText}</div>
                        {currentQuestion.type === 'TITA' ? (
                            <input type="text" onChange={handleTitaChange} value={answers[currentSectionIndex]?.[currentQuestionIndex] || ''} className="p-2 border-2 rounded-md w-full" placeholder="Type your answer here..."/>
                        ) : (
                            <div className="space-y-3">
                                {currentQuestion.options.map((option, index) => (
                                    <div key={index} onClick={() => handleOptionSelect(index)} className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${answers[currentSectionIndex]?.[currentQuestionIndex] === index ? 'bg-blue-50 border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}>
                                        <input type="radio" name={`q_${currentQuestionIndex}`} checked={answers[currentSectionIndex]?.[currentQuestionIndex] === index} readOnly className="mt-1 mr-3 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                                        <label className="flex-1">{option}</label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigator / Question Palette: w-80 fixed width, flex-shrink-0 to prevent shrinking,
                    overflow-y-auto for vertical scrolling, min-h-0 to prevent flex item from overflowing its parent */}
                {showNavigatorPanel && ( // Conditional render based on new state
                    <div className="w-full md:w-80 bg-white shadow-md rounded-lg p-4 flex-shrink-0 overflow-y-auto min-h-0">
                        <div className="text-center border-b pb-2">
                            <img src={userData.photoURL} alt="user" className="w-16 h-16 rounded-full mx-auto mb-2"/>
                            <p className="font-semibold">{userData.displayName}</p>
                        </div>
                        <div className="mt-4">
                            <button onClick={() => setIsCalculatorOpen(true)} className="w-full mb-4 py-2 bg-gray-200 rounded-md font-semibold hover:bg-gray-300">View Calculator</button>
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
                )}
            </div>

            {/* Footer: Fixed height, does not shrink */}
            <div className="bg-white shadow-inner py-3 px-4 flex-shrink-0"> 
                <div className="max-w-full mx-auto flex justify-between items-center">
                    <div className="flex space-x-2">
                        <button onClick={handleMarkForReview} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Mark for Review & Next</button>
                        <button onClick={handleClearResponse} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Clear Response</button>
                        {/* New button to toggle navigator panel visibility */}
                        <button onClick={() => setShowNavigatorPanel(prev => !prev)} className="font-semibold px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">
                            {showNavigatorPanel ? 'Hide Navigator' : 'Show Navigator'}
                        </button>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={handleSaveAndNext} className="font-bold px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">SAVE & NEXT</button>
                        {currentSectionIndex === test.sections.length - 1 && 
                            <button onClick={handleSubmitClick} className="font-bold px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">SUBMIT</button>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestInterfacePage;