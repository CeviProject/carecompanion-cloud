
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import SignOutButton from '@/components/auth/SignOutButton';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Don't show the main navbar on patient dashboard pages
  const isPatientPage = location.pathname.startsWith('/patient/');
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Track scroll position to add background effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
    navigate(path);
    setIsMenuOpen(false);
  };

  // Don't render on patient dashboard pages
  if (isPatientPage) {
    return null;
  }

  // Handle the "Go to Dashboard" action
  const handleDashboardNavigation = () => {
    console.log('Dashboard navigation triggered, auth state:', { isAuthenticated, profile, loading });
    if (isAuthenticated) {
      if (profile?.role === 'patient') {
        navigate('/patient/overview');
      } else if (profile?.role === 'doctor') {
        navigate('/dashboard/doctor');
      } else {
        navigate('/dashboard/' + (profile?.role || 'patient'));
      }
    } else {
      navigate('/auth/register');
    }
    setIsMenuOpen(false);
  };

  const handleLoginClick = () => {
    console.log('Login button clicked, navigating to /auth/login');
    navigate('/auth/login');
    setIsMenuOpen(false);
  };

  const handleRegisterClick = () => {
    console.log('Register button clicked, navigating to /auth/register');
    navigate('/auth/register');
    setIsMenuOpen(false);
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
      scrolled || isMenuOpen ? "bg-background/95 backdrop-blur-md shadow-sm" : "bg-background/80 backdrop-blur-sm"
    )}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-primary text-2xl font-semibold">
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
            
            {isAuthenticated && !loading && (
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
            {isAuthenticated && !loading ? (
              <>
                <div className="text-sm font-medium">
                  {profile?.role === 'patient' ? 'Anonymous' : `Hello, ${profile?.first_name || 'User'}`}
                </div>
                <SignOutButton />
              </>
            ) : loading ? (
              <div className="w-20 h-9 bg-gray-200 animate-pulse rounded-full"></div>
            ) : (
              <>
                <Button onClick={handleLoginClick} variant="outline" className="rounded-full">
                  Sign In
                </Button>
                <Button onClick={handleRegisterClick} className="rounded-full">
                  Get Started
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
            
            {isAuthenticated && !loading && (
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
              {isAuthenticated && !loading ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    <div className="text-base font-medium">
                      {profile?.role === 'patient' ? 'Anonymous' : `${profile?.first_name || ''} ${profile?.last_name || ''}`}
                    </div>
                  </div>
                  <SignOutButton className="w-full" />
                </div>
              ) : loading ? (
                <div className="w-full h-10 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <div className="flex-shrink-0 w-full space-y-2">
                  <Button onClick={handleLoginClick} className="w-full mb-2" variant="outline">
                    Sign In
                  </Button>
                  <Button onClick={handleRegisterClick} className="w-full">
                    Get Started
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
