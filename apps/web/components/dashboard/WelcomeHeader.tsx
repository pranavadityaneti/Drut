/**
 * WelcomeHeader — editorial refresh.
 *
 * Greeting in display-h1 type, no emoji. Subtitle in muted ink.
 * Period dropdown + Export button on the right. Button uses the ink
 * variant (deep neutral) so it reads confident rather than playful.
 */

import React from 'react';
import { Download } from 'lucide-react';
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
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = userName?.split(' ')[0] || 'there';

    return (
        <div className="w-full flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div className="flex flex-col gap-1.5">
                <p className="label-uppercase">Today</p>
                <h1 className="text-[36px] leading-[1.05] font-bold tracking-[-0.02em] text-[var(--color-ink-1)]">
                    {greeting}, {firstName}
                </h1>
                <p className="text-[14px] text-[var(--color-ink-3)] mt-1">
                    Here's where things stand for the last 7 days.
                </p>
            </div>

            <div className="flex items-center gap-3">
                <div className="w-[150px]">
                    <Select defaultValue="7days">
                        <SelectTrigger className="bg-[var(--color-card)] ring-hairline-strong h-10 font-medium text-[13px] rounded-[10px]">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7days">Last 7 days</SelectItem>
                            <SelectItem value="30days">Last 30 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={onExport}
                    variant="ink"
                    className="h-10 px-4"
                >
                    <Download className="w-4 h-4" />
                    Export
                </Button>
            </div>
        </div>
    );
};

export default WelcomeHeader;
