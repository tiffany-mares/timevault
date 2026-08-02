import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function NotFound() {
    const location = useLocation();
    useEffect(() => {
        console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }, [location.pathname]);

    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-serif font-bold text-navy">404</h1>
            <p className="mb-4 text-xl text-muted-foreground font-body">Page not found</p>

            <a href="/" className="text-olive hover:text-olive-light font-body transition-colors">
              Return to Home
            </a>
          </div>
      </div>
    );
}
