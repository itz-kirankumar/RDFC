import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const AllTestsPage = ({ navigate, tests, title, contentType }) => {
    const { userData } = useAuth();
    const [userAttempts, setUserAttempts] = useState({});
    const [userStatus, setUserStatus] = useState(null); // FIX: Add state for real-time user status
    const [filterType, setFilterType] = useState('All');

    // FIX: Add a real-time listener for the user's document to get live subscription updates.
    useEffect(() => {
        if (!userData?.uid) {
            setUserStatus(null);
            return;
        }
    
        const userDocRef = doc(db, 'users', userData.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserStatus(docSnap.data());
            } else {
                setUserStatus(null);
            }
        });
        
        return () => unsubscribe();
    }, [userData?.uid]);

    // This listener correctly keeps the test attempt statuses in sync.
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
                attemptsMap[attemptData.testId] = {
                    id: doc.id,
                    status: attemptData.status
                };
            });
            setUserAttempts(attemptsMap);
        });

        return () => unsubscribe();
    }, [userData?.uid]);

    const renderRDFCArticleRow = (test, isLocked) => {
        const article = test.article;
        
        const getButtonState = (type) => {
            if (isLocked) {
                return { text: "Unlock to Access", action: () => navigate('subscription'), className: "text-amber-500 hover:text-amber-400" };
            }
            
            if (type === 'article' && article) {
                return { text: "View Article", action: () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id }), className: "text-blue-400 hover:text-blue-300" };
            }
            
            if (type === 'test' && article) {
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') {
                    return { text: "View Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "text-green-400 hover:text-green-300" };
                }
                if (attempt?.status === 'in-progress') {
                    return { text: "Continue Test", action: () => navigate('test', { testId: test.id }), className: "text-orange-400 hover:text-orange-300" };
                }
                return { text: "Start Test", action: () => navigate('test', { testId: test.id }), className: "text-blue-400 hover:text-blue-300" };
            }

            return { text: "N/A", action: null, className: "text-gray-500 cursor-not-allowed" };
        };

        const articleButton = getButtonState('article');
        const testButton = getButtonState('test');

        return (
            <tr key={test.id} className={`${isLocked ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 text-sm font-medium text-white">{test.title}</td>
                <td className="px-6 py-4 text-sm text-gray-400">
                    {article ? article.name : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                    {article ? article.description : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button onClick={articleButton.action} disabled={isLocked || !article} className={articleButton.className}>
                        {articleButton.text}
                    </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button onClick={testButton.action} disabled={isLocked || !article} className={testButton.className}>
                       {testButton.text}
                    </button>
                </td>
            </tr>
        );
    };

    const renderAddOnTestRow = (test, isLocked) => {
        const attempt = userAttempts[test.id];

        let buttonText;
        let buttonAction;
        let buttonClass;

        if (attempt?.status === 'completed') {
            buttonText = "View Analysis";
            buttonAction = () => navigate('results', { attemptId: attempt.id });
            buttonClass = "bg-green-600 hover:bg-green-700 text-white";
        } else if (attempt?.status === 'in-progress') {
            buttonText = "Continue Test";
            buttonAction = () => navigate('test', { testId: test.id });
            buttonClass = "bg-orange-500 hover:bg-orange-600 text-white";
        } else if (isLocked) {
            buttonText = "Subscribe to Unlock";
            buttonAction = () => navigate('subscription');
            buttonClass = "bg-amber-500 hover:bg-amber-400 text-gray-900";
        } else {
            buttonText = "Start Test";
            buttonAction = () => navigate('test', { testId: test.id });
            buttonClass = "bg-blue-600 hover:bg-blue-700 text-white";
        }

        return (
            <tr key={test.id} className={`${isLocked ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{test.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{test.type}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{test.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                        onClick={buttonAction}
                        className={`px-4 py-2 rounded-md font-semibold transition-colors ${buttonClass}`}
                    >
                        {buttonText}
                    </button>
                </td>
            </tr>
        );
    };

    if (!userStatus) {
        return <div className="text-center text-gray-400">Loading...</div>;
    }

    const filteredTests = filterType === 'All' ? tests : tests.filter(test => test.type === filterType.toUpperCase());
    const isPaidContent = tests[0] ? !tests[0].isFree : false;
    // FIX: Use the real-time userStatus state instead of the stale userData from context.
    const showUnlockButton = !userStatus.isSubscribed && isPaidContent;
    
    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">{title}</h1>
                <button 
                    onClick={() => navigate('home')} 
                    className="bg-gray-800 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-700 shadow transition-all transform hover:scale-105"
                >
                    &larr; Back to Dashboard
                </button>
            </div>
            
            {showUnlockButton && (
                <div className="mb-8 p-6 rounded-lg shadow-md bg-amber-500 text-gray-900 text-center">
                    <p className="text-xl font-semibold mb-4">This content is for premium members only.</p>
                    <button onClick={() => navigate('subscription')} className="bg-white text-gray-900 px-6 py-3 rounded-md font-bold hover:bg-gray-200">
                        Subscribe Now to Unlock All
                    </button>
                </div>
            )}
            
            {contentType === 'rdfc' ? (
                <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
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
                                {tests.map(test => renderRDFCArticleRow(test, showUnlockButton))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex space-x-2 mb-4">
                        {['All', 'Test', 'Sectional', 'Mock'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${filterType === type ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
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
                                    {filteredTests.map(test => renderAddOnTestRow(test, showUnlockButton))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AllTestsPage;