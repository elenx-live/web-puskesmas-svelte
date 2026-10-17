export interface MaintenanceBackgroundPreset {
  id: string;
  name: string;
  category: string;
  url: string;
  thumbnail: string;
  description: string;
}

export const MAINTENANCE_BG_PRESETS: MaintenanceBackgroundPreset[] = [
  {
    id: 'hospital-modern',
    name: 'Fasilitas Rumah Sakit & Puskesmas Modern',
    category: 'Arsitektur & Gedung',
    url: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?q=80&w=400&auto=format&fit=crop',
    description: 'Pemandangan fasad gedung layanan kesehatan modern, bersih dan terpercaya.'
  },
  {
    id: 'healthcare-team',
    name: 'Tenaga Medis & Dokter Profesional',
    category: 'Pelayanan Medis',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=400&auto=format&fit=crop',
    description: 'Tim dokter dan paramedis yang siap melayani masyarakat sepenuh hati.'
  },
  {
    id: 'clinic-interior',
    name: 'Lobi & Ruang Tunggu Klinik',
    category: 'Interior Fasilitas',
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=400&auto=format&fit=crop',
    description: 'Suasana interior klinik yang rapi, tenang, dan tertata secara higienis.'
  },
  {
    id: 'medical-tech',
    name: 'Laboratorium & Teknologi Kesehatan',
    category: 'Teknologi & Diagnostik',
    url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=400&auto=format&fit=crop',
    description: 'Peralatan mutakhir laboratorium untuk mendukung pembaruan sistem berkala.'
  },
  {
    id: 'community-care',
    name: 'Pelayanan Komunitas & Posyandu',
    category: 'Masyarakat',
    url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=400&auto=format&fit=crop',
    description: 'Sentuhan ramah pelayanan kesehatan primer masyarakat dan keluarga.'
  },
  {
    id: 'abstract-teal',
    name: 'Gelombang Cyan/Teal Futuristik',
    category: 'Abstrak Medis',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
    description: 'Grafis abstrak 3D bernuansa toska medis yang tenang dan elegan.'
  },
  {
    id: 'abstract-dark',
    name: 'Gelap Minimalis & Berwibawa',
    category: 'Abstrak Dark',
    url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=400&auto=format&fit=crop',
    description: 'Latar gelap atmosferik dengan kontras tinggi untuk kenyamanan membaca.'
  },
  {
    id: 'pharmacy-care',
    name: 'Apotek & Distribusi Farmasi',
    category: 'Farmasi',
    url: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?q=80&w=400&auto=format&fit=crop',
    description: 'Instalasi farmasi modern untuk keselamatan dan pemulihan pasien.'
  }
];

export function getMaintenanceBackgroundImage(
  presetId?: string,
  customUrl?: string
): string {
  if (presetId === 'custom' && customUrl && customUrl.trim()) {
    return customUrl.trim();
  }
  const found = MAINTENANCE_BG_PRESETS.find(p => p.id === presetId);
  if (found) {
    return found.url;
  }
  // Default fallback
  return MAINTENANCE_BG_PRESETS[0].url;
}
