import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch } from '@headlessui/react';

const AdminTestManager = ({ navigate }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // State to handle the current filter

    // Fetch tests and order them by creation time
    const fetchTests = async () => {
        setLoading(true);
        try {
            const testsRef = collection(db, 'tests');
            // Query is ordered by 'createdAt' in descending order to show the latest tests first.
            // Note: This requires a 'createdAt' field (e.g., a serverTimestamp) on your test documents in Firestore.
            const q = query(testsRef, orderBy("createdAt", "desc"));
            const testsSnapshot = await getDocs(q);
            setTests(testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching tests: ", error);
            alert("Could not fetch tests. Ensure 'createdAt' field exists and you have the necessary Firestore indexes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    const handleDelete = async (testId) => {
        if (window.confirm("Are you sure you want to delete this test permanently?")) {
            try {
                await deleteDoc(doc(db, 'tests', testId));
                fetchTests(); // Refresh list
                alert("Test deleted.");
            } catch (error) {
                console.error("Error deleting test: ", error);
                alert("Failed to delete test.");
            }
        }
    };
    
    const togglePublish = async (test) => {
        try {
            await updateDoc(doc(db, 'tests', test.id), { isPublished: !test.isPublished });
            fetchTests(); // Refresh list
        } catch (error) {
            console.error("Error updating publish status: ", error);
        }
    };

    // Filter tests based on the selected type
    const filteredTests = tests.filter(test => {
        if (filter === 'ALL') return true;
        // This assumes your test documents have a 'type' field with values like 'TEST', 'SECTIONAL', or 'MOCK'
        return test.type === filter;
    });

    const getButtonClass = (buttonFilter) => {
        return filter === buttonFilter
            ? 'bg-white text-gray-900' // Active style
            : 'bg-gray-700 text-white hover:bg-gray-600'; // Inactive style
    };

    const getTypeClass = (testType) => {
        switch (testType) {
            case 'MOCK':
                return 'bg-blue-200 text-blue-800';
            case 'SECTIONAL':
                return 'bg-purple-200 text-purple-800';
            case 'TEST':
                return 'bg-green-200 text-green-800';
            default:
                return 'bg-gray-200 text-gray-800';
        }
    };

    if (loading) return <div className="text-center text-gray-400">Loading Tests...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Test Manager</h1>
                
                {/* **FIX**: Filter controls updated with "Tests" option */}
                <div className="flex space-x-2 bg-gray-800 p-1 rounded-md">
                    <button onClick={() => setFilter('ALL')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors ${getButtonClass('ALL')}`}>All</button>
                    <button onClick={() => setFilter('TEST')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors ${getButtonClass('TEST')}`}>Tests</button>
                    <button onClick={() => setFilter('SECTIONAL')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors ${getButtonClass('SECTIONAL')}`}>Sectional</button>
                    <button onClick={() => setFilter('MOCK')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors ${getButtonClass('MOCK')}`}>Mock</button>
                </div>

                <button 
                    onClick={() => navigate('createTest')} 
                    className="bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow transition-all transform hover:scale-105"
                >
                    + Create New Test
                </button>
            </div>
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Access</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {/* Map over the filtered list of tests */}
                            {filteredTests.map(test => (
                                <tr key={test.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{test.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {/* **FIX**: Dynamically set class for different test types */}
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeClass(test.type)}`}>
                                            {test.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{test.isFree ? 'Free' : 'Paid'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        <Switch checked={test.isPublished || false} onChange={() => togglePublish(test)} className={`${test.isPublished ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                                            <span className={`${test.isPublished ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                                        </Switch>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => navigate('createTest', { testToEdit: test })} className="text-gray-300 hover:text-white">Edit</button>
                                        <button onClick={() => handleDelete(test.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {/* Display a message if no tests match the filter */}
                 {filteredTests.length === 0 && !loading && (
                    <div className="text-center py-10">
                        <p className="text-gray-400">No tests found for the selected filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTestManager;