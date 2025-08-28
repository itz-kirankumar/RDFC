import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaUpload } from 'react-icons/fa';

// --- Reusable Input Component ---
const FormInput = ({ label, value, onChange, placeholder, as = 'input', rows = 3 }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        {as === 'textarea' ? (
            <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"/>
        ) : (
            <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"/>
        )}
    </div>
);

// --- Modal for Adding/Editing Words with New Fields ---
const WordModal = ({ isOpen, onClose, onSave, wordData }) => {
    const [word, setWord] = useState('');
    const [meaning, setMeaning] = useState('');
    const [example, setExample] = useState('');
    const [difficulty, setDifficulty] = useState('Medium');
    const [tags, setTags] = useState('');

    useEffect(() => {
        setWord(wordData?.word || '');
        setMeaning(wordData?.meaning || '');
        setExample(wordData?.example || '');
        setDifficulty(wordData?.difficulty || 'Medium');
        setTags(Array.isArray(wordData?.tags) ? wordData.tags.join(', ') : '');
    }, [wordData]);

    if (!isOpen) return null;

    const handleSave = () => {
        const tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
        onSave({ word, meaning, example, difficulty, tags: tagsArray });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md space-y-4 shadow-xl">
                <h2 className="text-2xl font-bold text-white">{wordData ? 'Edit Word' : 'Add New Word'}</h2>
                <FormInput label="Word" value={word} onChange={(e) => setWord(e.target.value)} placeholder="e.g., Ephemeral"/>
                <FormInput label="Meaning" as="textarea" value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="e.g., Lasting for a very short time."/>
                <FormInput label="Example Sentence" as="textarea" value={example} onChange={(e) => setExample(e.target.value)} placeholder="e.g., The beauty of the cherry blossoms is ephemeral."/>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Difficulty</label>
                    <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none">
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                    </select>
                </div>
                <FormInput label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., CAT Exam, High-Frequency"/>
                <div className="flex justify-end space-x-4 pt-2">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md font-semibold transition-colors">Cancel</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold transition-colors">Save</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Vocab Manager Component ---
const AdminVocabManager = () => {
    const [lists, setLists] = useState([]);
    const [selectedList, setSelectedList] = useState(null);
    const [words, setWords] = useState([]);
    const [newListName, setNewListName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isWordModalOpen, setIsWordModalOpen] = useState(false);
    const [editingWord, setEditingWord] = useState(null);
    const [view, setView] = useState('lists'); // For mobile view toggling

    useEffect(() => {
        const fetchLists = async () => {
            setLoading(true);
            const listsQuery = query(collection(db, 'vocabLists'), orderBy('createdAt', 'desc'));
            const listSnapshot = await getDocs(listsQuery);
            setLists(listSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        };
        fetchLists();
    }, []);

    const fetchWords = async (listId) => {
        if (!listId) return;
        const wordsQuery = query(collection(db, 'vocabLists', listId, 'words'), orderBy('createdAt', 'asc'));
        const wordsSnapshot = await getDocs(wordsQuery);
        setWords(wordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const handleListSelect = (list) => {
        setSelectedList(list);
        fetchWords(list.id);
        setView('words'); // Switch to word view on mobile
    };
    
    const handleAddList = async () => {
        if (!newListName.trim()) return;
        const docRef = await addDoc(collection(db, 'vocabLists'), {
            listName: newListName,
            isActive: false,
            createdAt: serverTimestamp()
        });
        setLists(prev => [{ id: docRef.id, listName: newListName, isActive: false, createdAt: new Date() }, ...prev]);
        setNewListName('');
    };

    const handleDeleteList = async (listId) => {
        if (!window.confirm("Are you sure? This will delete the list and ALL words within it permanently.")) return;
        
        // Delete all words in the subcollection
        const wordsRef = collection(db, 'vocabLists', listId, 'words');
        const wordsSnapshot = await getDocs(wordsRef);
        const batch = writeBatch(db);
        wordsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // Delete the list itself
        const listRef = doc(db, 'vocabLists', listId);
        batch.delete(listRef);
        
        await batch.commit();
        setLists(prev => prev.filter(l => l.id !== listId));
        if (selectedList?.id === listId) setSelectedList(null);
    };

    const handleEditList = async (list) => {
        const newName = prompt("Enter the new list name:", list.listName);
        if (newName && newName.trim() !== list.listName) {
            const listRef = doc(db, 'vocabLists', list.id);
            await updateDoc(listRef, { listName: newName.trim() });
            setLists(prev => prev.map(l => l.id === list.id ? { ...l, listName: newName.trim() } : l));
        }
    };

    const handleSetActive = async (listToActivate) => {
        const batch = writeBatch(db);
        lists.forEach(list => {
            if (list.isActive || list.id === listToActivate.id) {
                const listRef = doc(db, 'vocabLists', list.id);
                batch.update(listRef, { isActive: list.id === listToActivate.id });
            }
        });
        await batch.commit();
        setLists(prev => prev.map(l => ({ ...l, isActive: l.id === listToActivate.id })));
    };

    const handleSaveWord = async (wordData) => {
        if (editingWord) {
            const wordRef = doc(db, 'vocabLists', selectedList.id, 'words', editingWord.id);
            await updateDoc(wordRef, wordData);
        } else {
            await addDoc(collection(db, 'vocabLists', selectedList.id, 'words'), {
                ...wordData,
                createdAt: serverTimestamp()
            });
        }
        fetchWords(selectedList.id);
    };

    const handleDeleteWord = async (wordId) => {
        if (!window.confirm("Are you sure you want to delete this word?")) return;
        await deleteDoc(doc(db, 'vocabLists', selectedList.id, 'words', wordId));
        setWords(prev => prev.filter(w => w.id !== wordId));
    };

    const handleCSVImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            // Simple CSV parser assuming format: word,meaning,example,difficulty,tags
            const rows = text.split('\n').slice(1); // Skip header row
            const batch = writeBatch(db);
            let count = 0;
            
            rows.forEach(row => {
                const columns = row.split(',');
                if (columns.length >= 3) {
                    const newWordRef = doc(collection(db, 'vocabLists', selectedList.id, 'words'));
                    batch.set(newWordRef, {
                        word: columns[0]?.trim() || '',
                        meaning: columns[1]?.trim() || '',
                        example: columns[2]?.trim() || '',
                        difficulty: columns[3]?.trim() || 'Medium',
                        tags: columns[4] ? columns[4].split(';').map(t => t.trim()) : [],
                        createdAt: serverTimestamp()
                    });
                    count++;
                }
            });

            if (count > 0) {
                await batch.commit();
                alert(`${count} words imported successfully!`);
                fetchWords(selectedList.id);
            } else {
                alert("Could not import words. Check CSV format (word,meaning,example,difficulty,tags) and ensure it's not empty.");
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset input for re-uploading
    };
    
    if (loading) return <div className="text-center p-8 text-gray-400">Loading Vocabulary Lists...</div>;

    const renderLists = () => (
        <div className="md:w-1/3 bg-gray-800 p-4 rounded-lg flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4">Vocab Lists</h2>
            <div className="space-y-2 mb-4 flex-grow overflow-y-auto">
                {lists.map(list => (
                    <div key={list.id} className={`p-2 rounded flex justify-between items-center transition-colors ${selectedList?.id === list.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        <span onClick={() => handleListSelect(list)} className="flex-grow cursor-pointer font-semibold">{list.listName}</span>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                           {list.isActive ? <span className="text-xs bg-green-500 text-white font-bold px-2 py-1 rounded-full">ACTIVE</span> : <button onClick={() => handleSetActive(list)} className="text-xs bg-gray-500 hover:bg-gray-400 px-2 py-1 rounded-md">Set Active</button>}
                           <button onClick={() => handleEditList(list)} className="text-gray-300 hover:text-white"><FaEdit/></button>
                           <button onClick={() => handleDeleteList(list.id)} className="text-gray-300 hover:text-red-500"><FaTrash/></button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-auto">
                <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list name..." className="flex-grow p-2 bg-gray-900 text-white rounded border border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"/>
                <button onClick={handleAddList} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md font-semibold transition-colors flex items-center space-x-2"><FaPlus/><span>Add</span></button>
            </div>
        </div>
    );

    const renderWords = () => (
        <div className="md:w-2/3 bg-gray-800 p-4 rounded-lg flex flex-col h-full">
            {selectedList ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2">
                        <div className="flex items-center gap-4">
                           <button onClick={() => setView('lists')} className="md:hidden bg-gray-700 p-2 rounded-md hover:bg-gray-600"><FaArrowLeft/></button>
                           <h2 className="text-2xl font-bold">Words in <span className="text-cyan-400">{selectedList.listName}</span></h2>
                        </div>
                        <div className="flex gap-2 self-end md:self-center">
                            <label htmlFor="csv-upload" className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md font-semibold transition-colors cursor-pointer flex items-center space-x-2">
                               <FaUpload/><span>Import CSV</span>
                            </label>
                            <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                            <button onClick={() => { setEditingWord(null); setIsWordModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold transition-colors flex items-center space-x-2"><FaPlus/><span>Add Word</span></button>
                        </div>
                    </div>
                    <div className="space-y-3 overflow-y-auto">
                        {words.map(word => (
                            <div key={word.id} className="bg-gray-700 p-3 rounded-md">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-lg">{word.word}</p>
                                    <div className="flex space-x-2 flex-shrink-0 ml-4">
                                        <button onClick={() => { setEditingWord(word); setIsWordModalOpen(true); }} className="text-yellow-400 hover:text-yellow-300"><FaEdit/></button>
                                        <button onClick={() => handleDeleteWord(word.id)} className="text-red-500 hover:text-red-400"><FaTrash/></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${word.difficulty === 'Hard' ? 'bg-red-500' : word.difficulty === 'Easy' ? 'bg-green-500' : 'bg-yellow-500'}`}>{word.difficulty}</span>
                                    {word.tags?.map(tag => <span key={tag} className="text-xs bg-gray-600 px-2 py-0.5 rounded-full">{tag}</span>)}
                                </div>
                                <p className="text-sm text-gray-300 mt-2">{word.meaning}</p>
                                <p className="text-xs text-gray-400 italic mt-1">"{word.example}"</p>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-full"><p className="text-gray-400">Select a list to manage its words.</p></div>
            )}
        </div>
    );
    
    return (
        <div className="max-w-7xl mx-auto p-4 md:p-0">
            <WordModal isOpen={isWordModalOpen} onClose={() => { setIsWordModalOpen(false); setEditingWord(null); }} onSave={handleSaveWord} wordData={editingWord}/>
            
            {/* Desktop View */}
            <div className="hidden md:flex flex-row gap-6 h-[calc(100vh-100px)]">
                {renderLists()}
                {renderWords()}
            </div>

            {/* Mobile View */}
            <div className="md:hidden h-[calc(100vh-100px)]">
                {view === 'lists' ? renderLists() : renderWords()}
            </div>
        </div>
    );
};

export default AdminVocabManager;