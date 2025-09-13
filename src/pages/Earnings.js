import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, orderBy, getDocs, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
// ENHANCEMENT: Added icons for pagination
import { FaCog, FaHistory, FaRupeeSign, FaClock, FaChartLine, FaSun, FaHandHoldingUsd, FaCheckDouble, FaFileCsv, FaSearch, FaSortAmountDown, FaSortAmountUp, FaChartPie, FaExclamationTriangle, FaBoxOpen, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Helper Functions & Constants ---
const safeToDate = (timestamp) => timestamp?.toDate ? timestamp.toDate() : (timestamp ? new Date(timestamp) : null);
const formatTimestamp = (timestamp) => {
    const date = safeToDate(timestamp);
    return date ? date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
};
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444'];


// --- Reusable UI Components ---

const ConfirmationModal = ({ isOpen, setIsOpen, title, message, onConfirm }) => (
    <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                <div className="fixed inset-0 bg-black/70" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-800 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex items-center"><FaExclamationTriangle className="text-yellow-400 mr-3"/>{title}</Dialog.Title>
                    <div className="mt-2"><p className="text-sm text-slate-400">{message}</p></div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 focus:outline-none" onClick={() => setIsOpen(false)}>Cancel</button>
                        <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none" onClick={onConfirm}>Confirm</button>
                    </div>
                </Dialog.Panel>
            </div></div>
        </Dialog>
    </Transition>
);

const FormInput = ({ label, type = 'number', value, onChange, placeholder = '' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50" />
    </div>
);

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
                            <button type="button" className="bg-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-500" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="bg-blue-600 px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-500" onClick={onSave}>Save Settings</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

const StatCard = ({ title, value, icon }) => (
    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/80 shadow-lg transition-all duration-300 hover:bg-slate-800 hover:border-slate-600">
        <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <div className="p-2 bg-slate-700/50 rounded-lg">{icon}</div>
        </div>
        <p className="text-white text-3xl font-bold mt-2">₹{(value || 0).toFixed(2)}</p>
    </div>
);

const AnalyticsSection = ({ analyticsSummary, timeRange, setTimeRange }) => (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 mb-8">
         <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 px-2 gap-4">
             <h3 className="font-bold text-white text-lg">Financial Analytics</h3>
             <Menu as="div" className="relative self-end sm:self-auto">
                <Menu.Button className="bg-slate-700 px-3 py-1.5 rounded-md text-sm hover:bg-slate-600">Last {timeRange} Days</Menu.Button>
                <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                    <Menu.Items className="absolute right-0 mt-2 w-32 origin-top-right divide-y divide-slate-600 rounded-md bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        <div className="px-1 py-1"><Menu.Item>{({ active }) => (<button onClick={() => setTimeRange(7)} className={`${active ? 'bg-slate-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Last 7 Days</button>)}</Menu.Item></div>
                        <div className="px-1 py-1"><Menu.Item>{({ active }) => (<button onClick={() => setTimeRange(30)} className={`${active ? 'bg-slate-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Last 30 Days</button>)}</Menu.Item></div>
                        <div className="px-1 py-1"><Menu.Item>{({ active }) => (<button onClick={() => setTimeRange(90)} className={`${active ? 'bg-slate-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Last 90 Days</button>)}</Menu.Item></div>
                    </Menu.Items>
                </Transition>
             </Menu>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-4 flex items-center"><FaChartLine className="mr-2 text-emerald-400"/>Sales Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsSummary.trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1' }} interval="preserveStartEnd" />
                        <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} formatter={(value) => `₹${value.toFixed(2)}`} />
                        <Line type="monotone" dataKey="revenue" name="Daily Revenue" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-4 flex items-center"><FaChartPie className="mr-2 text-blue-400"/>Plan Contribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={analyticsSummary.planData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={{ stroke: '#94a3b8' }} label={{ fill: '#e2e8f0', fontSize: 13 }}>
                            {analyticsSummary.planData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#d3d3d3', border: '1px solid #334155' }} formatter={(value, name) => [`₹${value.toFixed(2)}`, name]} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const TableSkeletonLoader = () => (
    <div className="p-4">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex space-x-4 border-b border-slate-800 py-4">
                <div className="flex-1 space-y-3 py-1">
                    <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
                 <div className="h-8 bg-slate-700 rounded w-1/6"></div>
            </div>
        ))}
    </div>
);

const EmptyState = ({ message }) => (
    <div className="text-center p-8 text-slate-400">
        <FaBoxOpen className="mx-auto text-4xl mb-4 text-slate-500" />
        <p>{message}</p>
    </div>
);

const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// ENHANCEMENT: Pagination Component
const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border-t border-slate-700">
            <span className="text-sm text-slate-400">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
                <button onClick={handlePrevious} disabled={currentPage === 1} className="pagination-btn">
                    <FaChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={handleNext} disabled={currentPage === totalPages} className="pagination-btn">
                    <FaChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};


// --- Main Earnings Component ---
export default function Earnings() {
    // --- State and Hooks ---
    const { userData } = useAuth();
    const [unsettledItems, setUnsettledItems] = useState([]);
    const [settledItems, setSettledItems] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('unsettled');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isSettlingAll, setIsSettlingAll] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
    const [timeRange, setTimeRange] = useState(30);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [myPlanShares, setMyPlanShares] = useState({});
    const [charges, setCharges] = useState(0);

    // ENHANCEMENT: State for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // --- Data Fetching and Business Logic ---
    useEffect(() => {
        if (!userData?.uid || !userData?.isAdmin) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const listeners = [];
        const commonQueryErrorHandler = (error, type) => console.error(`Error fetching ${type}:`, error);
        const transactionTypes = [
            { status: "unsettled", setter: setUnsettledItems, type: 'transaction' },
            { status: "settled", setter: setSettledItems, type: 'transaction' }
        ];
        transactionTypes.forEach(({ status, setter }) => {
            const q = query(collection(db, "transactions"), where("status", "==", status), orderBy(status === 'settled' ? "settledAt" : "createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'transaction' }));
                setter(prev => [...items, ...prev.filter(item => item.type !== 'transaction')]);
                if (status === "unsettled") setLoading(false);
            }, (err) => commonQueryErrorHandler(err, `${status} transactions`));
            listeners.push(unsubscribe);
        });
        const unsubManualUsers = onSnapshot(collection(db, 'users'), async () => {
            try {
                const [usersSnapshot, settledDocs, allAutoTransactions] = await Promise.all([
                    getDocs(query(collection(db, 'users'), where('isSubscribed', '==', true))),
                    getDocs(collection(db, 'adminSettings', userData.uid, 'settledUsers')),
                    getDocs(collection(db, 'transactions'))
                ]);
                const settledMap = new Map(settledDocs.docs.map(doc => [doc.id, doc.data()]));
                const autoTransactionUserIds = new Set(allAutoTransactions.docs.map(doc => doc.data().userId));
                const manualUnsettled = [], manualSettled = [];
                usersSnapshot.docs.forEach(doc => {
                    const user = { id: doc.id, ...doc.data() };
                    if ((user.purchaseDate && autoTransactionUserIds.has(user.id)) || (!user.planPrice && !user.pricePaid)) return;
                    const commonData = { id: user.id, userName: user.displayName || user.email, planName: user.planName || 'Manual Plan', amount: user.planPrice || user.pricePaid || 0, type: 'manual', createdAt: user.purchaseDate || null };
                    if (settledMap.has(user.id)) {
                        manualSettled.push({ ...commonData, ...settledMap.get(user.id) });
                    } else {
                        manualUnsettled.push(commonData);
                    }
                });
                setUnsettledItems(prev => [...prev.filter(item => item.type !== 'manual'), ...manualUnsettled]);
                setSettledItems(prev => [...prev.filter(item => item.type !== 'manual'), ...manualSettled]);
            } catch(err) { commonQueryErrorHandler(err, 'manual users'); }
        });
        
        // FIX: Corrected typo from 'unmanualUsers' to 'unsubManualUsers'
        listeners.push(unsubManualUsers);
        
        const unsubPlans = onSnapshot(query(collection(db, 'subscriptionPlans'), orderBy('order')), (snapshot) => setAllPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (err) => commonQueryErrorHandler(err, 'plans'));
        const unsubSettings = onSnapshot(doc(db, 'adminSettings', userData.uid), (doc) => { if (doc.exists()) { setMyPlanShares(doc.data().planShares || {}); setCharges(doc.data().charges || 0); }}, (err) => commonQueryErrorHandler(err, 'settings'));
        listeners.push(unsubPlans, unsubSettings);
        return () => listeners.forEach(unsub => unsub());
    }, [userData]);

    // ENHANCEMENT: Effect to reset page when filters or tabs change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm, sortConfig]);

    const handleSettleItem = async (item) => {
        if (!userData?.uid) return;
        const settlerName = userData.displayName || 'Admin';
        try {
            if (item.type === 'transaction') {
                await updateDoc(doc(db, 'transactions', item.id), { status: 'settled', settledAt: serverTimestamp(), settledBy: settlerName });
            } else if (item.type === 'manual') {
                await setDoc(doc(db, 'adminSettings', userData.uid, 'settledUsers', item.id), { settledAt: serverTimestamp(), settledBy: settlerName });
            }
        } catch (error) { console.error("Error settling item:", error); }
    };
    
    const handleSettleAll = async () => {
        setConfirmModalState({ isOpen: false });
        setIsSettlingAll(true);
        const settlerName = userData.displayName || 'Admin';
        const batch = writeBatch(db);
        try {
            unsettledItems.forEach(item => {
                if (item.type === 'transaction') {
                    batch.update(doc(db, 'transactions', item.id), { status: 'settled', settledAt: serverTimestamp(), settledBy: settlerName });
                } else if (item.type === 'manual') {
                    batch.set(doc(db, 'adminSettings', userData.uid, 'settledUsers', item.id), { settledAt: serverTimestamp(), settledBy: settlerName });
                }
            });
            await batch.commit();
        } catch (error) { console.error("Error settling all items:", error); } 
        finally { setIsSettlingAll(false); }
    };

    const confirmAndSettleAll = () => {
        setConfirmModalState({
            isOpen: true,
            title: 'Settle All Transactions',
            message: `Are you sure you want to settle all ${unsettledItems.length} items? This action is irreversible.`,
            onConfirm: handleSettleAll,
        });
    };

    const handleUpdateSettings = async () => {
        if (!userData || !userData.uid) return;
        try {
            await setDoc(doc(db, 'adminSettings', userData.uid), { 
                planShares: myPlanShares,
                charges: Number(charges) || 0 
            }, { merge: true });
            setIsSettingsModalOpen(false);
        } catch (error) { console.error("Error saving settings:", error); }
    };
    
    const handleRequestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const financialSummary = useMemo(() => {
        const totalUnsettledGross = unsettledItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const chargeAmount = totalUnsettledGross * (charges / 100);
        const totalUnsettledNet = totalUnsettledGross - chargeAmount;
        const totalSettled = settledItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalSales = totalUnsettledGross + totalSettled;
        const today = new Date().toLocaleDateString('en-CA');
        const salesToday = [...unsettledItems, ...settledItems].filter(item => safeToDate(item.createdAt)?.toLocaleDateString('en-CA') === today).reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalUnsettledShares = unsettledItems.reduce((acc, item) => {
            const grossAmount = item.amount || 0;
            const netAfterCharges = grossAmount * (1 - (charges / 100));
            const plan = allPlans.find(p => p.name === item.planName);
            const sharePercentage = (plan && myPlanShares[plan.id]) ? myPlanShares[plan.id] : 0;
            return acc + (netAfterCharges * (sharePercentage / 100));
        }, 0);
        return { totalUnsettledNet, totalSettled, totalSales, salesToday, totalUnsettledShares };
    }, [unsettledItems, settledItems, charges, myPlanShares, allPlans]);
    
    const analyticsSummary = useMemo(() => {
        const allItems = [...unsettledItems, ...settledItems];
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - timeRange);
        const filteredItems = allItems.filter(item => safeToDate(item.createdAt) >= dateLimit);
        const planBreakdown = filteredItems.reduce((acc, item) => {
            const planName = item.planName || 'Unknown Plan';
            acc[planName] = (acc[planName] || 0) + (item.amount || 0);
            return acc;
        }, {});
        const dailySales = Array.from({ length: timeRange }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return { date: date.toLocaleDateString('en-CA'), revenue: 0 };
        }).reverse();
        filteredItems.forEach(item => {
            const dateStr = safeToDate(item.createdAt)?.toLocaleDateString('en-CA');
            const day = dailySales.find(d => d.date === dateStr);
            if (day) day.revenue += (item.amount || 0);
        });
        return {
            planData: Object.entries(planBreakdown).map(([name, revenue], i) => ({ name, revenue, fill: PIE_COLORS[i % PIE_COLORS.length] })).sort((a,b) => b.revenue - a.revenue),
            trendData: dailySales.map(d => ({ name: new Date(d.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short'}), revenue: d.revenue })),
        };
    }, [unsettledItems, settledItems, timeRange]);

    const sortedAndFilteredItems = useMemo(() => {
        const sourceItems = activeTab === 'unsettled' ? unsettledItems : settledItems;
        const filtered = sourceItems.filter(item =>
            (item.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.planName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
        return filtered.sort((a, b) => {
            let aValue = a[sortConfig.key]; let bValue = b[sortConfig.key];
            if (sortConfig.key.includes('At')) { aValue = safeToDate(aValue)?.getTime() || 0; bValue = safeToDate(bValue)?.getTime() || 0; }
            else if (typeof aValue === 'string') { aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase(); }
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [activeTab, unsettledItems, settledItems, searchTerm, sortConfig]);

    // ENHANCEMENT: Calculate the items to display on the current page
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedAndFilteredItems]);

    const exportToCSV = () => {
        const headers = activeTab === 'unsettled' ? 'User,Plan,Amount,Purchased On,Type' : 'User,Plan,Amount,Transaction Date,Settled On,Settled By,Type';
        const rows = sortedAndFilteredItems.map(tx => {
            const rowData = activeTab === 'unsettled'
                ? [tx.userName, tx.planName, (tx.amount||0).toFixed(2), formatTimestamp(tx.createdAt), tx.type]
                : [tx.userName, tx.planName, (tx.amount||0).toFixed(2), formatTimestamp(tx.createdAt), formatTimestamp(tx.settledAt), tx.settledBy, tx.type];
            return rowData.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `earnings_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const SortableHeader = ({ label, sortKey }) => (
        <th className="th cursor-pointer group" onClick={() => handleRequestSort(sortKey)}>
            <div className="flex items-center space-x-2">
                <span>{label}</span>
                <span className="opacity-30 group-hover:opacity-100 transition-opacity">
                    {sortConfig.key === sortKey ? (sortConfig.direction === 'ascending' ? <FaSortAmountUp/> : <FaSortAmountDown/>) : <FaSortAmountDown/>}
                </span>
            </div>
        </th>
    );

    // --- Main Render ---
    return (
        <div className="earnings-page bg-slate-900 text-white min-h-screen p-4 md:p-8">
            <div className="max-w-8xl mx-auto">
                <div className="w-full min-w-0">
                    <h1 className="text-3xl font-bold text-white mb-6">Earnings Dashboard</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                        <StatCard title="Total Sales" value={financialSummary?.totalSales} icon={<FaRupeeSign className="h-5 w-5 text-emerald-400"/>}/>
                        <StatCard title="Net Unsettled" value={financialSummary?.totalUnsettledNet} icon={<FaClock className="h-5 w-5 text-yellow-400"/>}/>
                        <StatCard title="My Unsettled Share" value={financialSummary?.totalUnsettledShares} icon={<FaHandHoldingUsd className="h-5 w-5 text-violet-400"/>}/>
                        <StatCard title="Total Settled" value={financialSummary?.totalSettled} icon={<FaHistory className="h-5 w-5 text-blue-400"/>}/>
                        <StatCard title="Sales Today" value={financialSummary?.salesToday} icon={<FaSun className="h-5 w-5 text-orange-400"/>} />
                    </div>
                    <AnalyticsSection analyticsSummary={analyticsSummary} timeRange={timeRange} setTimeRange={setTimeRange} />
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/80">
                        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center space-x-2 self-start w-full sm:w-auto">
                                 <button onClick={() => setActiveTab('unsettled')} className={`tab-btn flex-1 sm:flex-none ${activeTab === 'unsettled' && 'active'}`}>Unsettled ({unsettledItems.length})</button>
                                 <button onClick={() => setActiveTab('settled')} className={`tab-btn flex-1 sm:flex-none ${activeTab === 'settled' && 'active'}`}>History ({settledItems.length})</button>
                            </div>
                            <div className="flex items-center w-full sm:w-auto space-x-2 sm:space-x-4">
                                <div className="relative flex-grow"><FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input w-full"/></div>
                                <button onClick={exportToCSV} aria-label="Export to CSV" className="action-btn-secondary"><FaFileCsv className="h-5 w-5 sm:mr-2"/><span className="hidden sm:inline">Export</span></button>
                                {unsettledItems.length > 0 && activeTab === 'unsettled' && (
                                    <button onClick={confirmAndSettleAll} disabled={isSettlingAll} className="action-btn-primary">
                                        {isSettlingAll ? <Spinner /> : <><FaCheckDouble className="h-5 w-5 sm:mr-2"/><span className="hidden sm:inline">Settle All</span></>}
                                    </button>
                                )}
                                <button onClick={() => setIsSettingsModalOpen(true)} aria-label="Open Settings" className="p-2.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"><FaCog className="h-5 w-5"/></button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {loading ? <TableSkeletonLoader /> : (sortedAndFilteredItems.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead className="border-b-2 border-slate-700">
                                        <tr>{activeTab === 'unsettled' ? <>
                                            <SortableHeader label="User" sortKey="userName"/>
                                            <SortableHeader label="Plan" sortKey="planName"/>
                                            <SortableHeader label="Amount" sortKey="amount"/>
                                            <SortableHeader label="Purchased On" sortKey="createdAt"/>
                                            <th className="th">Type</th>
                                            <th className="th text-center">Actions</th>
                                        </> : <>
                                            <SortableHeader label="User" sortKey="userName"/>
                                            <SortableHeader label="Plan" sortKey="planName"/>
                                            <SortableHeader label="Amount" sortKey="amount"/>
                                            <SortableHeader label="Transaction Date" sortKey="createdAt"/>
                                            <SortableHeader label="Settled On" sortKey="settledAt"/>
                                            <SortableHeader label="Settled By" sortKey="settledBy"/>
                                            <th className="th">Type</th>
                                        </>}</tr>
                                    </thead>
                                    <tbody>
                                        {/* ENHANCEMENT: Map over paginated items instead of the full list */}
                                        {paginatedItems.map(tx => (<tr key={tx.id} className="hover:bg-slate-800/60 transition-colors duration-200">
                                            <td className="td font-medium text-white">{tx.userName}</td>
                                            <td className="td">{tx.planName}</td>
                                            <td className="td text-emerald-400 font-semibold" style={{ textShadow: '0 0 8px rgba(52, 211, 153, 0.3)' }}>₹{(tx.amount || 0).toFixed(2)}</td>
                                            {activeTab === 'unsettled' ? <>
                                                <td className="td">{formatTimestamp(tx.createdAt)}</td>
                                                <td className="td"><span className={`pill ${tx.type === 'transaction' ? 'pill-purple' : 'pill-gray'}`}>{tx.type === 'transaction' ? 'Auto' : 'Manual'}</span></td>
                                                <td className="td text-center"><button onClick={() => handleSettleItem(tx)} className="settle-btn">Settle</button></td>
                                            </> : <>
                                                <td className="td">{formatTimestamp(tx.createdAt)}</td>
                                                <td className="td">{formatTimestamp(tx.settledAt)}</td>
                                                <td className="td">{tx.settledBy || 'N/A'}</td>
                                                <td className="td"><span className={`pill ${tx.type === 'transaction' ? 'pill-purple' : 'pill-gray'}`}>{tx.type === 'transaction' ? 'Auto' : 'Manual'}</span></td>
                                            </>}
                                        </tr>))}
                                    </tbody>
                                </table>
                            ) : <EmptyState message={`No ${activeTab} items found matching your search.`} />)}
                        </div>
                        
                        {/* ENHANCEMENT: Add Pagination controls */}
                        <Pagination 
                            currentPage={currentPage}
                            totalItems={sortedAndFilteredItems.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            </div>
            
            <style>{`
                .earnings-page .th { 
                    padding: 0.75rem 1.5rem; 
                    font-size: 0.75rem; 
                    font-weight: 600; 
                    color: #94a3b8; 
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                }
                .earnings-page .td { 
                    padding: 1rem 1.5rem; 
                    font-size: 0.875rem; 
                    color: #cbd5e1; 
                    white-space: nowrap; 
                    border-bottom: 1px solid #1e293b; 
                    vertical-align: middle; 
                }
                .earnings-page tbody tr:last-child .td { 
                    border-bottom: none; 
                }
                .earnings-page .pill { padding: 0.25rem 0.6rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; }
                .earnings-page .pill-purple { background-color: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4); }
                .earnings-page .pill-gray { background-color: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.4); }
                .earnings-page .tab-btn { justify-content: center; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: #94a3b8; transition: all 0.2s ease; }
                .earnings-page .tab-btn.active { color: #ffffff; background-color: rgba(59, 130, 246, 0.3); box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
                .earnings-page .tab-btn:not(.active):hover { background-color: #334155; color: #f1f5f9; }
                .earnings-page .search-input { background-color: #1e293b; border: 1px solid #334155; border-radius: 0.375rem; padding: 0.625rem 0.75rem 0.625rem 2.25rem; font-size: 0.875rem; color: #f1f5f9; transition: border-color 0.2s; }
                .earnings-page .search-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); }
                .earnings-page .action-btn-primary, .earnings-page .action-btn-secondary { display: flex; align-items: center; justify-content: center; padding: 0.625rem 1rem; border-radius: 0.375rem; font-weight: 600; font-size: 0.875rem; transition: background-color 0.2s; white-space: nowrap; }
                .earnings-page .action-btn-primary { background-color: #2563eb; color: white; }
                .earnings-page .action-btn-primary:hover { background-color: #1d4ed8; }
                .earnings-page .action-btn-primary:disabled { background-color: #1e40af; cursor: not-allowed; }
                .earnings-page .action-btn-secondary { background-color: #334155; color: #cbd5e1; }
                .earnings-page .action-btn-secondary:hover { background-color: #475569; }
                .earnings-page .settle-btn { background-color: #2563eb; color: white; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-weight: 600; font-size: 0.75rem; transition: background-color 0.2s; }
                .earnings-page .settle-btn:hover { background-color: #1d4ed8; }
                .earnings-page .pagination-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2.25rem;
                    height: 2.25rem;
                    border-radius: 0.375rem;
                    background-color: #334155;
                    color: #cbd5e1;
                    transition: background-color 0.2s;
                }
                .earnings-page .pagination-btn:hover:not(:disabled) {
                    background-color: #475569;
                }
                .earnings-page .pagination-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
            
            <ConfirmationModal isOpen={confirmModalState.isOpen} setIsOpen={(val) => setConfirmModalState(s => ({...s, isOpen: val}))} title={confirmModalState.title} message={confirmModalState.message} onConfirm={confirmModalState.onConfirm} />
            <SettingsModal isOpen={isSettingsModalOpen} setIsOpen={setIsSettingsModalOpen} plansToShow={allPlans} myPlanShares={myPlanShares} setMyPlanShares={setMyPlanShares} charges={charges} setCharges={setCharges} onSave={handleUpdateSettings} />
        </div>
    );
}