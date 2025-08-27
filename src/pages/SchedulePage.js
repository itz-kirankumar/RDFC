import React, { useState, useMemo } from 'react';
import { FaCalendarAlt, FaArrowLeft, FaExternalLinkAlt } from 'react-icons/fa';

const sectionalSchedule = [
    { title: "VARC Sectional Core -- 01", releaseDate: "2025-08-27" },
    { title: "VARC Sectional Core -- 02", releaseDate: "2025-08-30" },
    { title: "VARC Sectional Core -- 03", releaseDate: "2025-09-03" },
    { title: "VARC Sectional Core -- 04", releaseDate: "2025-09-07" },
    { title: "VARC Sectional Core -- 05", releaseDate: "2025-09-11" },
    { title: "VARC Sectional Core -- 06", releaseDate: "2025-09-15" },
    { title: "VARC Sectional Core -- 07", releaseDate: "2025-09-19" },
    { title: "VARC Sectional Core -- 08", releaseDate: "2025-09-23" },
    { title: "VARC Sectional Core -- 09", releaseDate: "2025-09-27" },
    { title: "VARC Sectional Core -- 10", releaseDate: "2025-10-01" },
    { title: "VARC Sectional Core -- 11", releaseDate: "2025-10-05" },
    { title: "VARC Sectional Core -- 12", releaseDate: "2025-10-09" },
    { title: "VARC Sectional Core -- 13", releaseDate: "2025-10-13" },
    { title: "VARC Sectional Core -- 14", releaseDate: "2025-10-17" },
    { title: "VARC Sectional Core -- 15", releaseDate: "2025-10-21" },
    { title: "VARC Sectional Challenging -- 01", releaseDate: "2025-10-23" },
    { title: "VARC Sectional Challenging -- 02", releaseDate: "2025-11-02" },
    { title: "VARC Sectional Challenging -- 03", releaseDate: "2025-11-13" },
    { title: "VARC Sectional Challenging -- 04", releaseDate: "2025-11-25" },
    { title: "VARC Sectional Challenging -- 05", releaseDate: "2025-11-27" }
];

const mockSchedule = [
    { title: "Full-Length Mock -- 01", releaseDate: "2025-08-25" },
    { title: "Full-Length Mock -- 02", releaseDate: "2025-08-27" },
    { title: "Full-Length Mock -- 03", releaseDate: "2025-09-05" },
    { title: "Full-Length Mock -- 04", releaseDate: "2025-09-12" },
    { title: "Full-Length Mock -- 05", releaseDate: "2025-09-19" },
];


const SchedulePage = ({ navigate }) => {
    const [activeTab, setActiveTab] = React.useState('sectionals');

    const scheduleData = {
        sectionals: sectionalSchedule,
        mocks: mockSchedule,
    };

    const TabButton = ({ scheduleType, label }) => (
        <button
            onClick={() => setActiveTab(scheduleType)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeTab === scheduleType 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );

    const ScheduleList = ({ schedule }) => (
        <div className="bg-gray -800 shadow-lg rounded-lg border border-gray-700 mt-4">
            <ul className="divide-y divide-gray-700">
                {schedule.map((item, index) => {
                    // Combine date with 7:00 PM in IST
                    const releaseDateTime = new Date(`${item.releaseDate}T19:00:00+05:30`);
                    const now = new Date();
                    const isLive = releaseDateTime <= now;

                    const formattedDate = releaseDateTime.toLocaleDateString('en-US', {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata'
                    });

                    return (
                        <li key={index} className="flex items-center justify-between p-4">
                            <div className="flex items-center">
                                <FaCalendarAlt className={`mr-4 flex-shrink-0 text-xl ${isLive ? 'text-green-400' : 'text-yellow-400'}`} />
                                <div className="flex-grow">
                                    <p className="text-white font-semibold text-lg">{item.title}</p>
                                    <p className="text-gray-400">{formattedDate} at 7:00 PM IST</p>
                                </div>
                            </div>
                            {isLive ? (
                                <span className="text-xs font-bold bg-green-500/20 text-green-300 px-3 py-1 rounded-full">Live</span>
                            ) : (
                                <span className="text-xs font-bold bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full">Upcoming</span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <button 
                    onClick={() => navigate('home')} 
                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 font-semibold"
                >
                    <FaArrowLeft />
                    <span>Back to Dashboard</span>
                </button>
                <a 
                    href="https://docs.google.com/document/d/1NFuykwd9NY6O1zPWg70HrU_Z2spxunw2NdsDAYkGUeo/edit?usp=sharing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <FaExternalLinkAlt />
                    <span>View Detailed Document</span>
                </a>
            </div>

            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-6">
                Test Release Schedule
            </h2>
            
            <div className="flex space-x-2 p-1 bg-gray-900/50 rounded-lg self-start">
                <TabButton scheduleType="sectionals" label="Sectionals" />
                {/* <TabButton scheduleType="mocks" label="Mocks" /> */}
            </div>

            <ScheduleList schedule={scheduleData[activeTab]} />
        </div>
    );
};

export default SchedulePage;
