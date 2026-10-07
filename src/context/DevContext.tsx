import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useToast } from './ToastContext';

export type PlanType = 'unpaid' | 'basic' | 'premium';
export type TabType = 'landing' | 'projects' | 'editor' | 'dashboard' | 'preview' | 'settings';

export interface MockProject {
  id: string;
  name: string;
  type: 'personal_card' | 'menu' | 'catalog';
  plan: 'unpaid' | 'basic' | 'premium';
  tariff: 'Unpaid' | 'Premium' | 'Basic' | 'Standard';
  createdAt: string;
  avatar?: string;
  description?: string;
  layout: 'classic' | 'compact' | 'cover';
  themeStyle: string;
  whatsappPhone?: string;
  telegramUsername?: string;
  hasUnpublishedChanges?: boolean;
  cart?: { blockId: string; name: string; price: number; quantity: number }[];
  customDomain?: string;
  premiumExpiredAt?: string;
}

export interface DevContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  planType: PlanType;
  setPlanType: (plan: PlanType) => void;
  projects: MockProject[];
  activeProjectId: string | null;
  createProject: (
    name: string,
    type: MockProject['type'],
    plan: MockProject['plan'],
    avatar?: string,
    description?: string,
    layout?: MockProject['layout'],
    themeStyle?: string
  ) => void;
  duplicateProject: (id: string) => string | null;
  updateProject: (id: string, updates: Partial<MockProject>) => void;
  deleteProject: (id: string) => void;
  setActiveProjectId: (id: string | null) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isSaving: boolean;
  developerMode: boolean;
  setDeveloperMode: (mode: boolean) => void;
  getProjectUrl: (project: MockProject) => string;
  projectBackup: MockProject | null;
  setProjectBackup: (backup: MockProject | null) => void;
  previewScope: 'all' | 'blocks' | 'backgrounds';
  setPreviewScope: (scope: 'all' | 'blocks' | 'backgrounds') => void;
  startPreview: () => void;
  cancelPreview: () => void;
  applyPreviewTemplate: () => void;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

const getSaved = <T,>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    console.error("Failed to parse " + key + " from localStorage", e);
    return fallback;
  }
};

