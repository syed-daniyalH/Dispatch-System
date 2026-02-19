import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NavigationState = {
  from?: string;
};

export default function TechnicianLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('tech@mikechen.com');
  const [password, setPassword] = useState('tech123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as NavigationState | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password, 'technician');
      const destination = from && from.startsWith('/tech') ? from : '/tech/available-jobs';
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f5] via-white to-[#eefbf4] p-4 flex items-center justify-center">
      <Card className="w-full max-w-md border-[#d4e9d9] shadow-lg">
        <CardHeader className="space-y-3">
          <div className="w-11 h-11 rounded-xl bg-[#3b8d4f] flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Technician Sign In</CardTitle>
            <CardDescription>Access available jobs, assigned jobs, schedule, and profile after admin approval.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tech-email">Email</Label>
              <Input
                id="tech-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tech-password">Password</Label>
              <Input
                id="tech-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <Button type="submit" className="w-full bg-[#3b8d4f] hover:bg-[#2f7641]" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in as Technician'}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              New technician? <Link to="/tech/signup" className="text-[#3b8d4f] hover:underline">Create account</Link>
            </p>

            <p className="text-sm text-muted-foreground text-center">
              Admin account? <Link to="/admin/login" className="text-[#2F8E92] hover:underline">Go to admin login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
