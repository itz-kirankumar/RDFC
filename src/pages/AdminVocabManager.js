import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, serverTimestamp, orderBy } from 'firebase/firestore';

// Modal component for adding/editing words
const WordModal = ({ isOpen, onClose, onSave, wordData }) => {
    const [word, setWord] = useState('');
    const [meaning, setMeaning] = useState('');
    const [example, setExample] = useState('');

    useEffect(() => {
        setWord(wordData?.word || '');
        setMeaning(wordData?.meaning || '');
        setExample(wordData?.example || '');
    }, [wordData]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ word, meaning, example });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md space-y-4">
                <h2 className="text-2xl font-bold text-white">{wordData ? 'Edit Word' : 'Add New Word'}</h2>
                <input type="text" value={word} onChange={(e) => setWord(e.target.value)} placeholder="Word" className="w-full p-2 bg-gray-700 rounded"/>
                <textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Meaning" className="w-full p-2 bg-gray-700 rounded h-24"/>
                <textarea value={example} onChange={(e) => setExample(e.target.value)} placeholder="Example Sentence" className="w-full p-2 bg-gray-700 rounded h-24"/>
                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
                    <button onClick={handleSave} className="bg-blue-600 px-4 py-2 rounded">Save</button>
                </div>
            </div>
        </div>
    );
};

const AdminVocabManager = () => {
    const [lists, setLists] = useState([]);
    const [selectedList, setSelectedList] = useState(null);
    const [words, setWords] = useState([]);
    const [newListName, setNewListName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWord, setEditingWord] = useState(null);

    const fetchLists = async () => {
        setLoading(true);
        const listsCollection = collection(db, 'vocabLists');
        const listSnapshot = await getDocs(listsCollection);
        const listsData = listSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLists(listsData);
        setLoading(false);
    };

    useEffect(() => {
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
    };
    
    const handleAddList = async () => {
        if (!newListName.trim()) return;
        await addDoc(collection(db, 'vocabLists'), {
            listName: newListName,
            isActive: false,
            createdAt: serverTimestamp()
        });
        setNewListName('');
        fetchLists();
    };

    const handleSetActive = async (listToActivate) => {
        const batch = writeBatch(db);
        const activeQuery = query(collection(db, 'vocabLists'), where('isActive', '==', true));
        const activeSnapshot = await getDocs(activeQuery);
        
        activeSnapshot.forEach(doc => {
            batch.update(doc.ref, { isActive: false });
        });
        
        const newActiveRef = doc(db, 'vocabLists', listToActivate.id);
        batch.update(newActiveRef, { isActive: true });
        
        await batch.commit();
        fetchLists();
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
        if (window.confirm("Are you sure you want to delete this word?")) {
            await deleteDoc(doc(db, 'vocabLists', selectedList.id, 'words', wordId));
            fetchWords(selectedList.id);
        }
    };
    
    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <WordModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingWord(null); }}
                onSave={handleSaveWord}
                wordData={editingWord}
            />
            <div className="md:w-1/3 bg-gray-800 p-4 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Vocab Lists</h2>
                <div className="space-y-2 mb-4">
                    {lists.map(list => (
                        <div key={list.id} className={`p-2 rounded cursor-pointer flex justify-between items-center ${selectedList?.id === list.id ? 'bg-blue-600' : 'bg-gray-700'}`}>
                            <span onClick={() => handleListSelect(list)} className="flex-grow">{list.listName}</span>
                            {list.isActive ? (
                                <span className="text-xs bg-green-500 text-white font-bold px-2 py-1 rounded-full">ACTIVE</span>
                            ) : (
                                <button onClick={() => handleSetActive(list)} className="text-xs bg-gray-500 hover:bg-gray-400 px-2 py-1 rounded">Set Active</button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list name..." className="flex-grow p-2 bg-gray-900 rounded"/>
                    <button onClick={handleAddList} className="bg-green-600 px-4 py-2 rounded">Add</button>
                </div>
            </div>
            <div className="md:w-2/3 bg-gray-800 p-4 rounded-lg">
                {selectedList ? (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Words in <span className="text-cyan-400">{selectedList.listName}</span></h2>
                            <button onClick={() => { setEditingWord(null); setIsModalOpen(true); }} className="bg-blue-600 px-4 py-2 rounded">Add Word</button>
                        </div>
                        <div className="space-y-2">
                            {words.map(word => (
                                <div key={word.id} className="bg-gray-700 p-3 rounded flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg">{word.word}</p>
                                        <p className="text-sm text-gray-300">{word.meaning}</p>
                                        <p className="text-xs text-gray-400 italic mt-1">"{word.example}"</p>
                                    </div>
                                    <div className="flex space-x-2 flex-shrink-0 ml-4">
                                        <button onClick={() => { setEditingWord(word); setIsModalOpen(true); }} className="text-yellow-400 hover:text-yellow-300">Edit</button>
                                        <button onClick={() => handleDeleteWord(word.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400">Select a list to manage its words.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminVocabManager;