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
  | 'dap_studio'
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
  | 'ceo_surveys'
  | 'ceo_orgs';

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

  // Super Admin Navigation Hierarchy
  const superAdminNav: NavGroup[] = [
    {
      category: 'Core Platform',
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
        { id: 'guidance_flows', label: 'Walkthroughs', icon: Layers, badge: flowsCount > 0 ? flowsCount : undefined },
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
        { id: 'dap_studio', label: 'In-App Studio Sandbox', icon: Sparkles },
        { id: 'content_library', label: 'Content Library', icon: FolderKanban },
        { id: 'ai_studio', label: 'AI Guidance Studio', icon: Bot },
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
        { id: 'dap_studio', label: 'In-App Studio Sandbox', icon: Sparkles },
        { id: 'ceo_orgs', label: 'Organization Sites', icon: Building },
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
      animate={{ width: isCollapsed ? 76 : 256 }}
      transition={{ type: 'spring', damping: 24, stiffness: 150 }}
      className="h-screen bg-[#070d18] border-r border-slate-800/80 flex flex-col justify-between relative z-30 select-none shrink-0 text-[#f8fafc] font-sans"
    >
      {/* Collapse Trigger Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 bg-[#0b1324] border border-slate-700/80 text-slate-300 hover:text-sky-400 hover:border-sky-500/50 w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-all z-50"
      >
        {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Branding */}
        <div className={`p-4 flex items-center gap-3 border-b border-slate-800/80 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="shrink-0 flex items-center justify-center">
            <KenLogo size={32} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <h1 className="font-bold text-base tracking-tight text-white leading-tight flex items-center gap-1">
                Kenzo<span className="text-sky-400">_DAP</span>
              </h1>
              <span className="text-[9px] font-bold text-sky-400/90 tracking-wider uppercase">
                {isSuperAdmin ? 'Enterprise Portal' : user?.companyName || 'Client Portal'}
              </span>
            </div>
          )}
        </div>

        {/* Workspace Switcher */}
        {!isCollapsed && (
          <div className="p-3 border-b border-slate-800/80 relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full bg-[#0b1324] hover:bg-[#101c33] border border-slate-700/60 hover:border-sky-500/40 text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-xs transition-all shadow-inner"
            >
              <div className="flex items-center gap-2 truncate">
                <Building size={14} className="text-sky-400 shrink-0" />
                <span className="font-semibold text-slate-200 truncate">
                  {activeProject ? activeProject.name : 'Select Workspace'}
                </span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Workspace Dropdown */}
            <AnimatePresence>
              {workspaceMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-3 right-3 top-14 bg-[#0b1324] border border-slate-700/80 rounded-lg shadow-2xl z-50 py-1.5 overflow-hidden"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Workspaces ({projects.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto">
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
                          p.id === activeProjectId ? 'bg-sky-500/15 text-sky-400 font-semibold' : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {isSuperAdmin && projects.length > 1 && (
                          <Trash2
                            size={12}
                            className="text-slate-500 hover:text-red-400 transition-colors ml-2 shrink-0"
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
                    <div className="border-t border-slate-800/80 pt-1">
                      <button
                        onClick={() => {
                          setWorkspaceMenuOpen(false);
                          onOpenRegisterModal();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-sky-400 hover:bg-slate-800/60 font-semibold flex items-center gap-2"
                      >
                        <Plus size={12} /> New Application Workspace
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
                <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500/10 text-white font-semibold'
                        : 'text-slate-400 hover:bg-[#0b1324]/70 hover:text-slate-200'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={16} className={isActive ? 'text-sky-400' : 'text-slate-400'} />
                    {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {!isCollapsed && item.badge !== undefined && (
                      <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
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
        <div className="p-3 border-t border-slate-800/80 bg-[#05090f]">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 font-bold text-xs shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : 'K'}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</span>
                  <span className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@kenzo.com'}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-red-400 transition-colors"
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
