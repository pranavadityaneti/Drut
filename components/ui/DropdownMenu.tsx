import React, { useState, useRef, useEffect, createContext, useContext } from 'react';

interface DropdownMenuContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined);

const useDropdownMenu = () => {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('useDropdownMenu must be used within a DropdownMenu');
  }
  return context;
};

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ children, asChild }) => {
  const { setIsOpen } = useDropdownMenu();
  const { isOpen } = useDropdownMenu();
  const child = React.Children.only(children) as React.ReactElement;

  if (asChild) {
      // FIX: Under strict TypeScript settings, `child.props` can be inferred as `unknown`,
      // which prevents spreading and property access. Casting to `any` resolves these issues.
      const childProps = child.props as any;
      return React.cloneElement(child, {
          ...childProps,
          'aria-expanded': isOpen,
          'aria-haspopup': true,
          onClick: (event: React.MouseEvent) => {
              // Ensure any existing onClick on the child is also called.
              if (childProps.onClick) {
                childProps.onClick(event);
              }
              setIsOpen(prev => !prev);
          },
      });
  }
  
  return (
    <button onClick={() => setIsOpen(prev => !prev)} aria-expanded={isOpen} aria-haspopup="true">
      {children}
    </button>
  );
};


export const DropdownMenuContent: React.FC<{ 
    children: React.ReactNode; 
    className?: string;
    align?: 'start' | 'center' | 'end';
    side?: 'top' | 'right' | 'bottom' | 'left';
}> = ({ children, className = '', align = 'center', side = 'bottom' }) => {
  const { isOpen, setIsOpen } = useDropdownMenu();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  const sideClasses = {
      bottom: 'top-full mt-2',
      top: 'bottom-full mb-2',
      left: 'right-full mr-2',
      right: 'left-full ml-2'
  }

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ${alignClasses[align]} ${sideClasses[side]} ${className}`}
      data-state={isOpen ? 'open' : 'closed'}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => {
  const { setIsOpen } = useDropdownMenu();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    setIsOpen(false);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground ${className}`}
    >
      {children}
    </div>
  );
};

export const DropdownMenuSeparator: React.FC<{ className?: string }> = ({ className = '' }) => {
    return <div className={`-mx-1 my-1 h-px bg-muted ${className}`} />;
};