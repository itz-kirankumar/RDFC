import React, { useState, useEffect } from 'react';
// --- UPDATED: New imports for dynamic sections ---
import { addDoc, updateDoc, doc, serverTimestamp, collection, getDocs, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
// --- UPDATED: Removed SECTIONS from config import ---
import { db } from '../firebase/config';
import { Switch } from '@headlessui/react';
import { TrashIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, DocumentTextIcon, ListBulletIcon, ArrowUpOnSquareIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import Papa from 'papaparse';

// --- Reusable Form Input Components (Unchanged) ---
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

// --- NEW: Modal to manage custom section names ---
const SectionNameManagerModal = ({ isOpen, onClose, customSectionNames, onAdd, onDelete }) => {
    const [newSectionName, setNewSectionName] = useState('');

    const handleAdd = () => {
        if (newSectionName.trim() && !customSectionNames.some(s => s.name.toLowerCase() === newSectionName.trim().toLowerCase())) {
            onAdd(newSectionName.trim());
            setNewSectionName('');
        } else {
            alert("Section name cannot be empty or a duplicate.");
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? '' : 'hidden'}`}>
            <div className="fixed inset-0 bg-black/70" onClick={onClose}></div>
            <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-white mb-4">Manage Custom Section Names</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-2">
                    {customSectionNames.length === 0 && <p className="text-gray-400 text-sm text-center">No custom sections added yet.</p>}
                    {customSectionNames.map(section => (
                        <div key={section.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded">
                            <span className="text-gray-300">{section.name}</span>
                            <button onClick={() => onDelete(section.id)} className="p-1 text-red-400 hover:text-red-300">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-gray-700">
                    <input
                        type="text"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="Add new section name..."
                        className="flex-grow rounded-md bg-gray-700 border-gray-600 text-white shadow-sm"
                    />
                    <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold">
                        Add
                    </button>
                </div>
                 <p className="text-xs text-gray-500 mt-3">Note: Core sections (VARC, DILR, QA) are permanent and cannot be deleted.</p>
            </div>
        </div>
    );
};


const CreateTestPage = ({ navigate, testToEdit }) => {
    // --- NEW: Hardcoded core sections ---
    const CORE_SECTIONS = ['VARC', 'DILR', 'QA'];

    const BLANK_QUESTION = { 
        type: 'MCQ', passage: '', passageImageUrls: [], 
        questionText: '', options: ['', '', '', ''], 
        correctOption: '',
        solution: '', questionImageUrls: [], solutionImageUrls: [] 
    };

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [testCategory, setTestCategory] = useState('');
    const [managedTabs, setManagedTabs] = useState([]);
    const [isFree, setIsFree] = useState(false);
    // --- UPDATED: Initial section uses the first core section ---
    const [sections, setSections] = useState([{ name: CORE_SECTIONS[0], duration: 40, questions: [BLANK_QUESTION] }]);
    const [loading, setLoading] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState({ sec: 0, q: 0 });
    const [showNavigator, setShowNavigator] = useState(true);
    const [showPassage, setShowPassage] = useState(true);
    const [mobileView, setMobileView] = useState('question');

    // --- NEW: State for custom section names and the modal ---
    const [customSectionNames, setCustomSectionNames] = useState([]);
    const [isSectionManagerOpen, setIsSectionManagerOpen] = useState(false);

    // --- NEW: Combines core and custom sections for dropdowns ---
    const allAvailableSections = React.useMemo(() => {
        const customNames = customSectionNames.map(s => s.name);
        return [...CORE_SECTIONS, ...customNames];
    }, [customSectionNames]);

    // --- NEW: useEffect to fetch dynamic custom section names ---
    useEffect(() => {
        const q = query(collection(db, 'sectionNames'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const names = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            setCustomSectionNames(names);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        const fetchTabs = async () => {
            try {
                const q = query(collection(db, 'tabManager'), orderBy('order'));
                const tabsSnapshot = await getDocs(q);
                const tabsData = tabsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setManagedTabs(tabsData);
                
                if (!testToEdit && tabsData.length > 0) {
                    const firstTab = tabsData[0];
                    const defaultCategory = (firstTab.subTabs && firstTab.subTabs.length > 0)
                        ? `${firstTab.name}/${firstTab.subTabs[0].name}`
                        : firstTab.name;
                    setTestCategory(defaultCategory);
                }
            } catch (error) {
                console.error("Error fetching tabs: ", error);
                alert("Could not load test categories. Please check Firestore rules and connectivity.");
            }
        };
        fetchTabs();
    }, [testToEdit]);
    
    // --- CSV Parsing logic (Unchanged) ---
    const handleCsvUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            if (!text) {
                alert("File is empty or could not be read.");
                return;
            }

            const firstLine = text.slice(0, text.indexOf('\n'));
            const delimiter = firstLine.includes(';') ? ';' : ',';

            Papa.parse(text, {
                delimiter: delimiter,
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        if (results.errors.length > 0) {
                            console.error("CSV Parsing Errors:", results.errors);
                            alert("Errors found in CSV file. Please check the console for details.");
                            return;
                        }

                        const dataRows = results.data;
                        if (dataRows.length === 0) {
                            alert('CSV file is empty or missing data rows.');
                            return;
                        }
                        
                        const newSectionsMap = new Map();
                        let currentSectionDetails = { name: '', duration: 40 };
                        
                        const firstRow = dataRows[0];
                        setTitle(firstRow.testTitle || `Imported Test ${new Date().toLocaleDateString()}`);
                        setDescription(firstRow.testDescription || '');
                        
                        const mainType = firstRow.mainType;
                        const subType = firstRow.subType;
                        if (mainType) {
                            const category = subType ? `${mainType}/${subType}` : mainType;
                            setTestCategory(category);
                        }

                        dataRows.forEach((questionData, index) => {
                            if (questionData.sectionName) currentSectionDetails.name = questionData.sectionName;
                            if (questionData.sectionDuration) currentSectionDetails.duration = parseInt(questionData.sectionDuration, 10) || 40;

                            const { questionText, questionType, correctAnswer, solutionText } = questionData;

                            if (!currentSectionDetails.name || !questionText || !questionType || !correctAnswer || !solutionText) {
                                console.warn(`Skipping row #${index + 2} due to missing essential data.`);
                                return;
                            }

                            if (!newSectionsMap.has(currentSectionDetails.name)) {
                                newSectionsMap.set(currentSectionDetails.name, {
                                    name: currentSectionDetails.name,
                                    duration: currentSectionDetails.duration,
                                    questions: []
                                });
                            }
                            
                            const newQuestion = { ...BLANK_QUESTION };
                            
                            newQuestion.passage = questionData.passageText ? questionData.passageText.replace(/\\n/g, '\n') : '';
                            newQuestion.passageImageUrls = questionData.passageImageUrls ? questionData.passageImageUrls.split(';').map(url => url.trim()) : [];
                            newQuestion.questionText = questionText.replace(/\\n/g, '\n');
                            newQuestion.questionImageUrls = questionData.questionImageUrls ? questionData.questionImageUrls.split(';').map(url => url.trim()) : [];
                            newQuestion.type = questionType.toUpperCase() === 'TITA' ? 'TITA' : 'MCQ';
                            newQuestion.solution = solutionText.replace(/\\n/g, '\n');
                            newQuestion.solutionImageUrls = questionData.solutionImageUrls ? questionData.solutionImageUrls.split(';').map(url => url.trim()) : [];

                            if (newQuestion.type === 'MCQ') {
                                newQuestion.options = [questionData.option1, questionData.option2, questionData.option3, questionData.option4];
                                const correctOptionIndex = parseInt(correctAnswer, 10) - 1;
                                if (isNaN(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
                                     console.warn(`Skipping MCQ in row #${index + 2} due to invalid correctAnswer '${correctAnswer}'. It must be a number from 1 to 4.`);
                                     return;
                                }
                                newQuestion.correctOption = correctOptionIndex;
                            } else { 
                                if (!/^\d+$/.test(correctAnswer)) {
                                    console.warn(`Skipping TITA in row #${index + 2} due to non-numerical correctAnswer '${correctAnswer}'. TITA answers must be numbers (e.g., 1, 2, 3124).`);
                                    return;
                                }
                                newQuestion.correctOption = correctAnswer;
                                newQuestion.options = ['', '', '', ''];
                            }
                            
                            newSectionsMap.get(currentSectionDetails.name).questions.push(newQuestion);
                        });

                        const finalSections = Array.from(newSectionsMap.values());
                        if (finalSections.length > 0 && finalSections.some(s => s.questions.length > 0)) {
                            setSections(finalSections);
                            setActiveQuestion({ sec: 0, q: 0 });
                            alert(`Test successfully imported with ${finalSections.length} section(s)! Please review and click 'Save Test'.`);
                        } else {
                            alert('Import failed. No valid questions could be parsed. Please check the CSV format.');
                        }

                    } catch(error) {
                        console.error("Error processing CSV data:", error);
                        alert('A critical error occurred. Please check the console and ensure the file format is correct.');
                    }
                },
                error: (error) => {
                    console.error("Papaparse error:", error);
                    alert(`CSV parsing failed: ${error.message}`);
                }
            });
        };
        reader.readAsText(file);
        event.target.value = null;
    };
    
    const downloadCsvTemplate = () => {
        const header = "testTitle,testDescription,mainType,subType,sectionName,sectionDuration,passageText,passageImageUrls,questionText,questionImageUrls,questionType,option1,option2,option3,option4,correctAnswer,solutionText,solutionImageUrls\n";
        const exampleRow = "\"Sample Mock\",\"Full-length test.\",\"Mocks\",\"Mock 1\",\"VARC\",40,\"Passage...\",\"\",\"Question...\",\"\",MCQ,\"A\",\"B\",\"C\",\"D\",1,\"Solution...\",\"\"\n";
        const blob = new Blob([header + exampleRow], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "test_template_new.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadCsv = () => {
        if (!testToEdit) return;
        const [mainType, subType] = testCategory.split('/');
        const csvDataRows = sections.flatMap(section => 
            section.questions.map(q => ({
                testTitle: title, description, mainType, subType: subType || '',
                sectionName: section.name, sectionDuration: section.duration,
                passageText: q.passage ? q.passage.replace(/\n/g, '\\n') : '',
                passageImageUrls: (q.passageImageUrls || []).join(';'),
                questionText: q.questionText ? q.questionText.replace(/\n/g, '\\n') : '',
                questionImageUrls: (q.questionImageUrls || []).join(';'),
                questionType: q.type,
                option1: q.options[0] || '', option2: q.options[1] || '',
                option3: q.options[2] || '', option4: q.options[3] || '',
                correctAnswer: q.type === 'MCQ' ? (q.correctOption !== '' ? parseInt(q.correctOption, 10) + 1 : '') : q.correctOption,
                solutionText: q.solution ? q.solution.replace(/\n/g, '\\n') : '',
                solutionImageUrls: (q.solutionImageUrls || []).join(';')
            }))
        );
        if (csvDataRows.length === 0) return alert("This test has no questions to export.");
        
        const csv = Papa.unparse(csvDataRows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'test'}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (testToEdit) {
            setTitle(testToEdit.title);
            setDescription(testToEdit.description);
            let category = '';
            if (testToEdit.mainType) {
                category = testToEdit.subType ? `${testToEdit.mainType}/${testToEdit.subType}` : testToEdit.mainType;
            } else { // Backward compatibility for old tests
                const oldType = testToEdit.type?.toUpperCase();
                const foundTab = managedTabs.find(tab => tab.name.toUpperCase().includes(oldType));
                category = foundTab ? foundTab.name : '';
            }
            setTestCategory(category);
            setIsFree(testToEdit.isFree || false);
            const sanitizedSections = testToEdit.sections.map(s => ({ ...s, questions: s.questions.map(q => ({ ...BLANK_QUESTION, ...q })) }));
            setSections(sanitizedSections);
        }
    }, [testToEdit, managedTabs]);

    useEffect(() => {
        const currentSectionName = sections[activeQuestion.sec]?.name;
        setShowPassage(currentSectionName !== 'QA');
    }, [sections, activeQuestion]);


    const handleSectionChange = (secIndex, field, value) => {
        const newSections = [...sections];
        newSections[secIndex][field] = field === 'duration' ? parseInt(value, 10) || 0 : value;
        setSections(newSections);
    };

    const handleQuestionChange = (secIndex, qIndex, field, value) => {
        const newSections = [...sections];
        const question = newSections[secIndex].questions[qIndex];
        question[field] = value;
        if (field === 'type') question.correctOption = '';
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
        if (!window.confirm('Delete this question?')) return;
        const newSections = [...sections];
        newSections[secIndex].questions.splice(qIndex, 1);
        setSections(newSections);
        setActiveQuestion(prev => ({ ...prev, q: Math.max(0, qIndex - 1) }));
    };

    // --- UPDATED: addSection now uses the combined list of available sections ---
    const addSection = () => {
        const defaultName = allAvailableSections.length > 0 ? allAvailableSections[0] : 'VARC';
        setSections([...sections, { name: defaultName, duration: 40, questions: [{ ...BLANK_QUESTION }] }]);
    };
    
    const removeSection = (secIndex) => {
        if (!window.confirm('Delete this entire section?')) return;
        setSections(sections.filter((_, i) => i !== secIndex));
        setActiveQuestion({ sec: 0, q: 0 });
    };

    const validateTest = () => {
        if (!title.trim() || !testCategory) {
            alert('Test Title and Type are required.');
            return false;
        }
        for (let i = 0; i < sections.length; i++) {
            for (let j = 0; j < sections[i].questions.length; j++) {
                const q = sections[i].questions[j];
                const qNum = `S${i + 1}, Q${j + 1}`;
                if (!q.questionText.trim()) { alert(`${qNum}: Question Text required.`); return false; }
                if (q.type === 'MCQ' && (q.options.some(opt => !opt.trim()) || q.correctOption === '')) { alert(`${qNum}: All options and correct answer required for MCQ.`); return false; }
                if (q.type === 'TITA' && `${q.correctOption}`.trim() === '') { alert(`${qNum}: Correct answer required for TITA.`); return false; }
                if (!q.solution.trim()) { alert(`${qNum}: Solution required.`); return false; }
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateTest()) return;
        setLoading(true);

        const [mainType, subType] = testCategory.split('/');
        const testData = { 
            title, description, mainType, subType: subType || null,
            isFree, isPublished: testToEdit?.isPublished || false,
            sections, lastUpdated: serverTimestamp() 
        };

        try {
            if (testToEdit) {
                const testRef = doc(db, 'tests', testToEdit.id);
                const updateData = { ...testData };
                delete updateData.type; // Remove old field
                await updateDoc(testRef, updateData);
                alert('Test updated successfully! ✅');
            } else {
                await addDoc(collection(db, 'tests'), { ...testData, createdAt: serverTimestamp() });
                alert('Test created successfully! 🎉');
            }
            navigate('manageTests');
        } catch (error) {
            console.error("Error saving test:", error);
            alert('Failed to save test. Check console.');
        } finally {
            setLoading(false);
        }
    };

    // --- NEW: Functions to handle adding/deleting custom section names ---
    const handleAddSectionName = async (name) => {
        await addDoc(collection(db, 'sectionNames'), { name });
    };

    const handleDeleteSectionName = async (id) => {
        if (window.confirm("Are you sure? This will not affect existing tests, but it cannot be undone.")) {
            await deleteDoc(doc(db, 'sectionNames', id));
        }
    };
    
    const activeSec = sections[activeQuestion.sec];
    const activeQ = activeSec?.questions[activeQuestion.q];

    return (
        <div className="max-w-full mx-auto p-2 sm:p-0">
            {/* --- NEW: Render the section manager modal --- */}
            <SectionNameManagerModal
                isOpen={isSectionManagerOpen}
                onClose={() => setIsSectionManagerOpen(false)}
                customSectionNames={customSectionNames}
                onAdd={handleAddSectionName}
                onDelete={handleDeleteSectionName}
            />
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('manageTests')} className="text-sm text-gray-400 hover:text-white">&larr; Back to Test Manager</button>
                <button onClick={() => setShowNavigator(!showNavigator)} className="text-sm text-gray-400 hover:text-white hidden sm:flex items-center">
                    {showNavigator ? 'Hide' : 'Show'} Navigator <EyeIcon className="h-5 w-5 ml-1" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-8 rounded-lg shadow-xl">
                 <div className="space-y-6">
                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <h1 className="text-2xl font-bold text-white">{testToEdit ? 'Edit Test' : 'Create New Test'}</h1>
                        <div className="flex items-center gap-4">
                            <label htmlFor="csv-upload" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold text-sm cursor-pointer flex items-center space-x-2">
                               <ArrowUpOnSquareIcon className="h-5 w-5"/><span>Import from CSV</span>
                            </label>
                            <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                            <div className="flex flex-col items-start">
                                <button type="button" onClick={downloadCsvTemplate} className="text-sm text-gray-400 hover:text-white underline">Download Template</button>
                                {testToEdit && (<button type="button" onClick={handleDownloadCsv} className="text-sm text-gray-400 hover:text-white underline mt-1">Download this test as CSV</button>)}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FormInput label="Test Title" value={title} onChange={e => setTitle(e.target.value)} required />
                        <FormTextarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={1} />
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Test Type</label>
                            <select value={testCategory} onChange={e => setTestCategory(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white" required>
                                <option value="" disabled>-- Select a Category --</option>
                                {managedTabs.map(tab => !tab.subTabs || tab.subTabs.length === 0 
                                    ? <option key={tab.id} value={tab.name}>{tab.name}</option> 
                                    : <optgroup key={tab.id} label={tab.name}>
                                        {tab.subTabs.map(subTab => <option key={`${tab.id}-${subTab.name}`} value={`${tab.name}/${subTab.name}`}>{subTab.name}</option>)}
                                      </optgroup>
                                )}
                            </select>
                        </div>

                        <div className="flex items-end pb-1"><div className="flex items-center"><Switch checked={isFree} onChange={setIsFree} className={`${isFree ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}><span className={`${isFree ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full`}/></Switch><label className="ml-2 text-sm font-medium text-gray-300">Free Test</label></div></div>
                    </div>
                 </div>

                <div className="sm:hidden mt-6 border-b border-gray-700 mb-4">
                    <div className="flex items-stretch -mb-px">
                        <button type="button" onClick={() => setMobileView('question')} className={`flex-1 p-3 text-sm font-medium border-b-2 ${mobileView === 'question' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}><PencilSquareIcon className="h-5 w-5 mx-auto mb-1" /> Question</button>
                        {showPassage && (<button type="button" onClick={() => setMobileView('passage')} className={`flex-1 p-3 text-sm font-medium border-b-2 ${mobileView === 'passage' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}><DocumentTextIcon className="h-5 w-5 mx-auto mb-1" /> Passage</button>)}
                        <button type="button" onClick={() => setMobileView('navigator')} className={`flex-1 p-3 text-sm font-medium border-b-2 ${mobileView === 'navigator' ? 'border-white text-white' : 'border-transparent text-gray-400'}`}><ListBulletIcon className="h-5 w-5 mx-auto mb-1" /> Navigator</button>
                    </div>
                </div>

                <div className="mt-6 border-t border-gray-700 pt-6 flex flex-col sm:flex-row gap-4">
                    {showPassage && (
                        <div className={`${mobileView === 'passage' ? 'block' : 'hidden'} sm:block sm:w-1/3 w-full`}>
                            <h3 className="text-lg font-semibold text-white mb-2">Passage / Set Info</h3>
                            <div className="space-y-4">
                                <FormTextarea label="Passage Text (Optional)" value={activeQ?.passage || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'passage', e.target.value)} rows={25} />
                                <MultiImageUrlManager label="Passage Images (Optional)" urls={activeQ?.passageImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'passageImageUrls', urls)} />
                            </div>
                        </div>
                    )}
                    
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
                                        <button type="button" onClick={() => removeQuestion(activeQuestion.sec, activeQuestion.q)} disabled={activeSec.questions.length <= 1} className="p-1.5 text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </div>
                                <FormTextarea label="Question Text" value={activeQ.questionText} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'questionText', e.target.value)} required rows={4} />
                                <MultiImageUrlManager label="Question Images (Optional)" urls={activeQ?.questionImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'questionImageUrls', urls)} />
                                {activeQ.type === 'TITA' ? <FormInput label="Correct Answer (TITA)" value={activeQ.correctOption || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'correctOption', e.target.value)} required />
                                 : <> <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {activeQ.options.map((opt, optIndex) => <FormInput key={optIndex} label={`Option ${optIndex + 1}`} value={opt} onChange={e => handleOptionChange(activeQuestion.sec, activeQuestion.q, optIndex, e.target.value)} required />)}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">Correct Option</label>
                                            <select value={activeQ.correctOption} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'correctOption', parseInt(e.target.value, 10))} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white">
                                                <option value="" disabled>-- Select --</option>
                                                {[...Array(4)].map((_, i) => <option key={i} value={i}>Option {i + 1}</option>)}
                                            </select>
                                        </div>
                                    </>}
                                <FormTextarea label="Detailed Solution" value={activeQ.solution} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'solution', e.target.value)} required rows={4} />
                                <MultiImageUrlManager label="Solution Images (Optional)" urls={activeQ?.solutionImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'solutionImageUrls', urls)} />
                            </div>
                        ) : <div className="text-center py-10 border border-dashed border-gray-600 rounded-lg text-gray-400"><p>No question selected.</p></div>}
                    </div>

                    {showNavigator && (
                        <div className={`${mobileView === 'navigator' ? 'block' : 'hidden'} sm:block sm:w-56 sm:flex-shrink-0 w-full`}>
                             <h3 className="text-lg font-semibold text-white mb-2">Navigator</h3>
                             <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {sections.map((section, secIndex) => (
                                    <div key={secIndex} className="bg-gray-900/50 p-2 rounded">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-gray-300">Section {secIndex + 1}</label>
                                                <button type="button" onClick={() => removeSection(secIndex)} disabled={sections.length <= 1} className="p-1 text-red-500 hover:text-red-400 disabled:text-gray-600"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                             {/* --- UPDATED: Select dropdown now uses the combined list of sections --- */}
                                             <select value={section.name} onChange={e => handleSectionChange(secIndex, 'name', e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white text-sm">
                                                    {allAvailableSections.map(s => <option key={s} value={s}>{s}</option>)}
                                             </select>
                                             <FormInput label="Duration (mins)" type="number" value={section.duration} onChange={e => handleSectionChange(secIndex, 'duration', e.target.value)} required />
                                        </div>
                                        <div className="grid grid-cols-5 gap-1.5 mt-2">
                                            {section.questions.map((_, qIndex) => (
                                                <button type="button" key={qIndex} onClick={() => setActiveQuestion({ sec: secIndex, q: qIndex })} className={`h-8 w-8 flex items-center justify-center rounded text-xs font-semibold ${activeQuestion.sec === secIndex && activeQuestion.q === qIndex ? 'bg-white text-gray-900 ring-2 ring-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                                                    {qIndex + 1}
                                                </button>
                                            ))}
                                        </div>
                                         <button type="button" onClick={() => addQuestion(secIndex)} className="w-full mt-2 bg-gray-700 text-white px-2 py-1 text-xs rounded-md hover:bg-gray-600">+ Add Question</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addSection} className="w-full mt-4 bg-gray-700 text-white px-2 py-1 text-sm rounded-md hover:bg-gray-600">+ Add Section</button>
                                {/* --- NEW: Button to open the section manager --- */}
                                <button type="button" onClick={() => setIsSectionManagerOpen(true)} className="w-full mt-2 bg-gray-600 text-white px-2 py-1 text-xs rounded-md hover:bg-gray-500">Manage Custom Sections</button>
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