
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, LoginInput } from '../../../server/src/schema';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: ''
  });

  const [signupData, setSignupData] = useState<CreateUserInput>({
    email: '',
    password: '',
    name: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = await trpc.login.mutate(loginData);
      onLogin(user);
    } catch (error) {
      setError('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = await trpc.createUser.mutate(signupData);
      onLogin(user);
    } catch (error) {
      setError('Signup failed. Email might already be in use.');
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <TabsContent value="login">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={loginData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLoginData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={loginData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
              }
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup">
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name</Label>
            <Input
              id="signup-name"
              type="text"
              value={signupData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSignupData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              value={signupData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSignupData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              value={signupData.password || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSignupData((prev: CreateUserInput) => ({ 
                  ...prev, 
                  password: e.target.value || undefined 
                }))
              }
              required
              minLength={6}
            />
          </div>
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
