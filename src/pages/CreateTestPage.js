import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, updateDoc, doc, serverTimestamp, collection, getDocs, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch } from '@headlessui/react';
import { TrashIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, DocumentTextIcon, ListBulletIcon, ArrowUpOnSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import Papa from 'papaparse';

// --- Reusable Form Input Components ---
const FormInput = ({ label, type = 'text', value, onChange, required = false, placeholder = '' }) => (
    <div>
        <label className={`block text-sm font-medium text-gray-300 ${label.startsWith('Option') ? 'sr-only' : ''}`}>{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={label.startsWith('Option') ? label : placeholder}
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

const MarkingSchemeManagerModal = ({ isOpen, onClose, schemes, onSave, onDelete, allAvailableSections }) => {
    const BLANK_SCHEME = { name: '', marksForCorrect: 3, negativeMarksMCQ: 1, negativeMarksTITA: 0, hasSkipPenalty: false, skipPenaltyAfter: 8, skipPenaltyMarks: 0.1, sectionsWithNoNegativeMarking: [], sectionsExcludedFromTotal: [] };
    const [selectedScheme, setSelectedScheme] = useState(BLANK_SCHEME);

    useEffect(() => {
        if (isOpen) {
            setSelectedScheme(BLANK_SCHEME);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!selectedScheme.name) return alert('Scheme Name is required.');
        onSave(selectedScheme);
        setSelectedScheme(BLANK_SCHEME);
    };

    const handleSelectScheme = (schemeId) => {
        const scheme = schemes.find(s => s.id === schemeId);
        setSelectedScheme(scheme || BLANK_SCHEME);
    };

    const handleFieldChange = (field, value) => {
        setSelectedScheme(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxListChange = (field, sectionName, isChecked) => {
        setSelectedScheme(prev => {
            const currentList = prev[field] || [];
            const newList = isChecked
                ? [...currentList, sectionName]
                : currentList.filter(name => name !== sectionName);
            return { ...prev, [field]: newList };
        });
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? '' : 'hidden'}`}>
            <div className="fixed inset-0 bg-black/70" onClick={onClose}></div>
            <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6 flex gap-6 h-[85vh]">
                <div className="w-1/3 flex flex-col border-r border-gray-700 pr-6">
                    <h3 className="text-lg font-bold text-white mb-4">Marking Schemes</h3>
                    <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                        {schemes.map(scheme => (
                            <button key={scheme.id} onClick={() => handleSelectScheme(scheme.id)} className={`w-full text-left p-2 rounded ${selectedScheme.id === scheme.id ? 'bg-blue-600' : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                                {scheme.name}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setSelectedScheme(BLANK_SCHEME)} className="mt-4 w-full text-center p-2 rounded bg-gray-600 hover:bg-gray-500 text-sm font-semibold">+ New Scheme</button>
                </div>
                <div className="w-2/3 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4">{selectedScheme.id ? 'Edit Scheme' : 'Create New Scheme'}</h3>
                    <div className="flex-grow overflow-y-auto space-y-6 pr-2">
                        <fieldset className="p-4 border border-gray-700 rounded-lg space-y-4 bg-gray-900/30">
                            <legend className="px-2 font-semibold text-gray-300">Core Marking</legend>
                            <FormInput label="Scheme Name" value={selectedScheme.name} onChange={e => handleFieldChange('name', e.target.value)} required placeholder="e.g., CAT Pattern, XAT Pattern"/>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormInput label="Marks for Correct" type="number" value={selectedScheme.marksForCorrect} onChange={e => handleFieldChange('marksForCorrect', parseFloat(e.target.value))} />
                                <FormInput label="Negative Marks (MCQ)" type="number" value={selectedScheme.negativeMarksMCQ} onChange={e => handleFieldChange('negativeMarksMCQ', parseFloat(e.target.value))} />
                                <FormInput label="Negative Marks (TITA)" type="number" value={selectedScheme.negativeMarksTITA} onChange={e => handleFieldChange('negativeMarksTITA', parseFloat(e.target.value))} />
                            </div>
                        </fieldset>
                        <fieldset className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                            <legend className="px-2 font-semibold text-gray-300">Skip Penalty</legend>
                            <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={selectedScheme.hasSkipPenalty} onChange={e => handleFieldChange('hasSkipPenalty', e.target.checked)} className="h-5 w-5 rounded text-blue-500" /><span className="text-gray-300">Enable Penalty for Skipped Questions</span></label>
                            {selectedScheme.hasSkipPenalty && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pl-8">
                                    <FormInput label="Penalty After (questions)" type="number" value={selectedScheme.skipPenaltyAfter} onChange={e => handleFieldChange('skipPenaltyAfter', parseInt(e.target.value))} />
                                    <FormInput label="Penalty Marks" type="number" value={selectedScheme.skipPenaltyMarks} onChange={e => handleFieldChange('skipPenaltyMarks', parseFloat(e.target.value))} />
                                </div>
                            )}
                        </fieldset>
                        <fieldset className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                            <legend className="px-2 font-semibold text-gray-300">Section-Specific Rules</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-300 mb-2">Sections with NO Negative Marking</h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-700/50 p-2 rounded-md">
                                        {allAvailableSections.map(name => (<label key={name} className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={selectedScheme.sectionsWithNoNegativeMarking?.includes(name)} onChange={e => handleCheckboxListChange('sectionsWithNoNegativeMarking', name, e.target.checked)} className="h-4 w-4 rounded" /><span>{name}</span></label>))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-300 mb-2">Sections to EXCLUDE from Total</h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-700/50 p-2 rounded-md">
                                        {allAvailableSections.map(name => (<label key={name} className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={selectedScheme.sectionsExcludedFromTotal?.includes(name)} onChange={e => handleCheckboxListChange('sectionsExcludedFromTotal', name, e.target.checked)} className="h-4 w-4 rounded" /><span>{name}</span></label>))}
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <div className="flex justify-end items-center gap-2 pt-4 mt-4 border-t border-gray-700">
                        {selectedScheme.id && <button onClick={() => onDelete(selectedScheme.id)} className="text-red-400 hover:text-red-300 font-semibold mr-auto">Delete</button>}
                        <button onClick={onClose} className="bg-gray-600 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-500">Close</button>
                        <button onClick={handleSave} className="bg-blue-600 py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-500">Save Scheme</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const CreateTestPage = ({ navigate, testToEdit }) => {
    const CORE_SECTIONS = ['VARC', 'DILR', 'QA'];
    const BLANK_QUESTION = { type: 'MCQ', passage: '', passageImageUrls: [], questionText: '', options: ['', '', '', ''], correctOption: '', solution: '', questionImageUrls: [], solutionImageUrls: [] };

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [testCategory, setTestCategory] = useState('');
    const [managedTabs, setManagedTabs] = useState([]);
    const [isFree, setIsFree] = useState(false);
    
    // --- NEW: Timing State ---
    const [timingType, setTimingType] = useState('sectional'); // 'sectional' | 'overall'
    const [totalDuration, setTotalDuration] = useState(120); // Used if timingType is 'overall'

    const [sections, setSections] = useState([{ name: CORE_SECTIONS[0], duration: 40, questions: [BLANK_QUESTION] }]);
    const [loading, setLoading] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState({ sec: 0, q: 0 });
    const [showNavigator, setShowNavigator] = useState(true);
    const [showPassage, setShowPassage] = useState(true);
    const [mobileView, setMobileView] = useState('question');
    const [customSectionNames, setCustomSectionNames] = useState([]);
    const [isSectionManagerOpen, setIsSectionManagerOpen] = useState(false);
    
    const [markingSchemes, setMarkingSchemes] = useState([]);
    const [selectedSchemeId, setSelectedSchemeId] = useState('default');
    const [isSchemeManagerOpen, setIsSchemeManagerOpen] = useState(false);

    const allAvailableSections = useMemo(() => {
        const customNames = customSectionNames.map(s => s.name);
        return [...CORE_SECTIONS, ...customNames];
    }, [customSectionNames]);

    useEffect(() => {
        const q = query(collection(db, 'sectionNames'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCustomSectionNames(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'markingSchemes'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMarkingSchemes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
                    const defaultCategory = (firstTab.subTabs && firstTab.subTabs.length > 0) ? `${firstTab.name}/${firstTab.subTabs[0].name}` : firstTab.name;
                    setTestCategory(defaultCategory);
                }
            } catch (error) { console.error("Error fetching tabs: ", error); }
        };
        fetchTabs();
    }, [testToEdit]);
    
    const handleCsvUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            if (!text) { alert("File is empty or could not be read."); return; }
            const firstLine = text.slice(0, text.indexOf('\n'));
            const delimiter = firstLine.includes(';') ? ';' : ',';
            Papa.parse(text, {
                delimiter: delimiter, header: true, skipEmptyLines: true,
                complete: (results) => {
                    try {
                        if (results.errors.length > 0) { console.error("CSV Parsing Errors:", results.errors); alert("Errors found in CSV file."); return; }
                        const dataRows = results.data;
                        if (dataRows.length === 0) { alert('CSV file is empty.'); return; }
                        const newSectionsMap = new Map();
                        let currentSectionDetails = { name: '', duration: 40 };
                        const firstRow = dataRows[0];
                        setTitle(firstRow.testTitle || `Imported Test ${new Date().toLocaleDateString()}`);
                        setDescription(firstRow.testDescription || '');
                        
                        // Parse timing type from CSV if present, default to sectional
                        const csvTimingType = firstRow.timingType && firstRow.timingType.toLowerCase() === 'overall' ? 'overall' : 'sectional';
                        setTimingType(csvTimingType);
                        if(csvTimingType === 'overall' && firstRow.totalDuration) {
                            setTotalDuration(parseInt(firstRow.totalDuration, 10) || 120);
                        }

                        if (firstRow.mainType) {
                            const category = firstRow.subType ? `${firstRow.mainType}/${firstRow.subType}` : firstRow.mainType;
                            setTestCategory(category);
                        }
                        dataRows.forEach((questionData, index) => {
                            if (questionData.sectionName) currentSectionDetails.name = questionData.sectionName;
                            if (questionData.sectionDuration) currentSectionDetails.duration = parseInt(questionData.sectionDuration, 10) || 40;
                            const { questionText, questionType, correctAnswer, solutionText } = questionData;
                            if (!currentSectionDetails.name || !questionText || !questionType || !correctAnswer || !solutionText) {
                                console.warn(`Skipping row #${index + 2} due to missing core data.`); return;
                            }
                            if (!newSectionsMap.has(currentSectionDetails.name)) {
                                newSectionsMap.set(currentSectionDetails.name, { name: currentSectionDetails.name, duration: currentSectionDetails.duration, questions: [] });
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
                                const options = Object.keys(questionData)
                                      .filter(key => key.startsWith('option') && questionData[key])
                                      .sort((a, b) => parseInt(a.replace('option', '')) - parseInt(b.replace('option', '')))
                                      .map(key => questionData[key]);

                                if (options.length < 2) {
                                    console.warn(`Skipping MCQ in row #${index + 2} due to having fewer than 2 options.`);
                                    return;
                                }
                                newQuestion.options = options;
                                
                                const correctOptionIndex = parseInt(correctAnswer, 10) - 1;
                                if (isNaN(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
                                     console.warn(`Skipping MCQ in row #${index + 2} due to invalid correctAnswer '${correctAnswer}' for ${options.length} options.`); return;
                                }
                                newQuestion.correctOption = correctOptionIndex;
                            } else { 
                                if (!/^\d+$/.test(correctAnswer)) {
                                    console.warn(`Skipping TITA in row #${index + 2} due to non-numerical correctAnswer '${correctAnswer}'.`); return;
                                }
                                newQuestion.correctOption = correctAnswer;
                                newQuestion.options = [];
                            }
                            newSectionsMap.get(currentSectionDetails.name).questions.push(newQuestion);
                        });
                        const finalSections = Array.from(newSectionsMap.values());
                        if (finalSections.length > 0 && finalSections.some(s => s.questions.length > 0)) {
                            setSections(finalSections);
                            setActiveQuestion({ sec: 0, q: 0 });
                            alert(`Test successfully imported with ${finalSections.length} section(s)!`);
                        } else { alert('Import failed. No valid questions could be parsed.'); }
                    } catch(error) { console.error("Error processing CSV data:", error); alert('A critical error occurred.'); }
                },
                error: (error) => { console.error("Papaparse error:", error); alert(`CSV parsing failed: ${error.message}`); }
            });
        };
        reader.readAsText(file);
        event.target.value = null;
    };
    
    const downloadCsvTemplate = () => {
        // Added timingType and totalDuration columns
        const header = "testTitle,testDescription,timingType,totalDuration,mainType,subType,sectionName,sectionDuration,passageText,passageImageUrls,questionText,questionImageUrls,questionType,option1,option2,option3,option4,option5,option6,correctAnswer,solutionText,solutionImageUrls\n";
        const exampleRow = "\"Sample Mock\",\"Full-length test.\",\"overall\",120,\"Mocks\",\"Mock 1\",\"VARC\",40,\"Passage...\",\"\",\"Question...\",\"\",MCQ,\"A\",\"B\",\"C\",\"D\",\"\",\"\",1,\"Solution...\",\"\"\n";
        const blob = new Blob([header + exampleRow], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "test_template_v2.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadCsv = () => {
        if (!testToEdit) return;
        const [mainType, subType] = testCategory.split('/');
        
        const csvDataRows = sections.flatMap(section => 
            section.questions.map(q => {
                const row = {
                    testTitle: title,
                    description,
                    timingType: timingType,
                    totalDuration: timingType === 'overall' ? totalDuration : '',
                    mainType,
                    subType: subType || '',
                    sectionName: section.name,
                    sectionDuration: section.duration,
                    passageText: q.passage ? q.passage.replace(/\n/g, '\\n') : '',
                    passageImageUrls: (q.passageImageUrls || []).join(';'),
                    questionText: q.questionText ? q.questionText.replace(/\n/g, '\\n') : '',
                    questionImageUrls: (q.questionImageUrls || []).join(';'),
                    questionType: q.type,
                    correctAnswer: q.type === 'MCQ' ? (q.correctOption !== '' ? parseInt(q.correctOption, 10) + 1 : '') : q.correctOption,
                    solutionText: q.solution ? q.solution.replace(/\n/g, '\\n') : '',
                    solutionImageUrls: (q.solutionImageUrls || []).join(';')
                };

                if (q.type === 'MCQ') {
                    q.options.forEach((opt, index) => {
                        row[`option${index + 1}`] = opt || '';
                    });
                }

                return row;
            })
        );
        
        if (csvDataRows.length === 0) return alert("This test has no questions to export.");

        const allKeys = new Set();
        csvDataRows.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
        
        const preferredOrder = [ "testTitle", "testDescription", "timingType", "totalDuration", "mainType", "subType", "sectionName", "sectionDuration", "passageText", "passageImageUrls", "questionText", "questionImageUrls", "questionType" ];
        const optionKeys = [...allKeys].filter(key => key.startsWith('option')).sort((a, b) => parseInt(a.replace('option', '')) - parseInt(b.replace('option', '')));
        const remainingKeys = [ "correctAnswer", "solutionText", "solutionImageUrls" ];
        const finalHeader = [...preferredOrder, ...optionKeys, ...remainingKeys];

        const csv = Papa.unparse(csvDataRows, { columns: finalHeader });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-t8;' });
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
            let category = testToEdit.mainType ? (testToEdit.subType ? `${testToEdit.mainType}/${testToEdit.subType}` : testToEdit.mainType) : '';
            setTestCategory(category);
            setIsFree(testToEdit.isFree || false);
            const sanitizedSections = testToEdit.sections.map(s => ({ ...s, questions: s.questions.map(q => ({ ...BLANK_QUESTION, ...q })) }));
            setSections(sanitizedSections);
            setSelectedSchemeId(testToEdit.markingScheme?.id || 'default');
            
            // --- Set Timing Config ---
            setTimingType(testToEdit.timingType || 'sectional');
            setTotalDuration(testToEdit.totalDuration || 120);
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
        newSections[secIndex].questions[qIndex][field] = value;
        if (field === 'type') {
            newSections[secIndex].questions[qIndex].correctOption = '';
            if (value === 'MCQ' && newSections[secIndex].questions[qIndex].options.length === 0) {
                 newSections[secIndex].questions[qIndex].options = ['', '', '', ''];
            }
        }
        setSections(newSections);
    };
    const handleOptionChange = (secIndex, qIndex, optIndex, value) => {
        const newSections = [...sections];
        newSections[secIndex].questions[qIndex].options[optIndex] = value;
        setSections(newSections);
    };
    
    const addOption = (secIndex, qIndex) => {
        const newSections = [...sections];
        newSections[secIndex].questions[qIndex].options.push('');
        setSections(newSections);
    };

    const removeOption = (secIndex, qIndex, optIndex) => {
        const newSections = [...sections];
        const question = newSections[secIndex].questions[qIndex];
        
        if (question.options.length <= 2) {
            alert("An MCQ must have at least 2 options.");
            return;
        }

        question.options.splice(optIndex, 1);

        if (question.correctOption === optIndex) {
            question.correctOption = '';
        } else if (question.correctOption > optIndex) {
            question.correctOption -= 1;
        }

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
        if (!title.trim() || !testCategory) { alert('Test Title and Type are required.'); return false; }
        if (timingType === 'overall' && (!totalDuration || totalDuration <= 0)) { alert('Total duration is required for overall timing.'); return false; }
        for (let i = 0; i < sections.length; i++) {
            for (let j = 0; j < sections[i].questions.length; j++) {
                const q = sections[i].questions[j];
                const qNum = `S${i + 1}, Q${j + 1}`;
                if (!q.questionText.trim()) { alert(`${qNum}: Question Text required.`); return false; }
                if (q.type === 'MCQ' && (q.options.some(opt => !opt.trim()) || q.correctOption === '')) { alert(`${qNum}: All options and a correct answer selection are required for MCQ.`); return false; }
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
        
        // --- NEW: Construct Test Data with Timing ---
        const testData = { 
            title, 
            description, 
            mainType, 
            subType: subType || null, 
            isFree, 
            isPublished: testToEdit?.isPublished || false, 
            sections, 
            timingType, // 'sectional' or 'overall'
            totalDuration: timingType === 'overall' ? parseInt(totalDuration) : null,
            lastUpdated: serverTimestamp() 
        };

        if (selectedSchemeId !== 'default') {
            const selectedSchemeObject = markingSchemes.find(s => s.id === selectedSchemeId);
            if (selectedSchemeObject) { testData.markingScheme = selectedSchemeObject; }
        } else { testData.markingScheme = null; }
        try {
            if (testToEdit) {
                await updateDoc(doc(db, 'tests', testToEdit.id), testData);
                alert('Test updated successfully! ✅');
            } else {
                await addDoc(collection(db, 'tests'), { ...testData, createdAt: serverTimestamp() });
                alert('Test created successfully! 🎉');
            }
            navigate('manageTests');
        } catch (error) { console.error("Error saving test:", error); alert('Failed to save test. Check console.'); } finally { setLoading(false); }
    };
    
    const handleAddSectionName = async (name) => { await addDoc(collection(db, 'sectionNames'), { name }); };
    const handleDeleteSectionName = async (id) => { if (window.confirm("Are you sure?")) { await deleteDoc(doc(db, 'sectionNames', id)); } };
    
    const handleSaveScheme = async (schemeData) => {
        try {
            if (schemeData.id) {
                const { id, ...data } = schemeData;
                await updateDoc(doc(db, 'markingSchemes', id), data);
                alert('Scheme updated!');
            } else {
                await addDoc(collection(db, 'markingSchemes'), schemeData);
                alert('New scheme saved!');
            }
        } catch (error) { console.error("Error saving scheme:", error); }
    };
    const handleDeleteScheme = async (schemeId) => { if (window.confirm("Are you sure?")) { await deleteDoc(doc(db, 'markingSchemes', schemeId)); } };

    const activeSec = sections[activeQuestion.sec];
    const activeQ = activeSec?.questions[activeQuestion.q];

    return (
        <div className="max-w-full mx-auto p-2 sm:p-0">
            <SectionNameManagerModal isOpen={isSectionManagerOpen} onClose={() => setIsSectionManagerOpen(false)} customSectionNames={customSectionNames} onAdd={handleAddSectionName} onDelete={handleDeleteSectionName} />
            <MarkingSchemeManagerModal isOpen={isSchemeManagerOpen} onClose={() => setIsSchemeManagerOpen(false)} schemes={markingSchemes} onSave={handleSaveScheme} onDelete={handleDeleteScheme} allAvailableSections={allAvailableSections} />
            
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('manageTests')} className="text-sm text-gray-400 hover:text-white">&larr; Back to Test Manager</button>
                <button onClick={() => setShowNavigator(!showNavigator)} className="text-sm text-gray-400 hover:text-white hidden sm:flex items-center">{showNavigator ? 'Hide' : 'Show'} Navigator <EyeIcon className="h-5 w-5 ml-1" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-8 rounded-lg shadow-xl">
                 <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <h1 className="text-2xl font-bold text-white">{testToEdit ? 'Edit Test' : 'Create New Test'}</h1>
                        <div className="flex items-center gap-4">
                            <label htmlFor="csv-upload" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold text-sm cursor-pointer flex items-center space-x-2"><ArrowUpOnSquareIcon className="h-5 w-5"/><span>Import from CSV</span></label>
                            <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                            <div className="flex flex-col items-start">
                                <button type="button" onClick={downloadCsvTemplate} className="text-sm text-gray-400 hover:text-white underline">Download Template</button>
                                {testToEdit && (<button type="button" onClick={handleDownloadCsv} className="text-sm text-gray-400 hover:text-white underline mt-1">Download this test as CSV</button>)}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <FormInput label="Test Title" value={title} onChange={e => setTitle(e.target.value)} required />
                        <FormTextarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={1} />
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Test Type</label>
                            <select value={testCategory} onChange={e => setTestCategory(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white" required>
                                <option value="" disabled>-- Select a Category --</option>
                                {managedTabs.map(tab => !tab.subTabs || tab.subTabs.length === 0 ? <option key={tab.id} value={tab.name}>{tab.name}</option> : <optgroup key={tab.id} label={tab.name}>{tab.subTabs.map(subTab => <option key={`${tab.id}-${subTab.name}`} value={`${tab.name}/${subTab.name}`}>{subTab.name}</option>)}</optgroup>)}
                            </select>
                        </div>
                        {/* --- NEW: Timing Strategy Selection --- */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Timing Strategy</label>
                            <select value={timingType} onChange={e => setTimingType(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white">
                                <option value="sectional">Sectional Timers (CAT)</option>
                                <option value="overall">Overall Timer (SNAP/XAT)</option>
                            </select>
                        </div>
                        {/* --- NEW: Total Duration Input (Conditional) --- */}
                        {timingType === 'overall' && (
                            <div>
                                <FormInput label="Total Duration (mins)" type="number" value={totalDuration} onChange={e => setTotalDuration(e.target.value)} required />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300">Marking Scheme</label>
                            <div className="flex items-center gap-2">
                                <select value={selectedSchemeId} onChange={e => setSelectedSchemeId(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white">
                                    <option value="default">Default (+3 / -1)</option>
                                    {markingSchemes.map(scheme => (<option key={scheme.id} value={scheme.id}>{scheme.name}</option>))}
                                </select>
                                <button type="button" onClick={() => setIsSchemeManagerOpen(true)} className="mt-1 p-2 bg-gray-600 rounded-md hover:bg-gray-500" title="Manage Schemes"><PlusIcon className="h-5 w-5" /></button>
                            </div>
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
                    {showPassage && (<div className={`${mobileView === 'passage' ? 'block' : 'hidden'} sm:block sm:w-1/3 w-full`}><h3 className="text-lg font-semibold text-white mb-2">Passage / Set Info</h3><div className="space-y-4"><FormTextarea label="Passage Text (Optional)" value={activeQ?.passage || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'passage', e.target.value)} rows={25} /><MultiImageUrlManager label="Passage Images (Optional)" urls={activeQ?.passageImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'passageImageUrls', urls)} /></div></div>)}
                    <div className={`${mobileView === 'question' ? 'block' : 'hidden'} sm:block sm:flex-1 w-full`}>
                        <h3 className="text-lg font-semibold text-white mb-2">Question Editor</h3>
                        {activeQ ? (
                            <div className="border border-gray-700 p-3 rounded space-y-4 bg-gray-900/50">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-gray-300">Section {activeQuestion.sec + 1}, Question {activeQuestion.q + 1}</h4>
                                    <div className="flex items-center gap-4">
                                        <label className="text-sm font-medium text-gray-300">Type:
                                            <select value={activeQ.type || 'MCQ'} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'type', e.target.value)} className="ml-2 rounded-md bg-gray-700 border-gray-600 text-white text-sm">
                                                <option value="MCQ">MCQ</option><option value="TITA">TITA</option>
                                            </select>
                                        </label>
                                        <button type="button" onClick={() => removeQuestion(activeQuestion.sec, activeQuestion.q)} disabled={activeSec.questions.length <= 1} className="p-1.5 text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </div>
                                <FormTextarea label="Question Text" value={activeQ.questionText} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'questionText', e.target.value)} required rows={4} />
                                <MultiImageUrlManager label="Question Images (Optional)" urls={activeQ?.questionImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'questionImageUrls', urls)} />

                                {activeQ.type === 'TITA' ? 
                                    <FormInput label="Correct Answer (TITA)" value={activeQ.correctOption || ''} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'correctOption', e.target.value)} required />
                                    : <> 
                                        <div className="space-y-4">
                                            <label className="block text-sm font-medium text-gray-300">Options</label>
                                            <div className="space-y-3">
                                                {activeQ.options.map((opt, optIndex) => (
                                                    <div key={optIndex} className="flex items-center gap-2">
                                                        <div className="flex-grow">
                                                          <FormInput 
                                                              label={`Option ${optIndex + 1}`} 
                                                              value={opt} 
                                                              onChange={e => handleOptionChange(activeQuestion.sec, activeQuestion.q, optIndex, e.target.value)} 
                                                              required 
                                                          />
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeOption(activeQuestion.sec, activeQuestion.q, optIndex)} 
                                                            disabled={activeQ.options.length <= 2}
                                                            className="p-2 text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed mt-1"
                                                            title="Remove Option"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => addOption(activeQuestion.sec, activeQuestion.q)}
                                                className="text-sm text-gray-300 hover:text-white bg-gray-700/50 px-3 py-1.5 rounded-md hover:bg-gray-700"
                                            >
                                                + Add Option
                                            </button>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300">Correct Option</label>
                                            <select 
                                                value={activeQ.correctOption} 
                                                onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'correctOption', e.target.value === '' ? '' : parseInt(e.target.value, 10))} 
                                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                                            >
                                                <option value="" disabled>-- Select --</option>
                                                {activeQ.options.map((opt, i) => <option key={i} value={i}>Option {i + 1}{opt ? `: ${opt.substring(0,20)}...` : ''}</option>)}
                                            </select>
                                        </div>
                                    </>
                                }
                                
                                <FormTextarea label="Detailed Solution" value={activeQ.solution} onChange={e => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'solution', e.target.value)} required rows={4} />
                                <MultiImageUrlManager label="Solution Images (Optional)" urls={activeQ?.solutionImageUrls || []} onChange={urls => handleQuestionChange(activeQuestion.sec, activeQuestion.q, 'solutionImageUrls', urls)} />
                            </div>
                        ) : <div className="text-center py-10 border border-dashed border-gray-600 rounded-lg text-gray-400"><p>No question selected.</p></div>}
                    </div>
                    {showNavigator && (<div className={`${mobileView === 'navigator' ? 'block' : 'hidden'} sm:block sm:w-56 sm:flex-shrink-0 w-full`}><h3 className="text-lg font-semibold text-white mb-2">Navigator</h3><div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">{sections.map((section, secIndex) => (<div key={secIndex} className="bg-gray-900/50 p-2 rounded"><div className="space-y-2"><div className="flex justify-between items-center"><label className="text-sm font-medium text-gray-300">Section {secIndex + 1}</label><button type="button" onClick={() => removeSection(secIndex)} disabled={sections.length <= 1} className="p-1 text-red-500 hover:text-red-400 disabled:text-gray-600"><TrashIcon className="h-4 w-4" /></button></div><select value={section.name} onChange={e => handleSectionChange(secIndex, 'name', e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white text-sm">{allAvailableSections.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    {/* --- Only show section duration if timing is sectional --- */}
                    {timingType === 'sectional' && (
                        <FormInput label="Duration (mins)" type="number" value={section.duration} onChange={e => handleSectionChange(secIndex, 'duration', e.target.value)} required />
                    )}
                    </div><div className="grid grid-cols-5 gap-1.5 mt-2">{section.questions.map((_, qIndex) => (<button type="button" key={qIndex} onClick={() => setActiveQuestion({ sec: secIndex, q: qIndex })} className={`h-8 w-8 flex items-center justify-center rounded text-xs font-semibold ${activeQuestion.sec === secIndex && activeQuestion.q === qIndex ? 'bg-white text-gray-900 ring-2 ring-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>{qIndex + 1}</button>))}</div><button type="button" onClick={() => addQuestion(secIndex)} className="w-full mt-2 bg-gray-700 text-white px-2 py-1 text-xs rounded-md hover:bg-gray-600">+ Add Question</button></div>))}{<button type="button" onClick={addSection} className="w-full mt-4 bg-gray-700 text-white px-2 py-1 text-sm rounded-md hover:bg-gray-600">+ Add Section</button>}<button type="button" onClick={() => setIsSectionManagerOpen(true)} className="w-full mt-2 bg-gray-600 text-white px-2 py-1 text-xs rounded-md hover:bg-gray-500">Manage Custom Sections</button></div></div>)}
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