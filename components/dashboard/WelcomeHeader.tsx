/**
 * WelcomeHeader Component
 * 
 * Modern greeting section with user name, date, and export action
 */

import React from 'react';
import { Calendar, Download, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../ui/select-new';

interface WelcomeHeaderProps {
    userName: string;
    onExport?: () => void;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
    userName,
    onExport,
}) => {
    // Determine greeting based on time of day
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    // Get first name for greeting
    const firstName = userName?.split(' ')[0] || 'there';

    return (
        <div className="w-full flex items-center justify-between gap-4 mb-8">
            {/* Left: Greeting & Subtitle */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        {greeting}, {firstName} 👋
                    </h1>
                </div>
                <p className="text-slate-500 font-medium">
                    Here is the latest update for the last 7 days. Check now
                </p>
            </div>

            {/* Right: Date Filter & Export */}
            <div className="flex items-center gap-3 md:ml-auto">
                {/* Time Filter Dropdown */}
                <div className="w-[140px]">
                    <Select defaultValue="7days">
                        <SelectTrigger className="bg-white border-slate-200 h-10 font-medium">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7days">Last Week</SelectItem>
                            <SelectItem value="30days">Last Month</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Dark Export Button */}
                <Button
                    onClick={onExport}
                    className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 shadow-sm"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </Button>
            </div>
        </div>
    );
};

export default WelcomeHeader;
