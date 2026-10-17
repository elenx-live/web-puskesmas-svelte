import type { PuskesmasContactSettings, ContactChannelEntity, OperatingDayEntity, SpecialHourEntity, EmergencyInfoEntity } from '../types/index.js';
import { auditService } from './auditService';
import { getSingleDocument, saveSingleDocument } from '../lib/firebase';

const CONTACT_SETTINGS_KEY = 'puskesmas_contact_settings_v1';
const FIRESTORE_COLLECTION = 'site_settings';
const FIRESTORE_DOC_ID = 'contact_settings_v1';

const DEFAULT_CONTACT_SETTINGS: PuskesmasContactSettings = {
  name: 'Puskesmas Manding',
  tagline: 'Pelayanan Kesehatan Profesional, Ramah, dan Terjangkau',
  address: 'Jl. Kesehatan Raya No. 45, Kecamatan Mandiri, Kabupaten Sejahtera',
  village: 'Kelurahan Mandiri Sejahtera',
  district: 'Kecamatan Mandiri',
  regency: 'Kabupaten Sejahtera',
  province: 'Jawa Timur',
  postalCode: '69400',
  latitude: -6.2088,
  longitude: 106.8456,
  mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.521260322283!2d106.81956137475038!3d-6.208763393792019!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f3e705b630fb%3A0xf51fae2db4bf7d1b!2sMonumen%20Nasional!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid',
  externalMapUrl: 'https://maps.google.com/?q=-6.2088,106.8456',
  timezone: 'Asia/Jakarta',
  channels: [
    {
      id: 'chn-1',
      label: 'Telepon Puskesmas (Utama)',
      type: 'Phone',
      value: '(0328) 667123',
      isPrimary: true,
      showOnWebsite: true,
      order: 1,
      icon: 'Phone'
    },
    {
      id: 'chn-2',
      label: 'WhatsApp Pelayanan & Pendaftaran',
      type: 'WhatsApp',
      value: '0812-3456-7890',
      isPrimary: true,
      showOnWebsite: true,
      order: 2,
      icon: 'MessageSquare'
    },
    {
      id: 'chn-3',
      label: 'Email Layanan Pengaduan & Informasi',
      type: 'Email',
      value: 'info@puskesmas-mandiri.go.id',
      isPrimary: true,
      showOnWebsite: true,
      order: 3,
      icon: 'Mail'
    },
    {
      id: 'chn-4',
      label: 'Website Resmi',
      type: 'Website',
      value: 'https://puskesmas-mandiri.go.id',
      isPrimary: false,
      showOnWebsite: true,
      order: 4,
      icon: 'Globe'
    },
    {
      id: 'chn-5',
      label: 'Instagram Resmi',
      type: 'Social Media',
      value: 'https://instagram.com/puskesmas_mandiri',
      isPrimary: false,
      showOnWebsite: true,
      order: 5,
      icon: 'Instagram'
    },
    {
      id: 'chn-6',
      label: 'Facebook Page',
      type: 'Social Media',
      value: 'https://facebook.com/puskesmas.mandiri',
      isPrimary: false,
      showOnWebsite: true,
      order: 6,
      icon: 'Facebook'
    }
  ],
  operatingHours: [
    { day: 'Monday', dayNameId: 'Senin', isOpen: true, openTime: '07:30', closeTime: '16:00', notes: 'Pendaftaran 07:30 - 14:00' },
    { day: 'Tuesday', dayNameId: 'Selasa', isOpen: true, openTime: '07:30', closeTime: '16:00', notes: 'Pendaftaran 07:30 - 14:00' },
    { day: 'Wednesday', dayNameId: 'Rabu', isOpen: true, openTime: '07:30', closeTime: '16:00', notes: 'Pendaftaran 07:30 - 14:00' },
    { day: 'Thursday', dayNameId: 'Kamis', isOpen: true, openTime: '07:30', closeTime: '16:00', notes: 'Pendaftaran 07:30 - 14:00' },
    { day: 'Friday', dayNameId: 'Jumat', isOpen: true, openTime: '07:30', closeTime: '11:30', notes: 'Istirahat Sholat Jumat' },
    { day: 'Saturday', dayNameId: 'Sabtu', isOpen: true, openTime: '07:30', closeTime: '13:00', notes: 'Layanan Poliklinik & PONED' },
    { day: 'Sunday', dayNameId: 'Minggu', isOpen: false, openTime: '00:00', closeTime: '00:00', notes: 'Tutup (UGD & Rawat Inap Buka 24 Jam)' }
  ],
  specialHours: [
    {
      id: 'sp-1',
      date: '2026-08-17',
      title: 'Hari Kemerdekaan RI',
      isOpen: false,
      notes: 'Puskesmas Libur Nasional. Layanan Darurat UGD & Bersalin tetap buka 24 jam.'
    }
  ],
  emergencyInfo: {
    title: 'Layanan Darurat & UGD 24 Jam',
    description: 'Untuk keadaan darurat medis mendesak, silakan langsung menuju Instalasi Gawat Darurat (UGD) Puskesmas atau hubungi hotline siaga darurat kami.',
    hotlineNumbers: ['(0328) 667123', '0812-3456-7890'],
    locationNote: 'Gedung Utama Sayap Timur (Akses Khusus Ambulans & Pasien Darurat)',
    showOnHomepage: true,
    showOnContactPage: true,
    showOnServicePages: true
  },
  updatedAt: new Date().toISOString(),
  updatedBy: { id: 'usr-admin', name: 'System Admin' }
};

