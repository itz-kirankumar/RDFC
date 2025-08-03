import React, { useState, useEffect } from 'react';
import { addDoc, updateDoc, doc, serverTimestamp, collection } from 'firebase/firestore';
import { db, SECTIONS } from '../firebase/config';
import { Switch } from '@headlessui/react';

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

const CreateTestPage = ({ navigate, testToEdit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('TEST');
    const [isFree, setIsFree] = useState(false);
    const [sections, setSections] = useState([{ name: SECTIONS[0], duration: 40, questions: [{ type: 'MCQ', passage: '', passageImageUrl: '', questionText: '', options: ['', '', '', ''], correctOption: 0, solution: '', questionImageUrl: '', solutionImageUrl: '' }] }]);
    const [loading, setLoading] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState({ sec: 0, q: 0 });
    const [showNavigator, setShowNavigator] = useState(true);
    const [showPassage, setShowPassage] = useState(true);


    useEffect(() => {
        if (testToEdit) {
            setTitle(testToEdit.title);
            setDescription(testToEdit.description);
            setType(testToEdit.type);
            setIsFree(testToEdit.isFree || false);
            setSections(testToEdit.sections.map(s => ({...s, questions: s.questions.map(q => ({...q, passage: q.passage || '', passageImageUrl: q.passageImageUrl || ''}))})));
        }
    }, [testToEdit]);

    useEffect(() => {
        const currentSectionName = sections[activeQuestion.sec]?.name;
        if (currentSectionName === 'QA') {
            setShowPassage(false);
        } else {
            setShowPassage(true);
        }
    }, [sections, activeQuestion]);

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
        newSections[secIndex].questions.push({ type: 'MCQ', passage: '', passageImageUrl: '', questionText: '', options: ['', '', '', ''], correctOption: 0, solution: '', questionImageUrl: '', solutionImageUrl: '' });
        setSections(newSections);
        setActiveQuestion({ sec: secIndex, q: newSections[secIndex].questions.length - 1 });
    };

    const removeQuestion = (secIndex, qIndex) => {
        const newSections = [...sections];
        newSections[secIndex].questions.splice(qIndex, 1);
        setSections(newSections);
        setActiveQuestion({ sec: secIndex, q: Math.max(0, qIndex - 1) });
    };

    const addSection = () => {
        setSections([...sections, { name: SECTIONS[0], duration: 40, questions: [{ type: 'MCQ', passage: '', passageImageUrl: '', questionText: '', options: ['', '', '', ''], correctOption: 0, solution: '', questionImageUrl: '', solutionImageUrl: '' }] }]);
    };
    
    const removeSection = (secIndex) => {
        const newSections = sections.filter((_, i) => i !== secIndex);
        setSections(newSections);
        setActiveQuestion({ sec: 0, q: 0});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
                alert('Test updated successfully!');
            } else {
                await addDoc(collection(db, 'tests'), { ...testData, createdAt: serverTimestamp() });
                alert('Test created successfully!');
            }
            navigate('manageTests');
        } catch (error) {
            console.error("Error saving test:", error);
            alert('Failed to save test.');
        } finally {
            setLoading(false);
        }
    };
    
    const activeSec = sections[activeQuestion.sec];
    const activeQ = activeSec?.questions[activeQuestion.q];

    return (
        <div className="max-w-full mx-auto">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('manageTests')} className="text-sm text-gray-400 hover:text-white">&larr; Back to Test Manager</button>
                <button onClick={() => setShowNavigator(!showNavigator)} className="text-sm text-gray-400 hover:text-white">{showNavigator ? 'Hide Navigator' : 'Show Navigator'} &rarr;</button>
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
                                <option value="SECTIONAL">Sectional</option>
                                <option value="MOCK">Full Mock</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-1 space-x-8">
                            <div className="flex items-center"><Switch checked={isFree} onChange={setIsFree} className={`${isFree ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}><span className={`${isFree ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/></Switch><label className="ml-2 text-sm font-medium text-gray-300">Free Test</label></div>
                        </div>
                    </div>
                 </div>

                <div className="mt-6 border-t border-gray-700 pt-6 flex gap-4">
                    {/* Panel 1: Passage Editor (Conditional) */}
                    {showPassage && (
                        <div className="w-1/3">
                            <h3 className="text-lg font-semibold text-white mb-2">Passage / Set Information (for this question)</h3>
                            <div className="space-y-4">
                                <FormTextarea label="Passage Text (Optional)" value={activeQ.passage || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'passage', e.target.value)} rows={25} />
                                <FormInput label="Passage Image URL (Optional)" value={activeQ.passageImageUrl || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'passageImageUrl', e.target.value)} />
                            </div>
                        </div>
                    )}
                    
                    {/* Panel 2: Question Editor */}
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">Question Editor</h3>
                        {activeQ && (
                            <div className="border border-gray-700 p-3 rounded space-y-4 bg-gray-900/50">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-gray-300">Editing Question {activeQuestion.q + 1}</h4>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mr-2">Question Type:</label>
                                        <select value={activeQ.type || 'MCQ'} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'type', e.target.value)} className="rounded-md bg-gray-700 border-gray-600 text-white text-sm">
                                            <option value="MCQ">MCQ</option>
                                            <option value="TITA">TITA</option>
                                        </select>
                                    </div>
                                </div>
                                <FormTextarea label="Question Text" value={activeQ.questionText} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'questionText', e.target.value)} required rows={4} />
                                <FormInput label="Question Image URL (Optional)" value={activeQ.questionImageUrl || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'questionImageUrl', e.target.value)} />
                                
                                {activeQ.type === 'TITA' ? (
                                    <FormInput label="Correct Answer (TITA)" value={activeQ.correctOption || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'correctOption', e.target.value)} required />
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {activeQ.options.map((opt, optIndex) => <FormInput key={optIndex} label={`Option ${optIndex + 1}`} value={opt} onChange={e => handleOptionChange(activeQuestion.sec, activeQuestion.q, optIndex, e.target.value)} required />)}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">Correct Option</label>
                                            <select value={activeQ.correctOption} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'correctOption', parseInt(e.target.value))} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white">
                                                {[...Array(4)].map((_, i) => <option key={i} value={i}>Option {i + 1}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <FormTextarea label="Detailed Solution" value={activeQ.solution} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'solution', e.target.value)} required rows={4} />
                                <FormInput label="Solution Image URL (Optional)" value={activeQ.solutionImageUrl || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'solutionImageUrl', e.target.value)} />
                            </div>
                        )}
                    </div>

                    {/* Panel 3: Question Navigator (Conditional) */}
                    {showNavigator && (
                        <div className="w-48 flex-shrink-0">
                             <h3 className="text-lg font-semibold text-white mb-2">Navigator</h3>
                             <div className="space-y-4">
                                {sections.map((section, secIndex) => (
                                    <div key={secIndex}>
                                        <div className="space-y-2">
                                             <div>
                                                <label className="block text-sm font-medium text-gray-300">Section Name</label>
                                                <select value={section.name} onChange={e => handleSectionChange(secIndex, 'name', e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white">
                                                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                             <FormInput label="Duration" type="number" value={section.duration} onChange={e => handleSectionChange(secIndex, 'duration', parseInt(e.target.value))} required />
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                            {section.questions.map((_, qIndex) => (
                                                <button type="button" key={qIndex} onClick={() => setActiveQuestion({ sec: secIndex, q: qIndex })} className={`h-9 w-9 flex items-center justify-center rounded font-semibold transition-all ${activeQuestion.sec === secIndex && activeQuestion.q === qIndex ? 'bg-white text-gray-900' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
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
                    <button type="submit" disabled={loading} className="bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow disabled:bg-gray-400">{loading ? 'Saving...' : 'Save Test'}</button>
                </div>
            </form>
        </div>
    );
};

export default CreateTestPage;
