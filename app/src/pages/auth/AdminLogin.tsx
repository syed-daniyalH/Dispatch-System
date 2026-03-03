import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NavigationState = {
  from?: string;
};

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@sm2dispatch.com');
  const [password, setPassword] = useState('admin123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const from = (location.state as NavigationState | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password, 'admin');
      const destination = from && from.startsWith('/admin') ? from : '/admin';
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3fafb] via-white to-[#eef4ff] p-4 flex items-center justify-center">
      <Card className="w-full max-w-md border-[#cfe3e7] shadow-lg">
        <CardHeader className="space-y-3">
          <div className="w-11 h-11 rounded-xl bg-[#2F8E92] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Admin Sign In</CardTitle>
            <CardDescription>Single admin portal account for dashboard, jobs, approvals, and technician management.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-sm font-medium text-[#2F8E92] transition-colors hover:text-[#27797d] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <Button type="submit" className="w-full bg-[#2F8E92] hover:bg-[#27797d]" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in as Admin'}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Technician account? <Link to="/tech/login" className="text-[#2F8E92] hover:underline">Go to technician login</Link>
            </p>
          </form>
        </CardContent>
      </Card>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset admin password</DialogTitle>
            <DialogDescription>
              Self-service password reset is not available yet for the single admin portal account.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-[#cfe3e7] bg-[#f3fafb] px-4 py-3 text-sm text-slate-700">
            Contact the system owner or technical support to reset the admin login credentials and issue updated access.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setForgotPasswordOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
