import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const Star = ({ filled, onClick }) => (
    <svg onClick={onClick} className={`w-8 h-8 cursor-pointer ${filled ? 'text-yellow-400' : 'text-gray-600'} hover:text-yellow-300 transition-colors`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const FeedbackForm = ({ userStatus, onSuccessfulSubmit }) => {
    // We still need useAuth for the user's ID and name upon submission
    const { user, userData } = useAuth(); 
    
    const [rating, setRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleRating = (rate) => setRating(rate);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError("Please select a star rating.");
            return;
        }
        if (feedbackText.trim().length < 15) {
            setError("Feedback must be at least 15 characters long.");
            return;
        }
        
        setIsSubmitting(true);
        setError('');

        try {
            await addDoc(collection(db, 'feedbacks'), {
                userId: user.uid,
                userName: userData.displayName,
                userPhotoURL: userData.photoURL,
                rating,
                feedbackText,
                isApproved: false,
                createdAt: serverTimestamp(),
            });

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { hasSubmittedFeedback: true });

            // Notify the parent component that the submission was successful
            onSuccessfulSubmit();

        } catch (err) {
            console.error("Error submitting feedback:", err);
            setError("An error occurred. Please try again later.");
            setIsSubmitting(false);
        }
    };

    // If the user has already submitted, render nothing.
    if (userStatus?.hasSubmittedFeedback) {
        return null;
    }

    // If the user isn't a premium subscriber, render nothing.
    if (!userStatus?.isSubscribed) {
        return null;
    }

    // Render the form
    return (
        <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg my-8 border border-gray-700">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Share Your Experience</h3>
            <p className="text-gray-400 mb-6">As a premium member, your feedback helps us grow. Please share your thoughts!</p>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-300 font-semibold mb-2">Your Rating</label>
                    <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} filled={star <= rating} onClick={() => handleRating(star)} />
                        ))}
                    </div>
                </div>
                <div className="mb-4">
                    <label htmlFor="feedbackText" className="block text-gray-300 font-semibold mb-2">Your Feedback</label>
                    <textarea
                        id="feedbackText"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Tell us what you liked or where we can improve..."
                    />
                </div>
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
            </form>
        </div>
    );
};

export default FeedbackForm;