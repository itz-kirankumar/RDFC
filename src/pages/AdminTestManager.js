import React, { useState, useEffect, Fragment } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, SECTIONS } from '../firebase/config';
import { Dialog, Transition, Switch } from '@headlessui/react';

// --- Reusable Form Input Components ---
const FormInput = ({ label, type = 'text', value, onChange, required = false, placeholder = '' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
        />
    </div>
);

const FormTextarea = ({ label, value, onChange, required = false, rows = 3, placeholder = '' }) => (
     <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
        />
    </div>
);

// --- Test Editor Modal Component ---
const TestEditorModal = ({ isOpen, setIsOpen, testToEdit, onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('TEST');
    const [isFree, setIsFree] = useState(false);
    const [sections, setSections] = useState([{ name: SECTIONS[0], duration: 40, questions: [{ questionText: '', options: ['', '', '', ''], correctOption: 0, solution: '', questionImageUrl: '', solutionImageUrl: '' }] }]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (testToEdit) {
            setTitle(testToEdit.title);
            setDescription(testToEdit.description);
            setType(testToEdit.type);
            setIsFree(testToEdit.isFree || false);
            setSections(testToEdit.sections.map(s => ({...s, questions: s.questions.map(q => ({...q}))})));
        } else {
            setTitle('');
            setDescription('');
            setType('TEST');
            setIsFree(false);
            setSections([{ name: SECTIONS[0], duration: 40, questions: [{ questionText: '', options: ['', '', '', ''], correctOption: 0, solution: '', questionImageUrl: '', solutionImageUrl: '' }] }]);
        }
    }, [testToEdit, isOpen]);

    useEffect(() => {
        if ((type === 'SECTIONAL' || type === 'TEST') && sections.length > 1) {
            setSections([sections[0]]);
        }
    }, [type, sections]);

    const handleSectionChange = (secIndex, field, value) => {
        const newSections = [...sections];
        newSections[secIndex][field] = value;
        setSections(newSections);
    };

    const handleQuestionChange = (secIndex, qIndex, field, value) => {
        const newSections = [...sections];
        newSections[secIndex].questions[qIndex][field] = value;
        setSections(newSections);
    };
    
    const handleOptionChange = (secIndex, qIndex, optIndex, value) => {
        const newSections = [...sections];
        newSections[secIndex].questions[qIndex].options[optIndex] = value;
        setSections(newSections);
    };

    const addQuestion = (secIndex) => {
        const newSections = [...sections];
        newSections[secIndex].questions.push({ questionText: '', options: ['', '', '', ''], correctOption: 0, solution: '', questionImageUrl: '', solutionImageUrl: '' });
        setSections(newSections);
    };

    const removeQuestion = (secIndex, qIndex) => {
        const newSections = [...sections];
        newSections[secIndex].questions.splice(qIndex, 1);
        setSections(newSections);
    };

    const addSection = () => {
        setSections([...sections, { name: SECTIONS[0], duration: 40, questions: [{ questionText: '', options: ['', '', '', ''], correctOption: 0, solution: '', questionImageUrl: '', solutionImageUrl: '' }] }]);
    };
    
    const removeSection = (secIndex) => {
        const newSections = sections.filter((_, i) => i !== secIndex);
        setSections(newSections);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const finalSections = (type === 'SECTIONAL' || type === 'TEST') ? [{...sections[0], name: sections[0].name}] : sections;
        const testData = { 
            title, 
            description, 
            type, 
            isFree, 
            isPublished: testToEdit ? testToEdit.isPublished : false,
            sections: finalSections, 
            lastUpdated: serverTimestamp() 
        };
        
        try {
            if (testToEdit) {
                await updateDoc(doc(db, 'tests', testToEdit.id), testData);
                alert('Test updated!');
            } else {
                await addDoc(collection(db, 'tests'), { ...testData, createdAt: serverTimestamp() });
                alert('Test created!');
            }
            onSave();
            setIsOpen(false);
        } catch (error) {
            console.error("Error saving test:", error);
            alert('Failed to save test.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-white">{testToEdit ? 'Edit Test' : 'Create New Test'}</Dialog.Title>
                            <form onSubmit={handleSubmit} className="mt-4 space-y-6 max-h-[75vh] overflow-y-auto pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormInput label="Test Title" value={title} onChange={e => setTitle(e.target.value)} required />
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300">Test Type</label>
                                        <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50">
                                            <option value="TEST">Test</option>
                                            <option value="SECTIONAL">Sectional</option>
                                            <option value="MOCK">Full Mock</option>
                                        </select>
                                    </div>
                                </div>
                                <FormTextarea label="Description" value={description} onChange={e => setDescription(e.target.value)} />
                                <div className="flex items-center space-x-8">
                                    <div className="flex items-center"><Switch checked={isFree} onChange={setIsFree} className={`${isFree ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}><span className={`${isFree ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/></Switch><label className="ml-2 text-sm font-medium text-gray-300">Free Test</label></div>
                                </div>
                                
                                <h3 className="text-lg font-semibold text-white pt-4 border-t border-gray-700">Sections & Questions</h3>
                                {sections.map((section, secIndex) => (
                                    <div key={secIndex} className="border border-gray-600 p-4 rounded-lg space-y-4 bg-gray-900/50 relative">
                                        {type === 'MOCK' && sections.length > 1 && <button type="button" onClick={() => removeSection(secIndex)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 font-bold text-xl">&times;</button>}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300">Section Name</label>
                                                <select value={section.name} onChange={e => handleSectionChange(secIndex, 'name', e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white disabled:opacity-50">
                                                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <FormInput label="Duration (minutes)" type="number" value={section.duration} onChange={e => handleSectionChange(secIndex, 'duration', parseInt(e.target.value))} required />
                                        </div>
                                        {section.questions.map((q, qIndex) => (
                                            <div key={qIndex} className="border border-gray-700 p-3 rounded space-y-2 bg-gray-800 relative">
                                                <h4 className="font-semibold text-gray-300">Question {qIndex + 1}</h4>
                                                {section.questions.length > 1 && <button type="button" onClick={() => removeQuestion(secIndex, qIndex)} className="absolute top-1 right-1 text-red-600 hover:text-red-500 text-lg">&times;</button>}
                                                <FormTextarea label="Question Text" value={q.questionText} onChange={e => handleQuestionChange(secIndex, qIndex, 'questionText', e.target.value)} required rows={4} />
                                                <FormInput label="Question Image URL (Optional)" value={q.questionImageUrl || ''} onChange={e => handleQuestionChange(secIndex, qIndex, 'questionImageUrl', e.target.value)} />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {q.options.map((opt, optIndex) => <FormInput key={optIndex} label={`Option ${optIndex + 1}`} value={opt} onChange={e => handleOptionChange(secIndex, qIndex, optIndex, e.target.value)} required />)}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-300">Correct Option</label>
                                                    <select value={q.correctOption} onChange={e => handleQuestionChange(secIndex, qIndex, 'correctOption', parseInt(e.target.value))} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white">
                                                        {[...Array(4)].map((_, i) => <option key={i} value={i}>Option {i + 1}</option>)}
                                                    </select>
                                                </div>
                                                <FormTextarea label="Detailed Solution" value={q.solution} onChange={e => handleQuestionChange(secIndex, qIndex, 'solution', e.target.value)} required rows={4} />
                                                <FormInput label="Solution Image URL (Optional)" value={q.solutionImageUrl || ''} onChange={e => handleQuestionChange(secIndex, qIndex, 'solutionImageUrl', e.target.value)} />
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => addQuestion(secIndex)} className="bg-gray-700 text-white px-4 py-2 text-sm rounded-md hover:bg-gray-600">+ Add Question</button>
                                    </div>
                                ))}
                                {type === 'MOCK' && <button type="button" onClick={addSection} className="bg-gray-700 text-white px-4 py-2 text-sm rounded-md hover:bg-gray-600">+ Add Section</button>}
                                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                                    <button type="button" onClick={() => setIsOpen(false)} className="bg-gray-600 py-2 px-4 rounded-md text-sm font-medium text-white hover:bg-gray-500">Cancel</button>
                                    <button type="submit" disabled={loading} className="bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow disabled:bg-gray-400">{loading ? 'Saving...' : 'Save Test'}</button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

const AdminTestManager = ({ navigate }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTest, setCurrentTest] = useState(null);

    const fetchTests = async () => {
        setLoading(true);
        try {
            const testsSnapshot = await getDocs(collection(db, 'tests'));
            setTests(testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching tests: ", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    const handleOpenModal = (test = null) => {
        setCurrentTest(test);
        setIsModalOpen(true);
    };

    const handleDelete = async (testId) => {
        if (window.confirm("Are you sure you want to delete this test permanently?")) {
            try {
                await deleteDoc(doc(db, 'tests', testId));
                fetchTests();
                alert("Test deleted.");
            } catch (error) {
                console.error("Error deleting test: ", error);
                alert("Failed to delete test.");
            }
        }
    };
    
    const togglePublish = async (test) => {
        try {
            await updateDoc(doc(db, 'tests', test.id), { isPublished: !test.isPublished });
            fetchTests();
        } catch (error) {
            console.error("Error updating publish status: ", error);
        }
    };

    if (loading) return <div className="text-center text-gray-400">Loading Tests...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Test Manager</h1>
                <button onClick={() => handleOpenModal()} className="bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow transition-all transform hover:scale-105">+ Create New Test</button>
            </div>
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Access</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {tests.map(test => (
                                <tr key={test.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{test.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{test.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{test.isFree ? 'Free' : 'Paid'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        <Switch checked={test.isPublished || false} onChange={() => togglePublish(test)} className={`${test.isPublished ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}>
                                            <span className={`${test.isPublished ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
                                        </Switch>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => handleOpenModal(test)} className="text-gray-300 hover:text-white">Edit</button>
                                        <button onClick={() => handleDelete(test.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <TestEditorModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} testToEdit={currentTest} onSave={fetchTests} />
        </div>
    );
};

export default AdminTestManager;
