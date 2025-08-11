import React, { useEffect, useRef } from 'react';

// This is the new page component for your legal documents.
const LegalPage = ({ navigate, pageData = {} }) => {
    // Refs are used to scroll to the specific sections of the page.
    const termsRef = useRef(null);
    const privacyRef = useRef(null);

    // This effect runs when the component loads or when the section in pageData changes.
    // It smoothly scrolls the user to the correct section (Terms or Privacy).
    useEffect(() => {
        const section = pageData.section;
        if (section === 'terms' && termsRef.current) {
            termsRef.current.scrollIntoView({ behavior: 'smooth' });
        } else if (section === 'privacy' && privacyRef.current) {
            privacyRef.current.scrollIntoView({ behavior: 'smooth' });
        } else {
            // If no section is specified, scroll to the top of the page.
            window.scrollTo(0, 0);
        }
    }, [pageData.section]);

    const LegalSection = ({ title, children, id, refProp }) => (
        <section id={id} ref={refProp} className="mb-16 scroll-mt-24">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 pb-3 border-b-2 border-yellow-400 inline-block">
                {title}
            </h2>
            <div className="prose prose-invert prose-lg max-w-none text-zinc-300">
                {children}
            </div>
        </section>
    );

    return (
        <div className="bg-zinc-900 min-h-screen w-full text-white font-sans">
            {/* Custom styles for the prose helper classes to style the legal text */}
            <style>{`
                .prose-invert h3 { color: #FBBF24; margin-top: 2em; }
                .prose-invert p { line-height: 1.75; }
                .prose-invert ul { list-style-position: inside; }
                .prose-invert li::marker { color: #FBBF24; }
                .scroll-mt-24 { scroll-margin-top: 6rem; }
            `}</style>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Legal Information</h1>
                    <p className="text-zinc-400 mt-4 text-lg">Our commitment to transparency and your rights.</p>
                </div>

                {/* Terms and Conditions Section */}
                <LegalSection title="Terms & Conditions" id="terms" refProp={termsRef}>
                    <p>Last updated: August 11, 2025</p>
                    <p>Welcome to RDFCtest.site. By accessing or using our website and services, you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, you may not access the service.</p>
                    
                    <h3>1. Accounts & Subscriptions</h3>
                    <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service. Subscriptions are billed on a recurring basis. You are responsible for all charges incurred under your account.</p>

                    <h3>2. Intellectual Property</h3>
                    <p>The service and its original content, features, and functionality are and will remain the exclusive property of RDFCtest.site and its licensors. Our content is protected by copyright and other laws. Our trademarks may not be used in connection with any product or service without our prior written consent.</p>
                    
                    <h3>3. User Conduct</h3>
                    <p>You agree not to use the service for any unlawful purpose or to solicit others to perform or participate in any unlawful acts. You are prohibited from sharing your account credentials or reselling access to our services. We reserve the right to terminate your use of the service for violating any of the prohibited uses.</p>

                    <h3>4. Limitation of Liability</h3>
                    <p>In no event shall RDFCtest.site, nor its directors, employees, partners, or agents, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
                </LegalSection>

                {/* Privacy Policy Section */}
                <LegalSection title="Privacy Policy" id="privacy" refProp={privacyRef}>
                    <p>Last updated: August 11, 2025</p>
                    <p>Your privacy is important to us. It is RDFCtest.site's policy to respect your privacy regarding any information we may collect from you across our website.</p>
                    
                    <h3>1. Information We Collect</h3>
                    <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We collect the following information:</p>
                    <ul>
                        <li><strong>Account Information:</strong> Name, email address, and profile picture provided via Google Sign-In.</li>
                        <li><strong>Usage Data:</strong> Test scores, performance analytics, and pages visited to improve our services.</li>
                        <li><strong>Payment Information:</strong> We use a third-party payment processor (e.g., Razorpay, Stripe) to handle transactions. We do not store your full credit card details on our servers.</li>
                    </ul>

                    <h3>2. How We Use Your Information</h3>
                    <p>We use the information we collect to operate, maintain, and provide you with the features and functionality of the service, as well as to communicate with you directly, such as to send you service-related emails.</p>

                    <h3>3. Data Security</h3>
                    <p>We take commercially reasonable measures to protect your personal information from unauthorized access, use, or disclosure. However, no method of transmission over the Internet is 100% secure.</p>

                    <h3>4. Your Rights</h3>
                    <p>You have the right to access, update, or delete the information we have on you. You can do this at any time by contacting us at admin@rdfctest.site.</p>
                </LegalSection>
                
                <div className="text-center mt-16">
                    <button 
                        onClick={() => navigate('home')} 
                        className="bg-yellow-400 text-zinc-900 px-8 py-3 rounded-lg font-bold hover:bg-yellow-300 shadow-lg transition-all"
                    >
                        &larr; Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LegalPage;
