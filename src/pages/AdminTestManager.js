import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch, Dialog, Transition } from '@headlessui/react';
import { FaPlus, FaFilter } from 'react-icons/fa';

// --- Helper Components (Unchanged) ---
const formatTimestamp = (timestamp) => {
    if (!timestamp) return <span className="text-gray-500">Immediately</span>;
    const date = timestamp.toDate();
    if (date <= new Date()) return <span className="text-green-400 font-semibold">Live</span>;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const ScheduleModal = ({ isOpen, setIsOpen, test, onSave }) => {
    const [scheduleOption, setScheduleOption] = useState('immediately');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    useEffect(() => {
        if (test?.liveAt) {
            const liveDate = test.liveAt.toDate();
            setScheduleOption(liveDate > new Date() ? 'later' : 'immediately');
            setScheduledDate(liveDate.toISOString().split('T')[0]);
            setScheduledTime(liveDate.toTimeString().substring(0, 5));
        } else {
            setScheduleOption('immediately');
        }
    }, [test]);

    const handleSave = () => {
        const liveAt = scheduleOption === 'later' && scheduledDate && scheduledTime
            ? Timestamp.fromDate(new Date(`${scheduledDate}T${scheduledTime}`))
            : null;
        onSave(test.id, liveAt);
        setIsOpen(false);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/30" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Schedule Test: {test?.title}</Dialog.Title>
                        <div className="mt-4 space-y-4">
                            <div><label className="flex items-center space-x-2"><input type="radio" value="immediately" checked={scheduleOption === 'immediately'} onChange={(e) => setScheduleOption(e.target.value)} className="form-radio bg-gray-700 border-gray-600" /><span>Make Live Immediately</span></label></div>
                            <div>
                                <label className="flex items-center space-x-2"><input type="radio" value="later" checked={scheduleOption === 'later'} onChange={(e) => setScheduleOption(e.target.value)} className="form-radio bg-gray-700 border-gray-600"/><span>Schedule for Later</span></label>
                                {scheduleOption === 'later' && (<div className="mt-2 pl-6 flex gap-2"><input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full rounded-md bg-gray-700 border-gray-600 text-white" /><input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full rounded-md bg-gray-700 border-gray-600 text-white" /></div>)}
                            </div>
                        </div>
                         <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="bg-gray-600 px-4 py-2 rounded-md text-sm font-medium text-white" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white" onClick={handleSave}>Save Schedule</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};


const AdminTestManager = ({ navigate }) => {
    const [tests, setTests] = useState([]);
    const [managedTabs, setManagedTabs] = useState([]);
    const [linkedArticles, setLinkedArticles] = useState({}); // NEW: State for linked articles
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);

    useEffect(() => {
        const tabsQuery = query(collection(db, 'tabManager'), orderBy('order'));
        const unsubscribeTabs = onSnapshot(tabsQuery, (snapshot) => setManagedTabs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const testsQuery = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
        const unsubscribeTests = onSnapshot(testsQuery, (snapshot) => {
            setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        
        // NEW: Listener for RDFC articles to enable smarter filtering
        const articlesQuery = collection(db, 'rdfcArticles');
        const unsubscribeArticles = onSnapshot(articlesQuery, (snapshot) => {
            const articlesMap = {};
            snapshot.forEach(doc => { articlesMap[doc.id] = doc.data(); });
            setLinkedArticles(articlesMap);
        });

        return () => { unsubscribeTabs(); unsubscribeTests(); unsubscribeArticles(); };
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Permanently delete this test?")) {
            await deleteDoc(doc(db, 'tests', id));
        }
    };

    const handleTogglePublish = async (test) => {
        await updateDoc(doc(db, 'tests', test.id), { isPublished: !test.isPublished });
    };

    const handleOpenScheduleModal = (test) => {
        setSelectedTest(test);
        setIsScheduleModalOpen(true);
    };

    const handleSaveSchedule = async (testId, liveAt) => {
        await updateDoc(doc(db, 'tests', testId), { liveAt });
    };

    const getTestCategory = (test) => {
        if (test.mainType) return `${test.mainType}${test.subType ? ` / ${test.subType}` : ''}`;
        // --- TRANSITION LOGIC ---
        if (test.type === 'TEST') return linkedArticles[test.id] ? 'RDFC (Legacy)' : 'Add-Ons (Legacy)';
        if (test.type === '10MIN') return '10 Min RC (Legacy)';
        if (test.type === 'SECTIONAL') return 'Sectionals (Legacy)';
        if (test.type === 'MOCK') return 'Mocks (Legacy)';
        return test.type; // Fallback for any other legacy types
    };

    const filteredTests = useMemo(() => {
        if (filter === 'All') return tests;
        
        const [mainFilter, subFilter] = filter.split('/');

        return tests.filter(test => {
            // New format filtering
            if (test.mainType) {
                return subFilter ? test.mainType === mainFilter && test.subType === subFilter : test.mainType === mainFilter;
            }
            
            // --- TRANSITION LOGIC FILTERING ---
            // This logic maps the filter name to the old test structure
            const legacyCategory = getTestCategory(test).replace(' (Legacy)', '');
            if (subFilter) return false; // Legacy tests don't have sub-tabs
            return legacyCategory === mainFilter;
        });
    }, [filter, tests, linkedArticles]);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Test Manager</h1>
                <button onClick={() => navigate('createTest')} className="bg-white text-gray-900 px-4 py-2 rounded-md font-semibold hover:bg-gray-200 shadow flex items-center space-x-2 text-sm md:text-base">
                    <FaPlus /> <span>Create New Test</span>
                </button>
            </div>

            <div className="flex items-center space-x-4 mb-4">
                <FaFilter className="text-gray-400" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-gray-800 border-gray-700 text-white rounded-md shadow-sm">
                    <option value="All">All Types</option>
                    {managedTabs.map(tab => (
                        <Fragment key={tab.id}>
                            <option value={tab.name}>{tab.name}</option>
                            {tab.subTabs?.map(subTab => (
                                <option key={`${tab.id}-${subTab.name}`} value={`${tab.name}/${subTab.name}`}>&nbsp;&nbsp;↳ {subTab.name}</option>
                            ))}
                        </Fragment>
                    ))}
                </select>
            </div>

            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Goes Live</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Published</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {filteredTests.map(test => (
                                <tr key={test.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{test.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{getTestCategory(test)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatTimestamp(test.liveAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><Switch checked={!!test.isPublished} onChange={() => handleTogglePublish(test)} className={`${test.isPublished ? 'bg-green-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}><span className={`${test.isPublished ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full`}/></Switch></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => handleOpenScheduleModal(test)} className="text-gray-300 hover:text-white">Schedule</button>
                                        <button onClick={() => navigate('createTest', { testToEdit: test })} className="text-gray-300 hover:text-white">Edit</button>
                                        <button onClick={() => handleDelete(test.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {filteredTests.length === 0 && !loading && (<div className="text-center py-10"><p className="text-gray-400">No tests found for this filter.</p></div>)}
            </div>
            {selectedTest && <ScheduleModal isOpen={isScheduleModalOpen} setIsOpen={setIsScheduleModalOpen} test={selectedTest} onSave={handleSaveSchedule} />}
        </div>
    );
};

export default AdminTestManager;

