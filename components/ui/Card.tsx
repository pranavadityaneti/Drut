import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-card text-card-foreground border rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  return <div className={`p-8 ${className}`}>{children}</div>;
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return <div className={`flex flex-col space-y-1.5 p-8 ${className}`}>{children}</div>;
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;
};

interface CardDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = '' }) => {
    return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
};

interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
    return <div className={`flex items-center p-8 pt-0 ${className}`}>{children}</div>;
};