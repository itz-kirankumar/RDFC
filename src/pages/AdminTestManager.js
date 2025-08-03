import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch } from '@headlessui/react';

const AdminTestManager = ({ navigate }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTests = async () => {
        setLoading(true);
        try {
            const testsSnapshot = await getDocs(collection(db, 'tests'));
            setTests(testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching tests: ", error);
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

    if (loading) return <div className="text-center text-gray-400">Loading Tests...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Test Manager</h1>
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
                            {tests.map(test => (
                                <tr key={test.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{test.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{test.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{test.isFree ? 'Free' : 'Paid'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        <Switch checked={test.isPublished || false} onChange={() => togglePublish(test)} className={`${test.isPublished ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}>
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
            </div>
        </div>
    );
};

export default AdminTestManager;
