import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FaEye, FaLock, FaPlay, FaCheckCircle, FaBookOpen, FaArrowLeft, FaArrowUp, FaHourglassHalf } from 'react-icons/fa';

// --- HELPER COMPONENTS ---

const CountdownTimer = ({ targetDate, onComplete }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};
        if (difference > 0) {
            timeLeft = {
                DAYS: Math.floor(difference / (1000 * 60 * 60 * 24)),
                HOURS: Math.floor((difference / (1000 * 60 * 60)) % 24),
                MINUTES: Math.floor((difference / 1000 / 60) % 60),
                SECONDS: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            if (!Object.keys(newTimeLeft).length && onComplete) { onComplete(); }
        }, 1000);
        return () => clearTimeout(timer);
    });

    if (!Object.keys(timeLeft).length) {
        return <div className="text-center font-semibold text-green-400 text-xs">Live Now</div>;
    }
    
    return (
        <div className="grid grid-cols-4 gap-1 text-white" style={{width: '180px'}}>
            {Object.entries(timeLeft).map(([interval, value]) => (
                <div key={interval} className="flex flex-col items-center justify-center bg-gray-700/50 p-1 rounded">
                    <span className="font-mono text-base font-bold text-cyan-300">{String(value).padStart(2, '0')}</span>
                    <span className="text-xs opacity-70" style={{fontSize: '0.6rem'}}>{interval}</span>
                </div>
            ))}
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---

const AllTestsPage = ({ navigate, tests: initialTests = [], title, contentType }) => {
    const { userData } = useAuth();
    const [userAttempts, setUserAttempts] = useState({});
    const [userStatus, setUserStatus] = useState(null);
    const [liveTests, setLiveTests] = useState({});
    const [visibleCount, setVisibleCount] = useState(100);

    const hasMaterials = useMemo(() => 
        initialTests.some(test => test.material || test.isMaterialOnly), 
    [initialTests]);

    useEffect(() => {
        if (!userData?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', userData.uid), (docSnap) => {
            setUserStatus(docSnap.exists() ? docSnap.data() : null);
        });
        return unsub;
    }, [userData?.uid]);

    useEffect(() => {
        if (!userData?.uid) return;
        const q = query(collection(db, "attempts"), where("userId", "==", userData.uid));
        const unsub = onSnapshot(q, (snapshot) => {
            const attemptsMap = snapshot.docs.reduce((acc, doc) => {
                const data = doc.data();
                acc[data.testId] = { id: doc.id, status: data.status };
                return acc;
            }, {});
            setUserAttempts(attemptsMap);
        });
        return unsub;
    }, [userData?.uid]);
    
    useEffect(() => {
        const checkLiveStatus = () => {
            const now = new Date().getTime();
            const newLiveTests = {};
            initialTests.forEach(test => {
                if (test.liveAt?.toDate().getTime() <= now) {
                    newLiveTests[test.id] = true;
                }
            });
            setLiveTests(newLiveTests);
        };
        const interval = setInterval(checkLiveStatus, 1000 * 60);
        checkLiveStatus();
        return () => clearInterval(interval);
    }, [initialTests]);

    const sortedTests = useMemo(() => {
        return [...initialTests].sort((a, b) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });
    }, [initialTests]);

    const getTestCategory = (test) => {
        if (test.mainType) {
            return { main: test.mainType, sub: test.subType || null };
        }
        // The `material` property is passed from the dashboard navigate function
        if (test.material) return { main: 'RDFC', sub: null };
        const oldType = test.type?.toUpperCase();
        if (oldType === 'MOCK') return { main: 'Mocks', sub: null };
        if (oldType === 'SECTIONAL') return { main: 'Sectionals', sub: null };
        if (oldType === '10MIN') return { main: '10 Min RC', sub: null };
        return { main: 'Add-Ons', sub: null };
    };

    const getIsLocked = (test) => {
        if (test.isFree) return false;
        if (!userStatus?.isSubscribed) return true;
        
        const access = userStatus.accessControl;
        if (!access) return true;
        
        const { main, sub } = getTestCategory(test);
        let requiredPermissionKey = sub ? `${main}/${sub}` : main;

        if (access.validityMap && access.validityMap[requiredPermissionKey]) {
            const expiry = access.validityMap[requiredPermissionKey];
            if (expiry && expiry.toDate() > new Date()) return false;
        }

        const hasOverallAccess = userStatus.expiryDate ? userStatus.expiryDate.toDate() > new Date() : true;
        if (!hasOverallAccess) return true;

        if (access[requiredPermissionKey] === true) return false;

        const oldKeyMap = {
            'RDFC': userStatus.rdfc_articles || userStatus.rdfc_tests,
            'Mocks': userStatus.mock,
            'Sectionals': userStatus.sectional,
            'Add-Ons': userStatus.test,
            '10 Min RC': userStatus.ten_min_tests
        };
        if (oldKeyMap[requiredPermissionKey]) return false;

        return false; // CORRECTED: Defaults to unlocked for subscribed users
    };

    const handleViewArticle = async (articleUrl, testId) => {
        if (!userData?.uid) return;
        try {
            await updateDoc(doc(db, 'users', userData.uid), { [`readArticles.${testId}`]: true });
            navigate('rdfcArticleViewer', { articleUrl, testId });
        } catch (error) {
            console.error("Error marking article as read:", error);
        }
    };
    
    const renderActionButtons = (test) => {
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        if (isScheduled) {
            return <div className="flex items-center justify-center h-full"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({ ...prev, [test.id]: true }))} /></div>;
        }
    
        const isLocked = getIsLocked(test);
        let buttons = [];
    
        if (isLocked) {
            if (userStatus?.isSubscribed) {
                buttons.push({ key: 'upgrade', text: "Upgrade", action: () => navigate('upgrade'), className: "action-btn-upgrade", icon: <FaArrowUp /> });
            } else {
                buttons.push({ key: 'unlock', text: "Unlock", action: () => navigate('subscription'), className: "action-btn-unlock", icon: <FaLock /> });
            }
        } else {
            if (test.material) {
                const isMaterialRead = userStatus?.readArticles?.[test.id];
                const { main } = getTestCategory(test);
                const viewText = main === 'RDFC' ? 'View RDFC' : 'View Material';
                const readText = main === 'RDFC' ? 'RDFC Read' : 'Material Viewed';
    
                if (isMaterialRead) {
                    buttons.push({ key: 'material', text: readText, action: () => navigate('rdfcArticleViewer', { articleUrl: test.material.url, testId: test.id }), className: "action-btn-viewed", icon: <FaCheckCircle /> });
                } else {
                    buttons.push({ key: 'material', text: viewText, action: () => handleViewArticle(test.material.url, test.id), className: "action-btn-view", icon: <FaBookOpen /> });
                }
            }
    
            if (!test.isMaterialOnly) {
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') {
                    buttons.push({ key: 'test', text: "View Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "action-btn-analysis", icon: <FaEye /> });
                } else if (attempt?.status === 'in-progress') {
                    buttons.push({ key: 'test', text: "Continue Test", action: () => navigate('test', { testId: test.id }), className: "action-btn-continue", icon: <FaPlay /> });
                } else {
                    buttons.push({ key: 'test', text: "Start Test", action: () => navigate('test', { testId: test.id }), className: "action-btn-start", icon: <FaPlay /> });
                }
            }
        }
    
        return (
            <div className="flex items-center justify-center space-x-2 w-full">
                {buttons.map(btn => (
                    <button key={btn.key} onClick={btn.action} className={`action-btn ${btn.className}`}>
                        {btn.icon}<span className="btn-text">{btn.text}</span>
                    </button>
                ))}
            </div>
        );
    };

    const renderMobileActionButtons = (test) => {
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        if (isScheduled) return <div className="tag-green">Coming Soon</div>;

        const isLocked = getIsLocked(test);
        if (isLocked) {
            let text, action, className, icon;
             if (userStatus?.isSubscribed) { text = "Upgrade"; action = () => navigate('upgrade'); className = "action-btn-upgrade"; icon = <FaArrowUp />; } 
             else { text = "Unlock"; action = () => navigate('subscription'); className = "action-btn-unlock"; icon = <FaLock />; }
             return <button onClick={action} className={`action-btn-mobile ${className}`}>{icon}<span>{text}</span></button>;
        }

        let buttons = [];
        if(test.material){
            const isMaterialRead = userStatus?.readArticles?.[test.id];
            const { main } = getTestCategory(test);
            const viewText = main === 'RDFC' ? 'View RDFC' : 'Material';
            const readText = main === 'RDFC' ? 'RDFC Read' : 'Viewed';
            if(isMaterialRead){ buttons.push({key: 'mat', text: readText, action: () => navigate('rdfcArticleViewer', { articleUrl: test.material.url, testId: test.id }), className: "action-btn-viewed"}); }
            else { buttons.push({key: 'mat', text: viewText, action: () => handleViewArticle(test.material.url, test.id), className: "action-btn-view"}); }
        }
        
        if (!test.isMaterialOnly) {
            const attempt = userAttempts[test.id];
            if (attempt?.status === 'completed') { buttons.push({ key: 'test', text: "Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "action-btn-analysis" }); }
            else if (attempt?.status === 'in-progress') { buttons.push({ key: 'test', text: "Continue", action: () => navigate('test', { testId: test.id }), className: "action-btn-continue" }); }
            else { buttons.push({ key: 'test', text: "Start", action: () => navigate('test', { testId: test.id }), className: "action-btn-start" }); }
        }
        
        return (
            <div className="flex flex-col items-end space-y-2">
                {buttons.map(btn => <button key={btn.key} onClick={btn.action} className={`action-btn-mobile ${btn.className}`}>{btn.text}</button>)}
            </div>
        );
    };

    if (!userStatus) return <div className="text-center text-gray-400 p-8">Loading User Data...</div>;
    
    const isPaidContentPresent = initialTests.some(test => !test.isFree);
    const showUnlockBanner = !userStatus.isSubscribed && isPaidContentPresent;
    
    const desktopHeaders = ['Title'];
    if (hasMaterials) {
        desktopHeaders.push('Article Name');
    }
    desktopHeaders.push('Type', 'Description', 'Actions');

    const mobileHeaders = ['Details', 'Actions'];
    
    const renderTestRow = (test) => {
        const { material } = test;
        const { main, sub } = getTestCategory(test);
        const typeColors = { MOCKS: 'type-tag-mock', SECTIONALS: 'type-tag-sectional', 'ADD-ONS': 'type-tag-addon', '10 MIN RC': 'type-tag-10min', RDFC: 'type-tag-rdfc' };
        const displayType = sub ? sub : main;

        // --- NEW LOGIC TO COMBINE DESCRIPTIONS ---
        const testDesc = test.description;
        const materialDesc = material?.description;
        let combinedDescription;

        if (testDesc && materialDesc) {
            // Case 1: Both descriptions exist. Stack them for clarity.
            combinedDescription = (
                <div>
                    <p className="truncate" title={testDesc}>{testDesc}</p>
                    <p className="text-xs text-gray-500 mt-1 italic truncate" title={materialDesc}>{materialDesc}</p>
                </div>
            );
        } else {
            // Case 2: Only one (or none) exists. Display it directly.
            const singleDesc = testDesc || materialDesc || '';
            combinedDescription = <p className="truncate" title={singleDesc}>{singleDesc}</p>;
        }
        // --- END OF NEW LOGIC ---
    
        return (
            <tr key={test.id} className="hover:bg-gray-700/50 transition-colors">
                 <td className="px-6 py-4 text-sm font-medium text-white">
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-100">{test.title}</span>
                         {test.isFree && <span className="tag-green">Free</span>}
                    </div>
                 </td>
                 {hasMaterials && (
                    <td className="px-6 py-4 text-sm text-gray-300">{material?.name || (test.isMaterialOnly ? test.title : '-')}</td>
                 )}
                 <td className="px-6 py-4 text-sm text-gray-400">
                    <span className={`tag-type ${typeColors[displayType.toUpperCase()] || 'type-tag-addon'}`}>{displayType}</span>
                 </td>
                 <td className="px-6 py-4 text-sm text-gray-400 max-w-xs">{combinedDescription}</td>
                 <td className="px-6 py-4 text-sm text-center">{renderActionButtons(test)}</td>
            </tr>
        );
    };
    
    const renderMobileTestRow = (test) => {
        const { material } = test;
        const { main } = getTestCategory(test);
        const typeColors = { MOCKS: 'type-tag-mock', SECTIONALS: 'type-tag-sectional', 'ADD-ONS': 'type-tag-addon', '10 MIN RC': 'type-tag-10min', RDFC: 'type-tag-rdfc' };

        return (
            <tr key={test.id} className="hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col items-start space-y-1">
                        <p className="text-white font-semibold flex items-center space-x-2">
                            <span>{test.title}</span>
                            {test.isFree && <span className="tag-green">Free</span>}
                        </p>
                        {material && <p className="text-gray-400 text-xs">{material.name}</p>}
                        <span className={`tag-type mt-1 ${typeColors[main.toUpperCase()] || 'type-tag-addon'}`}>{main}</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                    {renderMobileActionButtons(test)}
                </td>
            </tr>
        );
    };
    
    const renderDesktopTable = () => (
        <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/50">
                    <tr>
                        {desktopHeaders.map(h => <th key={h} className={`px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider ${h === 'Actions' ? 'text-center' : ''}`}>{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {sortedTests.slice(0, visibleCount).map(test => renderTestRow(test))}
                </tbody>
            </table>
            {sortedTests.length > visibleCount && (
                <div className="p-4 bg-gray-800 text-center">
                    <button onClick={() => setVisibleCount(prev => prev + 100)} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                        Load more...
                    </button>
                </div>
            )}
        </div>
    );
    
    const renderMobileTable = () => (
        <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-700">
             <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/50">
                    <tr>
                        {mobileHeaders.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {sortedTests.slice(0, visibleCount).map(test => renderMobileTestRow(test))}
                </tbody>
            </table>
            {sortedTests.length > visibleCount && (
                <div className="p-4 bg-gray-800 text-center">
                    <button onClick={() => setVisibleCount(prev => prev + 10)} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                        Load more...
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <style jsx>{`
            .action-btn { 
                @apply flex-1 text-sm px-4 py-2 rounded-lg flex items-center justify-center space-x-2 font-semibold 
                transition-all duration-300; 
                margin: 0 4px;
                background-color: rgba(59, 130, 246, 0.05);
                border: 1px solid rgba(59, 130, 246, 0.2);
                min-width: 120px;
            }
            .action-btn .btn-text { @apply font-semibold; }
            .action-btn-mobile { @apply text-xs px-3 py-1.5 rounded-md font-semibold transition-all duration-300 flex items-center justify-center space-x-1; }
            
            .action-btn-start, .action-btn-view { 
                color: #60a5fa; 
                background-color: rgba(59, 130, 246, 0.05);
                border: 1px solid rgba(59, 130, 246, 0.2);
            }
            .action-btn-start:hover, .action-btn-view:hover { 
                background-color: rgba(59, 130, 246, 0.15); 
                box-shadow: 0 0 12px rgba(59, 130, 246, 0.4); 
                transform: scale(1.05);
            }

            .action-btn-continue { 
                color: #fb923c;
                background-color: rgba(249, 115, 22, 0.05);
                border: 1px solid rgba(249, 115, 22, 0.2);
            }
            .action-btn-continue:hover { 
                background-color: rgba(249, 115, 22, 0.15); 
                box-shadow: 0 0 12px rgba(249, 115, 22, 0.4); 
                transform: scale(1.05);
            }

            .action-btn-analysis { 
                color: #4ade80; 
                background-color: rgba(34, 197, 94, 0.05);
                border: 1px solid rgba(34, 197, 94, 0.2);
            }
            .action-btn-analysis:hover { 
                background-color: rgba(34, 197, 94, 0.15); 
                box-shadow: 0 0 12px rgba(34, 197, 94, 0.4); 
                transform: scale(1.05);
            }

            .action-btn-viewed { 
                color: #9ca3af; 
                background-color: rgba(107, 114, 128, 0.05);
                border: 1px solid rgba(107, 114, 128, 0.2);
            }
            .action-btn-viewed:hover { 
                background-color: rgba(107, 114, 128, 0.15); 
                transform: scale(1.05);
            }

            .action-btn-unlock { 
                color: #facc15; 
                background-color: rgba(245, 158, 11, 0.05);
                border: 1px solid rgba(245, 158, 11, 0.2);
            }
            .action-btn-unlock:hover { 
                background-color: rgba(245, 158, 11, 0.15); 
                box-shadow: 0 0 12px rgba(245, 158, 11, 0.4); 
                transform: scale(1.05);
            }

            .action-btn-upgrade { 
                color: #c084fc; 
                background-color: rgba(147, 51, 234, 0.05);
                border: 1px solid rgba(147, 51, 234, 0.2);
            }
            .action-btn-upgrade:hover { 
                background-color: rgba(147, 51, 234, 0.15); 
                box-shadow: 0 0 12px rgba(147, 51, 234, 0.4); 
                transform: scale(1.05);
            }

            .tag-green { @apply inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300; }
            .tag-type { @apply inline-block px-3 py-1 text-xs font-bold rounded-md border; }
            .type-tag-mock { background-color: #9333ea20; color: #e9d5ff; border-color: #9333ea80; }
            .type-tag-sectional { background-color: #0d948820; color: #99f6e4; border-color: #0d948880; }
            .type-tag-addon { background-color: #6b728020; color: #d1d5db; border-color: #6b728080; }
            .type-tag-10min { background-color: #e11d4820; color: #fda4af; border-color: #e11d4880; }
            .type-tag-rdfc { background-color: #db277720; color: #fbcfe8; border-color: #db277780; }
            `}</style>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
                <button onClick={() => navigate('home')} className="bg-gray-700 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition-all flex items-center space-x-2"><FaArrowLeft /><span>Dashboard</span></button>
            </div>
            
            {showUnlockBanner && (
                <div className="mb-8 p-5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-center flex flex-col sm:flex-row items-center justify-center sm:justify-between shadow-lg">
                    <p className="text-lg font-bold text-white mb-2 sm:mb-0">Unlock Your Full Potential! Access all premium content now.</p>
                    <button onClick={() => navigate('subscription')} className="bg-white text-amber-700 px-6 py-2 rounded-md font-bold hover:bg-gray-200 transition-transform transform hover:scale-105">Subscribe Now</button>
                </div>
            )}

            <div className="hidden md:block">
                {sortedTests.length > 0 ? renderDesktopTable() : ( <div className="text-center text-gray-500 p-12 bg-gray-800 rounded-lg"><p>No content available in this category yet.</p></div> )}
            </div>

            <div className="md:hidden">
                {sortedTests.length > 0 ? renderMobileTable() : ( <div className="text-center text-gray-500 p-12 bg-gray-800 rounded-lg"><p>No content available in this category yet.</p></div> )}
            </div>
        </div>
    );
};

export default AllTestsPage;