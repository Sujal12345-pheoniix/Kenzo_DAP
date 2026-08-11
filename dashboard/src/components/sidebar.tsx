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
  Globe,
  Plus
} from 'lucide-react';
import KenLogo from './logo';

interface Project {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
}

export type TabType = 
  | 'all_content'
  | 'my_content'
  | 'repositories'
  | 'widget'
  | 'users'
  | 'tags'
  | 'dashboard'
  | 'integration'
  | 'auto_testing'
  | 'insights'
  | 'feedback'
  | 'community';

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
}

interface NavItem {
  id: TabType;
  label: string;
  icon: any;
  badge?: number;
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
  onDeleteProject
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const mainNavItems: NavItem[] = [
    { id: 'all_content', label: 'All content', icon: Layers, badge: flowsCount > 0 ? flowsCount : undefined },
    { id: 'my_content', label: 'My content', icon: User },
    { id: 'repositories', label: 'Repositories', icon: FolderKanban },
    { id: 'widget', label: 'Widget', icon: Boxes },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'dashboard', label: 'Analytics', icon: BarChart3 },
    { id: 'integration', label: 'Integrations', icon: Cpu },
    { id: 'auto_testing', label: 'Auto testing', icon: TestTube },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
  ];

  const bottomNavItems: NavItem[] = [
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'community', label: 'Community', icon: Globe },
  ];

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <motion.div 
      animate={{ width: isCollapsed ? 80 : 250 }}
      transition={{ type: 'spring', damping: 22, stiffness: 130 }}
      className="h-screen bg-[#242424] border-r border-[#333333] flex flex-col justify-between relative z-30 select-none shrink-0 text-[#e0e0e0] font-sans"
    >
      {/* Collapse Trigger Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-7 bg-[#333333] border border-[#444] text-zinc-300 hover:text-white w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all z-50 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header / Logo */}
        <div className={`p-4 flex items-center gap-3 border-b border-[#333333] ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="shrink-0 flex items-center justify-center">
            <KenLogo size={32} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <h1 className="font-bold text-base tracking-tight text-white leading-tight">whatfix</h1>
              <span className="text-[10px] font-semibold text-amber-500 tracking-wider uppercase">Kenzo DAP Parity</span>
            </div>
          )}
        </div>

        {/* Workspace Switcher */}
        {!isCollapsed && (
          <div className="p-3 border-b border-[#333333] relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#383838] text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Building size={14} className="text-amber-500 shrink-0" />
                <span className="font-semibold text-zinc-200 truncate">
                  {activeProject ? activeProject.name : 'Select Workspace'}
                </span>
              </div>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {workspaceMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-3 right-3 top-14 bg-[#1e1e1e] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Workspaces ({projects.length})
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
                          p.id === activeProjectId ? 'bg-amber-600/20 text-amber-400 font-semibold' : 'text-zinc-300 hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {projects.length > 1 && (
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
                  <div className="border-t border-[#333] pt-1">
                    <button
                      onClick={() => {
                        setWorkspaceMenuOpen(false);
                        onOpenRegisterModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-[#2a2a2a] font-semibold flex items-center gap-2"
                    >
                      <Plus size={12} /> New Workspace
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Main Nav Section */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#333333] text-white border-l-4 border-amber-500 font-semibold shadow-sm'
                    : 'text-zinc-300 hover:bg-[#2a2a2a] hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={16} className={isActive ? 'text-amber-500' : 'text-zinc-400'} />
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!isCollapsed && item.badge !== undefined && (
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="my-4 border-t border-[#333333] mx-2" />

          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#333333] text-white border-l-4 border-amber-500 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:bg-[#2a2a2a] hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={16} className="text-zinc-400" />
                {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
