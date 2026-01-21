import { useState, useEffect } from 'react';
import { AuthPage } from './components/auth-page';
import { StudentDashboard } from './components/student-dashboard';
import { InstructorDashboard } from './components/instructor-dashboard';
import { AdminDashboard } from './components/admin-dashboard';
import { supabase } from '@/lib/supabase-client';
import { projectId } from '/utils/supabase/info';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && session.access_token) {
        await handleLogin(session.access_token, session.user.user_metadata?.role || 'student');
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (token: string, role: string) => {
    setAccessToken(token);
    
    // Fetch user profile from backend
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const profile = await response.json();
        console.log('User profile loaded:', profile);
        setUserProfile(profile);
      } else {
        // Fallback if profile fetch fails
        console.log('Profile fetch failed, using fallback role:', role);
        setUserProfile({ role });
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setUserProfile({ role });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAccessToken(null);
    setUserProfile(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!accessToken || !userProfile) {
    return (
      <>
        <AuthPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  // Admin users go to Admin Dashboard
  if (userProfile.role === 'admin') {
    return (
      <>
        <AdminDashboard
          accessToken={accessToken}
          userProfile={userProfile}
          onLogout={handleLogout}
        />
        <Toaster />
      </>
    );
  }

  // Instructor users go to Instructor Dashboard
  if (userProfile.role === 'instructor') {
    return (
      <>
        <InstructorDashboard
          accessToken={accessToken}
          userProfile={userProfile}
          onLogout={handleLogout}
        />
        <Toaster />
      </>
    );
  }

  // Student users go to Student Dashboard
  return (
    <>
      <StudentDashboard
        accessToken={accessToken}
        userProfile={userProfile}
        onLogout={handleLogout}
      />
      <Toaster />
    </>
  );
}
