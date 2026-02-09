import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { CalendarDays, CheckCircle, Clock, Users } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const LoginPage = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    {
      icon: CalendarDays,
      title: "Easy Booking",
      description: "Request holidays with just a few clicks",
    },
    {
      icon: CheckCircle,
      title: "Quick Approval",
      description: "HR team reviews and approves requests promptly",
    },
    {
      icon: Clock,
      title: "Track Credits",
      description: "Monitor your remaining holiday days",
    },
    {
      icon: Users,
      title: "Team Calendar",
      description: "View team availability at a glance",
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 login-bg items-center justify-center p-12">
        <div className="max-w-md text-white animate-fade-in">
          <h1 className="text-4xl font-bold mb-6 tracking-tight">
            Holiday Management System
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Simplify your leave management process. Request time off, track approvals, and stay organized.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-4 bg-white/10 rounded-xl backdrop-blur-sm"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <feature.icon className="w-8 h-8 mb-2 text-blue-400" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
              <CalendarDays className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-slate-600">
              Sign in to manage your holidays
            </p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-slate-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>

          {/* Mobile features */}
          <div className="mt-12 lg:hidden">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">
              Features
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl text-center"
                >
                  <feature.icon className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-xs font-medium text-slate-700">
                    {feature.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
