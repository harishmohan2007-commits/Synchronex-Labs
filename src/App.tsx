import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './screens/Overview';
import Schedule from './screens/Schedule';
import WBSExplorer from './screens/WBSExplorer';
import ProgressTracking from './screens/ProgressTracking';
import AICapture from './screens/AICapture';
import ExtractionResults from './screens/ExtractionResults';
import AILinking from './screens/AILinking';
import ReviewQueue from './screens/ReviewQueue';
import ImportedReports from './screens/ImportedReports';
import Analytics from './screens/Analytics';
import DelayIntelligence from './screens/DelayIntelligence';
import ProjectMemory from './screens/ProjectMemory';
import AuditTrail from './screens/AuditTrail';
import Settings from './screens/Settings';

type Screen =
  | 'overview' | 'schedule' | 'wbs' | 'progress'
  | 'ai-capture' | 'extraction-results' | 'ai-linking'
  | 'review-queue' | 'imported-reports'
  | 'analytics' | 'delay-intelligence' | 'project-memory'
  | 'audit-trail' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('overview');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [pip245Progress, setPip245Progress] = useState(70);
  const [pip245Approved, setPip245Approved] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(12);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleApproveMatch = () => {
    setPip245Progress(75);
    setPip245Approved(true);
    if (reviewCount > 0) setReviewCount(c => c - 1);
  };

  const handleNav = (s: string) => {
    setScreen(s as Screen);
    setShowNotifications(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F5F7FA' }}>
      <Sidebar active={screen} onNav={handleNav} reviewCount={reviewCount} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header
          screen={screen}
          onNav={handleNav}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
        />
        <div style={{ flex: 1, overflow: 'auto' }} onClick={() => showNotifications && setShowNotifications(false)}>
          {screen === 'overview' && (
            <Overview onNav={handleNav} pip245Progress={pip245Progress} />
          )}
          {screen === 'schedule' && (
            <Schedule
              selectedActivity={selectedActivity}
              onSelectActivity={setSelectedActivity}
              pip245Progress={pip245Progress}
            />
          )}
          {screen === 'wbs' && <WBSExplorer />}
          {screen === 'progress' && <ProgressTracking />}
          {screen === 'ai-capture' && (
            <AICapture onNav={handleNav} onAnalyzeComplete={() => {}} />
          )}
          {screen === 'extraction-results' && (
            <ExtractionResults
              onNav={handleNav}
              onApproveMatch={handleApproveMatch}
              showToast={showToast}
            />
          )}
          {screen === 'ai-linking' && (
            <AILinking
              onNav={handleNav}
              onApproveMatch={handleApproveMatch}
              showToast={showToast}
            />
          )}
          {screen === 'review-queue' && (
            <ReviewQueue showToast={showToast} />
          )}
          {screen === 'imported-reports' && <ImportedReports />}
          {screen === 'analytics' && <Analytics />}
          {screen === 'delay-intelligence' && <DelayIntelligence />}
          {screen === 'project-memory' && <ProjectMemory />}
          {screen === 'audit-trail' && <AuditTrail pip245Approved={pip245Approved} />}
          {screen === 'settings' && <Settings />}
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span style={{ color: '#4ADE80' }}>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