export const DevProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const toast = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => getSaved<boolean>('slm_auth_status', false));
  const [planType, setPlanTypeState] = useState<PlanType>(() => getSaved<PlanType>('slm_plan_type', 'premium'));
  const [activeTab, setActiveTab] = useState<TabType>(() => getSaved<TabType>('slm_active_tab', 'landing'));
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => getSaved<string | null>('slm_active_project_id', null));
  const [isSaving, setIsSaving] = useState(false);
  const [developerMode, setDeveloperMode] = useState<boolean>(() => getSaved<boolean>('slm_developer_mode', false));

  const [projectBackup, setProjectBackup] = useState<MockProject | null>(null);
  const [previewScope, setPreviewScope] = useState<'all' | 'blocks' | 'backgrounds'>('all');

  const startPreview = () => {
    const activeProj = projects.find(p => p.id === activeProjectId);
    if (activeProj) {
      setProjectBackup(JSON.parse(JSON.stringify(activeProj)));
    }
    setActiveTab('preview');
  };

  const cancelPreview = () => {
    if (projectBackup) {
      setProjects(prev => prev.map(p => p.id === projectBackup.id ? JSON.parse(JSON.stringify(projectBackup)) : p));
    }
    setProjectBackup(null);
    setActiveTab('editor');
  };

  const applyPreviewTemplate = () => {
    setProjectBackup(null);
    setActiveTab('editor');
  };

  const [projects, setProjects] = useState<MockProject[]>(() => {
    const saved = getSaved<any[]>('slm_projects', []);
    const defaultProjects: MockProject[] = [
      {
        id: 'demo-card',
        name: 'Моя Визитка',
        type: 'personal_card',
        plan: 'basic',
        tariff: 'Basic',
        createdAt: new Date().toLocaleDateString('ru-RU'),
        layout: 'classic',
        themeStyle: 'cosmic',
        description: 'Личная интерактивная визитка'
      },
      {
        id: 'demo-menu',
        name: 'Меню Ресторана',
        type: 'menu',
        plan: 'premium',
        tariff: 'Premium',
        createdAt: new Date().toLocaleDateString('ru-RU'),
        layout: 'compact',
        themeStyle: 'sunset',
        description: 'Официальное меню нашего ресторана'
      }
    ];
    const initial = saved.length > 0 ? saved : defaultProjects;
    return initial.map(p => ({
      ...p,
      tariff: p.tariff || (p.plan === 'premium' ? 'Premium' : 'Basic')
    })) as MockProject[];
  });

  const firstRender = useRef(true);

  useEffect(() => {
    try {
      localStorage.setItem('slm_plan_type', JSON.stringify(planType));
      localStorage.setItem('slm_active_tab', JSON.stringify(activeTab));
      localStorage.setItem('slm_active_project_id', JSON.stringify(activeProjectId));
      localStorage.setItem('slm_projects', JSON.stringify(projects));
      localStorage.setItem('slm_developer_mode', JSON.stringify(developerMode));
      localStorage.setItem('slm_auth_status', JSON.stringify(isAuthenticated));

      if (firstRender.current) {
        firstRender.current = false;
      } else {
        setIsSaving(true);
        const timer = setTimeout(() => setIsSaving(false), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error("Failed to write state to localStorage", e);
    }
  }, [planType, activeTab, activeProjectId, projects, developerMode, isAuthenticated]);

  // Grace Period Background Check
  useEffect(() => {
    const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
    let hasChanges = false;
    const now = Date.now();

    const updatedProjects = projects.map(p => {
      if ((p.tariff === 'Basic' || p.tariff === 'Unpaid') && p.premiumExpiredAt) {
        const expiredDate = new Date(p.premiumExpiredAt).getTime();
        if (now - expiredDate > GRACE_PERIOD_MS) {
          hasChanges = true;
          toast.error(`Домен проекта ${p.name} отключен (Grace Period истек)`);
          return {
            ...p,
            customDomain: undefined,
            premiumExpiredAt: undefined
          };
        }
      }
      return p;
    });

    if (hasChanges) {
      setProjects(updatedProjects);
    }
  }, [projects, toast]);

  const getProjectUrl = (project: MockProject): string => {
    const isPremium = project.tariff === 'Premium';
    let isGracePeriodActive = false;

    if (project.tariff === 'Basic' && project.premiumExpiredAt) {
      const expiredDate = new Date(project.premiumExpiredAt).getTime();
      const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - expiredDate;
      if (elapsed >= 0 && elapsed < GRACE_PERIOD_MS) {
        isGracePeriodActive = true;
      }
    }

    if (isPremium && project.customDomain) {
      return `https://${project.customDomain}`;
    }

    if (project.tariff === 'Basic' && project.customDomain && isGracePeriodActive) {
      return `https://${project.customDomain}`;
    }

    return `https://slmcards.io/${project.id}`;
  };

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem('slm_auth_status', 'true');
    toast.success('Добро пожаловать!');
  };

  const logout = () => {
    setIsAuthenticated(false);
    setActiveProjectIdState(null);
    setActiveTab('landing');
    localStorage.setItem('slm_auth_status', 'false');
    localStorage.setItem('slm_active_project_id', JSON.stringify(null));
    localStorage.setItem('slm_active_tab', JSON.stringify('landing'));
  };

  const setPlanType = (newPlan: PlanType) => {
    setPlanTypeState(newPlan);
    if (activeProjectId) {
      setProjects(prev =>
        prev.map(p => (p.id === activeProjectId ? { 
          ...p, 
          plan: newPlan,
          tariff: newPlan === 'premium' ? 'Premium' : newPlan === 'unpaid' ? 'Unpaid' : 'Basic'
        } : p))
      );
    }
  };

  const setActiveProjectId = (id: string | null) => {
    setActiveProjectIdState(id);
    if (id) {
      const proj = projects.find(p => p.id === id);
      if (proj) {
        setPlanTypeState(proj.plan);
      }
    }
  };

  const createProject = (
    name: string,
    type: MockProject['type'],
    plan: MockProject['plan'],
    avatar?: string,
    description?: string,
    layout: MockProject['layout'] = 'classic',
    themeStyle: string = 'cosmic'
  ) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newProject: MockProject = {
      id: newId,
      name,
      type,
      plan,
      tariff: plan === 'premium' ? 'Premium' : 'Basic',
      avatar,
      description,
      layout,
      themeStyle,
      createdAt: new Date().toLocaleDateString('ru-RU'),
      cart: []
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newId);
  };

  const duplicateProject = (id: string): string | null => {
    const sourceProject = projects.find(p => p.id === id);
    if (!sourceProject) return null;

    const newId = Math.random().toString(36).substr(2, 9);
    const newProject: MockProject = {
      ...JSON.parse(JSON.stringify(sourceProject)),
      id: newId,
      name: `${sourceProject.name} (копия)`,
      createdAt: new Date().toLocaleDateString('ru-RU'),
    };

    try {
      const cfgKey = `nocode_cfg_project_${id}`;
      const savedCfg = localStorage.getItem(cfgKey);
      if (savedCfg) {
        localStorage.setItem(`nocode_cfg_project_${newId}`, savedCfg);
      }
    } catch (e) {
      console.error('Failed to duplicate project config in localStorage:', e);
    }

    setProjects(prev => [...prev, newProject]);
    return newId;
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectIdState(null);
    }
  };

  const updateProject = (id: string, updates: Partial<MockProject>) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const merged = { ...p, ...updates };
        if (updates.hasUnpublishedChanges === undefined) {
          merged.hasUnpublishedChanges = true;
        }
        if (updates.plan) {
          merged.tariff = updates.plan === 'premium' ? 'Premium' : updates.plan === 'unpaid' ? 'Unpaid' : 'Basic';
        }
        return merged;
      }
      return p;
    }));
  };

  return (
    <DevContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        planType,
        setPlanType,
        projects,
        activeProjectId,
        createProject,
        duplicateProject,
        updateProject,
        deleteProject,
        setActiveProjectId,
        activeTab,
        setActiveTab,
        isSaving,
        developerMode,
        setDeveloperMode,
        getProjectUrl,
        projectBackup,
        setProjectBackup,
        previewScope,
        setPreviewScope,
        startPreview,
        cancelPreview,
        applyPreviewTemplate
      }}
    >
      {children}
    </DevContext.Provider>
  );
};

export const useDev = (): DevContextType => {
  const context = useContext(DevContext);
  if (!context) {
    throw new Error('useDev must be used within a DevProvider');
  }
  return context;
};
