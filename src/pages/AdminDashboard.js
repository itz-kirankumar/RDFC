import React from 'react';
import { 
    FaTicketAlt, FaUsers, FaListAlt, FaChartLine, FaTags, 
    FaStar, FaSpellCheck, FaSitemap, FaLink, FaBook 
} from 'react-icons/fa';

const AdminDashboard = ({ navigate }) => {
    
    const DashboardCard = ({ onClick, title, description, icon, iconBgColor }) => (
        <div className="dashboard-card-glow relative h-full">
            <button 
                onClick={onClick} 
                className="relative w-full h-full p-6 bg-slate-800/60 backdrop-blur-md border border-slate-700/80 rounded-xl 
                           shadow-lg hover:border-slate-600 transition-all duration-300 text-left flex flex-col overflow-hidden"
            >
                <div className="flex-shrink-0">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${iconBgColor}`}>
                        {icon}
                    </div>
                </div>
                
                <div className="mt-4 flex flex-col flex-grow">
                    <h2 className="text-xl font-bold text-slate-100">{title}</h2>
                    <p className="mt-2 text-slate-400 text-sm flex-grow">{description}</p>
                </div>
            </button>
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-slate-900 text-white p-4 sm:p-6 lg:p-8">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/30 via-slate-900 to-slate-900 -z-10"></div>

            <div className="max-w-7xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-100">Admin Dashboard</h1>
                    <p className="mt-2 text-lg text-slate-400">Welcome back! Manage your platform from here.</p>
                </header>

                {/* LAYOUT CHANGE: Main grid is now a balanced 2-column layout on extra-large screens */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    
                    {/* Section 1: Content & Test Management */}
                    <section>
                        <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/60 h-full">
                            <h2 className="text-2xl font-semibold text-slate-200 mb-6">Content & Test Management</h2>
                            {/* LAYOUT CHANGE: Sub-grid is now consistently 2 columns to avoid gaps */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* LAYOUT CHANGE: "Test Manager" spans 2 columns for emphasis and to fill the grid */}
                                <div className="md:col-span-2">
                                    <DashboardCard 
                                        onClick={() => navigate('manageTests')} 
                                        title="Test Manager"
                                        description="Create, edit, and publish Sectionals and Mock Tests."
                                        icon={<FaListAlt className="text-white text-2xl"/>}
                                        iconBgColor="bg-sky-600"
                                    />
                                </div>
                                
                                <DashboardCard 
                                    onClick={() => navigate('manageRDFCArticles')} 
                                    title="Material Manager"
                                    description="Link Google Drive materials and articles to specific tests."
                                    icon={<FaBook className="text-white text-2xl"/>}
                                    iconBgColor="bg-rose-600"
                                />
                                <DashboardCard 
                                    onClick={() => navigate('manageVocab')} 
                                    title="Vocab Manager"
                                    description="Create and manage daily vocabulary wordlists for users."
                                    icon={<FaSpellCheck className="text-white text-2xl"/>}
                                    iconBgColor="bg-teal-600"
                                />
                                <DashboardCard 
                                    onClick={() => navigate('manageReviews')} 
                                    title="Manage Reviews"
                                    description="Approve and feature user-submitted testimonials."
                                    icon={<FaStar className="text-white text-2xl"/>}
                                    iconBgColor="bg-yellow-500"
                                />
                                <DashboardCard 
                                    onClick={() => navigate('manageTabs')} 
                                    title="Tab Manager"
                                    description="Organize tests into categories and tabs for the user dashboard."
                                    icon={<FaSitemap className="text-white text-2xl"/>}
                                    iconBgColor="bg-amber-600"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Business & Users */}
                    <section>
                        <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/60 h-full">
                            <h2 className="text-2xl font-semibold text-slate-200 mb-6">Business & Users</h2>
                            {/* LAYOUT CHANGE: Sub-grid is now consistently 2 columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* LAYOUT CHANGE: "Plan Access Mapper" spans 2 columns for emphasis */}
                                <div className="md:col-span-2">
                                    <DashboardCard 
                                    onClick={() => navigate('earnings')} 
                                    title="Earnings Dashboard"
                                    description="Track revenue, settled payments, and manage sharing."
                                    icon={<FaChartLine className="text-white text-2xl"/>}
                                    iconBgColor="bg-emerald-600"
                                />
                                </div>
                                
                                <DashboardCard 
                                    onClick={() => navigate('userManagement')} 
                                    title="User Management"
                                    description="View users and manually grant premium access."
                                    icon={<FaUsers className="text-white text-2xl"/>}
                                    iconBgColor="bg-slate-600"
                                />
                                <DashboardCard 
                                    onClick={() => navigate('manageSubscriptions')} 
                                    title="Subscription Plans"
                                    description="Manage pricing, features, and plan details."
                                    icon={<FaTags className="text-white text-2xl"/>}
                                    iconBgColor="bg-pink-600"
                                />
                                <DashboardCard 
                                        onClick={() => navigate('planMapper')} 
                                        title="Plan Access Mapper"
                                        description="Crucial: Link subscription plans to test tabs to grant access."
                                        icon={<FaLink className="text-white text-2xl"/>}
                                        iconBgColor="bg-gradient-to-br from-indigo-500 to-purple-600"
                                    />
                                <DashboardCard 
                                    onClick={() => navigate('manageSupport')} 
                                    title="Support Center"
                                    description="View and respond to user support tickets."
                                    icon={<FaTicketAlt className="text-white text-2xl"/>}
                                    iconBgColor="bg-cyan-600"
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            
            <style>{`
                .dashboard-card-glow::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(99, 102, 241, 0.2), transparent 40%);
                    border-radius: 0.75rem;
                    opacity: 0;
                    transition: opacity 0.3s ease-in-out;
                    z-index: 1;
                }
                .dashboard-card-glow:hover::before {
                    opacity: 1;
                }
                .dashboard-card-glow > button {
                    z-index: 2;
                }
            `}</style>
            
            <script>{`
                document.querySelectorAll('.dashboard-card-glow').forEach(card => {
                    card.onmousemove = e => {
                        const rect = card.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        card.style.setProperty('--mouse-x', x + 'px');
                        card.style.setProperty('--mouse-y', y + 'px');
                    };
                });
            `}</script>

        </div>
    );
};

export default AdminDashboard;