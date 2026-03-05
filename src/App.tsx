import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UnreadMessagesProvider } from "@/hooks/useUnreadMessages";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import FloatingDiscoverButton from "@/components/FloatingDiscoverButton";
import Auth from "./pages/Auth";
import Discover from "./pages/Discover";
import ProfileSetup from "./pages/ProfileSetup";
import ProfileView from "./pages/ProfileView";
import Likes from "./pages/Likes";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import PaymentSuccess from "./pages/PaymentSuccess";
import Verify from "./pages/Verify";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Testimonials from "./pages/Testimonials";
import DatingAdvice from "./pages/DatingAdvice";
import Blog from "./pages/Blog";
import ConversationStarters from "./pages/ConversationStarters";
import FunStuff from "./pages/FunStuff";
import MyGames from "./pages/MyGames";
import GameLobby from "./pages/GameLobby";
import PlayGame from "./pages/PlayGame";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <UnreadMessagesProvider>
                <ScrollToTop />
                <FloatingDiscoverButton />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/testimonials" element={<Testimonials />} />
                  <Route path="/dating-advice" element={<DatingAdvice />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/conversation-starters" element={<ConversationStarters />} />
                  <Route path="/fun" element={<ProtectedRoute><FunStuff /></ProtectedRoute>} />
                  <Route path="/fun/my-games" element={<ProtectedRoute><MyGames /></ProtectedRoute>} />
                  <Route path="/fun/:gameType" element={<ProtectedRoute><GameLobby /></ProtectedRoute>} />
                  <Route path="/fun/play/:gameId" element={<ProtectedRoute><PlayGame /></ProtectedRoute>} />
                  <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
                  <Route path="/profile/:userId" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
                  <Route path="/likes" element={<ProtectedRoute><Likes /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                  <Route path="/messages/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                  <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
                  <Route path="/verify" element={<ProtectedRoute><Verify /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </UnreadMessagesProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
