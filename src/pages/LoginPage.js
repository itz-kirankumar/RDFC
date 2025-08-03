import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import SubscriptionPage from './SubscriptionPage';

const LoginPage = ({ navigate }) => {
    const { signInWithGoogle } = useAuth();
    const [freeTests, setFreeTests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch ALL free tests to display as a preview
    useEffect(() => {
        const fetchFreeTests = async () => {
            setLoading(true);
            try {
                // Simplified query to get all free, published tests
                const q = query(
                    collection(db, 'tests'), 
                    where("isFree", "==", true),
                    where("isPublished", "==", true)
                );
                const snapshot = await getDocs(q);
                const allFreeTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFreeTests(allFreeTests);
            } catch (error) {
                console.error("Error fetching free tests for login page:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFreeTests();
    }, []);

    const features = [
        {
            icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>,
            title: "Realistic CAT Interface",
            description: "Experience the actual exam environment to build confidence and master time management."
        },
        {
            icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>,
            title: "In-Depth Analytics",
            description: "Go beyond just a score. Understand your strengths and pinpoint your weaknesses with our detailed analysis."
        },
        {
            icon: <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m-5.747-6.918l11.494 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
            title: "Expertly Crafted Mocks",
            description: "Attempt tests designed by experts to perfectly match the latest CAT pattern and difficulty."
        }
    ];

    return (
        <div className="bg-gray-900 text-white min-h-screen">
            <Navbar navigate={navigate} />
            <main>
                <div className="relative pt-16 pb-32 flex content-center items-center justify-center min-h-[75vh]">
                    <div className="absolute top-0 w-full h-full bg-center bg-cover"
                         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80')" }}>
                        <span id="blackOverlay" className="w-full h-full absolute opacity-75 bg-black"></span>
                    </div>
                    <div className="container relative mx-auto text-center">
                        <h1 className="text-white font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight">
                            Your Journey to IIM Starts Here
                        </h1>
                        <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
                            Ace the CAT with our daily tests, realistic exam interface, and detailed performance analysis.
                        </p>
                        <button onClick={signInWithGoogle} className="mt-12 mx-auto flex items-center justify-center bg-white text-gray-900 px-6 py-3 rounded-lg shadow-md hover:shadow-xl hover:bg-gray-200 transition-all transform hover:scale-105 group text-lg font-semibold">
                            <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#34A853" d="M43.611 20.083H24v8h11.303c-1.649 4.657-6.08 8-11.303 8V44c5.268 0 10.046-1.947 13.611-5.657c3.565-3.71 5.789-8.604 5.789-14.343c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FBBC05" d="M9.961 14.961C11.846 12.154 15.059 10 18 10c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C28.046 2.053 23.268 0 18 0C12.955 0 8 4.955 8 10c0 1.341.138 2.65.389 3.917l1.572 1.044z"></path><path fill="#EA4335" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-4.891c-1.543 1.037-3.481 1.663-5.219 1.663c-3.454 0-6.556-1.983-8.163-4.891L4.389 35.083C7.023 40.523 12.866 44 24 44z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                            Join with Google
                        </button>
                    </div>
                </div>

                <section className="py-20 bg-gray-800">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-extrabold text-white">Try Our Free Sectional Tests</h2>
                            <p className="text-gray-400 mt-2">Get a feel for our platform. Sign in to attempt these free starter tests.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {loading ? <p className="text-center col-span-3 text-gray-400">Loading free tests...</p> 
                                     : freeTests.length > 0 ? freeTests.map(test => (
                                <div key={test.id} className="bg-gray-900 rounded-lg shadow-lg p-6 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">{test.title}</h3>
                                        <p className="text-gray-400 mt-2">{test.description}</p>
                                    </div>
                                    <button onClick={signInWithGoogle} className="mt-6 w-full bg-white text-gray-900 px-4 py-2 rounded-md font-semibold transition-colors hover:bg-gray-200">
                                        Sign In to Attempt
                                    </button>
                                </div>
                            )) : <p className="text-center col-span-3 text-gray-500">No free tests have been added by the admin yet.</p>}
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-gray-900">
                    <div className="container mx-auto px-4">
                        <SubscriptionPage embedded={true} />
                    </div>
                </section>
                
            </main>
            <footer className="bg-gray-800 pt-8 pb-6">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap items-center md:justify-between justify-center">
                        <div className="w-full md:w-4/12 px-4 mx-auto text-center">
                            <div className="text-sm text-gray-500 font-semibold py-1">
                                © {new Date().getFullYear()} RDFC.blog. All Rights Reserved.
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LoginPage;
