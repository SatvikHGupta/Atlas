import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { useAuthStore } from './store/auth.store.js';
import { useSwipeNav } from './hooks/useSwipeNav.js';
import Navbar from './components/layout/Navbar/Navbar.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute/ProtectedRoute.jsx';
import BottomNav from './components/ui/BottomNav/BottomNav.jsx';
import ScrollToTop from './components/ui/ScrollToTop/ScrollToTop.jsx';
import { FullPageLoader } from './components/ui/Loader/Loader.jsx';
import ToastContainer from './components/ui/Toast/ToastContainer.jsx';

// Route-level code splitting — each page (and whatever it pulls in: charts,
// syntax highlighter, MUI bits) becomes its own chunk, fetched only when
// that route is actually visited, instead of all 14 pages shipping in the
// initial bundle. See docs audit "no code splitting" P1 finding.
const Home = lazy(() => import('./pages/Home/Home.jsx'));
const Problems = lazy(() => import('./pages/Problems/Problems.jsx'));
const CpProblems = lazy(() => import('./pages/CpProblems/CpProblems.jsx'));
const ProblemDetail = lazy(() => import('./pages/ProblemDetail/ProblemDetail.jsx'));
const Roadmap = lazy(() => import('./pages/Roadmap/Roadmap.jsx'));
const RoadmapLevel = lazy(() => import('./pages/RoadmapLevel/RoadmapLevel.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard.jsx'));
const Login = lazy(() => import('./pages/Login/Login.jsx'));
const Notes = lazy(() => import('./pages/Notes/Notes.jsx'));
const NoteReader = lazy(() => import('./pages/NoteReader/NoteReader.jsx'));
const Bookmarks = lazy(() => import('./pages/Bookmarks/Bookmarks.jsx'));
const History = lazy(() => import('./pages/History/History.jsx'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound.jsx'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function AppRoutes() {
  const location = useLocation();
  const { init, loading } = useAuthStore();

  /* swipe right to go back - mobile only, safe with existing scroll/drag elements */
  useSwipeNav();

  useEffect(() => {
    const unsubscribe = init();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  if (loading) return <FullPageLoader />;

  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <Suspense fallback={<FullPageLoader />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/"               element={<Home />} />
            <Route path="/login"          element={<Login />} />
            <Route path="/problems"       element={<Problems />} />
            <Route path="/problems/:slug" element={<ProblemDetail />} />
            <Route path="/cp"             element={<CpProblems />} />
            <Route path="/roadmap"        element={<P><Roadmap /></P>} />
            <Route path="/roadmap/:level" element={<P><RoadmapLevel /></P>} />
            <Route path="/notes"          element={<Notes />} />
            <Route path="/notes/:slug"    element={<NoteReader />} />
            <Route path="/dashboard"      element={<P><Dashboard /></P>} />
            <Route path="/bookmarks"      element={<P><Bookmarks /></P>} />
            <Route path="/history"        element={<P><History /></P>} />
            <Route path="*"               element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
      <ToastContainer />
      <ScrollToTop />
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    // reducedMotion="user" makes every motion.* animation in the tree
    // respect prefers-reduced-motion automatically (crossfade instead of
    // full transforms) — the CSS rule in global.css only ever covered
    // plain CSS transitions/animations, not Framer Motion's JS-driven ones,
    // which is most of the actual motion in this app.
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </MotionConfig>
  );
}
