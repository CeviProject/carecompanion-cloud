
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-primary text-2xl font-semibold animate-pulse-gentle">
                VirtualHealth
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/") ? "text-primary" : "text-foreground/80"
              )}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/about") ? "text-primary" : "text-foreground/80"
              )}
            >
              About
            </Link>
            <Link 
              to="/features" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive("/features") ? "text-primary" : "text-foreground/80"
              )}
            >
              Features
            </Link>
          </nav>

          {/* Authentication buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/auth/login">Sign In</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/auth/register">Sign Up</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md focus-ring"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/"
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium focus-ring",
                isActive("/") ? "text-primary" : "text-foreground/80 hover:text-primary"
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/about"
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium focus-ring",
                isActive("/about") ? "text-primary" : "text-foreground/80 hover:text-primary"
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/features"
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium focus-ring",
                isActive("/features") ? "text-primary" : "text-foreground/80 hover:text-primary"
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-border">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <Button asChild className="w-full mb-2" variant="outline">
                  <Link to="/auth/login" onClick={() => setIsMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/auth/register" onClick={() => setIsMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
