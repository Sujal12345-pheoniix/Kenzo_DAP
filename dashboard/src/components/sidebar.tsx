import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp,
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Building,
  ChevronDown,
  Trash2,
  FolderKanban,
  User,
  Boxes,
  Users,
  Tag,
  Cpu,
  TestTube,
  MessageSquare,
  Plus,
  Home,
  Key,
  Bot,
  PieChart,
  ShieldCheck,
  Languages,
  GitBranch,
  FileText,
  ScrollText,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react';
import KenLogo from './logo';

interface Project {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
}

export type TabType = 
  // Super Admin Tabs
  | 'overview'
  | 'organizations'
  | 'applications'
  | 'project_keys'
  | 'guidance_flows'
  | 'guidance_tips'
  | 'guidance_popups'
  | 'guidance_beacons'
  | 'guidance_tasks'
  | 'guidance_surveys'
  | 'guidance_selfhelp'
  | 'content_library'
  | 'ai_studio'
  | 'analytics_overview'
  | 'adoption_health'
  | 'product_analytics'
  | 'events'
  | 'trends'
  | 'funnels'
  | 'user_journeys'
  | 'session_replay'
  | 'cohorts'
  | 'users'
  | 'roles'
  | 'tags'
  | 'localization'
  | 'lifecycle'
  | 'integrations'
  | 'reports'
  | 'notifications'
  | 'audit_logs'
  | 'settings'
  | 'smart_tips' | 'guidance_tips'
  | 'popups' | 'guidance_popups'
  | 'beacons' | 'guidance_beacons'
  | 'task_lists' | 'guidance_tasks'
  | 'surveys' | 'guidance_surveys'
  | 'self_help' | 'guidance_selfhelp'
  // Client CEO Tabs
  | 'ceo_overview'
  | 'ceo_apps'
  | 'ceo_walkthroughs'
  | 'ceo_selfhelp'
  | 'ceo_self_help'
  | 'ceo_growth'
  | 'ceo_analytics'
  | 'ceo_users'
  | 'ceo_ai'
  | 'ceo_reports'
  | 'ceo_settings'
  | 'ceo_audit'
  | 'ceo_smart_tips'
  | 'ceo_popups'
  | 'ceo_beacons'
  | 'ceo_task_lists'
  | 'ceo_surveys';

interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'CLIENT_CEO' | 'MEMBER';
  companyId: string;
  companyName: string;
}

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  loadData: () => void;
  flowsCount: number;
  projects: Project[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  onOpenRegisterModal: () => void;
  onDeleteProject: (id: string, name: string) => Promise<void>;
  user: UserSession | null;
  onLogout: () => void;
}

