import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AllTestsPage = ({ navigate, tests, title, contentType }) => {
    const { userData } = useAuth();
    const testsAttempted = userData?.testsAttempted || {};
    const [filterType, setFilterType] = useState('All');

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
                const attemptId = testsAttempted[test.id];
                const isAttempted = !!attemptId;
                if (isAttempted) {
                    return { text: "View Analysis", action: () => navigate('results', { attemptId: attemptId }), className: "text-green-400 hover:text-green-300" };
                }
                return { text: "Start Test", action: () => navigate('test', { testId: test.id }), className: "text-green-400 hover:text-green-300" };
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
        const attemptId = testsAttempted[test.id];
        const isAttempted = !!attemptId;

        let buttonText;
        let buttonAction;
        let buttonClass;

        if (isAttempted) {
            buttonText = "View Analysis";
            buttonAction = () => navigate('results', { attemptId: attemptId });
            buttonClass = "bg-green-600 hover:bg-green-700 text-white";
        } else if (isLocked) {
            buttonText = "Subscribe to Unlock";
            buttonAction = () => navigate('subscription');
            buttonClass = "bg-amber-500 hover:bg-amber-400 text-gray-900";
        } else {
            buttonText = "Start Test";
            buttonAction = () => navigate('test', { testId: test.id });
            buttonClass = "bg-white hover:bg-gray-200 text-gray-900";
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

    const filteredTests = filterType === 'All' ? tests : tests.filter(test => test.type === filterType.toUpperCase());
    const isPaidContent = tests[0] ? !tests[0].isFree : false;
    const showUnlockButton = !userData?.isSubscribed && isPaidContent;
    
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
            
            {/* Conditional Rendering for RDFC or Add-on Tests */}
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
                    {/* Filter for Add-On Tests */}
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
