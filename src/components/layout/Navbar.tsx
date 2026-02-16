"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/videos", label: "My videos" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [accountOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-slate-900 transition hover:text-indigo-600"
        >
          <span className="text-xl tracking-tight">Clipflow</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {status === "loading" ? (
            <span className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
          ) : session?.user ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                className="rounded-full ring-1 ring-slate-200 transition hover:ring-slate-300 hover:bg-slate-50"
                aria-expanded={accountOpen}
                aria-haspopup="true"
                aria-label="Account menu"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-9 w-9 rounded-full"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                    {(session.user.name ?? session.user.email ?? "?")[0]}
                  </span>
                )}
              </button>
              {accountOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                  role="menu"
                >
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {session.user.name ?? "Account"}
                    </p>
                    {session.user.email && (
                      <p className="truncate text-xs text-slate-500">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/videos"
                    onClick={() => setAccountOpen(false)}
                    className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    role="menuitem"
                  >
                    My videos
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setAccountOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    role="menuitem"
                  >
                    <SignOutIcon />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("google")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-slate-100 pt-3">
            {status === "loading" ? (
              <span className="block h-12 w-12 rounded-full bg-slate-100" />
            ) : session?.user ? (
              <div>
                <button
                  type="button"
                  onClick={() => setMobileAccountOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full p-1 ring-1 ring-slate-200 transition hover:ring-slate-300 hover:bg-slate-50"
                  aria-expanded={mobileAccountOpen}
                  aria-label="Account menu"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                      {(session.user.name ?? session.user.email ?? "?")[0]}
                    </span>
                  )}
                  <svg
                    className={`h-4 w-4 text-slate-400 transition ${mobileAccountOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileAccountOpen && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white py-2 shadow-sm">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {session.user.name ?? "Account"}
                      </p>
                      {session.user.email && (
                        <p className="truncate text-xs text-slate-500">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/videos"
                      onClick={() => {
                        setMobileOpen(false);
                        setMobileAccountOpen(false);
                      }}
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      My videos
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setMobileOpen(false);
                        setMobileAccountOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <SignOutIcon />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  signIn("google");
                  setMobileOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white"
              >
                <GoogleIcon />
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SignOutIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
