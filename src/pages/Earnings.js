import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, orderBy, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FaCog, FaHistory, FaRupeeSign, FaClock, FaChartBar, FaChartLine, FaSun, FaHandHoldingUsd } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- FIX: Helper function to safely convert Firestore Timestamps, returning null on failure ---
const safeToDate = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    // Fallback for invalid timestamps to prevent showing incorrect dates
    return null;
};

// --- Reusable Input for Settings Modal ---
const FormInput = ({ label, type = 'number', value, onChange, placeholder = '' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white" />
    </div>
);


// --- Enhanced Settings Modal ---
const SettingsModal = ({ isOpen, setIsOpen, plansToShow, myPlanShares, setMyPlanShares, charges, setCharges, onSave }) => {
    const handleShareChange = (planId, value) => {
        const percentage = parseInt(value, 10);
        if (value === '' || (!isNaN(percentage) && percentage >= 0 && percentage <= 100)) {
            setMyPlanShares(prev => ({ ...prev, [planId]: value === '' ? '' : percentage }));
        }
    };
    
    const handleChargesChange = (e) => {
        const percentage = parseFloat(e.target.value);
        if (e.target.value === '' || (!isNaN(percentage) && percentage >= 0 && percentage <= 100)) {
            setCharges(e.target.value === '' ? '' : percentage);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/60" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Earnings Settings</Dialog.Title>
                        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="p-4 border border-gray-700 rounded-lg">
                                <h4 className="font-semibold text-gray-200 mb-2">Platform Charges</h4>
                                <FormInput label="Charges (%)" value={charges} onChange={handleChargesChange} placeholder="e.g., 2.5" />
                            </div>
                             <div className="p-4 border border-gray-700 rounded-lg">
                                <h4 className="font-semibold text-gray-200 mb-2">My Plan Shares</h4>
                                {plansToShow.map(plan => (
                                    <div key={plan.id} className="mb-3">
                                        <FormInput label={plan.name} value={myPlanShares[plan.id] || ''} onChange={e => handleShareChange(plan.id, e.target.value)} placeholder="e.g., 70" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="bg-gray-600 px-4 py-2 rounded-md text-sm" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="bg-blue-600 px-4 py-2 rounded-md text-sm font-semibold" onClick={onSave}>Save Settings</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

// --- Main Earnings Component ---
export default function Earnings() {
    const { userData } = useAuth();
    
    const [unsettledItems, setUnsettledItems] = useState([]);
    const [settledItems, setSettledItems] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('unsettled');
    
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [myPlanShares, setMyPlanShares] = useState({});
    const [charges, setCharges] = useState(0);

    useEffect(() => {
        if (!userData?.uid || !userData?.isAdmin) {
            setLoading(false);
            return;
        }

        const listeners = [];
        
        // Use a single variable to store both auto and manual items before setting state
        let currentUnsettled = [];
        let currentSettled = [];

        // --- Listener for AUTOMATED system (transactions collection) ---
        const unsettledTxQuery = query(collection(db, "transactions"), where("status", "==", "unsettled"), orderBy("createdAt", "desc"));
        const unsubUnsettledTx = onSnapshot(unsettledTxQuery, (snapshot) => {
            const autoTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'transaction' }));
            currentUnsettled = [...autoTransactions, ...currentUnsettled.filter(item => item.type !== 'transaction')];
            setUnsettledItems(currentUnsettled);
            setLoading(false);
        }, (err) => console.error("Error fetching unsettled transactions:", err));
        listeners.push(unsubUnsettledTx);

        const settledTxQuery = query(collection(db, "transactions"), where("status", "==", "settled"), orderBy("settledAt", "desc"));
        const unsubSettledTx = onSnapshot(settledTxQuery, (snapshot) => {
            const autoSettled = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'transaction' }));
            currentSettled = [...autoSettled, ...currentSettled.filter(item => item.type !== 'transaction')];
            setSettledItems(currentSettled);
        }, (err) => console.error("Error fetching settled transactions:", err));
        listeners.push(unsubSettledTx);

        // --- Listener for MANUAL system (users & adminSettings) ---
        // FIX: The core logic change is here. We get the latest auto transactions first to cross-reference
        const unsubManualUsers = onSnapshot(collection(db, 'users'), async () => {
             try {
                const usersSnapshot = await getDocs(query(collection(db, 'users'), where('isSubscribed', '==', true)));
                const settledUsersRef = collection(db, 'adminSettings', userData.uid, 'settledUsers');
                const settledDocs = await getDocs(settledUsersRef);
                const settledMap = new Map(settledDocs.docs.map(doc => [doc.id, doc.data()]));
                
                // Get all automated transactions to filter out duplicate manual entries
                const allAutoTransactions = await getDocs(collection(db, 'transactions'));
                const autoTransactionUserIds = new Set(allAutoTransactions.docs.map(doc => doc.data().userId));

                const manualUnsettled = [];
                const manualSettled = [];

                usersSnapshot.docs.forEach(doc => {
                    const user = { id: doc.id, ...doc.data() };
                    // FIX: Skip user if they have a purchase and an automated transaction exists for them
                    // This is the key change to prevent manual duplicates for auto payments.
                    if (user.purchaseDate && autoTransactionUserIds.has(user.id)) {
                        return;
                    }
                    if (!user.planPrice && !user.pricePaid) return; // Skip users without a price

                    const commonData = {
                        id: user.id, userName: user.displayName || user.email,
                        planName: user.planName || 'Manual Plan', tierText: '',
                        amount: user.planPrice || user.pricePaid || 0, type: 'manual'
                    };
                    if (settledMap.has(user.id)) {
                        manualSettled.push({ ...commonData, settledAt: settledMap.get(user.id).settledAt });
                    } else {
                        manualUnsettled.push({ ...commonData, createdAt: user.purchaseDate || null });
                    }
                });

                setUnsettledItems(prev => [...prev.filter(item => item.type !== 'manual'), ...manualUnsettled]);
                setSettledItems(prev => [...prev.filter(item => item.type !== 'manual'), ...manualSettled]);
             } catch(err) {
                 console.error("Error fetching manual users/settlements:", err)
             }
        }, (err) => console.error("Error setting up manual user listener:", err));
        listeners.push(unsubManualUsers);


        // --- Listener for Settings & Plans ---
        const plansQuery = query(collection(db, 'subscriptionPlans'), orderBy('order'));
        const unsubPlans = onSnapshot(plansQuery, (snapshot) => setAllPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        listeners.push(unsubPlans);
        
        const settingsRef = doc(db, 'adminSettings', userData.uid);
        const unsubSettings = onSnapshot(settingsRef, (doc) => { 
            if (doc.exists()) {
                const data = doc.data();
                setMyPlanShares(data.planShares || {}); 
                setCharges(data.charges || 0);
            }
        });
        listeners.push(unsubSettings);

        return () => listeners.forEach(unsub => unsub());
    }, [userData]);

    const handleSettleItem = async (item) => {
        if (!userData?.uid) return;
        if (item.type === 'transaction') {
            await updateDoc(doc(db, 'transactions', item.id), { status: 'settled', settledAt: serverTimestamp(), settledBy: userData.displayName });
        } else if (item.type === 'manual') {
            await setDoc(doc(db, 'adminSettings', userData.uid, 'settledUsers', item.id), { settledAt: serverTimestamp() });
        }
        alert('Item marked as settled!');
    };
    
    const handleUpdateSettings = async () => {
        if (!userData || !userData.uid) {
            alert("You must be logged in to save settings.");
            return;
        }
        try {
            await setDoc(doc(db, 'adminSettings', userData.uid), { 
                planShares: myPlanShares,
                charges: Number(charges) || 0 
            }, { merge: true });
            alert("Settings updated!");
            setIsSettingsModalOpen(false);
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings. Please check console for details.");
        }
    };

    const financialSummary = useMemo(() => {
        const totalUnsettledGross = unsettledItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const chargeAmount = totalUnsettledGross * (charges / 100);
        const totalUnsettledNet = totalUnsettledGross - chargeAmount;
        const totalSettled = settledItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        
        // --- FIX: Calculate Total Sales (Gross Revenue) ---
        const totalSales = totalUnsettledGross + totalSettled;
        
        const today = new Date().toLocaleDateString('en-CA');
        const salesToday = [...unsettledItems, ...settledItems]
            .filter(item => {
                const itemDate = safeToDate(item.createdAt);
                return itemDate ? itemDate.toLocaleDateString('en-CA') === today : false;
            })
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);

        const totalUnsettledShares = unsettledItems.reduce((acc, item) => {
            const grossAmount = item.amount || 0;
            const netAfterCharges = grossAmount * (1 - (charges / 100));
            const plan = allPlans.find(p => p.name === item.planName);
            let sharePercentage = 0;
            if (plan && myPlanShares[plan.id]) {
                sharePercentage = myPlanShares[plan.id];
            }
            const myShare = netAfterCharges * (sharePercentage / 100);
            return acc + myShare;
        }, 0);
            
        return { totalUnsettledNet, totalSettled, totalSales, salesToday, totalUnsettledShares };
    }, [unsettledItems, settledItems, charges, myPlanShares, allPlans]);
    
    const analyticsSummary = useMemo(() => {
        const allItems = [...unsettledItems, ...settledItems];
        const planBreakdown = allItems.reduce((acc, item) => {
            const planName = item.planName || 'Unknown Plan';
            acc[planName] = (acc[planName] || 0) + (item.amount || 0);
            return acc;
        }, {});
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dailySales = Array(30).fill(0).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return { date: date.toLocaleDateString('en-CA'), revenue: 0 };
        }).reverse();
        
        allItems.forEach(item => {
            const itemDate = safeToDate(item.createdAt);
            if (itemDate && itemDate >= thirtyDaysAgo) {
                const dateStr = itemDate.toLocaleDateString('en-CA');
                const day = dailySales.find(d => d.date === dateStr);
                if (day) day.revenue += (item.amount || 0);
            }
        });

        return {
            planData: Object.entries(planBreakdown).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue - a.revenue),
            trendData: dailySales.map(d => ({ name: new Date(d.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short'}), revenue: d.revenue })),
        };
    }, [unsettledItems, settledItems]);

    const itemsToShow = activeTab === 'unsettled' ? unsettledItems : settledItems.sort((a,b) => (safeToDate(b.settledAt)) - (safeToDate(a.settledAt)));

    const StatCard = ({ title, value, icon }) => (
        <div className="bg-gray-800 p-5 rounded-lg flex items-center space-x-4 shadow-lg">
            <div className="bg-gray-700 p-3 rounded-full">{icon}</div>
            <div>
                <p className="text-gray-400 text-sm font-medium">{title}</p>
                <p className="text-white text-2xl font-bold">₹{value.toFixed(2)}</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">Earnings Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {/* --- FIX: Updated StatCard for Total Sales --- */}
                <StatCard title="Total Sales" value={financialSummary.totalSales} icon={<FaRupeeSign className="h-6 w-6 text-green-400"/>}/>
                <StatCard title="Net Unsettled" value={financialSummary.totalUnsettledNet} icon={<FaClock className="h-6 w-6 text-yellow-400"/>}/>
                <StatCard title="My Unsettled Share" value={financialSummary.totalUnsettledShares} icon={<FaHandHoldingUsd className="h-6 w-6 text-indigo-400"/>}/>
                <StatCard title="Total Settled" value={financialSummary.totalSettled} icon={<FaHistory className="h-6 w-6 text-blue-400"/>}/>
                <StatCard title="Sales Today" value={financialSummary.salesToday} icon={<FaSun className="h-6 w-6 text-orange-400"/>}/>
            </div>
            
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg shadow-md">
                    <h3 className="font-bold text-white mb-4 flex items-center"><FaChartBar className="mr-2"/>Revenue by Plan</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsSummary.planData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="name" stroke="#A0AEC0" fontSize={12} tick={{ fill: '#A0AEC0' }} interval={0} angle={-20} textAnchor="end" height={60} />
                            <YAxis stroke="#A0AEC0" tick={{ fill: '#A0AEC0' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} formatter={(value) => `₹${value.toFixed(2)}`} />
                            <Legend />
                            <Bar dataKey="revenue" fill="#3b82f6" name="Total Revenue" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-gray-800 p-4 rounded-lg shadow-md">
                    <h3 className="font-bold text-white mb-4 flex items-center"><FaChartLine className="mr-2"/>Last 30 Days Sales Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsSummary.trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                            <XAxis dataKey="name" stroke="#A0AEC0" fontSize={12} tick={{ fill: '#A0AEC0' }} />
                            <YAxis stroke="#A0AEC0" tick={{ fill: '#A0AEC0' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} formatter={(value) => `₹${value.toFixed(2)}`} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" name="Daily Revenue" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-md">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setActiveTab('unsettled')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeTab === 'unsettled' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>Unsettled ({unsettledItems.length})</button>
                        <button onClick={() => setActiveTab('settled')} className={`px-3 py-1.5 text-sm font-medium rounded-md ${activeTab === 'settled' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>History</button>
                    </div>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-gray-400 hover:text-white"><FaCog/></button>
                </div>

                <div className="overflow-x-auto">
                    {loading ? <p className="text-center p-8">Loading...</p> : (
                        itemsToShow.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700/50">
                                    <tr>
                                        <th className="th">User</th><th className="th">Plan</th><th className="th">Amount</th>
                                        <th className="th">{activeTab === 'unsettled' ? 'Purchased On' : 'Settled On'}</th><th className="th">Type</th><th className="th">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">
                                    {itemsToShow.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="px-6 py-4 text-sm font-medium text-white">{tx.userName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-300">{tx.planName} {tx.tierText ? `(${tx.tierText})` : ''}</td>
                                            <td className="px-6 py-4 text-sm text-green-400 font-semibold">₹{(tx.amount || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-400">
                                                {/* --- FIX: Safely display the date or 'N/A' --- */}
                                                {(() => {
                                                    const date = safeToDate(activeTab === 'unsettled' ? tx.createdAt : tx.settledAt);
                                                    return date ? date.toLocaleDateString() : 'N/A';
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.type === 'transaction' ? 'bg-purple-600/50 text-purple-300' : 'bg-gray-600/50 text-gray-300'}`}>
                                                    {tx.type === 'transaction' ? 'Auto' : 'Manual'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {activeTab === 'unsettled' && (<button onClick={() => handleSettleItem(tx)} className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-700">Mark as Settled</button>)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p className="text-gray-400 text-center p-8">No {activeTab} items found.</p>
                    )}
                </div>
            </div>
            <style>{`.th { padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 500; color: #D1D5DB; text-transform: uppercase; }`}</style>
            
            <SettingsModal isOpen={isSettingsModalOpen} setIsOpen={setIsSettingsModalOpen} plansToShow={allPlans}
                myPlanShares={myPlanShares} setMyPlanShares={setMyPlanShares} charges={charges} setCharges={setCharges} onSave={handleUpdateSettings} />
        </div>
    );
}