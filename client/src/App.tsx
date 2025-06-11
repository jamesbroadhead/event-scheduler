
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '@/components/LoginForm';
import { CreateEventForm } from '@/components/CreateEventForm';
import { EventDashboard } from '@/components/EventDashboard';
import { AttendeeView } from '@/components/AttendeeView';
import type { User } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [eventSecretUrl, setEventSecretUrl] = useState('');
  const [showAttendeeView, setShowAttendeeView] = useState(false);

  // Check URL for secret event URL on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const secretUrl = urlParams.get('event');
    if (secretUrl) {
      setEventSecretUrl(secretUrl);
      setShowAttendeeView(true);
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleJoinEvent = () => {
    if (eventSecretUrl.trim()) {
      setShowAttendeeView(true);
    }
  };

  const handleBackToHome = () => {
    setShowAttendeeView(false);
    setEventSecretUrl('');
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (showAttendeeView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-blue-900">📅 EventSync</h1>
            <Button variant="outline" onClick={handleBackToHome}>
              ← Back to Home
            </Button>
          </div>
          <AttendeeView secretUrl={eventSecretUrl} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">📅 EventSync</h1>
          <p className="text-lg text-gray-600">Simple event scheduling made easy</p>
        </div>

        {!user ? (
          <div className="space-y-8">
            {/* Join Event Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">🎯 Join an Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    placeholder="Enter event URL or ID"
                    value={eventSecretUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setEventSecretUrl(e.target.value)
                    }
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleJoinEvent} 
                    disabled={!eventSecretUrl.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Join Event 🚀
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Login Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">👤 Event Organizer Login</CardTitle>
              </CardHeader>
              <CardContent>
                <LoginForm onLogin={handleLogin} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Welcome back, {user.name}! 👋
                </h2>
                <p className="text-gray-600">Ready to organize your next event?</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">✨ Create Event</TabsTrigger>
                <TabsTrigger value="manage">📊 My Events</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="mt-6">
                <CreateEventForm organizerId={user.id} />
              </TabsContent>
              
              <TabsContent value="manage" className="mt-6">
                <EventDashboard organizerId={user.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
