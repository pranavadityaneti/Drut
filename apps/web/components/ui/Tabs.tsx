import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@drut/shared";

/**
 * Tabs — editorial underlined tab bar.
 *
 * Built on @radix-ui/react-tabs (already a dependency). The active tab gets
 * a thin underline in deep ink; inactive tabs are muted. Replaces pill-toggle
 * tab patterns across the app.
 *
 * Usage:
 *   <Tabs defaultValue="a">
 *     <TabsList>
 *       <TabsTrigger value="a">First</TabsTrigger>
 *       <TabsTrigger value="b">Second</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="a">...</TabsContent>
 *     <TabsContent value="b">...</TabsContent>
 *   </Tabs>
 */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={cn(
            "inline-flex items-center gap-6 border-b border-[var(--color-ink-5)]",
            className
        )}
        {...props}
    />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
            "tab-underline inline-flex items-center gap-2 text-sm",
            "focus-visible:outline-none focus-visible:text-[var(--color-ink-1)]",
            // pull the bottom border down 1px so it sits ON the list's bottom border
            "-mb-px",
            className
        )}
        {...props}
    />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={cn(
            "mt-6 focus-visible:outline-none",
            className
        )}
        {...props}
    />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
