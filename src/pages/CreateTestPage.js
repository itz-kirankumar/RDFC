import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, doc, serverTimestamp, collection } from 'firebase/firestore';
import { db, SECTIONS } from '../firebase/config';
import { Switch } from '@headlessui/react';
// ICONS: Added new icons for the mobile navigation tabs
import { TrashIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, DocumentTextIcon, ListBulletIcon } from '@heroicons/react/24/outline';

// --- Reusable Form Input Components (No Changes) ---

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

const MultiImageUrlManager = ({ label, urls, onChange }) => {
    const handleUrlChange = (index, newUrl) => {
        const updatedUrls = [...urls];
        updatedUrls[index] = newUrl;
        onChange(updatedUrls);
    };

    const addUrlInput = () => {
        onChange([...urls, '']);
    };

    const removeUrlInput = (index) => {
        const updatedUrls = urls.filter((_, i) => i !== index);
        onChange(updatedUrls);
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">{label}</label>
            <p className="text-xs text-gray-400 -mt-2">
                Requires direct, public links to images (e.g., from Imgur).
            </p>
            {urls.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        placeholder="https://i.imgur.com/your-image.png"
                        className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50 text-sm"
                    />
                    <button type="button" onClick={() => removeUrlInput(index)} className="p-1.5 text-red-400 hover:text-red-300 flex-shrink-0">
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={addUrlInput} className="text-sm text-gray-300 hover:text-white bg-gray-700/50 px-2 py-1 rounded-md hover:bg-gray-700">
                + Add Image URL
            </button>

            <div className="mt-2 flex flex-wrap gap-2">
                {urls.map((url, index) => {
                    const isValidUrl = url && /\.(jpeg|jpg|gif|png|webp)$/.test(url);
                    return isValidUrl ? (
                        <div key={`preview-${index}`} className="relative border border-gray-600 rounded p-1 bg-gray-800">
                            <img src={url} alt={`Preview ${index + 1}`} className="h-24 w-auto rounded object-contain" />
                        </div>
                    ) : null;
                })}
            </div>
        </div>
    );
};


const CreateTestPage = ({ navigate, testToEdit }) => {
    const BLANK_QUESTION = { 
        type: 'MCQ', passage: '', passageImageUrls: [], 
        questionText: '', options: ['', '', '', ''], 
        correctOption: '',
        solution: '', questionImageUrls: [], solutionImageUrls: [] 
    };

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('TEST');
    const [isFree, setIsFree] = useState(false);
    const [sections, setSections] = useState([{ name: SECTIONS[0], duration: 40, questions: [BLANK_QUESTION] }]);
    const [loading, setLoading] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState({ sec: 0, q: 0 });
    const [showNavigator, setShowNavigator] = useState(true);
    const [showPassage, setShowPassage] = useState(true);

    // NEW STATE: Manages the active panel on mobile view
    const [mobileView, setMobileView] = useState('question'); // 'question', 'passage', or 'navigator'

    useEffect(() => {
        if (testToEdit) {
            setTitle(testToEdit.title);
            setDescription(testToEdit.description);
            setType(testToEdit.type);
            setIsFree(testToEdit.isFree || false);
            const sanitizedSections = testToEdit.sections.map(s => ({
                ...s,
                questions: s.questions.map(q => {
                    const newQ = { ...BLANK_QUESTION, ...q, correctOption: q.correctOption ?? '' };
                    newQ.passageImageUrls = Array.isArray(q.passageImageUrls) ? q.passageImageUrls : (q.passageImageUrl ? [q.passageImageUrl] : []);
                    delete newQ.passageImageUrl;
                    newQ.questionImageUrls = Array.isArray(q.questionImageUrls) ? q.questionImageUrls : (q.questionImageUrl ? [q.questionImageUrl] : []);
                    delete newQ.questionImageUrl;
                    newQ.solutionImageUrls = Array.isArray(q.solutionImageUrls) ? q.solutionImageUrls : (q.solutionImageUrl ? [q.solutionImageUrl] : []);
                    delete newQ.solutionImageUrl;
                    return newQ;
                })
            }));
            setSections(sanitizedSections);
        }
    }, [testToEdit]);

    useEffect(() => {
        const currentSectionName = sections[activeQuestion.sec]?.name;
        setShowPassage(currentSectionName !== 'QA');
    }, [sections, activeQuestion]);

    const handleSectionChange = (secIndex, field, value) => {
        const newSections = [...sections];
        if (field === 'duration') {
            newSections[secIndex][field] = parseInt(value, 10) || 0;
        } else {
            newSections[secIndex][field] = value;
        }
        setSections(newSections);
    };

    const handleQuestionChange = (secIndex, qIndex, field, value) => {
        const newSections = [...sections];
        const question = newSections[secIndex].questions[qIndex];
        question[field] = value;
        if (field === 'type') {
            if (value === 'TITA') {
                question.options = ['', '', '', ''];
                question.correctOption = '';
            } else {
                question.correctOption = '';
            }
        }
        setSections(newSections);
    };
    
    const handleOptionChange = (secIndex, qIndex, optIndex, value) => {
        const newSections = [...sections];
        newSections[secIndex].questions[qIndex].options[optIndex] = value;
        setSections(newSections);
    };

    const addQuestion = (secIndex) => {
        const newSections = [...sections];
        newSections[secIndex].questions.push({ ...BLANK_QUESTION });
        setSections(newSections);
        setActiveQuestion({ sec: secIndex, q: newSections[secIndex].questions.length - 1 });
    };

    const removeQuestion = (secIndex, qIndex) => {
        if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return;
        const newSections = [...sections];
        newSections[secIndex].questions.splice(qIndex, 1);
        setSections(newSections);
        setActiveQuestion(prev => ({ ...prev, q: Math.max(0, qIndex - 1) }));
    };

    const addSection = () => {
        setSections([...sections, { name: SECTIONS[0], duration: 40, questions: [{ ...BLANK_QUESTION }] }]);
    };
    
    const removeSection = (secIndex) => {
        if (!window.confirm('Are you sure you want to delete this entire section? This cannot be undone.')) return;
        const newSections = sections.filter((_, i) => i !== secIndex);
        setSections(newSections);
        setActiveQuestion({ sec: 0, q: 0 });
    };

    const validateTest = () => {
        if (!title.trim()) {
            alert('Test Title is required.');
            return false;
        }
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (section.duration <= 0) {
                alert(`Duration for Section ${i + 1} (${section.name}) must be a positive number.`);
                return false;
            }
            for (let j = 0; j < section.questions.length; j++) {
                const q = section.questions[j];
                const qNum = `Section ${i + 1}, Question ${j + 1}`;
                if (!q.questionText.trim()) {
                    alert(`${qNum}: Question Text is required.`);
                    setActiveQuestion({ sec: i, q: j });
                    return false;
                }
                if (q.type === 'MCQ') {
                    if (q.options.some(opt => !opt.trim())) {
                        alert(`${qNum}: All four options are required for an MCQ.`);
                        setActiveQuestion({ sec: i, q: j });
                        return false;
                    }
                    if (q.correctOption === '') {
                        alert(`${qNum}: You must select a Correct Option for an MCQ.`);
                        setActiveQuestion({ sec: i, q: j });
                        return false;
                    }
                } else {
                     if (`${q.correctOption}`.trim() === '') {
                        alert(`${qNum}: The Correct Answer is required for a TITA question.`);
                        setActiveQuestion({ sec: i, q: j });
                        return false;
                    }
                }
                if (!q.solution.trim()) {
                    alert(`${qNum}: A Detailed Solution is required.`);
                    setActiveQuestion({ sec: i, q: j });
                    return false;
                }
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateTest()) return;
        setLoading(true);
        const testData = { 
            title, description, type, isFree, 
            isPublished: testToEdit ? testToEdit.isPublished : false,
            sections, 
            lastUpdated: serverTimestamp() 
        };
        try {
            if (testToEdit) {
                await updateDoc(doc(db, 'tests', testToEdit.id), testData);
                alert('Test updated successfully! ✅');
            } else {
                await addDoc(collection(db, 'tests'), { ...testData, createdAt: serverTimestamp() });
                alert('Test created successfully! 🎉');
            }
            navigate('manageTests');
        } catch (error) {
            console.error("Error saving test:", error);
            alert('Failed to save test. Check the console for more details.');
        } finally {
            setLoading(false);
        }
    };
    
    const activeSec = sections[activeQuestion.sec];
    const activeQ = activeSec?.questions[activeQuestion.q];

    return (
        <div className="max-w-full mx-auto p-2 sm:p-0">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('manageTests')} className="text-sm text-gray-400 hover:text-white">&larr; Back to Test Manager</button>
                {/* MODIFIED: Hide the desktop navigator toggle on small screens */}
                <button onClick={() => setShowNavigator(!showNavigator)} className="text-sm text-gray-400 hover:text-white hidden sm:flex items-center">
                    {showNavigator ? 'Hide Navigator' : 'Show Navigator'} 
                    {showNavigator ? <EyeSlashIcon className="h-5 w-5 ml-1"/> : <EyeIcon className="h-5 w-5 ml-1" />}
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-8 rounded-lg shadow-xl">
                 <div className="space-y-6">
                    <h1 className="text-2xl font-bold text-white">{testToEdit ? 'Edit Test' : 'Create New Test'}</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FormInput label="Test Title" value={title} onChange={e => setTitle(e.target.value)} required />
                        <FormTextarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={1} />
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Test Type</label>
                            <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50">
                                <option value="TEST">Test</option>
                                <option value="10MIN">10 Min Test</option>
                                <option value="SECTIONAL">Sectional</option>
                                <option value="MOCK">Full Mock</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-1 space-x-8">
                            <div className="flex items-center"><Switch checked={isFree} onChange={setIsFree} className={`${isFree ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}><span className={`${isFree ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/></Switch><label className="ml-2 text-sm font-medium text-gray-300">Free Test</label></div>
                        </div>
                    </div>
                 </div>

                {/* --- NEW: Mobile Tab Navigator --- */}
                <div className="sm:hidden mt-6 border-b border-gray-700 mb-4">
                    <div className="flex items-stretch -mb-px">
                        {/* Question Tab */}
                        <button type="button" onClick={() => setMobileView('question')} className={`flex-1 p-3 text-sm font-medium border-b-2 ${mobileView === 'question' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}>
                            <PencilSquareIcon className="h-5 w-5 mx-auto mb-1" />
                            Question
                        </button>
                        {/* Passage Tab (Conditional) */}
                        {showPassage && (
                             <button type="button" onClick={() => setMobileView('passage')} className={`flex-1 p-3 text-sm font-medium border-b-2 ${mobileView === 'passage' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}>
                                <DocumentTextIcon className="h-5 w-5 mx-auto mb-1" />
                                Passage
                            </button>
                        )}
                        {/* Navigator Tab */}
                        <button type="button" onClick={() => setMobileView('navigator')} className={`flex-1 p-3 text-sm font-medium border-b-2 ${mobileView === 'navigator' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}>
                           <ListBulletIcon className="h-5 w-5 mx-auto mb-1" />
                            Navigator
                        </button>
                    </div>
                </div>

                {/* --- MODIFIED: Main Content Area --- */}
                {/* Now flex-col on mobile and flex-row on desktop (sm and up) */}
                <div className="mt-6 border-t border-gray-700 pt-6 flex flex-col sm:flex-row gap-4">
                    
                    {/* Panel 1: Passage Editor (Conditional Visibility) */}
                    {/* MODIFIED: Added classes to control visibility on mobile vs desktop */}
                    {showPassage && (
                        <div className={`${mobileView === 'passage' ? 'block' : 'hidden'} sm:block sm:w-1/3 w-full`}>
                            <h3 className="text-lg font-semibold text-white mb-2">Passage / Set Info</h3>
                            <div className="space-y-4">
                                <FormTextarea label="Passage Text (Optional)" value={activeQ?.passage || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'passage', e.target.value)} rows={25} />
                                <MultiImageUrlManager label="Passage Images (Optional)" urls={activeQ?.passageImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'passageImageUrls', urls)} />
                            </div>
                        </div>
                    )}
                    
                    {/* Panel 2: Question Editor (Conditional Visibility) */}
                    {/* MODIFIED: Added classes to control visibility on mobile vs desktop */}
                    <div className={`${mobileView === 'question' ? 'block' : 'hidden'} sm:block sm:flex-1 w-full`}>
                        <h3 className="text-lg font-semibold text-white mb-2">Question Editor</h3>
                        {activeQ ? (
                            <div className="border border-gray-700 p-3 rounded space-y-4 bg-gray-900/50">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-gray-300">Section {activeQuestion.sec + 1}, Question {activeQuestion.q + 1}</h4>
                                    <div className="flex items-center gap-4">
                                        <label className="text-sm font-medium text-gray-300">Type:
                                            <select value={activeQ.type || 'MCQ'} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'type', e.target.value)} className="ml-2 rounded-md bg-gray-700 border-gray-600 text-white text-sm">
                                                <option value="MCQ">MCQ</option>
                                                <option value="TITA">TITA</option>
                                            </select>
                                        </label>
                                        <button type="button" onClick={() => removeQuestion(activeQuestion.sec, activeQuestion.q)} disabled={activeSec.questions.length <= 1} className="p-1.5 text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                                <FormTextarea label="Question Text" value={activeQ.questionText} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'questionText', e.target.value)} required rows={4} />
                                <MultiImageUrlManager label="Question Images (Optional)" urls={activeQ?.questionImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'questionImageUrls', urls)} />
                                
                                {activeQ.type === 'TITA' ? (
                                    <FormInput label="Correct Answer (TITA)" value={activeQ.correctOption || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'correctOption', e.target.value)} required />
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {activeQ.options.map((opt, optIndex) => <FormInput key={optIndex} label={`Option ${optIndex + 1}`} value={opt} onChange={e => handleOptionChange(activeQuestion.sec, activeQuestion.q, optIndex, e.target.value)} required />)}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">Correct Option</label>
                                            <select value={activeQ.correctOption} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'correctOption', parseInt(e.target.value, 10))} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white">
                                                <option value="" disabled>-- Select Correct Option --</option>
                                                {[...Array(4)].map((_, i) => <option key={i} value={i}>Option {i + 1}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <FormTextarea label="Detailed Solution" value={activeQ.solution} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'solution', e.target.value)} required rows={4} />
                                <MultiImageUrlManager label="Solution Images (Optional)" urls={activeQ?.solutionImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'solutionImageUrls', urls)} />
                            </div>
                        ) : (
                            <div className="text-center py-10 border border-dashed border-gray-600 rounded-lg text-gray-400">
                                <p>No question selected or this section is empty.</p>
                                <p>Add a question from the navigator to begin.</p>
                            </div>
                        )}
                    </div>

                    {/* Panel 3: Question Navigator (Conditional Visibility) */}
                    {/* MODIFIED: Added classes to control visibility on mobile vs desktop. Note 'sm:flex' for desktop. */}
                    {showNavigator && (
                        <div className={`${mobileView === 'navigator' ? 'block' : 'hidden'} sm:block sm:w-56 sm:flex-shrink-0 w-full`}>
                             <h3 className="text-lg font-semibold text-white mb-2">Navigator</h3>
                             <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {sections.map((section, secIndex) => (
                                    <div key={secIndex} className="bg-gray-900/50 p-2 rounded">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-gray-300">Section {secIndex + 1}</label>
                                                <button type="button" onClick={() => removeSection(secIndex)} disabled={sections.length <= 1} className="p-1 text-red-500 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                             <select value={section.name} onChange={e => handleSectionChange(secIndex, 'name', e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white text-sm">
                                                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                             <FormInput label="Duration (mins)" type="number" value={section.duration} onChange={e => handleSectionChange(secIndex, 'duration', e.target.value)} required />
                                        </div>
                                        <div className="grid grid-cols-5 gap-1.5 mt-2">
                                            {section.questions.map((_, qIndex) => (
                                                <button type="button" key={qIndex} onClick={() => setActiveQuestion({ sec: secIndex, q: qIndex })} className={`h-8 w-8 flex items-center justify-center rounded text-xs font-semibold transition-all ${activeQuestion.sec === secIndex && activeQuestion.q === qIndex ? 'bg-white text-gray-900 ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                                                    {qIndex + 1}
                                                </button>
                                            ))}
                                        </div>
                                         <button type="button" onClick={() => addQuestion(secIndex)} className="w-full mt-2 bg-gray-700 text-white px-2 py-1 text-xs rounded-md hover:bg-gray-600">+ Add Question</button>
                                    </div>
                                ))}
                                {type === 'MOCK' && <button type="button" onClick={addSection} className="w-full mt-4 bg-gray-700 text-white px-2 py-1 text-sm rounded-md hover:bg-gray-600">+ Add Section</button>}
                             </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700 mt-6">
                    <button type="button" onClick={() => navigate('manageTests')} className="bg-gray-600 py-2 px-4 rounded-md text-sm font-medium text-white hover:bg-gray-500">Cancel</button>
                    <button type="submit" disabled={loading} className="bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow disabled:bg-gray-400 disabled:cursor-wait">{loading ? 'Saving...' : 'Save Test'}</button>
                </div>
            </form>
        </div>
    );
};

export default CreateTestPage;