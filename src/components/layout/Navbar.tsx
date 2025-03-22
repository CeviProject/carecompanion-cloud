
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
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
            {isAuthenticated && profile?.role === 'patient' && (
              <Link 
                to="/dashboard/patient" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive("/dashboard/patient") ? "text-primary" : "text-foreground/80"
                )}
              >
                Dashboard
              </Link>
            )}
            {isAuthenticated && profile?.role === 'doctor' && (
              <Link 
                to="/dashboard/doctor" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive("/dashboard/doctor") ? "text-primary" : "text-foreground/80"
                )}
              >
                Dashboard
              </Link>
            )}
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
            {isAuthenticated ? (
              <>
                <div className="text-sm font-medium">
                  Hello, {profile?.first_name || 'User'}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full" 
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/auth/login">Sign In</Link>
                </Button>
                <Button asChild className="rounded-full">
                  <Link to="/auth/register">Sign Up</Link>
                </Button>
              </>
            )}
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
            <button
              onClick={() => handleNavigation("/")}
              className={cn(
                "block w-full text-left px-3 py-2 rounded-md text-base font-medium focus-ring",
                isActive("/") ? "text-primary" : "text-foreground/80 hover:text-primary"
              )}
            >
              Home
            </button>
            {isAuthenticated && profile?.role === 'patient' && (
              <button 
                onClick={() => handleNavigation("/dashboard/patient")}
                className={cn(
                  "block w-full text-left px-3 py-2 rounded-md text-base font-medium focus-ring",
                  isActive("/dashboard/patient") ? "text-primary" : "text-foreground/80 hover:text-primary"
                )}
              >
                Dashboard
              </button>
            )}
            {isAuthenticated && profile?.role === 'doctor' && (
              <button
                onClick={() => handleNavigation("/dashboard/doctor")}
                className={cn(
                  "block w-full text-left px-3 py-2 rounded-md text-base font-medium focus-ring",
                  isActive("/dashboard/doctor") ? "text-primary" : "text-foreground/80 hover:text-primary"
                )}
              >
                Dashboard
              </button>
            )}
            <button
              onClick={() => handleNavigation("/about")}
              className={cn(
                "block w-full text-left px-3 py-2 rounded-md text-base font-medium focus-ring",
                isActive("/about") ? "text-primary" : "text-foreground/80 hover:text-primary"
              )}
            >
              About
            </button>
            <button
              onClick={() => handleNavigation("/features")}
              className={cn(
                "block w-full text-left px-3 py-2 rounded-md text-base font-medium focus-ring",
                isActive("/features") ? "text-primary" : "text-foreground/80 hover:text-primary"
              )}
            >
              Features
            </button>
          </div>
          <div className="pt-4 pb-3 border-t border-border">
            <div className="flex items-center px-5">
              {isAuthenticated ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    <div className="text-base font-medium">
                      {profile?.first_name} {profile?.last_name}
                    </div>
                  </div>
                  <Button 
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex-shrink-0 w-full space-y-2">
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
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
