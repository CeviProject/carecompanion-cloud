
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import SignOutButton from '@/components/auth/SignOutButton';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Don't show the main navbar on patient dashboard pages
  const isPatientPage = location.pathname.startsWith('/patient/');
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  // Don't render on patient dashboard pages
  if (isPatientPage) {
    return null;
  }

  // Handle the "Go to Dashboard" action
  const handleDashboardNavigation = () => {
    if (isAuthenticated) {
      if (profile?.role === 'patient') {
        navigate('/patient/overview');
      } else if (profile?.role === 'doctor') {
        navigate('/dashboard/doctor');
      } else {
        navigate('/auth/register');
      }
    } else {
      navigate('/auth/register');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-primary text-2xl font-semibold animate-pulse-gentle">
                Med-Guardian
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className={cn(
                "text-sm font-medium transition-colors px-4 py-2 rounded-full",
                isActive("/") 
                  ? "bg-medBlue text-white" 
                  : "bg-medBlue-light text-foreground/80 hover:bg-medBlue hover:text-white"
              )}
            >
              Home
            </Link>
            
            <Link 
              to="/about" 
              className={cn(
                "text-sm font-medium transition-colors px-4 py-2 rounded-full",
                isActive("/about") 
                  ? "bg-health-500 text-white" 
                  : "bg-health-100 text-foreground/80 hover:bg-health-500 hover:text-white"
              )}
            >
              About
            </Link>
            
            <Link 
              to="/features" 
              className={cn(
                "text-sm font-medium transition-colors px-4 py-2 rounded-full",
                isActive("/features") 
                  ? "bg-destructive text-white" 
                  : "bg-destructive/10 text-foreground/80 hover:bg-destructive hover:text-white"
              )}
            >
              Features
            </Link>
            
            {isAuthenticated && (
              <Button 
                onClick={handleDashboardNavigation}
                className={cn(
                  "text-sm font-medium transition-colors px-4 py-2 rounded-full",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            )}
          </nav>

          {/* Authentication buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="text-sm font-medium">
                  {profile?.role === 'patient' ? 'Anonymous' : `Hello, ${profile?.first_name || 'User'}`}
                </div>
                <SignOutButton />
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/auth/login">Sign In</Link>
                </Button>
                <Button asChild className="rounded-full">
                  <Link to="/auth/register">Get Started</Link>
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
                "block w-full text-left px-4 py-2 rounded-full text-base font-medium focus-ring",
                isActive("/") 
                  ? "bg-medBlue text-white" 
                  : "bg-medBlue-light text-foreground/80 hover:bg-medBlue hover:text-white"
              )}
            >
              Home
            </button>
            
            <button
              onClick={() => handleNavigation("/about")}
              className={cn(
                "block w-full text-left px-4 py-2 rounded-full text-base font-medium focus-ring",
                isActive("/about") 
                  ? "bg-health-500 text-white" 
                  : "bg-health-100 text-foreground/80 hover:bg-health-500 hover:text-white"
              )}
            >
              About
            </button>
            
            <button
              onClick={() => handleNavigation("/features")}
              className={cn(
                "block w-full text-left px-4 py-2 rounded-full text-base font-medium focus-ring",
                isActive("/features") 
                  ? "bg-destructive text-white" 
                  : "bg-destructive/10 text-foreground/80 hover:bg-destructive hover:text-white"
              )}
            >
              Features
            </button>
            
            {isAuthenticated && (
              <button
                onClick={handleDashboardNavigation}
                className={cn(
                  "flex items-center w-full text-left px-4 py-2 rounded-full text-base font-medium focus-ring",
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Dashboard
              </button>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-border">
            <div className="flex items-center px-5">
              {isAuthenticated ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    <div className="text-base font-medium">
                      {profile?.role === 'patient' ? 'Anonymous' : `${profile?.first_name || ''} ${profile?.last_name || ''}`}
                    </div>
                  </div>
                  <SignOutButton className="w-full" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-full space-y-2">
                  <Button asChild className="w-full mb-2" variant="outline">
                    <Link to="/auth/login" onClick={() => setIsMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full" onClick={() => { setIsMenuOpen(false); }}>
                    <Link to="/auth/register">
                      Get Started
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
