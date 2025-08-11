// src/pages/AdminReviewsManager.js
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch } from '@headlessui/react';

// Reusable StarRating component for display
const StarRating = ({ rating }) => (
    <div className="flex">
        {[...Array(5)].map((_, i) => (
            <svg key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);


const AdminReviewsManager = ({ navigate }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED

    useEffect(() => {
        const feedbackQuery = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
            const fetchedFeedbacks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setFeedbacks(fetchedFeedbacks);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching feedbacks:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleToggleApproval = async (id, currentStatus) => {
        const feedbackRef = doc(db, 'feedbacks', id);
        try {
            await updateDoc(feedbackRef, { isApproved: !currentStatus });
        } catch (error) {
            console.error("Error updating approval status:", error);
            alert("Failed to update status.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to permanently delete this feedback?")) {
            try {
                await deleteDoc(doc(db, 'feedbacks', id));
                // The onSnapshot listener will automatically update the UI
            } catch (error) {
                console.error("Error deleting feedback:", error);
                alert("Failed to delete feedback.");
            }
        }
    };

    const filteredFeedbacks = feedbacks.filter(feedback => {
        if (filter === 'PENDING') return !feedback.isApproved;
        if (filter === 'APPROVED') return feedback.isApproved;
        return true; // ALL
    });

    const getButtonClass = (buttonFilter) => {
        return filter === buttonFilter ? 'bg-white text-gray-900' : 'bg-gray-700 text-white hover:bg-gray-600';
    };

    if (loading) return <div className="text-center text-gray-400">Loading Reviews...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Manage User Reviews</h1>
                <div className="flex space-x-2 bg-gray-800 p-1 rounded-md">
                    <button onClick={() => setFilter('ALL')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors ${getButtonClass('ALL')}`}>All</button>
                    <button onClick={() => setFilter('PENDING')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors ${getButtonClass('PENDING')}`}>Pending</button>
                    <button onClick={() => setFilter('APPROVED')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors ${getButtonClass('APPROVED')}`}>Approved</button>
                </div>
            </div>

            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Rating</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Feedback</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Submitted On</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {filteredFeedbacks.map(feedback => (
                                <tr key={feedback.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                        <div className="flex items-center">
                                            <img className="h-8 w-8 rounded-full mr-3" src={feedback.userPhotoURL || `https://ui-avatars.com/api/?name=${feedback.userName}&background=random`} alt={feedback.userName} />
                                            {feedback.userName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        <StarRating rating={feedback.rating} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400 max-w-sm">
                                        <p className="truncate hover:whitespace-normal">{feedback.feedbackText}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {feedback.createdAt ? new Date(feedback.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        <Switch
                                            checked={feedback.isApproved || false}
                                            onChange={() => handleToggleApproval(feedback.id, feedback.isApproved)}
                                            className={`${feedback.isApproved ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                                        >
                                            <span className={`${feedback.isApproved ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                        </Switch>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => handleDelete(feedback.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredFeedbacks.length === 0 && !loading && (
                        <div className="text-center py-10">
                            <p className="text-gray-400">No feedbacks found for this filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminReviewsManager;