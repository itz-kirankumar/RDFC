import React, { useState, useEffect, Fragment } from 'react';
import { collection, getDocs, query, where, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard = ({ navigate }) => {
    const { userData } = useAuth();
    const [rdfcTests, setRdfcTests] = useState([]);
    const [addOnTests, setAddOnTests] = useState([]);
    const [linkedArticles, setLinkedArticles] = useState({});
    const [loading, setLoading] = useState(true);
    const [userStatus, setUserStatus] = useState(null);
    const [userAttempts, setUserAttempts] = useState({});

    useEffect(() => {
        if (!userData?.uid) {
            setUserStatus(null);
            setUserAttempts({});
            return;
        }

        const userDocRef = doc(db, 'users', userData.uid);
        const userUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            setUserStatus(docSnap.exists() ? docSnap.data() : null);
        });

        const attemptsQuery = query(collection(db, "attempts"), where("userId", "==", userData.uid));
        const attemptsUnsubscribe = onSnapshot(attemptsQuery, (querySnapshot) => {
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

        return () => {
            userUnsubscribe();
            attemptsUnsubscribe();
        };
    }, [userData?.uid]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!userStatus) return; // Wait until user status is loaded
            setLoading(true);
            try {
                const testsQuery = query(collection(db, 'tests'), where("isPublished", "==", true));
                const testsSnapshot = await getDocs(testsQuery);
                const allPublishedTests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const articlesQuery = collection(db, 'rdfcArticles');
                const articlesSnapshot = await getDocs(articlesQuery);
                const fetchedArticles = {};
                articlesSnapshot.forEach(doc => { fetchedArticles[doc.id] = doc.data(); });
                setLinkedArticles(fetchedArticles);

                const rdfc = allPublishedTests.filter(test => fetchedArticles[test.id]);
                const addOn = allPublishedTests.filter(test => !fetchedArticles[test.id]);

                setRdfcTests(rdfc.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)));
                setAddOnTests(addOn.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)));
            } catch (error) {
                console.error("Error fetching dashboard data: ", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [userStatus]);

    const handleViewArticle = async (articleUrl, testId) => {
        if (!userData?.uid) return;
        try {
            const userRef = doc(db, 'users', userData.uid);
            await updateDoc(userRef, {
                [`readArticles.${testId}`]: true
            });
            navigate('rdfcArticleViewer', { articleUrl, testId });
        } catch (error) {
            console.error("Error marking article as read:", error);
        }
    };

    const renderTestCard = (test, isLocked) => {
        const attempt = userAttempts[test.id];
        let buttonText, buttonAction, buttonClass;

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
            <div key={test.id} className={`bg-gray-800 rounded-lg shadow-md p-6 flex flex-col justify-between transition-all ${isLocked ? 'opacity-50' : 'hover:shadow-xl hover:-translate-y-1'}`}>
                <div>
                    <h3 className="text-xl font-semibold text-white">{test.title}</h3>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${test.type === 'MOCK' ? 'bg-gray-700 text-gray-300' : 'bg-gray-600 text-gray-400'}`}>{test.type}</span>
                    <p className="text-gray-400 mt-2">{test.description}</p>
                </div>
                <button onClick={buttonAction} className={`mt-4 w-full px-4 py-2 rounded-md font-semibold transition-colors ${buttonClass}`}>{buttonText}</button>
            </div>
        );
    };

    const renderRDFCArticleRow = (test, isLocked) => {
        const article = linkedArticles[test.id];
        const isArticleRead = userStatus?.readArticles?.[test.id];
        
        const getButtonState = (type) => {
            let text, action, className, disabled = false;

            if (isLocked) {
                return { text: "Unlock", action: () => navigate('subscription'), className: "bg-amber-500 hover:bg-amber-400 text-gray-900", disabled: false };
            }

            if (type === 'article' && article) {
                if (isArticleRead) {
                    return { text: "Read", action: () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id }), className: "bg-gray-600 hover:bg-gray-700 text-gray-300", disabled: false };
                }
                return { text: "View Article", action: () => handleViewArticle(article.url, test.id), className: "bg-blue-600 hover:bg-blue-700 text-white", disabled: false };
            }
            
            if (type === 'test' && article) {
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') {
                    return { text: "View Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "bg-green-600 hover:bg-green-700 text-white", disabled: false };
                }
                if (attempt?.status === 'in-progress') {
                    return { text: "Continue Test", action: () => navigate('test', { testId: test.id }), className: "bg-orange-500 hover:bg-orange-600 text-white", disabled: false };
                }
                return { text: "Start Test", action: () => navigate('test', { testId: test.id }), className: "bg-blue-600 hover:bg-blue-700 text-white", disabled: false };
            }

            return { text: "N/A", action: null, className: "bg-gray-700 text-gray-500 cursor-not-allowed", disabled: true };
        };

        const articleButton = getButtonState('article');
        const testButton = getButtonState('test');

        return (
            // Mobile Card View
            <div key={test.id} className={`md:hidden bg-gray-800 rounded-lg p-4 mb-4 ${isLocked ? 'opacity-50' : ''}`}>
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
    
    const renderUserStatus = () => {
        if (!userStatus) return null;
        if (userStatus.isSubscribed) {
            return (
                <div className="flex items-center space-x-2">
                    <style jsx>{` @keyframes shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } .premium-badge { background: linear-gradient(90deg, #ffde5e, #ffef97, #ffde5e); background-size: 200% 100%; animation: shine 4s linear infinite; color: #2d3748; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.2); } `}</style>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold premium-badge">Premium Member</span>
                    {userStatus.planName && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-800 text-blue-100">{userStatus.planName}</span>}
                </div>
            );
        } else {
            return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-700 text-gray-300">Standard User</span>;
        }
    };

    if (loading || !userStatus) {
        return <div className="text-center text-gray-400 p-8">Loading Dashboard...</div>;
    }

    const freeRdfcTests = rdfcTests.filter(t => t.isFree);
    const paidRdfcTests = rdfcTests.filter(t => !t.isFree);
    const freeAddOnTests = addOnTests.filter(t => t.isFree);
    const paidAddOnTests = addOnTests.filter(t => !t.isFree);

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-0">User Dashboard</h2>
                 {renderUserStatus()}
            </div>

            {/* RDFC Sections */}
            {[
                { title: "Free RDFC Articles & Tests", tests: freeRdfcTests, isLocked: false },
                { title: "Premium RDFC Articles & Tests", tests: paidRdfcTests, isLocked: !userStatus.isSubscribed }
            ].map((section, index) => (
                <div key={section.title} className={`${index > 0 ? 'border-t border-gray-700 pt-8' : ''} mb-12`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-0">{section.title}</h3>
                        {section.isLocked && <button onClick={() => navigate('subscription')} className="bg-amber-500 text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-amber-400 shadow transition-all transform hover:scale-105 self-start md:self-center">Subscribe Now to Unlock</button>}
                    </div>
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-gray-800 shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Link</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Link</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {section.tests.slice(0, 3).map(test => {
                                    const article = linkedArticles[test.id];
                                    const isArticleRead = userStatus?.readArticles?.[test.id];
                                    const getButton = (type) => {
                                        if (section.isLocked) return { text: "Unlock", action: () => navigate('subscription'), className: "bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs px-3 py-1 rounded-full" };
                                        if (type === 'article') {
                                            if (isArticleRead) return { text: "Read", action: () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id }), className: "bg-gray-600 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full" };
                                            return { text: "View Article", action: () => handleViewArticle(article.url, test.id), className: "bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full" };
                                        } else {
                                            const attempt = userAttempts[test.id];
                                            if (attempt?.status === 'completed') return { text: "View Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-full" };
                                            if (attempt?.status === 'in-progress') return { text: "Continue Test", action: () => navigate('test', { testId: test.id }), className: "bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded-full" };
                                            return { text: "Start Test", action: () => navigate('test', { testId: test.id }), className: "bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full" };
                                        }
                                    };
                                    const articleBtn = getButton( 'article');
                                    const testBtn = getButton('test');
                                    return (
                                        <tr key={test.id} className={`${section.isLocked ? 'opacity-50' : ''}`}>
                                            <td className="px-6 py-4 text-sm font-medium text-white">{test.title}</td>
                                            <td className="px-6 py-4 text-sm text-gray-400">{article ? article.name : 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm"><button onClick={articleBtn.action} disabled={section.isLocked || !article} className={articleBtn.className}>{articleBtn.text}</button></td>
                                            <td className="px-6 py-4 text-sm"><button onClick={testBtn.action} disabled={section.isLocked || !article} className={testBtn.className}>{testBtn.text}</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Cards */}
                    <div className="md:hidden">
                        {section.tests.slice(0, 3).map(test => renderRDFCArticleRow(test, section.isLocked))}
                    </div>
                    {section.tests.length > 3 && (
                        <div className="text-center mt-4">
                            <button onClick={() => navigate('allTests', { tests: section.tests.map(t => ({...t, article: linkedArticles[t.id]})), title: section.title, contentType: 'rdfc' })} className="text-sm font-semibold text-gray-400 hover:text-white">View All &rarr;</button>
                        </div>
                    )}
                </div>
            ))}

            {/* Add-On Tests Section */}
            <div className="border-t border-gray-700 pt-8">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white">Add-On Tests</h2>
                    {addOnTests.length > 3 && (
                        <button onClick={() => navigate('allTests', { tests: addOnTests, title: "All Add-On Tests", contentType: 'addon' })} className="text-sm font-semibold text-gray-400 hover:text-white">View All &rarr;</button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {freeAddOnTests.slice(0, 3).map(test => renderTestCard(test, false))}
                    {paidAddOnTests.slice(0, 3).map(test => renderTestCard(test, !userStatus?.isSubscribed))}
                    {(freeAddOnTests.length === 0 && paidAddOnTests.length === 0) && (
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
