import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
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
    const [sortConfig, setSortConfig] = useState({ key: 'testCreatedAt', direction: 'descending' });

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const testsQuery = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
                const testsSnapshot = await getDocs(testsQuery);
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

    const unlinkedTests = tests.filter(test => !linkedArticles[test.id]);

    const sortedLinkedArticleList = useMemo(() => {
        let combinedList = Object.values(linkedArticles).map(article => {
            const test = tests.find(t => t.id === article.id);
            return {
                ...article,
                testTitle: test?.title || 'N/A',
                testCreatedAt: test?.createdAt,
            };
        });

        if (sortConfig.key) {
            combinedList.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return combinedList;
    }, [linkedArticles, tests, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? '▲' : '▼';
        }
        return null;
    };

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
        return <div className="text-center text-gray-400 p-8">Loading...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">RDFC Articles</h1>
                <button
                    onClick={() => navigate('home')}
                    className="bg-gray-800 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-700 shadow text-sm md:text-base"
                >
                    &larr; Dashboard
                </button>
            </div>

            <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{isEditing ? 'Edit Article Link' : 'Link New Article'}</h2>
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
                            className="flex-1 rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                            required
                        />
                    </div>
                    <input
                        type="text"
                        value={articleName}
                        onChange={(e) => setArticleName(e.target.value)}
                        placeholder="Article Name"
                        className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                        required
                    />
                    <textarea
                        value={articleDescription}
                        onChange={(e) => setArticleDescription(e.target.value)}
                        placeholder="Article Description"
                        rows="3"
                        className="w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                        required
                    />
                    <button type="submit" className="w-full bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow">
                        {isEditing ? 'Update Article Link' : 'Link Article to Test'}
                    </button>
                </form>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Linked Articles ({sortedLinkedArticleList.length})</h2>
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                {/* --- MOBILE CARD VIEW --- */}
                <div className="md:hidden">
                    <div className="p-4 space-y-4">
                        {sortedLinkedArticleList.map(article => (
                            <div key={article.id} className="bg-gray-700 rounded-lg p-4 flex flex-col space-y-3 shadow">
                                <div>
                                    <p className="text-xs text-gray-400">Test Title</p>
                                    <h3 className="font-bold text-white break-words">{article.testTitle}</h3>
                                </div>
                                <div className="space-y-3 border-t border-gray-600 pt-3">
                                    <div>
                                        <p className="text-xs text-gray-400">Article Name</p>
                                        <p className="text-sm text-gray-200">{article.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Description</p>
                                        <p className="text-sm text-gray-300 break-words">{article.description}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Link</p>
                                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 break-all hover:underline">{article.url}</a>
                                    </div>
                                </div>
                                <div className="flex justify-end items-center space-x-2 border-t border-gray-600 pt-3">
                                    <button onClick={() => setSelectedTestId(article.id)} className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-500">Edit</button>
                                    <button onClick={() => handleUnlinkArticle(article.id)} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-500">Unlink</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- DESKTOP TABLE VIEW --- */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase"><button onClick={() => requestSort('testTitle')} className="flex items-center space-x-1"><span>Test Title</span><span>{getSortIndicator('testTitle')}</span></button></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase"><button onClick={() => requestSort('name')} className="flex items-center space-x-1"><span>Article Name</span><span>{getSortIndicator('name')}</span></button></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Google Drive Link</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {sortedLinkedArticleList.map(article => (
                                <tr key={article.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{article.testTitle}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{article.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{article.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400"><a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate max-w-xs inline-block">{article.url}</a></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => setSelectedTestId(article.id)} className="text-gray-300 hover:text-white">Edit</button>
                                        <button onClick={() => handleUnlinkArticle(article.id)} className="text-red-500 hover:text-red-400">Unlink</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {sortedLinkedArticleList.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-400">No articles have been linked to tests yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RDFCArticlesPage;