interface NavGroup {
  category: string;
  items: Array<{
    id: TabType;
    label: string;
    icon: any;
    badge?: number;
  }>;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  loadData, 
  flowsCount,
  projects,
  activeProjectId,
  setActiveProjectId,
  onOpenRegisterModal,
  onDeleteProject,
  user,
  onLogout
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Super Admin Full Navigation Hierarchy
  const superAdminNav: NavGroup[] = [
    {
      category: 'Core',
      items: [
        { id: 'overview', label: 'Overview', icon: Home },
        { id: 'organizations', label: 'Organizations', icon: Building },
        { id: 'applications', label: 'Applications', icon: Boxes },
        { id: 'project_keys', label: 'Project Keys', icon: Key },
      ]
    },
    {
      category: 'Guidance Suite',
      items: [
        { id: 'guidance_flows', label: 'Flows', icon: Layers, badge: flowsCount > 0 ? flowsCount : undefined },
        { id: 'guidance_tips', label: 'Smart Tips', icon: Tag },
        { id: 'guidance_popups', label: 'Pop-ups', icon: MessageSquare },
        { id: 'guidance_beacons', label: 'Beacons', icon: Sparkles },
        { id: 'guidance_tasks', label: 'Task Lists', icon: FolderKanban },
        { id: 'guidance_surveys', label: 'Surveys', icon: TestTube },
        { id: 'guidance_selfhelp', label: 'Self Help', icon: User },
      ]
    },
    {
      category: 'Intelligence & Studio',
      items: [
        { id: 'content_library', label: 'Content Library', icon: FolderKanban },
        { id: 'ai_studio', label: 'AI Studio', icon: Bot },
      ]
    },
    {
      category: 'Analytics & Insights',
      items: [
        { id: 'analytics_overview', label: 'Analytics Overview', icon: BarChart3 },
        { id: 'adoption_health', label: 'Adoption Health', icon: PieChart },
        { id: 'trends', label: 'Trends & Insights', icon: TrendingUp },
        { id: 'funnels', label: 'Funnels & Journeys', icon: GitBranch },
      ]
    },
    {
      category: 'Management',
      items: [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
        { id: 'tags', label: 'Tags', icon: Tag },
        { id: 'localization', label: 'Localization', icon: Languages },
        { id: 'integrations', label: 'Integrations', icon: Cpu },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'audit_logs', label: 'Audit Logs', icon: ScrollText },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  // Client CEO Navigation Hierarchy
  const clientCeoNav: NavGroup[] = [
    {
      category: 'Company Portal',
      items: [
        { id: 'ceo_overview', label: 'Company Overview', icon: Home },
        { id: 'ceo_apps', label: 'My Applications', icon: Boxes },
        { id: 'ceo_walkthroughs', label: 'My Walkthroughs', icon: Layers, badge: flowsCount > 0 ? flowsCount : undefined },
        { id: 'ceo_selfhelp', label: 'Self Help Content', icon: User },
      ]
    },
    {
      category: 'Guidance Suite',
      items: [
        { id: 'ceo_smart_tips', label: 'Smart Tips', icon: Tag },
        { id: 'ceo_popups', label: 'Pop-ups', icon: MessageSquare },
        { id: 'ceo_beacons', label: 'Beacons', icon: Sparkles },
        { id: 'ceo_task_lists', label: 'Task Lists', icon: FolderKanban },
        { id: 'ceo_surveys', label: 'Surveys', icon: TestTube },
      ]
    },
    {
      category: 'Analytics & Growth',
      items: [
        { id: 'ceo_growth', label: 'Application Growth', icon: TrendingUp },
        { id: 'ceo_analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'ceo_users', label: 'Company Users', icon: Users },
        { id: 'ceo_ai', label: 'AI Insights', icon: Bot },
        { id: 'ceo_reports', label: 'Reports', icon: FileText },
        { id: 'ceo_settings', label: 'Company Settings', icon: Settings },
      ]
    }
  ];

  const currentNav = isSuperAdmin ? superAdminNav : clientCeoNav;
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <motion.div 
      animate={{ width: isCollapsed ? 80 : 250 }}
      transition={{ type: 'spring', damping: 22, stiffness: 130 }}
      className="h-screen bg-[#11131f] border-r border-[#1e2238] flex flex-col justify-between relative z-30 select-none shrink-0 text-[#e0e0e0] font-sans"
    >
      {/* Collapse Trigger Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-7 bg-[#1e2238] border border-[#2e3454] text-zinc-300 hover:text-white w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all z-50 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Branding */}
        <div className={`p-4 flex items-center gap-3 border-b border-[#1e2238] ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="shrink-0 flex items-center justify-center">
            <KenLogo size={32} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <h1 className="font-bold text-base tracking-tight text-white leading-tight font-outfit">Kenzo_DAP</h1>
              <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">
                {isSuperAdmin ? 'SUPER ADMIN' : user?.companyName || 'CLIENT CEO'}
              </span>
            </div>
          )}
        </div>

        {/* Workspace Switcher */}
        {!isCollapsed && (
          <div className="p-3 border-b border-[#1e2238] relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full bg-[#181b2e] hover:bg-[#20243d] border border-[#2a2f4c] text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Building size={14} className="text-indigo-400 shrink-0" />
                <span className="font-semibold text-zinc-200 truncate">
                  {activeProject ? activeProject.name : 'Select Project'}
                </span>
              </div>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Workspace Dropdown */}
            <AnimatePresence>
              {workspaceMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-3 right-3 top-14 bg-[#181b2e] border border-[#2a2f4c] rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Projects ({projects.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActiveProjectId(p.id);
                          localStorage.setItem('kenzo_active_project_id', p.id);
                          setWorkspaceMenuOpen(false);
                          loadData();
                        }}
                        className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          p.id === activeProjectId ? 'bg-indigo-600/20 text-indigo-400 font-semibold' : 'text-zinc-300 hover:bg-[#20243d]'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSuperAdmin && projects.length > 1 && (
                          <Trash2
                            size={12}
                            className="text-zinc-500 hover:text-red-400 transition-colors ml-2 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProject(p.id, p.name);
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {isSuperAdmin && (
                    <div className="border-t border-[#1e2238] pt-1">
                      <button
                        onClick={() => {
                          setWorkspaceMenuOpen(false);
                          onOpenRegisterModal();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-indigo-400 hover:bg-[#20243d] font-semibold flex items-center gap-2"
                      >
                        <Plus size={12} /> New Application / Project
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {currentNav.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {group.category}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-white border-l-4 border-indigo-500 font-semibold shadow-sm'
                        : 'text-zinc-400 hover:bg-[#181b2e] hover:text-white'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-zinc-400'} />
                    {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {!isCollapsed && item.badge !== undefined && (
                      <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-[#1e2238] bg-[#0d0f17]">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : 'A'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-white truncate">{user?.name || 'Super Admin'}</span>
                  <span className="text-[10px] text-zinc-400 truncate">{user?.email || 'Kenzo@gmail.com'}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800/80 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center p-2 text-zinc-400 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