export const contactService = {
  getCachedSettings(): PuskesmasContactSettings {
    try {
      const stored = localStorage.getItem(CONTACT_SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_CONTACT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}
    return DEFAULT_CONTACT_SETTINGS;
  },

  async getContactSettings(): Promise<PuskesmasContactSettings> {
    // 1. Try Server API first (global single source of truth across all devices/browsers)
    try {
      const res = await fetch('/api/contact-settings');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.contactSettings && typeof json.contactSettings === 'object') {
          const merged = { ...DEFAULT_CONTACT_SETTINGS, ...json.contactSettings };
          localStorage.setItem(CONTACT_SETTINGS_KEY, JSON.stringify(merged));
          saveSingleDocument(FIRESTORE_COLLECTION, FIRESTORE_DOC_ID, merged, CONTACT_SETTINGS_KEY).catch(() => {});
          return merged;
        }
      }
    } catch {}

    // 2. Try Firestore with local cache
    try {
      const fsData = await getSingleDocument<PuskesmasContactSettings>(
        FIRESTORE_COLLECTION,
        FIRESTORE_DOC_ID,
        CONTACT_SETTINGS_KEY,
        DEFAULT_CONTACT_SETTINGS
      );
      if (fsData && fsData.name) {
        return fsData;
      }
    } catch (err) {
      console.warn('Firestore contact fetch fallback:', err);
    }

    // 3. Fallback to local cache or defaults
    return this.getCachedSettings();
  },

  async saveContactSettings(settings: PuskesmasContactSettings, user?: { id: string; name: string; email?: string }): Promise<void> {
    const updated: PuskesmasContactSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: user ? { id: user.id, name: user.name } : { id: 'usr-admin', name: 'Admin' }
    };

    // 1. Immediate local save
    localStorage.setItem(CONTACT_SETTINGS_KEY, JSON.stringify(updated));

    // 2. Server API save for cross-device & cross-browser synchronization
    try {
      await fetch('/api/contact-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.warn('Server contact save failed:', err);
    }

    // 3. Cloud Firestore save
    saveSingleDocument(FIRESTORE_COLLECTION, FIRESTORE_DOC_ID, updated, CONTACT_SETTINGS_KEY).catch(err => {
      console.warn('Firestore contact save failed:', err);
    });

    // 4. Bi-directional synchronization to site_settings (puskesmas_site_settings)
    try {
      const storedSite = localStorage.getItem('puskesmas_site_settings');
      if (storedSite) {
        const siteObj = JSON.parse(storedSite);
        if (settings.name) siteObj.siteName = settings.name;
        if (settings.tagline) siteObj.tagline = settings.tagline;
        if (settings.address) siteObj.address = settings.address;
        if (settings.village) siteObj.village = settings.village;
        if (settings.district) siteObj.district = settings.district;
        if (settings.regency) siteObj.regency = settings.regency;
        if (settings.province) siteObj.province = settings.province;
        if (settings.postalCode) siteObj.postalCode = settings.postalCode;
        if (settings.latitude) siteObj.latitude = settings.latitude;
        if (settings.longitude) siteObj.longitude = settings.longitude;
        if (settings.timezone) siteObj.timezone = settings.timezone;

        const phoneCh = settings.channels?.find(c => c.type === 'Phone');
        if (phoneCh) siteObj.phone = phoneCh.value;
        const waCh = settings.channels?.find(c => c.type === 'WhatsApp');
        if (waCh) siteObj.whatsapp = waCh.value;
        const emailCh = settings.channels?.find(c => c.type === 'Email');
        if (emailCh) siteObj.email = emailCh.value;

        localStorage.setItem('puskesmas_site_settings', JSON.stringify(siteObj));
        saveSingleDocument('site_settings', 'global_settings', siteObj, 'puskesmas_site_settings').catch(() => {});
        try {
          fetch('/api/site-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteObj)
          }).catch(() => {});
        } catch {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('puskesmas_settings_updated', { detail: siteObj }));
        }
      }
    } catch (err) {
      console.warn('Sync to site settings failed:', err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('puskesmas_contact_updated', { detail: updated }));
    }

    await auditService.recordLog({
      action: 'SETTINGS_CHANGE',
      module: 'SETTINGS',
      description: 'Memperbarui pengaturan kontak, jam operasional, dan informasi darurat puskesmas',
      userId: user?.id || 'admin',
      userName: user?.name || 'Admin',
      userEmail: user?.email || 'admin@puskesmas.id',
      targetId: 'contact-settings',
      targetName: 'Pengaturan Kontak'
    });
  },

  async getPublicContactSettings(): Promise<PuskesmasContactSettings> {
    const settings = await this.getContactSettings();
    // Filter out un-published channels if needed, but return full settings structure
    return {
      ...settings,
      channels: settings.channels.filter(c => c.showOnWebsite)
    };
  },

  checkIsOpenNow(settings?: PuskesmasContactSettings): { isOpen: boolean; statusLabel: string; message: string } {
    // We can use Asia/Jakarta timezone or local time formatted to Jakarta
    try {
      const now = new Date();
      // Format current time in Asia/Jakarta
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(now);
      
      let dayStr = '';
      let hourStr = '0';
      let minuteStr = '0';
      let dateStr = ''; // YYYY-MM-DD

      let year = '';
      let month = '';
      let dayNum = '';

      for (const p of parts) {
        if (p.type === 'weekday') dayStr = p.value;
        if (p.type === 'hour') hourStr = p.value;
        if (p.type === 'minute') minuteStr = p.value;
        if (p.type === 'year') year = p.value;
        if (p.type === 'month') month = p.value;
        if (p.type === 'day') dayNum = p.value;
      }
      dateStr = `${year}-${month}-${dayNum}`;

      const currentMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);

      // Check special hours first
      if (settings && settings.specialHours) {
        const special = settings.specialHours.find(s => s.date === dateStr);
        if (special) {
          if (!special.isOpen) {
            return { isOpen: false, statusLabel: 'Tutup (Libur Khusus)', message: special.title || 'Libur / Jam Khusus' };
          }
          if (special.openTime && special.closeTime) {
            const [openH, openM] = special.openTime.split(':').map(Number);
            const [closeH, closeM] = special.closeTime.split(':').map(Number);
            const openMin = openH * 60 + openM;
            const closeMin = closeH * 60 + closeM;
            const isOpenTime = currentMinutes >= openMin && currentMinutes <= closeMin;
            return {
              isOpen: isOpenTime,
              statusLabel: isOpenTime ? 'Buka (Jam Khusus)' : 'Tutup (Diluar Jam Khusus)',
              message: special.title || `Jam: ${special.openTime} - ${special.closeTime}`
            };
          }
        }
      }

      // Check regular operating hours
      if (settings && settings.operatingHours) {
        const dayMap: Record<string, string> = {
          'Monday': 'Monday',
          'Tuesday': 'Tuesday',
          'Wednesday': 'Wednesday',
          'Thursday': 'Thursday',
          'Friday': 'Friday',
          'Saturday': 'Saturday',
          'Sunday': 'Sunday'
        };
        const dayRecord = settings.operatingHours.find(h => h.day.toLowerCase() === dayStr.toLowerCase());
        if (dayRecord) {
          if (!dayRecord.isOpen) {
            return { isOpen: false, statusLabel: 'Tutup Hari Ini', message: dayRecord.notes || 'Buka kembali besok' };
          }
          const [openH, openM] = dayRecord.openTime.split(':').map(Number);
          const [closeH, closeM] = dayRecord.closeTime.split(':').map(Number);
          const openMin = openH * 60 + openM;
          const closeMin = closeH * 60 + closeM;
          const isOpenTime = currentMinutes >= openMin && currentMinutes <= closeMin;
          return {
            isOpen: isOpenTime,
            statusLabel: isOpenTime ? 'Buka' : 'Tutup',
            message: `${dayRecord.dayNameId}: ${dayRecord.openTime} - ${dayRecord.closeTime}`
          };
        }
      }

      return { isOpen: true, statusLabel: 'Jam Operasional', message: 'Silakan cek jadwal layanan' };
    } catch (e) {
      return { isOpen: true, statusLabel: 'Jam Operasional', message: 'Senin - Sabtu' };
    }
  }
};
