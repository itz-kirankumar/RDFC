import React, { useState, useEffect, Fragment } from 'react';
import { collection, getDocs, query, where, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard = ({ navigate }) => {
    const { userData } = useAuth();
    const [rdfcTests, setRdfcTests] = useState([]);
    const [addOnTests, setAddOnTests] = useState([]);
    const [linkedArticles, setLinkedArticles] = useState({});
    const [loading, setLoading] = useState(true);
    const [userStatus, setUserStatus] = useState(null);
    const [userAttempts, setUserAttempts] = useState({}); // FIX: State for real-time attempt statuses

    // This useEffect hook sets up a real-time listener for the user's data.
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

    // FIX: Added a dedicated real-time listener for test attempts to get live status updates.
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

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const testsQuery = query(collection(db, 'tests'), where("isPublished", "==", true));
                const testsSnapshot = await getDocs(testsQuery);
                const allPublishedTests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const articlesQuery = collection(db, 'rdfcArticles');
                const articlesSnapshot = await getDocs(articlesQuery);
                const fetchedArticles = {};
                articlesSnapshot.forEach(doc => {
                    fetchedArticles[doc.id] = doc.data();
                });
                setLinkedArticles(fetchedArticles);

                const rdfc = allPublishedTests.filter(test => fetchedArticles[test.id]);
                const addOn = allPublishedTests.filter(test => !fetchedArticles[test.id]);

                const sortedRdfcTests = rdfc.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
                const sortedAddOnTests = addOn.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

                setRdfcTests(sortedRdfcTests);
                setAddOnTests(sortedAddOnTests);

            } catch (error) {
                console.error("Error fetching dashboard data: ", error);
            } finally {
                setLoading(false);
            }
        };
        
        if (userStatus !== null) { 
            fetchDashboardData();
        }
    }, [userStatus]);

    const renderTestCard = (test, isLocked) => {
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
            <div 
                key={test.id} 
                className={`bg-gray-800 rounded-lg shadow-md p-6 flex flex-col justify-between transition-all ${isLocked ? 'opacity-50' : 'hover:shadow-xl hover:-translate-y-1'}`}
            >
                <div>
                    <h3 className="text-xl font-semibold text-white">{test.title}</h3>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${test.type === 'MOCK' ? 'bg-gray-700 text-gray-300' : 'bg-gray-600 text-gray-400'}`}>
                        {test.type}
                    </span>
                    <p className="text-gray-400 mt-2">{test.description}</p>
                </div>
                <button 
                    onClick={buttonAction}
                    className={`mt-4 w-full px-4 py-2 rounded-md font-semibold transition-colors ${buttonClass}`}
                >
                    {buttonText}
                </button>
            </div>
        );
    };

    const renderRDFCArticleRow = (test, isLocked) => {
        const article = linkedArticles[test.id];
        
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
    
    const renderUserStatus = () => {
        if (!userStatus) return null;
        if (userStatus.isSubscribed) {
            return (
                <div className="flex items-center space-x-2">
                    <style jsx>{`
                        @keyframes shine {
                            0% { background-position: -200% 0; }
                            100% { background-position: 200% 0; }
                        }
                        .premium-badge, .animated-gold-bg {
                            background: linear-gradient(90deg, #ffde5e, #ffef97, #ffde5e);
                            background-size: 200% 100%;
                            animation: shine 4s linear infinite;
                            color: #2d3748;
                            font-weight: 700;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        }
                    `}</style>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold premium-badge">
                        Premium Member
                    </span>
                    {userStatus.planName && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-800 text-blue-100">
                            {userStatus.planName}
                        </span>
                    )}
                </div>
            );
        } else {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-700 text-gray-300">
                    Standard User
                </span>
            );
        }
    };

    if (loading || userStatus === null) {
        return <div className="text-center text-gray-400">Loading Dashboard...</div>;
    }

    const freeRdfcTests = rdfcTests.filter(t => t.isFree);
    const paidRdfcTests = rdfcTests.filter(t => !t.isFree);
    const freeAddOnTests = addOnTests.filter(t => t.isFree);
    const paidAddOnTests = addOnTests.filter(t => !t.isFree);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                 <h2 className="text-3xl font-bold text-white">User Dashboard</h2>
                 {renderUserStatus()}
            </div>

            {/* Free RDFC Articles & Tests Section */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">Free RDFC Articles & Tests</h3>
                    {freeRdfcTests.length > 3 && (
                        <button onClick={() => navigate('allTests', { tests: freeRdfcTests.map(t => ({...t, article: linkedArticles[t.id]})), title: "All Free RDFC Articles & Tests", contentType: 'rdfc' })} className="text-sm font-semibold text-gray-400 hover:text-white">
                            View All &rarr;
                        </button>
                    )}
                </div>
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
                                {freeRdfcTests.slice(0, 3).length > 0 ? freeRdfcTests.slice(0, 3).map(test => renderRDFCArticleRow(test, false)) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-400">No free RDFC articles found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {freeRdfcTests.length > 3 && (
                    <div className="text-center mt-4">
                        <button onClick={() => navigate('allTests', { tests: freeRdfcTests.map(t => ({...t, article: linkedArticles[t.id]})), title: "All Free RDFC Articles & Tests", contentType: 'rdfc' })} className="text-sm font-semibold text-gray-400 hover:text-white">
                            View All &rarr;
                        </button>
                    </div>
                )}
            </div>

            {/* Premium RDFC Articles & Tests Section */}
            <div className="border-t border-gray-700 pt-8 mb-12">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Premium RDFC Articles & Tests</h2>
                    {!userStatus?.isSubscribed && (
                        <button 
                            onClick={() => navigate('subscription')}
                            className="mt-4 md:mt-0 bg-amber-500 text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-amber-400 shadow transition-all transform hover:scale-105"
                        >
                            Subscribe Now to Unlock
                        </button>
                    )}
                </div>
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
                                {paidRdfcTests.length > 0 ? paidRdfcTests.slice(0, 3).map(test => renderRDFCArticleRow(test, !userStatus?.isSubscribed)) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-400">No premium RDFC articles found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {paidRdfcTests.length > 3 && (
                    <div className="text-center mt-4">
                        <button onClick={() => navigate('allTests', { tests: paidRdfcTests.map(t => ({...t, article: linkedArticles[t.id]})), title: "All Premium RDFC Articles & Tests", contentType: 'rdfc' })} className="text-sm font-semibold text-gray-400 hover:text-white">
                            View All &rarr;
                        </button>
                    </div>
                )}
            </div>

            {/* Add-On Tests Section */}
            <div className="border-t border-gray-700 pt-8">
                 <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white mb-6">Add-On Tests</h2>
                    {addOnTests.length > 3 && (
                        <button onClick={() => navigate('allTests', { tests: addOnTests, title: "All Add-On Tests", contentType: 'addon' })} className="text-sm font-semibold text-gray-400 hover:text-white mb-6">
                            View All &rarr;
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {freeAddOnTests.slice(0, 3).length > 0 && freeAddOnTests.slice(0, 3).map(test => renderTestCard(test, false))}
                    {paidAddOnTests.slice(0, 3).length > 0 && paidAddOnTests.slice(0, 3).map(test => renderTestCard(test, !userStatus?.isSubscribed))}
                    {(freeAddOnTests.slice(0, 3).length === 0 && paidAddOnTests.slice(0, 3).length === 0) && (
                        <div className="col-span-full bg-gray-800 text-center p-12 rounded-lg shadow-md">
                            <h3 className="text-xl font-semibold text-gray-200">No Add-On Tests Available.</h3>
                            <p className="text-gray-500 mt-2">Please check back later!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;