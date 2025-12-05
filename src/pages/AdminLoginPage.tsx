import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Lock, LogIn } from 'lucide-react';

const AdminLoginPage = () => {
  const { user, signIn, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated and admin, redirect to admin panel
  useEffect(() => {
    if (user && isAdmin && !authLoading && !roleLoading) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter email and password',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error, user: loggedInUser } = await signIn(email, password);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: 'Invalid email or password',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (loggedInUser) {
        // Check if user is admin - will be verified by admin panel redirect
        toast({
          title: 'Success',
          description: 'Logged in successfully',
        });
        // Wait a moment for role to be fetched, then redirect
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 500);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred during login',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="border-2 border-orange-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-t-lg">
              <div className="flex items-center gap-3 justify-center">
                <Lock className="h-6 w-6" />
                <CardTitle className="text-2xl">Admin Portal</CardTitle>
              </div>
              <p className="text-orange-100 text-sm mt-2 text-center">
                Secure access for administrators only
              </p>
            </CardHeader>
            
            <CardContent className="pt-8 space-y-6">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Admin Access Required:</strong> Only users with admin privileges can access this panel. Log in with your admin account.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@servelytica.com"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                    disabled={loading}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  {loading ? 'LOGGING IN...' : 'ADMIN LOGIN'}
                </Button>
              </form>

              {/* Features */}
              <div className="border-t pt-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Admin Access Includes:</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-orange-500 rounded-full"></span>
                    Manage all users and coaches
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-orange-500 rounded-full"></span>
                    Monitor and moderate videos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-orange-500 rounded-full"></span>
                    View platform statistics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-orange-500 rounded-full"></span>
                    Control site-wide settings
                  </li>
                </ul>
              </div>

              {/* Security Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  🔒 <strong>Security:</strong> This is a restricted area. Keep your credentials secure and log out after use.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Need admin access?</p>
            <p className="text-gray-500">Contact the system administrator</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminLoginPage;
