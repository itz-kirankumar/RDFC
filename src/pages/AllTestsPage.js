import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const AllTestsPage = ({ navigate, tests, title, contentType }) => {
    const { userData } = useAuth();
    const [userAttempts, setUserAttempts] = useState({});
    const [userStatus, setUserStatus] = useState(null);
    const [filterType, setFilterType] = useState('All');

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

    const getButtonState = (test, type, isLocked) => {
        const article = test.article;
        const isArticleRead = userStatus?.readArticles?.[test.id];
        if (isLocked) return { text: "Unlock", action: () => navigate('subscription'), className: "bg-amber-500 hover:bg-amber-400 text-gray-900", disabled: false };
        if (type === 'article' && article) {
            if (isArticleRead) return { text: "Article Read", action: () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id }), className: "bg-gray-600 hover:bg-gray-700 text-gray-300", disabled: false };
            return { text: "View Article", action: () => handleViewArticle(article.url, test.id), className: "bg-blue-600 hover:bg-blue-700 text-white", disabled: false };
        }
        if (type === 'test') {
            const attempt = userAttempts[test.id];
            if (attempt?.status === 'completed') return { text: "View Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "bg-green-600 hover:bg-green-700 text-white", disabled: false };
            if (attempt?.status === 'in-progress') return { text: "Continue Test", action: () => navigate('test', { testId: test.id }), className: "bg-orange-500 hover:bg-orange-600 text-white", disabled: false };
            return { text: "Start Test", action: () => navigate('test', { testId: test.id }), className: "bg-blue-600 hover:bg-blue-700 text-white", disabled: false };
        }
        return { text: "N/A", action: null, className: "bg-gray-700 text-gray-500 cursor-not-allowed", disabled: true };
    };

    const renderRDFCDesktopRow = (test, isLocked) => {
        const article = test.article;
        const getDesktopButton = (type) => {
            const state = getButtonState(test, type, isLocked);
            state.className += " text-xs px-3 py-1 rounded-full";
            return state;
        };
        const articleButton = getDesktopButton('article');
        const testButton = getDesktopButton('test');
        return (
            <tr key={test.id} className={`${isLocked ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 text-sm font-medium text-white">{test.title}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{article ? article.name : 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{article ? article.description : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={articleButton.action} disabled={isLocked || !article} className={articleButton.className}>{articleButton.text}</button></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={testButton.action} disabled={isLocked || !article} className={testButton.className}>{testButton.text}</button></td>
            </tr>
        );
    };

    const renderRDFCMobileCard = (test, isLocked) => {
        const article = test.article;
        const articleButton = getButtonState(test, 'article', isLocked);
        const testButton = getButtonState(test, 'test', isLocked);
        return (
            <div key={test.id} className={`bg-gray-800 rounded-lg p-4 mb-4 ${isLocked ? 'opacity-50' : ''}`}>
                <h4 className="text-lg font-semibold text-white">{test.title}</h4>
                <p className="text-sm text-gray-400 mt-1 mb-2">{article ? article.name : 'N/A'}</p>
                <p className="text-xs text-gray-500 mb-4 h-8 overflow-hidden">{article ? article.description : 'N/A'}</p>
                <div className="flex space-x-2">
                    <button onClick={articleButton.action} disabled={articleButton.disabled} className={`flex-1 text-sm font-semibold px-3 py-2 rounded-md transition-colors ${articleButton.className}`}>{articleButton.text}</button>
                    <button onClick={testButton.action} disabled={testButton.disabled} className={`flex-1 text-sm font-semibold px-3 py-2 rounded-md transition-colors ${testButton.className}`}>{testButton.text}</button>
                </div>
            </div>
        );
    };

    const renderAddOnTestRow = (test, isLocked) => {
        const testButton = getButtonState(test, 'test', isLocked);
        return (
            <tr key={test.id} className={`${isLocked ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{test.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{test.type}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{test.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={testButton.action} disabled={testButton.disabled} className={`px-4 py-2 rounded-md font-semibold transition-colors ${testButton.className}`}>{testButton.text}</button></td>
            </tr>
        );
    };

    const renderAddOnMobileCard = (test, isLocked) => {
        const testButton = getButtonState(test, 'test', isLocked);
        return (
            <div key={test.id} className={`bg-gray-800 rounded-lg p-4 mb-4 ${isLocked ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start">
                    <h4 className="text-lg font-semibold text-white">{test.title}</h4>
                    <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-2 py-1 rounded-full">{test.type}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2 mb-4">{test.description}</p>
                <button onClick={testButton.action} disabled={testButton.disabled} className={`w-full text-sm font-semibold px-3 py-2 rounded-md transition-colors ${testButton.className}`}>{testButton.text}</button>
            </div>
        );
    };

    if (!userStatus) return <div className="text-center text-gray-400 p-8">Loading...</div>;

    const sortedTests = [...tests].sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return 0;
    });
    const filteredTests = filterType === 'All' ? sortedTests : sortedTests.filter(test => test.type === filterType.toUpperCase());
    
    // **FIX**: The banner now only shows if there is paid content AND the user is not subscribed.
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
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Link</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Link</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {tests.map(test => {
                                    // **FIX**: Lock status is now determined on a per-test basis.
                                    const isLocked = !userStatus.isSubscribed && !test.isFree;
                                    return renderRDFCDesktopRow(test, isLocked);
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden">
                        {tests.map(test => {
                            const isLocked = !userStatus.isSubscribed && !test.isFree;
                            return renderRDFCMobileCard(test, isLocked);
                        })}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex space-x-2 mb-4 overflow-x-auto">
                        {['All', 'Test', 'Sectional', 'Mock'].map(type => <button key={type} onClick={() => setFilterType(type)} className={`flex-shrink-0 px-4 py-2 rounded-md font-semibold text-sm transition-colors ${filterType === type ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{type}</button>)}
                    </div>
                    <div className="hidden md:block bg-gray-800 shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Link</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {filteredTests.map(test => {
                                    const isLocked = !userStatus.isSubscribed && !test.isFree;
                                    return renderAddOnTestRow(test, isLocked);
                                })}
                            </tbody>
                        </table>
                    </div>
                     <div className="md:hidden">
                        {filteredTests.map(test => {
                            const isLocked = !userStatus.isSubscribed && !test.isFree;
                            return renderAddOnMobileCard(test, isLocked);
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default AllTestsPage;