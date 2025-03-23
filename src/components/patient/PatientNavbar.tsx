
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, X, BellRing, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import SignOutButton from '@/components/auth/SignOutButton';

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

const navigation: NavigationItem[] = [
  { name: "Overview", href: "/patient/overview", icon: <div>📊</div> },
  { name: "Appointments", href: "/patient/appointments", icon: <div>📅</div> },
  { name: "Medications", href: "/patient/medications", icon: <div>💊</div> },
  { name: "Health Query", href: "/patient/health-query", icon: <div>❓</div> },
  { name: "Assessment", href: "/patient/assessment", icon: <div>📝</div> },
  { name: "Health Tips", href: "/patient/elderly-tips", icon: <div>💡</div> },
  { name: "Find Doctors", href: "/patient/doctors", icon: <div>👨‍⚕️</div> },
];

export default function PatientNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out",
      scrolled || isMenuOpen ? "bg-background/95 backdrop-blur-md shadow-sm" : "bg-background/80 backdrop-blur-sm"
    )}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand name */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-primary text-2xl font-semibold">
                Med-Guardian
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center text-sm font-medium px-3 py-2 rounded-full transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User menu and notifications (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <button className="relative rounded-full p-2 hover:bg-muted focus-ring">
              <BellRing className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 text-xs flex items-center justify-center bg-destructive text-white rounded-full">
                  {unreadNotifications}
                </span>
              )}
            </button>
            
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <div className="font-medium">
                  {profile?.role === 'patient' ? 'Patient' : `${profile?.first_name || 'User'}`}
                </div>
              </div>
              <SignOutButton />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md focus-ring"
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
        <div className="lg:hidden bg-background/95 backdrop-blur-md">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "block px-3 py-2 rounded-lg text-base font-medium",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="flex items-center">
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-border">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium">
                  {profile?.role === 'patient' ? 'Patient' : `${profile?.first_name || ''} ${profile?.last_name || ''}`}
                </div>
              </div>
              <button 
                className="ml-auto p-1 rounded-full hover:bg-muted focus-ring"
                onClick={() => setUnreadNotifications(0)}
              >
                <BellRing className="h-6 w-6" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 text-xs flex items-center justify-center bg-destructive text-white rounded-full">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full justify-start"
              >
                <LogOut className="h-5 w-5 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
