import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const CountdownTimer = ({ targetDate, onComplete }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};
        if (difference > 0) {
            timeLeft = {
                Days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                Hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                Minutes: Math.floor((difference / 1000 / 60) % 60),
                Seconds: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            if (!Object.keys(newTimeLeft).length) {
                onComplete();
            }
        }, 1000);
        return () => clearTimeout(timer);
    });

    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
        return (
          <span key={interval} className="text-center p-1">
            <span className="font-mono text-base sm:text-lg font-semibold">{String(value).padStart(2, '0')}</span>
            <span className="text-xs uppercase block opacity-70">{interval}</span>
          </span>
        );
      });

    return (
        <div className="flex justify-around items-center text-white w-full h-full bg-gray-700/50 rounded-md">
            {timerComponents.length ? timerComponents : <span>Loading...</span>}
        </div>
    );
};


const AllTestsPage = ({ navigate, tests, title, contentType }) => {
    const { userData } = useAuth();
    const [userAttempts, setUserAttempts] = useState({});
    const [userStatus, setUserStatus] = useState(null);
    const [filterType, setFilterType] = useState('All');
    const [liveTests, setLiveTests] = useState({});

    useEffect(() => {
        if (!userData?.uid) {
            setUserStatus(null);
            return;
        }
        const userDocRef = doc(db, 'users', userData.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            setUserStatus(docSnap.exists() ? docSnap.data() : null);
        });
        return () => unsubscribe();
    }, [userData?.uid]);

    useEffect(() => {
        if (!userData?.uid) {
            setUserAttempts({});
            return;
        }
        const attemptsQuery = query(collection(db, "attempts"), where("userId", "==", userData.uid));
        const unsubscribe = onSnapshot(attemptsQuery, (querySnapshot) => {
            const attemptsMap = {};
            querySnapshot.forEach((doc) => {
                const attemptData = doc.data();
                attemptsMap[attemptData.testId] = { id: doc.id, status: attemptData.status };
            });
            setUserAttempts(attemptsMap);
        });
        return () => unsubscribe();
    }, [userData?.uid]);

    const getIsLocked = (test, itemType) => {
        if (test.isFree) return false;
        if (!userStatus?.isSubscribed) return true;
    
        const access = userStatus.accessControl;
        if (!access) return true;
    
        if (itemType === 'rdfc_article') return !access.rdfc_articles;
        if (itemType === 'rdfc_test') return !access.rdfc_tests;
    
        switch (test.type?.toUpperCase()) {
            case 'MOCK': return !access.mock;
            case 'SECTIONAL': return !access.sectional;
            case 'TEST': return !access.test;
            default: return true;
        }
    };

    const handleViewArticle = async (articleUrl, testId) => {
        if (!userData?.uid) return;
        try {
            const userRef = doc(db, 'users', userData.uid);
            await updateDoc(userRef, { [`readArticles.${testId}`]: true });
            navigate('rdfcArticleViewer', { articleUrl, testId });
        } catch (error) {
            console.error("Error marking article as read:", error);
        }
    };
    
    // --- MODIFICATION: Refactored RDFC desktop row logic ---
    const renderRDFCDesktopRow = (test) => {
        const article = test.article;
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];

        const renderCellContent = (type) => {
            if (isScheduled) {
                return <div className="w-full h-10 flex items-center justify-center"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({...prev, [test.id]: true}))} /></div>;
            }
            const isLocked = getIsLocked(test, `rdfc_${type}`);
            const isArticleRead = userStatus?.readArticles?.[test.id];

            let text, action, className, disabled = !article;
            if(isLocked) {
                text = "Unlock";
                action = () => navigate('subscription');
                className = "bg-amber-500 hover:bg-amber-400 text-gray-900";
            } else if(type === 'article') {
                if(isArticleRead) {
                    text = "Article Read";
                    action = () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id });
                    className = "bg-gray-600 hover:bg-gray-700 text-gray-300";
                } else {
                    text = "View Article";
                    action = () => handleViewArticle(article.url, test.id);
                    className = "bg-blue-600 hover:bg-blue-700 text-white";
                }
            } else { // type === 'test'
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') {
                    text = "View Analysis";
                    action = () => navigate('results', { attemptId: attempt.id });
                    className = "bg-green-600 hover:bg-green-700 text-white";
                } else if (attempt?.status === 'in-progress') {
                    text = "Continue Test";
                    action = () => navigate('test', { testId: test.id });
                    className = "bg-orange-500 hover:bg-orange-600 text-white";
                } else {
                    text = "Start Test";
                    action = () => navigate('test', { testId: test.id });
                    className = "bg-blue-600 hover:bg-blue-700 text-white";
                }
            }
            return <button onClick={action} disabled={disabled} className={`text-xs px-3 py-1 rounded-full w-40 h-10 flex items-center justify-center ${className} ${isLocked ? 'opacity-60' : ''}`}>{text}</button>;
        };

        return (
            <tr key={test.id}>
                <td className="px-6 py-4 text-sm font-medium text-white">
                    <div className="flex items-center">
                        <span>{test.title}</span>
                        {isScheduled && <span className="ml-2 flex-shrink-0 text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200 px-2 py-1">Coming Soon</span>}
                    </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">{article ? article.name : 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{article ? article.description : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{renderCellContent('article')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{renderCellContent('test')}</td>
            </tr>
        );
    };
    
    const renderRDFCMobileCard = (test) => {
        const article = test.article;
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];

        const getButtonState = (type) => {
            const itemType = `rdfc_${type}`;
            const isLocked = getIsLocked(test, itemType);
            const isArticleRead = userStatus?.readArticles?.[test.id];

            let text, action, className, disabled = false;
            if (isLocked) {
                text = "Unlock";
                action = () => navigate('subscription');
                className = "bg-amber-500 hover:bg-amber-400 text-gray-900";
            } else if (type === 'article') {
                if (isArticleRead) {
                    text = "Article Read";
                    action = () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id });
                    className = "bg-gray-600 hover:bg-gray-700 text-gray-300";
                } else {
                    text = "View Article";
                    action = () => handleViewArticle(article.url, test.id);
                    className = "bg-blue-600 hover:bg-blue-700 text-white";
                }
            } else { // type === 'test'
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') {
                    text = "View Analysis";
                    action = () => navigate('results', { attemptId: attempt.id });
                    className = "bg-green-600 hover:bg-green-700 text-white";
                } else if (attempt?.status === 'in-progress') {
                    text = "Continue Test";
                    action = () => navigate('test', { testId: test.id });
                    className = "bg-orange-500 hover:bg-orange-600 text-white";
                } else {
                    text = "Start Test";
                    action = () => navigate('test', { testId: test.id });
                    className = "bg-blue-600 hover:bg-blue-700 text-white";
                }
            }
            return { text, action, className, disabled };
        };

        const renderButtons = () => {
            const articleButton = getButtonState('article');
            const testButton = getButtonState('test');
            return (
                <div className="flex space-x-2">
                    <button onClick={articleButton.action} disabled={articleButton.disabled || !article} className={`flex-1 text-sm font-semibold px-3 py-2 rounded-md transition-colors ${getIsLocked(test, 'rdfc_article') ? 'opacity-60' : ''} ${articleButton.className}`}>{articleButton.text}</button>
                    <button onClick={testButton.action} disabled={testButton.disabled || !article} className={`flex-1 text-sm font-semibold px-3 py-2 rounded-md transition-colors ${getIsLocked(test, 'rdfc_test') ? 'opacity-60' : ''} ${testButton.className}`}>{testButton.text}</button>
                </div>
            );
        };
        
        return (
            <div key={test.id} className={`bg-gray-800 rounded-lg p-4 mb-4`}>
                <h4 className="text-lg font-semibold text-white">{test.title} {isScheduled && <span className="ml-2 text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200 px-2 py-1">Coming Soon</span>}</h4>
                <p className="text-sm text-gray-400 mt-1 mb-2">{article ? article.name : 'N/A'}</p>
                <p className="text-xs text-gray-500 mb-4 h-8 overflow-hidden">{article ? article.description : 'N/A'}</p>
                {isScheduled 
                    ? <div className="mt-2"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({...prev, [test.id]: true}))} /></div>
                    : renderButtons()
                }
            </div>
        );
    };

    const renderAddOnTestRow = (test) => {
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];

        const renderCellContent = () => {
            if (isScheduled) {
                return <div className="w-full h-10 flex items-center justify-center"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({...prev, [test.id]: true}))} /></div>;
            }
            const isLocked = getIsLocked(test, 'test');
            let text, action, className;
            if (isLocked) {
                text = "Unlock";
                action = () => navigate('subscription');
                className = "bg-amber-500 hover:bg-amber-400 text-gray-900";
            } else {
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') {
                    text = "View Analysis";
                    action = () => navigate('results', { attemptId: attempt.id });
                    className = "bg-green-600 hover:bg-green-700 text-white";
                } else if (attempt?.status === 'in-progress') {
                    text = "Continue Test";
                    action = () => navigate('test', { testId: test.id });
                    className = "bg-orange-500 hover:bg-orange-600 text-white";
                } else {
                    text = "Start Test";
                    action = () => navigate('test', { testId: test.id });
                    className = "bg-blue-600 hover:bg-blue-700 text-white";
                }
            }
            return <button onClick={action} className={`px-4 py-2 rounded-md font-semibold transition-colors ${className}`}>{text}</button>;
        };
        
        return (
            <tr key={test.id} className={`${getIsLocked(test, 'test') && !isScheduled ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    <div className="flex items-center">
                        <span>{test.title}</span>
                        {isScheduled && <span className="ml-2 flex-shrink-0 text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200 px-2 py-1">Coming Soon</span>}
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{test.type}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{test.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{renderCellContent()}</td>
            </tr>
        );
    };

    const renderAddOnMobileCard = (test) => {
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        const isLocked = getIsLocked(test, 'test');

        const renderButton = () => {
             let text, action, className;
             if (isLocked) {
                 text = "Unlock";
                 action = () => navigate('subscription');
                 className = "bg-amber-500 hover:bg-amber-400 text-gray-900";
             } else {
                 const attempt = userAttempts[test.id];
                 if (attempt?.status === 'completed') {
                     text = "View Analysis";
                     action = () => navigate('results', { attemptId: attempt.id });
                     className = "bg-green-600 hover:bg-green-700 text-white";
                 } else if (attempt?.status === 'in-progress') {
                     text = "Continue Test";
                     action = () => navigate('test', { testId: test.id });
                     className = "bg-orange-500 hover:bg-orange-600 text-white";
                 } else {
                     text = "Start Test";
                     action = () => navigate('test', { testId: test.id });
                     className = "bg-blue-600 hover:bg-blue-700 text-white";
                 }
             }
             return <button onClick={action} className={`w-full text-sm font-semibold px-3 py-2 rounded-md transition-colors ${className}`}>{text}</button>;
        };

        return (
            <div key={test.id} className={`bg-gray-800 rounded-lg p-4 mb-4 ${isLocked && !isScheduled ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start">
                    <h4 className="text-lg font-semibold text-white">{test.title}</h4>
                    <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-2 py-1 rounded-full">{test.type}</span>
                </div>
                {isScheduled && <span className="mt-2 inline-block text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200 px-2 py-1">Coming Soon</span>}
                <p className="text-sm text-gray-400 mt-2 mb-4">{test.description}</p>
                {isScheduled
                    ? <div className="mt-2"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({...prev, [test.id]: true}))} /></div>
                    : renderButton()
                }
            </div>
        );
    };

    if (!userStatus) return <div className="text-center text-gray-400 p-8">Loading...</div>;

    const sortedTests = [...tests].sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
    });
    
    const filteredTests = filterType === 'All' || contentType !== 'test' 
        ? sortedTests 
        : sortedTests.filter(test => test.type === filterType.toUpperCase());
    
    const isPaidContentPresent = tests.some(test => !test.isFree);
    const showUnlockBanner = !userStatus.isSubscribed && isPaidContentPresent;
    
    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
                <button onClick={() => navigate('home')} className="bg-gray-800 text-white px-4 md:px-6 py-2 rounded-md font-semibold hover:bg-gray-700 shadow transition-all">&larr; Back</button>
            </div>
            
            {showUnlockBanner && (
                <div className="mb-8 p-6 rounded-lg shadow-md bg-amber-500 text-gray-900 text-center">
                    <p className="text-xl font-semibold mb-4">This content is for premium members only.</p>
                    <button onClick={() => navigate('subscription')} className="bg-white text-gray-900 px-6 py-3 rounded-md font-bold hover:bg-gray-200">Subscribe Now to Unlock All</button>
                </div>
            )}
            
            {contentType === 'rdfc' ? (
                <>
                    <div className="hidden md:block bg-gray-800 shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-700">
                           <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Title</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Description</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Link</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Link</th></tr></thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {tests.map(test => renderRDFCDesktopRow(test))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden">
                        {tests.map(test => renderRDFCMobileCard(test))}
                    </div>
                </>
            ) : (
                <>
                    {contentType === 'test' && (
                        <div className="flex space-x-2 mb-4 overflow-x-auto">
                            {['All', 'Test'].map(type => <button key={type} onClick={() => setFilterType(type)} className={`flex-shrink-0 px-4 py-2 rounded-md font-semibold text-sm transition-colors ${filterType === type ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{type}</button>)}
                        </div>
                    )}
                    <div className="hidden md:block bg-gray-800 shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-700">
                           <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Title</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Description</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Link</th></tr></thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {filteredTests.map(test => renderAddOnTestRow(test))}
                            </tbody>
                        </table>
                    </div>
                     <div className="md:hidden">
                        {filteredTests.map(test => renderAddOnMobileCard(test))}
                    </div>
                </>
            )}
        </div>
    );
};

export default AllTestsPage;