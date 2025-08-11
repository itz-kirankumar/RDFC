import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { motion } from 'framer-motion';

// A subtle SVG Quote Icon that matches the new theme
const QuoteIcon = () => (
    <svg className="absolute top-6 left-6 w-16 h-16 text-gray-800" fill="currentColor" viewBox="0 0 32 32">
        <path d="M9.984 20.016q0 2.016-1.008 3.552t-2.64 2.16-3.312 0.624q-2.112 0-3.312-1.344t-1.152-3.408q0-2.352 1.152-4.992t2.688-4.512q1.536-1.872 3.168-3.456t2.928-2.688l1.488 1.104q-2.112 1.488-4.224 4.032t-2.4 4.896q0 0.816 0.432 1.248t1.104 0.432q1.2 0 2.208-0.912t1.008-2.544zM26.016 20.016q0 2.016-1.008 3.552t-2.64 2.16-3.312 0.624q-2.112 0-3.312-1.344t-1.152-3.408q0-2.352 1.152-4.992t2.688-4.512q1.536-1.872 3.168-3.456t2.928-2.688l1.488 1.104q-2.112 1.488-4.224 4.032t-2.4 4.896q0 0.816 0.432 1.248t1.104 0.432q1.2 0 2.208-0.912t1.008-2.544z"></path>
    </svg>
);

const StarRating = ({ rating }) => (
    <div className="flex z-10">
        {[...Array(5)].map((_, index) => (
            <svg key={index} className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);

// Custom loading spinner component with the new theme color
const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
    </div>
);

const AllTestimonialsPage = ({ navigate }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    // This is your original useEffect hook to fetch REAL data from Firebase.
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
                console.error("Error fetching all reviews:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFeedbacks();
    }, []);
    
    // Animation variants for the container and items
    const containerVariants = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
    };

    return (
        <div className="bg-[#121212] min-h-screen w-full py-16 sm:py-24 font-sans text-white">
            <motion.div 
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-14 gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">What Our Members Say</h1>
                        <p className="text-gray-400 mt-2 text-lg">Real feedback from our dedicated community of learners.</p>
                    </div>
                    <button 
                        onClick={() => navigate('home')} 
                        className="bg-gray-800 text-white px-6 py-3 rounded-md font-semibold hover:bg-gray-700 shadow-md transition-colors self-start sm:self-center border border-gray-700"
                    >
                        &larr; Back to Home
                    </button>
                </div>
                {loading ? (
                    <LoadingSpinner />
                ) : feedbacks.length > 0 ? (
                    <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {feedbacks.map(feedback => (
                            <motion.div 
                                key={feedback.id} 
                                className="bg-[#1E1E1E] rounded-lg p-6 flex flex-col shadow-lg h-full border border-gray-800 relative overflow-hidden transition-transform hover:-translate-y-1"
                                variants={itemVariants}
                            >
                                <QuoteIcon />
                                <div className="flex-grow mb-5 z-10 pt-10">
                                    <p className="text-gray-300 text-base leading-relaxed">"{feedback.feedbackText}"</p>
                                </div>
                                <div className="mt-auto pt-5 border-t border-gray-700/50 z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <img 
                                                src={feedback.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(feedback.userName)}&background=FFC107&color=121212&bold=true`} 
                                                alt={feedback.userName} 
                                                className="w-11 h-11 rounded-full mr-4 border-2 border-gray-600"
                                            />
                                            <span className="font-semibold text-white text-base">{feedback.userName}</span>
                                        </div>
                                        <StarRating rating={feedback.rating} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="text-center text-gray-400 bg-[#1E1E1E] p-16 rounded-lg border border-gray-800">
                        <h3 className="text-2xl font-bold text-white">More testimonials coming soon!</h3>
                        <p className="mt-2 max-w-md mx-auto">No testimonials have been approved by the admin yet. Please check back later to see what our members think.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default AllTestimonialsPage;
