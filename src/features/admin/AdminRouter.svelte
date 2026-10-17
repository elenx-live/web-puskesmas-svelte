<!--
  @component Router khusus admin — mapping path /admin/* ke komponen manajemen.
-->
<script lang="ts">
  import DashboardOverview from './dashboard/DashboardOverview.svelte';
  import OperationalDashboard from './dashboard/OperationalDashboard.svelte';
  import ServiceDashboard from './dashboard/ServiceDashboard.svelte';
  import PendaftaranManagement from './operasional/PendaftaranManagement.svelte';
  import QueueManagement from './operasional/QueueManagement.svelte';
  import ComplaintsManagement from './operasional/ComplaintsManagement.svelte';
  import AdminSurveysManagement from './survei/AdminSurveysManagement.svelte';
  import UsersManagement from './pengguna/UsersManagement.svelte';
  import RolesManagement from './pengguna/RolesManagement.svelte';
  import PagesManagement from './konten/PagesManagement.svelte';
  import MenusManagement from './konten/MenusManagement.svelte';
  import PostsManagement from './konten/PostsManagement.svelte';
  import CategoriesManagement from './konten/CategoriesManagement.svelte';
  import AnnouncementsManagement from './konten/AnnouncementsManagement.svelte';
  import DocumentsManagement from './konten/DocumentsManagement.svelte';
  import GalleryManagement from './konten/GalleryManagement.svelte';
  import MediaLibraryView from './konten/MediaLibraryView.svelte';
  import ServicesManagement from './layanan/ServicesManagement.svelte';
  import ServiceReviewQueue from './layanan/ServiceReviewQueue.svelte';
  import ServiceCategoriesManagement from './layanan/ServiceCategoriesManagement.svelte';
  import ServiceClustersManagement from './layanan/ServiceClustersManagement.svelte';
  import ServiceUnitsManagement from './layanan/ServiceUnitsManagement.svelte';
  import ServiceLocationsManagement from './layanan/ServiceLocationsManagement.svelte';
  import AdminFacilityManagement from './fasilitas/AdminFacilityManagement.svelte';
  import AdminOrgStructureManagement from './fasilitas/AdminOrgStructureManagement.svelte';
  import AdminStaffDirectoryManagement from './fasilitas/AdminStaffDirectoryManagement.svelte';
  import AdminContactManagement from './fasilitas/AdminContactManagement.svelte';
  import AdminFaqManagement from './fasilitas/AdminFaqManagement.svelte';
  import AdminDynamicContentManagement from './fasilitas/AdminDynamicContentManagement.svelte';
  import AdminPublicInfoManagement from './fasilitas/AdminPublicInfoManagement.svelte';
  import AdminInfoRequestsManagement from './fasilitas/AdminInfoRequestsManagement.svelte';
  import MicrositesManagement from './microsite/MicrositesManagement.svelte';
  import SettingsManagement from './sistem/SettingsManagement.svelte';
  import AIProviderSettingsPage from './sistem/AIProviderSettingsPage.svelte';
  import AdminFeaturesManagement from './sistem/AdminFeaturesManagement.svelte';
  import WhatsAppSettings from './sistem/WhatsAppSettings.svelte';
  import AuditLogsView from './sistem/AuditLogsView.svelte';
  import NotificationsManagement from './sistem/NotificationsManagement.svelte';
  import SeoSearchManagement from './sistem/SeoSearchManagement.svelte';
  import ThemeCustomization from './sistem/ThemeCustomization.svelte';
  import SystemBackupManagement from './sistem/SystemBackupManagement.svelte';
  import SystemMonitoringManagement from './sistem/SystemMonitoringManagement.svelte';

  let { path = '/admin' }: { path?: string } = $props();

  const p = $derived(path.split('?')[0].replace(/\/$/, '') || '/admin');
</script>

{#if p === '/admin'}
  <DashboardOverview />
{:else if p === '/admin/operational-dashboard'}
  <OperationalDashboard />
{:else if p === '/admin/services/dashboard'}
  <ServiceDashboard />
{:else if p === '/admin/pendaftaran'}
  <PendaftaranManagement />
{:else if p === '/admin/antrian'}
  <QueueManagement />
{:else if p === '/admin/pengaduan'}
  <ComplaintsManagement />
{:else if p === '/admin/survei'}
  <AdminSurveysManagement />
{:else if p === '/admin/users'}
  <UsersManagement />
{:else if p === '/admin/roles'}
  <RolesManagement />
{:else if p === '/admin/pages'}
  <PagesManagement />
{:else if p === '/admin/menus'}
  <MenusManagement />
{:else if p === '/admin/posts'}
  <PostsManagement />
{:else if p === '/admin/categories'}
  <CategoriesManagement />
{:else if p === '/admin/announcements'}
  <AnnouncementsManagement />
{:else if p === '/admin/documents'}
  <DocumentsManagement />
{:else if p === '/admin/gallery'}
  <GalleryManagement />
{:else if p === '/admin/media'}
  <MediaLibraryView />
{:else if p === '/admin/services'}
  <ServicesManagement />
{:else if p === '/admin/services/review'}
  <ServiceReviewQueue />
{:else if p === '/admin/services/categories'}
  <ServiceCategoriesManagement />
{:else if p === '/admin/services/clusters'}
  <ServiceClustersManagement />
{:else if p === '/admin/services/units'}
  <ServiceUnitsManagement />
{:else if p === '/admin/services/locations'}
  <ServiceLocationsManagement />
{:else if p === '/admin/facilities'}
  <AdminFacilityManagement />
{:else if p === '/admin/org-structure'}
  <AdminOrgStructureManagement />
{:else if p === '/admin/staff-directory'}
  <AdminStaffDirectoryManagement />
{:else if p === '/admin/contact-settings'}
  <AdminContactManagement />
{:else if p === '/admin/faq'}
  <AdminFaqManagement />
{:else if p === '/admin/dynamic-content'}
  <AdminDynamicContentManagement />
{:else if p === '/admin/public-info'}
  <AdminPublicInfoManagement />
{:else if p === '/admin/info-requests'}
  <AdminInfoRequestsManagement />
{:else if p === '/admin/microsites'}
  <MicrositesManagement />
{:else if p === '/admin/settings'}
  <SettingsManagement />
{:else if p === '/admin/settings/identity' || p === '/admin/settings/appearance' || p === '/admin/settings/services' || p === '/admin/settings/communication' || p === '/admin/settings/security'}
  <SettingsManagement />
{:else if p === '/admin/ai-providers' || p === '/admin/settings/ai-provider' || p === '/admin/ai-provider'}
  <AIProviderSettingsPage />
{:else if p === '/admin/features' || p === '/admin/settings/fitur'}
  <AdminFeaturesManagement />
{:else if p === '/admin/whatsapp' || p === '/admin/settings/whatsapp'}
  <WhatsAppSettings />
{:else if p === '/admin/audit-logs' || p === '/admin/audit'}
  <AuditLogsView />
{:else if p === '/admin/notifications'}
  <NotificationsManagement />
{:else if p === '/admin/seo'}
  <SeoSearchManagement />
{:else if p === '/admin/builder' || p === '/admin/theme'}
  <ThemeCustomization />
{:else if p === '/admin/system/backup' || p === '/admin/system/restore' || p === '/admin/system/versions' || p === '/admin/system/recovery'}
  <SystemBackupManagement />
{:else if p === '/admin/system/health' || p === '/admin/system/logs' || p === '/admin/system/incidents' || p === '/admin/system/jobs'}
  <SystemMonitoringManagement />
{:else}
  <div class="p-8 text-center">
    <h2 class="text-xl font-bold mb-2">Halaman tidak ditemukan</h2>
    <p class="text-gray-600">Path: {path}</p>
  </div>
{/if}
