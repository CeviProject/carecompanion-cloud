
import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

type SignOutButtonProps = {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
};

const SignOutButton = ({ 
  variant = "outline", 
  size = "sm", 
  className = "",
  showIcon = true,
  showText = true
}: SignOutButtonProps) => {
  try {
    const { signOut, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
      return null;
    }

    return (
      <Button 
        variant={variant} 
        size={size} 
        className={className} 
        onClick={signOut}
      >
        {showIcon && <LogOut className="h-4 w-4 mr-2" />}
        {showText && "Sign Out"}
      </Button>
    );
  } catch (error) {
    // If useAuth fails, render nothing or a fallback
    console.error("Error in SignOutButton:", error);
    return null;
  }
};

export default SignOutButton;
