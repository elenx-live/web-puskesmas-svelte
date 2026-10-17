import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur admin — agregat seluruh sub-fitur admin.
 * Setiap entri dibungkus AdminLayout + ProtectedRoute oleh App.svelte.
 * Permission granular mengikuti App.tsx source.
 */
const A = (path: string, loader: () => Promise<{ default: unknown }>, permission?: string): RouteDef => ({
  path,
  load: loader,
  layout: 'admin',
  permission,
});

export const adminRoutes: RouteDef[] = [
  // --- Dashboard ---
  A('/admin', () => import('./dashboard/DashboardOverview.svelte')),
  A('/admin/operational-dashboard', () => import('./dashboard/OperationalDashboard.svelte'), 'view_operational_dashboard'),
  A('/admin/services/dashboard', () => import('./dashboard/ServiceDashboard.svelte'), 'manage_services_clusters'),

  // --- Operasional ---
  A('/admin/pendaftaran', () => import('./operasional/PendaftaranManagement.svelte'), 'manage_services_clusters'),
  A('/admin/antrian', () => import('./operasional/QueueManagement.svelte'), 'manage_services_clusters'),
  A('/admin/pengaduan', () => import('./operasional/ComplaintsManagement.svelte'), 'view_complaints'),

  // --- Survei ---
  A('/admin/survei', () => import('./survei/AdminSurveysManagement.svelte'), 'view_surveys'),

  // --- Pengguna ---
  A('/admin/users', () => import('./pengguna/UsersManagement.svelte'), 'manage_users'),
  A('/admin/roles', () => import('./pengguna/RolesManagement.svelte'), 'manage_roles_permissions'),

  // --- Konten ---
  A('/admin/pages', () => import('./konten/PagesManagement.svelte'), 'manage_pages_menus'),
  A('/admin/menus', () => import('./konten/MenusManagement.svelte'), 'manage_pages_menus'),
  A('/admin/posts', () => import('./konten/PostsManagement.svelte'), 'manage_posts_categories'),
  A('/admin/categories', () => import('./konten/CategoriesManagement.svelte'), 'manage_posts_categories'),
  A('/admin/announcements', () => import('./konten/AnnouncementsManagement.svelte'), 'manage_pages_menus'),
  A('/admin/documents', () => import('./konten/DocumentsManagement.svelte'), 'manage_pages_menus'),
  A('/admin/gallery', () => import('./konten/GalleryManagement.svelte'), 'manage_pages_menus'),
  A('/admin/media', () => import('./konten/MediaLibraryView.svelte'), 'manage_media'),

  // --- Layanan ---
  A('/admin/services', () => import('./layanan/ServicesManagement.svelte'), 'manage_services_clusters'),
  A('/admin/services/review', () => import('./layanan/ServiceReviewQueue.svelte'), 'manage_services_clusters'),
  A('/admin/services/categories', () => import('./layanan/ServiceCategoriesManagement.svelte'), 'manage_services_clusters'),
  A('/admin/services/clusters', () => import('./layanan/ServiceClustersManagement.svelte'), 'manage_services_clusters'),
  A('/admin/services/units', () => import('./layanan/ServiceUnitsManagement.svelte'), 'manage_services_clusters'),
  A('/admin/services/locations', () => import('./layanan/ServiceLocationsManagement.svelte'), 'manage_services_clusters'),

  // --- Fasilitas & profil ---
  A('/admin/facilities', () => import('./fasilitas/AdminFacilityManagement.svelte'), 'view_facilities'),
  A('/admin/org-structure', () => import('./fasilitas/AdminOrgStructureManagement.svelte'), 'view_staff_directory'),
  A('/admin/staff-directory', () => import('./fasilitas/AdminStaffDirectoryManagement.svelte'), 'view_staff_directory'),
  A('/admin/contact-settings', () => import('./fasilitas/AdminContactManagement.svelte'), 'view_contact_settings'),
  A('/admin/faq', () => import('./fasilitas/AdminFaqManagement.svelte'), 'view_faq'),
  A('/admin/dynamic-content', () => import('./fasilitas/AdminDynamicContentManagement.svelte'), 'view_content'),
  A('/admin/public-info', () => import('./fasilitas/AdminPublicInfoManagement.svelte'), 'view_public_information'),
  A('/admin/info-requests', () => import('./fasilitas/AdminInfoRequestsManagement.svelte'), 'manage_information_requests'),

  // --- Microsite ---
  A('/admin/microsites', () => import('./microsite/MicrositesManagement.svelte'), 'manage_microsites'),

  // --- Sistem ---
  A('/admin/settings', () => import('./sistem/SettingsManagement.svelte'), 'manage_site_settings'),
  A('/admin/settings/identity', () => import('./sistem/SettingsManagement.svelte'), 'manage_site_settings'),
  A('/admin/settings/appearance', () => import('./sistem/SettingsManagement.svelte'), 'manage_site_settings'),
  A('/admin/settings/services', () => import('./sistem/SettingsManagement.svelte'), 'manage_site_settings'),
  A('/admin/settings/communication', () => import('./sistem/SettingsManagement.svelte'), 'manage_site_settings'),
  A('/admin/settings/security', () => import('./sistem/SettingsManagement.svelte'), 'manage_site_settings'),
  A('/admin/settings/ai-provider', () => import('./sistem/AIProviderSettingsPage.svelte'), 'manage_site_settings'),
  A('/admin/ai-providers', () => import('./sistem/AIProviderSettingsPage.svelte'), 'manage_site_settings'),
  A('/admin/ai-provider', () => import('./sistem/AIProviderSettingsPage.svelte'), 'manage_site_settings'),
  A('/admin/settings/fitur', () => import('./sistem/AdminFeaturesManagement.svelte'), 'manage_site_settings'),
  A('/admin/features', () => import('./sistem/AdminFeaturesManagement.svelte'), 'manage_site_settings'),
  A('/admin/settings/whatsapp', () => import('./sistem/WhatsAppSettings.svelte'), 'manage_site_settings'),
  A('/admin/whatsapp', () => import('./sistem/WhatsAppSettings.svelte'), 'manage_site_settings'),
  A('/admin/audit', () => import('./sistem/AuditLogsView.svelte'), 'view_audit_logs'),
  A('/admin/audit-logs', () => import('./sistem/AuditLogsView.svelte'), 'view_audit_logs'),
  A('/admin/notifications', () => import('./sistem/NotificationsManagement.svelte')),
  A('/admin/seo', () => import('./sistem/SeoSearchManagement.svelte'), 'manage_site_settings'),
  A('/admin/builder', () => import('./sistem/ThemeCustomization.svelte'), 'manage_homepage_builder'),
  A('/admin/theme', () => import('./sistem/ThemeCustomization.svelte'), 'manage_homepage_builder'),
  A('/admin/system/backup', () => import('./sistem/SystemBackupManagement.svelte'), 'manage_backup'),
  A('/admin/system/restore', () => import('./sistem/SystemBackupManagement.svelte'), 'manage_backup'),
  A('/admin/system/versions', () => import('./sistem/SystemBackupManagement.svelte'), 'manage_backup'),
  A('/admin/system/recovery', () => import('./sistem/SystemBackupManagement.svelte'), 'manage_backup'),
  A('/admin/system/health', () => import('./sistem/SystemMonitoringManagement.svelte'), 'manage_backup'),
  A('/admin/system/logs', () => import('./sistem/SystemMonitoringManagement.svelte'), 'manage_backup'),
  A('/admin/system/incidents', () => import('./sistem/SystemMonitoringManagement.svelte'), 'manage_backup'),
  A('/admin/system/jobs', () => import('./sistem/SystemMonitoringManagement.svelte'), 'manage_backup'),
];
