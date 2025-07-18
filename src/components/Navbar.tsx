import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import type { User } from "../types";

interface NavbarProps {
  user: User | null;
  setUser: (user: User | null) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

function Navbar({ user, setUser, darkMode, setDarkMode }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user on mount if not already available
  useEffect(() => {
    const fetchProfile = async () => {
      // Get the currently authenticated Supabase user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error:", authError.message);
        return;
      }

      if (user) {
        // Fetch custom profile data from your 'users' table
        const { data: profile, error: profileError } = await supabase
          .from("users") // or "profiles" if you're using that table
          .select("username")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError.message);
          return;
        }

        // Set user with proper shape for your app
        setUser({
          id: user.id,
          email: user.email ?? "",
          username: profile?.username ?? "",
        });
      }
    };

    fetchProfile();
  }, [setUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsDropdownOpen(false);
    navigate("/");
  };

  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "New Note", path: "/editor" },
    { label: "Graph View", path: "/graph" },
    { label: "Export Notes", path: "/exportnotes" },
  ];

  const personalItems = user?.username
    ? [{ label: "My Garden", path: `/garden/${user.username}` }]
    : [];

  return (
    <header
      className="shadow-sm sticky top-0 z-10"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="container flex items-center justify-between py-4">
        <Link
          to="/"
          className="flex items-center space-x-4 text-2xl font-bold text-[var(--text)]"
        >
          <img src="/secondbrain.ico" alt="Logo" className="h-8 w-8" />
          <span>Second Brain</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <div className="relative group" ref={dropdownRef}>
            <button
              className="btn btn-secondary flex items-center"
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>Menu</span>
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <ul
                className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--border)",
                }}
              >
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setIsDropdownOpen(false)}
                      className="block px-4 py-2 hover:bg-[var(--hover-bg)] text-[var(--text)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}

                {personalItems.length > 0 && (
                  <>
                    <hr className="my-1 border-t border-[var(--border)]" />
                    {personalItems.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 hover:bg-[var(--hover-bg)] text-[var(--text)] font-medium"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            )}
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-[var(--hover-bg)]"
            style={{ color: "var(--text)" }}
            aria-label="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {user ? (
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          ) : (
            <Link to="/auth" className="btn btn-primary">
              Login
            </Link>
          )}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-full hover:bg-[var(--hover-bg)]"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isMobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav
          className="md:hidden border-t"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--border)",
          }}
        >
          <ul className="container py-4 space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 hover:bg-[var(--hover-bg)] text-[var(--text)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {personalItems.length > 0 && (
              <>
                <hr className="my-1 border-t border-[var(--border)]" />
                {personalItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-[var(--hover-bg)] text-[var(--text)] font-medium"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </>
            )}

            <li className="px-4 py-2">
              <button
                onClick={() => {
                  setDarkMode(!darkMode);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 hover:bg-[var(--hover-bg)] text-[var(--text)]"
              >
                <span className="mr-2">
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </span>
                <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
              </button>
            </li>

            <li className="px-4 py-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-left py-2 hover:bg-[var(--hover-bg)] text-[var(--text)]"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 hover:bg-[var(--hover-bg)] text-[var(--text)]"
                >
                  Login
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Navbar;
