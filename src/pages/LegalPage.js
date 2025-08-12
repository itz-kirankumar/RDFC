import React, { useEffect, useRef } from 'react';

// This is the updated page component for your legal documents.
const LegalPage = ({ navigate, pageData = {} }) => {
    // Refs are used to scroll to the specific sections of the page.
    const termsRef = useRef(null);
    const privacyRef = useRef(null);
    const cancellationRef = useRef(null); // Ref for new section
    const shippingRef = useRef(null);     // Ref for new section

    // This effect runs when the component loads or when the section in pageData changes.
    // It smoothly scrolls the user to the correct section.
    useEffect(() => {
        const section = pageData.section;
        if (section === 'terms' && termsRef.current) {
            termsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (section === 'privacy' && privacyRef.current) {
            privacyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (section === 'cancellation' && cancellationRef.current) {
            cancellationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (section === 'shipping' && shippingRef.current) {
            shippingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                    <p>Last updated: August 12, 2025</p>
                    <p>Welcome to RDFCtest.site. By accessing or using our website and services, you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, you may not access the service.</p>
                    <h3>1. Accounts & Subscriptions</h3>
                    <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service. Subscriptions are billed on a recurring basis. You are responsible for all charges incurred under your account.</p>
                    <h3>2. Intellectual Property</h3>
                    <p>The service and its original content, features, and functionality are and will remain the exclusive property of RDFCtest.site and its licensors. Our content is protected by copyright and other laws. Our trademarks may not be used in connection with any product or service without our prior written consent.</p>
                </LegalSection>

                {/* Privacy Policy Section */}
                <LegalSection title="Privacy Policy" id="privacy" refProp={privacyRef}>
                    <p>Last updated: August 12, 2025</p>
                    <p>Your privacy is important to us. It is RDFCtest.site's policy to respect your privacy regarding any information we may collect from you across our website.</p>
                    <h3>1. Information We Collect</h3>
                    <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We collect information such as your name, email address, profile picture (via Google Sign-In), and test performance data.</p>
                    <h3>2. How We Use Your Information</h3>
                    <p>We use the information we collect to operate, maintain, and provide you with the features and functionality of the service, as well as to communicate with you directly, such as to send you service-related emails.</p>
                </LegalSection>

                {/* ++ NEW: Cancellation and Refund Policy Section ++ */}
                <LegalSection title="Cancellation & Refund Policy" id="cancellation" refProp={cancellationRef}>
                    <p>Last updated: August 12, 2025</p>
                    <h3>1. Subscription Cancellation</h3>
                    <p>You may cancel your recurring subscription at any time through your account dashboard. The cancellation will take effect at the end of your current billing cycle. You will continue to have access to the service until the end of the billing period.</p>
                    <h3>2. Refund Policy</h3>
                    <p>Due to the digital nature of our services and the immediate access provided to our proprietary content and tests, we do not offer refunds on any subscription plans. Once a payment is made, it is non-refundable. We encourage users to try our free tests to evaluate the service before purchasing a subscription.</p>
                    <p>In exceptional circumstances, a refund may be considered at the sole discretion of the RDFCtest.site management. To request a refund, please contact us at <strong>admin@rdfctest.site</strong> with a detailed explanation of your issue.</p>
                </LegalSection>

                {/* ++ NEW: Shipping and Delivery Policy Section ++ */}
                <LegalSection title="Shipping & Delivery Policy" id="shipping" refProp={shippingRef}>
                    <p>Last updated: August 12, 2025</p>
                    <h3>1. Service Delivery</h3>
                    <p>RDFCtest.site provides digital services and content. There are no physical products that require shipping. All our materials, including tests, articles, and analytics, are delivered electronically through our web platform.</p>
                    <h3>2. Access upon Payment</h3>
                    <p>Upon successful completion of your subscription payment, your account will be upgraded, and you will receive instant access to all the premium features corresponding to your chosen plan. You will receive an email confirmation of your purchase and immediate access to the dashboard.</p>
                     <h3>3. WhatsApp Group Access</h3>
                    <p>For plans that include access to an exclusive WhatsApp community group, you will be sent an invitation link to the registered email address or added to the group via your registered phone number within 24 hours of successful payment.</p>
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
