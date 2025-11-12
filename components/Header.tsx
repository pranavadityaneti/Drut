
import React from 'react';

const DrutLogo = () => (
    <div className="flex items-center text-primary">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
            {/* Main 'D' shape, using currentColor to adapt to theme */}
            <path d="M33.3334 20.0002C33.3334 28.2845 27.2842 35.0002 19.1667 35.0002C11.0492 35.0002 5 28.2845 5 20.0002C5 11.7159 11.0492 5.00016 19.1667 5.00016C27.2842 5.00016 33.3334 11.7159 33.3334 20.0002Z" fill="currentColor"/>
            
            {/* The "folded paper" or shadow effect on the left. */}
            <path fillRule="evenodd" clipRule="evenodd" d="M5.13123 4.44354C8.75052 6.45331 11.6667 10.0535 13.3333 14.4446C14.2593 16.8401 14.8333 19.4147 14.8333 22.0835C14.8333 24.7523 14.2593 27.3269 13.3333 29.7224C11.6667 34.1135 8.75052 37.7137 5.13123 39.7235C4.94314 39.8272 4.99998 39.5841 4.99998 39.3613V4.80562C4.99998 4.58284 4.94314 4.33973 5.13123 4.44354Z" fill="black" fillOpacity="0.2"/>
            
            {/* The inner white cutout */}
            <path d="M25.8333 20C25.8333 23.799 22.8825 27.0833 19.1667 27.0833C15.4508 27.0833 12.5 23.799 12.5 20C12.5 16.201 15.4508 12.9167 19.1667 12.9167C22.8825 12.9167 25.8333 16.201 25.8333 20Z" fill="white"/>
        </svg>
        <span className="ml-3 text-3xl font-bold tracking-tight">Drut</span>
    </div>
);


export const Header: React.FC = () => {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <DrutLogo />
      </div>
    </header>
  );
};
