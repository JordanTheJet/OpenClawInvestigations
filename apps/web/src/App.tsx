import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/Home';
import SearchPage from './pages/Search';
import EntityPage from './pages/Entity';
import DocumentPage from './pages/Document';
import StatsPage from './pages/Stats';
import DocsPage from './pages/Docs';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/entity/:id" element={<EntityPage />} />
        <Route path="/document/:id" element={<DocumentPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/api" element={<DocsPage />} />
        <Route path="/api-docs" element={<DocsPage />} />
        <Route path="/developer" element={<DocsPage />} />
        <Route path="/agents" element={<DocsPage />} />
      </Routes>
    </Layout>
  );
}
