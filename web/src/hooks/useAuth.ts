"use client";
import { useQuery } from "@tanstack/react-query";
import { authApi, type User } from "@/lib/api-client";

export function useAuth() {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    isAdmin: user?.role === "admin",
    isReviewer: user?.role === "reviewer",
    error,
  };
}
