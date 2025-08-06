import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch } from '@headlessui/react';

const RDFCArticlesPage = ({ navigate }) => {
    const [tests, setTests] = useState([]);
    const [linkedArticles, setLinkedArticles] = useState({});
    const [loading, setLoading] = useState(true);
    const [articleUrl, setArticleUrl] = useState('');
    const [articleName, setArticleName] = useState('');
    const [articleDescription, setArticleDescription] = useState('');
    const [selectedTestId, setSelectedTestId] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const testsSnapshot = await getDocs(collection(db, 'tests'));
                setTests(testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching tests: ", error);
            }
        };

        const fetchLinkedArticles = () => {
            const articlesRef = collection(db, 'rdfcArticles');
            const unsubscribe = onSnapshot(articlesRef, (snapshot) => {
                const fetchedArticles = {};
                snapshot.forEach(doc => {
                    fetchedArticles[doc.id] = { ...doc.data(), id: doc.id };
                });
                setLinkedArticles(fetchedArticles);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching linked articles: ", error);
                setLoading(false);
            });
            return unsubscribe;
        };

        fetchTests();
        const unsubscribe = fetchLinkedArticles();

        return () => unsubscribe();
    }, []);

    // Auto-populate form when selecting a test that already has a linked article
    useEffect(() => {
        if (selectedTestId) {
            const article = linkedArticles[selectedTestId];
            if (article) {
                setArticleUrl(article.url || '');
                setArticleName(article.name || '');
                setArticleDescription(article.description || '');
                setIsEditing(true);
            } else {
                setArticleUrl('');
                setArticleName('');
                setArticleDescription('');
                setIsEditing(false);
            }
        } else {
            setArticleUrl('');
            setArticleName('');
            setArticleDescription('');
            setIsEditing(false);
        }
    }, [selectedTestId, linkedArticles]);

    const handleLinkArticle = async (e) => {
        e.preventDefault();
        if (!selectedTestId || !articleUrl || !articleName || !articleDescription) {
            alert("Please fill in all required fields.");
            return;
        }

        try {
            const articleRef = doc(db, 'rdfcArticles', selectedTestId);
            await setDoc(articleRef, {
                url: articleUrl,
                name: articleName,
                description: articleDescription
            });
            alert('Article linked successfully!');
            setArticleUrl('');
            setArticleName('');
            setArticleDescription('');
            setSelectedTestId('');
            setIsEditing(false);
        } catch (error) {
            console.error("Error linking article:", error);
            alert("Failed to link article.");
        }
    };

    const handleUnlinkArticle = async (testId) => {
        if (window.confirm("Are you sure you want to unlink this article?")) {
            try {
                const articleRef = doc(db, 'rdfcArticles', testId);
                await deleteDoc(articleRef);
                alert("Article unlinked successfully!");
            } catch (error) {
                console.error("Error unlinking article:", error);
                alert("Failed to unlink article.");
            }
        }
    };

    if (loading) {
        return <div className="text-center text-gray-400">Loading...</div>;
    }

    // Filter tests to show only unlinked ones
    const unlinkedTests = tests.filter(test => !linkedArticles[test.id]);
    // Filter articles to show only linked ones
    const linkedArticleList = Object.values(linkedArticles).map(article => ({
        ...article,
        testTitle: tests.find(test => test.id === article.id)?.title || 'N/A'
    }));

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">RDFC Articles Manager</h1>
                <button
                    onClick={() => navigate('home')}
                    className="bg-gray-800 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-700 shadow transition-all transform hover:scale-105"
                >
                    &larr; Back to Dashboard
                </button>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">{isEditing ? 'Edit Article Link' : 'Link New Article'}</h2>
                <form onSubmit={handleLinkArticle} className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <select
                            value={selectedTestId}
                            onChange={(e) => setSelectedTestId(e.target.value)}
                            className="flex-1 rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                        >
                            <option value="">Select a Test</option>
                            {unlinkedTests.map(test => (
                                <option key={test.id} value={test.id}>{test.title}</option>
                            ))}
                            {isEditing && selectedTestId && (
                                <option key={selectedTestId} value={selectedTestId}>{tests.find(test => test.id === selectedTestId)?.title}</option>
                            )}
                        </select>
                        <input
                            type="url"
                            value={articleUrl}
                            onChange={(e) => setArticleUrl(e.target.value)}
                            placeholder="Paste Google Drive Link"
                            className="flex-1 mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                            required
                        />
                    </div>
                    <input
                        type="text"
                        value={articleName}
                        onChange={(e) => setArticleName(e.target.value)}
                        placeholder="Article Name"
                        className="w-full mt-1 block rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                        required
                    />
                    <textarea
                        value={articleDescription}
                        onChange={(e) => setArticleDescription(e.target.value)}
                        placeholder="Article Description"
                        rows="3"
                        className="w-full mt-1 block rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                        required
                    />
                    <button type="submit" className="w-full bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow">
                        {isEditing ? 'Update Article Link' : 'Link Article to Test'}
                    </button>
                </form>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">Linked Articles</h2>
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Google Drive Link</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {linkedArticleList.map(article => (
                                <tr key={article.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{article.testTitle}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {article.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {article.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate">{article.url}</a>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => setSelectedTestId(article.id)} className="text-gray-300 hover:text-white">Edit</button>
                                        <button onClick={() => handleUnlinkArticle(article.id)} className="text-red-500 hover:text-red-400">Unlink</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RDFCArticlesPage;