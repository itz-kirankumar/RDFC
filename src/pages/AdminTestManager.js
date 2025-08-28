import React, { useState, useEffect, Fragment } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch, Dialog, Transition } from '@headlessui/react';
import { FaPlus, FaFilter } from 'react-icons/fa';

// --- Helper to format Firestore Timestamps consistently ---
const formatTimestamp = (timestamp) => {
    if (!timestamp) return <span className="text-gray-500">Immediately</span>;
    const date = timestamp.toDate();
    if (date <= new Date()) {
        return <span className="text-gray-500">Live</span>;
    }
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// --- Scheduling Modal Component (No changes needed here) ---
const ScheduleModal = ({ isOpen, setIsOpen, test, onSave }) => {
    const [scheduleOption, setScheduleOption] = useState('immediately');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    useEffect(() => {
        if (test?.liveAt) {
            const liveDate = test.liveAt.toDate();
            if (liveDate > new Date()) {
                setScheduleOption('later');
                setScheduledDate(liveDate.toISOString().split('T')[0]);
                setScheduledTime(liveDate.toTimeString().substring(0, 5));
            } else {
                setScheduleOption('immediately');
                setScheduledDate('');
                setScheduledTime('');
            }
        } else {
            setScheduleOption('immediately');
            setScheduledDate('');
            setScheduledTime('');
        }
    }, [test]);

    const handleSave = () => {
        let liveAtTimestamp = null;
        if (scheduleOption === 'later' && scheduledDate && scheduledTime) {
            const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;
            liveAtTimestamp = Timestamp.fromDate(new Date(dateTimeString));
        } else {
            liveAtTimestamp = Timestamp.now();
        }
        onSave(test.id, liveAtTimestamp);
        setIsOpen(false);
    };

    if (!test) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Schedule Test: {test.title}</Dialog.Title>
                        
                        <div className="mt-4 space-y-4">
                            <div className="flex items-center">
                                <input type="radio" id="immediately" name="schedule" value="immediately" checked={scheduleOption === 'immediately'} onChange={() => setScheduleOption('immediately')} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                                <label htmlFor="immediately" className="ml-3 block text-sm font-medium text-gray-300">Go Live Immediately</label>
                            </div>
                            <div className="flex items-center">
                                <input type="radio" id="later" name="schedule" value="later" checked={scheduleOption === 'later'} onChange={() => setScheduleOption('later')} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                                <label htmlFor="later" className="ml-3 block text-sm font-medium text-gray-300">Schedule for Later</label>
                            </div>

                            {scheduleOption === 'later' && (
                                <div className="pl-6 mt-2 space-y-2">
                                    <div>
                                        <label htmlFor="date" className="text-sm text-gray-400">Date</label>
                                        <input type="date" id="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50" />
                                    </div>
                                    <div>
                                        <label htmlFor="time" className="text-sm text-gray-400">Time</label>
                                        <input type="time" id="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={handleSave}>Save Schedule</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};


const AdminTestManager = ({ navigate }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);

    useEffect(() => {
        const fetchTests = async () => {
            setLoading(true);
            try {
                const testsRef = collection(db, 'tests');
                const q = query(testsRef, orderBy("createdAt", "desc"));
                const testsSnapshot = await getDocs(q);
                setTests(testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching tests: ", error);
                alert("Could not fetch tests. Ensure 'createdAt' field exists and you have the necessary Firestore indexes.");
            } finally {
                setLoading(false);
            }
        };
        fetchTests();
    }, []);

    const handleDelete = async (testId) => {
        if (window.confirm("Are you sure you want to delete this test permanently?")) {
            try {
                await deleteDoc(doc(db, 'tests', testId));
                // BUG FIX: Update state directly for instant UI change without flicker
                setTests(prevTests => prevTests.filter(test => test.id !== testId));
                alert("Test deleted.");
            } catch (error) {
                console.error("Error deleting test: ", error);
                alert("Failed to delete test.");
            }
        }
    };
    
    const togglePublish = async (test) => {
        try {
            const newPublishStatus = !test.isPublished;
            await updateDoc(doc(db, 'tests', test.id), { isPublished: newPublishStatus });
            // BUG FIX: Update state directly for instant UI change without flicker
            setTests(prevTests => prevTests.map(t => t.id === test.id ? { ...t, isPublished: newPublishStatus } : t));
        } catch (error) {
            console.error("Error updating publish status: ", error);
        }
    };

    const handleOpenScheduleModal = (test) => {
        setSelectedTest(test);
        setIsScheduleModalOpen(true);
    };

    const handleSaveSchedule = async (testId, liveAtTimestamp) => {
        try {
            await updateDoc(doc(db, 'tests', testId), { liveAt: liveAtTimestamp });
            // BUG FIX: Update state directly for instant UI change without flicker
            setTests(prevTests => prevTests.map(t => t.id === testId ? { ...t, liveAt: liveAtTimestamp } : t));
            alert("Test schedule updated successfully.");
        } catch (error) {
            console.error("Error updating schedule: ", error);
            alert("Failed to update schedule.");
        }
    };

    const filteredTests = tests.filter(test => {
        if (filter === 'ALL') return true;
        return test.type === filter;
    });

    const getButtonClass = (buttonFilter) => {
        return filter === buttonFilter
            ? 'bg-white text-gray-900'
            : 'bg-gray-700 text-white hover:bg-gray-600';
    };

    const getTypeClass = (testType) => {
        switch (testType) {
            case 'MOCK': return 'bg-blue-200 text-blue-800';
            case 'SECTIONAL': return 'bg-purple-200 text-purple-800';
            case '10MIN': return 'bg-rose-200 text-rose-800';
            case 'TEST': return 'bg-green-200 text-green-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    };

    if (loading) return <div className="text-center text-gray-400 p-8">Loading Tests...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-0">
            {/* --- MOBILE-FRIENDLY HEADER --- */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-white">Test Manager</h1>
                
                <div className="flex-grow md:flex-grow-0 md:flex md:space-x-2 bg-gray-800 p-1 rounded-md overflow-x-auto">
                    <div className="flex items-center space-x-2">
                        <FaFilter className="text-gray-400 ml-2 md:hidden" />
                        <button onClick={() => setFilter('ALL')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors flex-shrink-0 ${getButtonClass('ALL')}`}>All</button>
                        <button onClick={() => setFilter('TEST')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors flex-shrink-0 ${getButtonClass('TEST')}`}>Tests</button>
                        <button onClick={() => setFilter('SECTIONAL')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors flex-shrink-0 ${getButtonClass('SECTIONAL')}`}>Sectional</button>
                        <button onClick={() => setFilter('MOCK')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors flex-shrink-0 ${getButtonClass('MOCK')}`}>Mock</button>
                        <button onClick={() => setFilter('10MIN')} className={`px-4 py-2 text-sm rounded-md font-semibold transition-colors flex-shrink-0 ${getButtonClass('10MIN')}`}>10 Min</button>
                    </div>
                </div>

                <button onClick={() => navigate('createTest')} className="w-full md:w-auto bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow transition-all transform hover:scale-105 flex items-center justify-center space-x-2">
                    <FaPlus />
                    <span>Create New Test</span>
                </button>
            </div>
            
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                {/* --- MOBILE CARD VIEW --- */}
                <div className="md:hidden">
                    <div className="p-4 space-y-4">
                        {filteredTests.map(test => (
                            <div key={test.id} className="bg-gray-700 rounded-lg p-4 flex flex-col space-y-4 shadow">
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-bold text-white pr-2 break-words">{test.title}</h3>
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full flex-shrink-0 ${getTypeClass(test.type)}`}>{test.type}</span>
                                </div>
                                <div className="text-sm space-y-2 border-t border-b border-gray-600 py-3">
                                    <div className="flex justify-between"><span className="text-gray-400 font-medium">Access:</span><span className="text-white">{test.isFree ? 'Free' : 'Paid'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400 font-medium">Scheduled:</span><span className="text-white text-right">{formatTimestamp(test.liveAt)}</span></div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-300">Published:</span>
                                        <Switch checked={test.isPublished || false} onChange={() => togglePublish(test)} className={`${test.isPublished ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                                            <span className={`${test.isPublished ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                                        </Switch>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleOpenScheduleModal(test)} className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-500">Schedule</button>
                                        <button onClick={() => navigate('createTest', { testToEdit: test })} className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-500">Edit</button>
                                        <button onClick={() => handleDelete(test.id)} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-red-500">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- DESKTOP TABLE VIEW --- */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Access</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Scheduled On</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {filteredTests.map(test => (
                                <tr key={test.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{test.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeClass(test.type)}`}>{test.type}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{test.isFree ? 'Free' : 'Paid'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatTimestamp(test.liveAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><Switch checked={test.isPublished || false} onChange={() => togglePublish(test)} className={`${test.isPublished ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}><span className={`${test.isPublished ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                                        </Switch></td>
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
                 {filteredTests.length === 0 && !loading && (
                    <div className="text-center py-10">
                        <p className="text-gray-400">No tests found for the selected filter.</p>
                    </div>
                )}
            </div>
            {selectedTest && (
                <ScheduleModal
                    isOpen={isScheduleModalOpen}
                    setIsOpen={setIsScheduleModalOpen}
                    test={selectedTest}
                    onSave={handleSaveSchedule}
                />
            )}
        </div>
    );
};

export default AdminTestManager;