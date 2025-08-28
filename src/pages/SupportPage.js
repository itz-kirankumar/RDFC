import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

// A simple spinner component for a better loading state
const Spinner = () => (
    <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
    </div>
);

const SupportPage = ({ navigate }) => {
    const { user, userData } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'new', 'ticket'
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');
    const messagesEndRef = useRef(null); // Ref for auto-scrolling

    // Effect to fetch tickets in real-time
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const q = query(collection(db, 'supportTickets'), where('userId', '==', user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userTickets = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
            
            setTickets(userTickets);

            if (selectedTicket) {
                const updatedSelected = userTickets.find(t => t.id === selectedTicket.id);
                setSelectedTicket(updatedSelected || null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tickets:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, selectedTicket?.id]);

    // Effect for auto-scrolling to the latest message
    useEffect(() => {
        if (view === 'ticket' && selectedTicket) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.messages, view]);


    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            alert('Please fill out both subject and message.');
            return;
        }
        try {
            await addDoc(collection(db, 'supportTickets'), {
                userId: user.uid,
                userEmail: user.email,
                subject: subject,
                status: 'open',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                messages: [{
                    text: message,
                    sender: 'user',
                    senderName: userData?.name || user.email,
                    timestamp: new Date()
                }]
            });
            setSubject('');
            setMessage('');
            setView('list');
        } catch (error) {
            console.error("Error creating ticket: ", error);
        }
    };

    const handleSelectTicket = (ticket) => {
        setSelectedTicket(ticket);
        setView('ticket');
    };
    
    const handleSendReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
    
        const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
    
        try {
            await updateDoc(ticketRef, {
                messages: arrayUnion({
                    text: replyText,
                    sender: 'user',
                    senderName: userData?.name || user.email,
                    timestamp: new Date()
                }),
                status: 'open', // Re-open the ticket if it was 'replied' or 'resolved'
                updatedAt: serverTimestamp()
            });
            setReplyText('');
        } catch (error) {
            console.error("Error sending reply:", error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-yellow-200 text-yellow-800';
            case 'replied': return 'bg-blue-200 text-blue-800';
            case 'resolved': return 'bg-green-200 text-green-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    };
    
    // --- Shared Styles for Form Elements ---
    const formInputStyle = "mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";
    const primaryButtonStyle = "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500";
    const secondaryButtonStyle = "w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors";

    const renderListView = () => (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 flex flex-col h-full">
            <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">My Support Tickets</h2>
                <button onClick={() => setView('new')} className={primaryButtonStyle}>Create New Ticket</button>
            </div>
            {loading ? <Spinner /> : (
                <div className="flex-grow space-y-4 overflow-y-auto">
                    {tickets.length === 0 ? <p className="text-gray-400 text-center py-8">You have not created any support tickets yet.</p> :
                        tickets.map(ticket => (
                            <div key={ticket.id} onClick={() => handleSelectTicket(ticket)} className="bg-gray-700/50 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                    <p className="font-semibold text-white truncate">{ticket.subject}</p>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 mt-2">Last updated: {ticket.updatedAt ? new Date(ticket.updatedAt.toDate()).toLocaleString() : 'Just now'}</p>
                            </div>
                        ))
                    }
                </div>
            )}
        </div>
    );

    const renderNewTicketForm = () => (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 h-full">
            <h2 className="text-2xl font-bold text-white mb-6">Create a New Support Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-6">
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300">Subject</label>
                    <input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={formInputStyle} required />
                </div>
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300">Message</label>
                    <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows="6" className={formInputStyle} required></textarea>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button type="button" onClick={() => setView('list')} className={secondaryButtonStyle}>Cancel</button>
                    <button type="submit" className={primaryButtonStyle}>Submit Ticket</button>
                </div>
            </form>
        </div>
    );
    
    const renderTicketView = () => (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 flex flex-col h-full">
            <div className="flex-shrink-0">
                <button onClick={() => setView('list')} className="text-blue-400 hover:text-blue-300 mb-4 inline-block">&larr; Back to all tickets</button>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedTicket.subject}</h2>
                <p className="text-sm text-gray-400 mb-6">Status: <span className={`font-bold capitalize px-2 py-0.5 rounded ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span></p>
            </div>

            <div className="flex-grow space-y-4 overflow-y-auto pr-2 border-t border-b border-gray-700 py-4">
                {selectedTicket.messages.map((msg, index) => (
                    <div key={index} className={`p-3 rounded-lg max-w-lg sm:max-w-xl ${msg.sender === 'user' ? 'bg-blue-900/70 ml-auto' : 'bg-gray-700 mr-auto'}`}>
                        <p className="font-bold text-sm mb-1">{msg.senderName}</p>
                        <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                        <p className="text-xs text-gray-400 mt-2 text-right">{msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : 'Sending...'}</p>
                    </div>
                ))}
                <div ref={messagesEndRef} /> 
            </div>

            <div className="flex-shrink-0 pt-6">
                {selectedTicket.status !== 'resolved' ? (
                    <>
                        <label htmlFor="reply" className="block text-sm font-medium text-gray-300 mb-1">Your Reply</label>
                        <textarea
                           id="reply"
                           value={replyText}
                           onChange={(e) => setReplyText(e.target.value)}
                           placeholder="Type your reply..."
                           className={formInputStyle}
                           rows="4"
                       />
                       <div className="flex mt-3">
                           <button
                               onClick={handleSendReply}
                               disabled={!replyText.trim()}
                               className={`${primaryButtonStyle} flex-grow`}
                           >
                               Send Reply
                           </button>
                       </div>
                    </>
                ) : (
                    <div className="text-center p-4 bg-green-900/50 rounded-lg">
                        <p className="font-semibold text-green-200">This ticket has been resolved.</p>
                        <p className="text-sm text-green-300 mt-1">If your issue persists, you can re-open the ticket by sending a new reply.</p>
                        <textarea
                           value={replyText}
                           onChange={(e) => setReplyText(e.target.value)}
                           placeholder="Type a follow-up to re-open..."
                           className={`${formInputStyle} mt-4`}
                           rows="4"
                       />
                       <button
                           onClick={handleSendReply}
                           disabled={!replyText.trim()}
                           className={`${primaryButtonStyle} w-full mt-2 bg-orange-600 hover:bg-orange-700`}
                       >
                           Submit Reply and Re-open Ticket
                       </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-screen bg-gray-900 text-white">
            <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6">
                <h1 className="text-3xl font-bold text-white">Support Center</h1>
                <button onClick={() => navigate('home')} className="bg-gray-700 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 shadow transition-colors">&larr; Back to Dashboard</button>
            </div>
            <div className="flex-grow overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
                {view === 'list' && renderListView()}
                {view === 'new' && renderNewTicketForm()}
                {view === 'ticket' && selectedTicket && renderTicketView()}
            </div>
        </div>
    );
};

export default SupportPage;
