import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard = ({ navigate }) => {
    const { userData } = useAuth();
    const [freeTests, setFreeTests] = useState([]);
    const [paidTests, setPaidTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTests = async () => {
            setLoading(true);
            try {
                // Single, efficient query to get all published tests
                const testsQuery = query(collection(db, 'tests'), where("isPublished", "==", true));
                const testsSnapshot = await getDocs(testsQuery);
                const allPublishedTests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Separate tests into "Free" and "Paid" arrays
                const free = allPublishedTests.filter(test => test.isFree);
                const paid = allPublishedTests.filter(test => !test.isFree);

                setFreeTests(free);
                setPaidTests(paid);

            } catch (error) {
                console.error("Error fetching tests: ", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTests();
    }, []);

    if (loading) {
        return <div className="text-center text-gray-400">Loading Dashboard...</div>;
    }

    const testsAttempted = userData?.testsAttempted || {};

    const renderTestCard = (test, isLocked = false) => {
        const attemptId = testsAttempted[test.id];
        const isAttempted = !!attemptId;

        let buttonText = "Start Test";
        let buttonAction = () => navigate('test', { testId: test.id });
        let buttonClass = "bg-white text-gray-900 hover:bg-gray-200";
        let isDisabled = isLocked;

        if (isAttempted) {
            buttonText = "View Analysis";
            buttonAction = () => navigate('results', { attemptId: attemptId });
            buttonClass = "bg-green-600 hover:bg-green-700 text-white"; // Green button for analysis
            isDisabled = false;
        } else if (isLocked) {
            buttonText = "Subscribe to Unlock";
            buttonAction = () => navigate('subscription');
            buttonClass = "bg-gray-600 text-gray-400 cursor-not-allowed";
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
                    disabled={isDisabled && !isAttempted}
                    className={`mt-4 w-full px-4 py-2 rounded-md font-semibold transition-colors ${buttonClass}`}
                >
                    {buttonText}
                </button>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                 <h2 className="text-3xl font-bold text-white mb-6">User Dashboard</h2>
                 {userData?.isSubscribed && (
                    <div className="mb-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-800 text-amber-100">
                            Premium Member
                        </span>
                    </div>
                 )}
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">Free Trial Tests</h3>
            <p className="text-gray-400 mb-6 -mt-2">Every new user can attempt any of the free tests once.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {freeTests.length > 0 ? freeTests.map(test => renderTestCard(test, false)) : (
                    <div className="col-span-full bg-gray-800 text-center p-12 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-gray-200">No Free Tests Available.</h3>
                        <p className="text-gray-500 mt-2">The admin has not added any free trial tests yet. Please check back later!</p>
                    </div>
                )}
            </div>

            {/* Premium Tests Section */}
            <div className="border-t border-gray-700 pt-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <h2 className="text-3xl font-bold text-white">Premium Tests</h2>
                    {!userData?.isSubscribed && (
                        <button 
                            onClick={() => navigate('subscription')}
                            className="mt-4 md:mt-0 bg-amber-500 text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-amber-400 shadow transition-all transform hover:scale-105"
                        >
                            Subscribe Now to Unlock
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {paidTests.length > 0 ? paidTests.map(test => renderTestCard(test, !userData?.isSubscribed)) : (
                        <div className="col-span-full bg-gray-800 text-center p-12 rounded-lg shadow-md">
                            <h3 className="text-xl font-semibold text-gray-200">No Premium Tests Available.</h3>
                            <p className="text-gray-500 mt-2">Please check back later!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
