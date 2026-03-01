export const pagesCatalog = [
  // Main navigation
  { id: 'overview', title: 'Overview', url: '/dashboard', description: 'Campaign performance at a glance', category: 'Pages' },
  { id: 'analytics', title: 'Analytics', url: '/analytics', description: 'Deep-dive metrics and cost breakdown', category: 'Pages' },
  { id: 'contacts', title: 'Contacts', url: '/contacts', description: 'Manage leads and import CSV', category: 'Pages' },
  { id: 'sequences', title: 'Sequences', url: '/sequences', description: 'Email sequence management', category: 'Pages' },
  // Settings sections
  { id: 'settings-general', title: 'General Settings', url: '/settings?tab=general', description: 'Workspace name, timezone, currency', category: 'Settings' },
  { id: 'settings-team', title: 'Team & Members', url: '/settings?tab=team', description: 'Manage roles and invite people', category: 'Settings' },
  { id: 'settings-billing', title: 'Billing & Plan', url: '/settings?tab=billing', description: 'Subscription, usage, and invoices', category: 'Settings' },
  { id: 'settings-config', title: 'Config Vault', url: '/settings?tab=config-vault', description: 'Campaign parameters and API keys', category: 'Settings' },
  { id: 'settings-security', title: 'Security & Sessions', url: '/settings?tab=security', description: 'Two-factor auth and active sessions', category: 'Settings' },
  // Admin
  { id: 'admin-migration', title: 'Migration Control', url: '/admin?tab=migration', description: 'Database migration management', category: 'Admin' },
  { id: 'admin-audit', title: 'Audit Logs', url: '/admin?tab=audit', description: 'Workspace activity history', category: 'Admin' },
];

/** All items that represent settings sections */
export const settingsCatalog = pagesCatalog.filter(p => p.category === 'Settings');







