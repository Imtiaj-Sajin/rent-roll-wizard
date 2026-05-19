import { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/upload";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Please enter your username and password");
      return;
    }
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Login failed");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/favicon.ico" alt="Rent Roll Wizard" className="w-11 h-11 rounded-xl mb-3" />
          <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sign in to Rent Roll Wizard</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-2">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 text-center">
                  {error}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-medium text-muted-foreground">
                  Username or email
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full h-10 font-semibold text-sm" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-[11px] text-muted-foreground/50 text-center mt-8">
          Rent Roll Wizard
        </p>
      </div>
    </div>
  );
}
