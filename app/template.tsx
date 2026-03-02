"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import PageTransition from "@/components/ui/PageTransition";
import { toast } from "sonner";

// Set to true when ready to launch and allow all routes
const IS_LAUNCHED = true;

// Routes that are allowed before launch
// Note: Admin users can access all routes
const ALLOWED_ROUTES = [
    "/admin",      // Admin dashboard
    "/sign-in",    // Auth pages
    "/sign-up",
];

// Check if a path is allowed
function isAllowedRoute(pathname: string): boolean {
    return ALLOWED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
}

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isSignedIn, isLoaded: clerkLoaded } = useUser();
    const [hasShownToast, setHasShownToast] = useState(false);

    // Only query for user if signed in
    const user = useQuery(
        api.users.currentUser,
        isSignedIn ? {} : "skip"
    );

    useEffect(() => {
        // If launched, allow all routes
        if (IS_LAUNCHED) return;

        // Wait for Clerk to load
        if (!clerkLoaded) return;

        // Allow all pre-defined routes
        if (isAllowedRoute(pathname)) return;

        // If signed in, wait for user data to load before deciding
        if (isSignedIn && user === undefined) return;

        // If user is admin, allow all routes
        if (user?.isAdmin) return;

        // For all other internal routes, redirect to landing page
        if (!hasShownToast) {
            toast.info("🚧 Coming Soon!", {
                description: "We're still building this feature. Check back soon!",
                duration: 5000,
            });
            setHasShownToast(true);
        }
        router.replace("/");
    }, [pathname, clerkLoaded, isSignedIn, user, router, hasShownToast]);

    return <PageTransition>{children}</PageTransition>;
}

