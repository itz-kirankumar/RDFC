// src/pages/ReviewsPage.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

// Reusable component to display star ratings
const StarRating = ({ rating }) => (
    <div className="flex text-yellow-400">
        {[...Array(5)].map((_, index) => (
            <svg
                key={index}
                className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-600'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);

const ReviewsPage = ({ navigate }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const feedbackQuery = query(
                    collection(db, 'feedbacks'),
                    where('isApproved', '==', true),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(feedbackQuery);
                setFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching reviews:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFeedbacks();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Member Testimonials</h1>
                <button 
                    onClick={() => navigate('home')} 
                    className="bg-gray-800 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-700 shadow transition-all"
                >
                    &larr; Back to Home
                </button>
            </div>
            {loading ? (
                <div className="text-center text-gray-400">Loading reviews...</div>
            ) : feedbacks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {feedbacks.map(feedback => (
                        <div key={feedback.id} className="bg-gray-800 rounded-lg p-6 flex flex-col shadow-lg">
                            <div className="flex-grow">
                                <p className="text-gray-300 italic">"{feedback.feedbackText}"</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <img 
                                            src={feedback.userPhotoURL || `https://ui-avatars.com/api/?name=${feedback.userName}&background=random`} 
                                            alt={feedback.userName} 
                                            className="w-10 h-10 rounded-full mr-3"
                                        />
                                        <span className="font-semibold text-white">{feedback.userName}</span>
                                    </div>
                                    <StarRating rating={feedback.rating} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 bg-gray-800 p-12 rounded-lg">
                    No testimonials have been approved yet.
                </div>
            )}
        </div>
    );
};

export default ReviewsPage;