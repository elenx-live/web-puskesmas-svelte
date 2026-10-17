// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
// Konfigurasi & konstanta shared (dipindah dari server.ts).
import path from "path";
import fs from "fs";

const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const uploadsDir = path.join(publicDir, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const CONFIG_FILE = path.join(process.cwd(), "whatsapp_config.json");
const LOGS_FILE = path.join(process.cwd(), "whatsapp_logs.json");
const AI_CONFIG_FILE = path.join(process.cwd(), "ai_provider_config.json");

const AI_PROVIDER_PRESETS = [
  {
    id: "gemini",
    name: "Google Gemini (Google AI Studio)",
    endpointUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-3.8-flash",
    placeholderKey: "AIzaSy...",
    helpText: "Dapatkan API key gratis dari Google AI Studio (aistudio.google.com). Jika dikosongkan, server otomatis memakai default GEMINI_API_KEY."
  },
  {
    id: "groq",
    name: "Groq Cloud (Llama 3.3 70B - Sangat Cepat)",
    endpointUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    placeholderKey: "gsk_...",
    helpText: "Dapatkan API key di console.groq.com. Sangat cepat, hemat kuota, dan format kompatibel OpenAI."
  },
  {
    id: "deepseek",
    name: "DeepSeek AI (DeepSeek Chat V3)",
    endpointUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    placeholderKey: "sk-...",
    helpText: "Dapatkan API key di platform.deepseek.com. Sangat cerdas dan ekonomis."
  },
  {
    id: "openai",
    name: "OpenAI ChatGPT (GPT-4o Mini / GPT-4o)",
    endpointUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    placeholderKey: "sk-proj-...",
    helpText: "Dapatkan API key di platform.openai.com. Mendukung GPT-4o-mini, GPT-4o, dan model lainnya."
  },
  {
    id: "openrouter",
    name: "OpenRouter (Akses Multi-Model Bebas)",
    endpointUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    placeholderKey: "sk-or-...",
    helpText: "Dapatkan API key di openrouter.ai untuk mengakses Claude, Llama, Mistral, dan ratusan model lainnya."
  },
  {
    id: "custom",
    name: "Custom / OpenAI-Compatible (Ollama, vLLM, LM Studio, Proxy)",
    endpointUrl: "http://localhost:11434/v1",
    defaultModel: "llama3",
    placeholderKey: "Kunci API (opsional jika server lokal)",
    helpText: "Mendukung semua server AI dengan format endpoint OpenAI /chat/completions standar."
  }
];

const IMAGE_PROVIDER_PRESETS = [
  {
    id: "gemini",
    name: "Google Imagen 3 (Google AI Studio)",
    endpointUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "imagen-3.0-generate-002",
    placeholderKey: "AIzaSy... (Kunci API Google AI Studio)",
    helpText: "Generasi gambar fotorealistik berkualitas tinggi dari Google. Menggunakan kuota API Key Google AI Studio."
  },
  {
    id: "openai",
    name: "OpenAI DALL-E 3",
    endpointUrl: "https://api.openai.com/v1",
    defaultModel: "dall-e-3",
    placeholderKey: "sk-proj-... (Kunci API OpenAI)",
    helpText: "Model generasi gambar DALL-E 3 dari OpenAI dengan ketelitian visual tinggi."
  },
  {
    id: "stability",
    name: "Stability AI (Stable Diffusion XL)",
    endpointUrl: "https://api.stability.ai/v1",
    defaultModel: "stable-diffusion-xl-1024-v1-0",
    placeholderKey: "sk-... (Kunci API Stability AI)",
    helpText: "Engine text-to-image Stable Diffusion XL dari Stability AI dengan kontrol artistik mendalam."
  },
  {
    id: "pollinations",
    name: "Pollinations AI (Flux / Open Source)",
    endpointUrl: "https://image.pollinations.ai",
    defaultModel: "flux",
    placeholderKey: "Tidak butuh API key (Gratis & Terbuka)",
    helpText: "Model visual Flux bebas kuota dan tanpa registrasi API key. Siap pakai langsung."
  },
  {
    id: "custom",
    name: "Custom Image API (OpenAI Compatible / Local)",
    endpointUrl: "http://localhost:11434/v1",
    defaultModel: "stable-diffusion",
    placeholderKey: "Kunci API (opsional)",
    helpText: "Endpoint custom text-to-image dengan format OpenAI /images/generations atau server lokal."
  }
];

const DEFAULT_MICROSITES: Record<string, { name: string; description: string; profileImageUrl?: string; logoUrl?: string; ogImageUrl?: string; slug?: string }> = {
  'portal-cepat': {
    name: 'Portal Layanan Cepat & Terpadu',
    description: 'Akses cepat semua layanan kesehatan, pendaftaran online, pengaduan masyarakat, serta jadwal operasional dalam satu genggaman.',
    profileImageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200',
    logoUrl: '/logo.png',
    slug: 'portal-cepat'
  },
  'polio-2026': {
    name: 'Posko Informasi PIN Polio 2026',
    description: 'Pusat Informasi & Layanan Imunisasi Polio Dosis Tambahan Gratis untuk seluruh balita.',
    profileImageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=1200',
    logoUrl: '/logo.png',
    slug: 'polio-2026'
  }
};

const DEFAULT_POSTS: Record<string, { title: string; excerpt: string; featuredImage?: string }> = {
  'penerapan-integrasi-layanan-primer-ilp': {
    title: 'Penerapan Integrasi Layanan Primer (ILP) di Puskesmas',
    excerpt: 'Sesuai Keputusan Menteri Kesehatan RI No. 19/2024, Puskesmas resmi menata ulang alur pelayanan berbasis 5 Klaster Kesehatan.',
    featuredImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200'
  },
  'pelaksanaan-pekan-imunisasi-nasional-pin-polio': {
    title: 'Pelaksanaan Pekan Imunisasi Nasional (PIN) Polio Serentak',
    excerpt: 'Ribuan balita di wilayah kerja Puskesmas berhasil mendapatkan penetesan vaksin polio dosis tambahan gratis.',
    featuredImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=1200'
  },
  'tips-mencegah-demam-berdarah-dengue-dbd': {
    title: 'Tips Mencegah Demam Berdarah Dengue (DBD) dengan Gerakan 3M Plus',
    excerpt: 'Langkah taktis membasmi jentik nyamuk Aedes aegypti selama musim penghujan tiba.',
    featuredImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=1200'
  }
};

// File persistence paths for settings & metadata
const SITE_SETTINGS_FILE = path.join(process.cwd(), "site_settings.json");
const MICROSITES_META_FILE = path.join(process.cwd(), "microsites_meta.json");
const MICROSITES_DATA_FILE = path.join(process.cwd(), "microsites_data.json");
const MICROSITES_CATEGORIES_FILE = path.join(process.cwd(), "microsites_categories.json");
const THEME_PUBLISHED_FILE = path.join(process.cwd(), "theme_published.json");
const THEME_DRAFT_FILE = path.join(process.cwd(), "theme_draft.json");
const HOMEPAGE_PUBLISHED_FILE = path.join(process.cwd(), "homepage_published.json");
const HOMEPAGE_DRAFT_FILE = path.join(process.cwd(), "homepage_draft.json");
const POSTS_META_FILE = path.join(process.cwd(), "posts_meta.json");
const DEFAULT_THEME = {
  id: 'global-theme-config',
  status: 'published',
  updatedAt: new Date().toISOString(),
  themeName: "Fresh Mint",
  colorPrimary: "#18A878",
  colorPrimaryForeground: "#FFFFFF",
  colorSecondary: "#DDF5EA",
  colorSecondaryForeground: "#145A3B",
  colorAccent: "#27C7A5",
  colorAccentForeground: "#FFFFFF",
  colorBg: "#F8FCFA",
  colorText: "#18332A",
  colorCard: "#FFFFFF",
  colorSurface: "#FFFFFF",
  colorSurfaceForeground: "#18332A",
  colorMuted: "#EEF6F2",
  colorMutedForeground: "#60756C",
  colorBorder: "#D9E9E1",
  colorInput: "#D9E9E1",
  colorRing: "#18A878",
  colorSuccess: "#16A34A",
  colorWarning: "#D97706",
  colorDanger: "#DC2626",
  colorInfo: "#0284C7",
  radius: "rounded",
  buttonStyle: "rounded"
};

const DEFAULT_HOMEPAGE = {
  id: 'homepage-builder-config',
  template: 'modern_majestic',
  backgroundAnimation: 'aurora_flow',
  status: 'published',
  updatedAt: new Date().toISOString(),
  sections: [
    {
      id: 'sec-hero',
      type: 'hero',
      title: 'Pelayanan Kesehatan Terpadu, Profesional & Ramah',
      visible: true,
      order: 0,
      settings: {
        subtitle: 'Puskesmas Mandiri Sejahtera memberikan pelayanan kesehatan komprehensif berbasis 5 Klaster Kesehatan (Permenkes RI No. 19/2024) dan Standar Pelayanan Minimal (Permenkes No. 6/2024).',
        buttonText: 'Lihat Layanan',
        buttonLink: '/layanan',
        buttonText2: 'Kontak & Pengaduan',
        buttonLink2: '/kontak',
        alignment: 'left',
        bgGradient: true
      }
    },
    {
      id: 'sec-search',
      type: 'search',
      title: 'Pencarian Cepat Informasi Puskesmas',
      visible: true,
      order: 1,
      settings: {
        placeholder: 'Cari layanan, jadwal poli, berita, atau persyaratan...',
        showSuggestions: true
      }
    },
    {
      id: 'sec-sambutan',
      type: 'sambutan',
      title: 'Sambutan Kepala Puskesmas',
      visible: true,
      order: 2,
      settings: {
        name: 'dr. H. Rahmat Hidayat, M.Kes',
        role: 'Kepala Puskesmas',
        text: 'Selamat datang di website resmi Puskesmas Mandiri Sejahtera. Kami berkomitmen untuk terus meningkatkan pelayanan kesehatan promotif, preventif, kuratif, dan rehabilitatif di wilayah kami sesuai dengan standar nasional, serta mewujudkan integrasi pelayanan kesehatan primer yang inklusif.',
        avatarUrl: ''
      }
    },
    {
      id: 'sec-info',
      type: 'info',
      title: 'Sekilas Puskesmas Kami',
      visible: true,
      order: 3,
      settings: {
        grid: [
          { title: '5 Klaster', desc: 'Penyelenggaraan Klaster Kesehatan Terintegrasi' },
          { title: '24 Jam', desc: 'Layanan UGD & Persalinan Darurat' },
          { title: '11 Komponen', desc: 'Standar Pelayanan Publik Terbuka' },
          { title: '12 SPM', desc: 'Cakupan Standar Pelayanan Minimal' }
        ]
      }
    },
    {
      id: 'sec-unggulan',
      type: 'unggulan',
      title: 'Layanan Unggulan & Inovasi',
      visible: true,
      order: 4,
      settings: {
        items: [
          { name: 'Skrining PTM Keliling', description: 'Pemeriksaan tensi, gula darah, dan kolesterol gratis di posyandu & balai RW.' },
          { name: 'Pojok Gizi & Konseling', description: 'Pelayanan konseling gizi terpadu untuk penanganan stunting.' },
          { name: 'UGD & Ambulans Siaga 24 Jam', description: 'Pelayanan gawat darurat respons cepat.' }
        ]
      }
    },
    {
      id: 'sec-layanan',
      type: 'layanan',
      title: 'Daftar Layanan Kesehatan',
      visible: true,
      order: 5,
      settings: {
        limit: 6,
        layout: 'grid',
        categoryFilter: 'all'
      }
    },
    {
      id: 'sec-jadwal',
      type: 'jadwal',
      title: 'Jadwal Layanan Poli',
      visible: true,
      order: 6,
      settings: {
        schedules: [
          { name: 'Poli Umum', days: 'Senin - Sabtu', hours: '08:00 - 14:00' },
          { name: 'Poli Gigi', days: 'Senin - Jumat', hours: '08:00 - 13:00' },
          { name: 'Poli KIA/KB', days: 'Selasa & Kamis', hours: '08:00 - 12:00' },
          { name: 'Poli Imunisasi', days: 'Rabu', hours: '08:00 - 11:30' }
        ]
      }
    },
    {
      id: 'sec-berita',
      type: 'berita',
      title: 'Berita & Artikel Kesehatan Terbaru',
      visible: true,
      order: 7,
      settings: {
        limit: 3,
        sortBy: 'latest'
      }
    },
    {
      id: 'sec-pengumuman',
      type: 'pengumuman',
      title: 'Pengumuman Penting',
      visible: true,
      order: 8,
      settings: {
        limit: 2
      }
    },
    {
      id: 'sec-statistik',
      type: 'statistik',
      title: 'Statistik Pelayanan Bulan Ini',
      visible: true,
      order: 9,
      settings: {
        items: [
          { label: 'Pasien Terlayani', value: '1,420+' },
          { label: 'Kepuasan Masyarakat', value: '94.8%' },
          { label: 'Kunjungan Pustu', value: '380' },
          { label: 'Kegiatan Posyandu', value: '24' }
        ]
      }
    },
    {
      id: 'sec-kritik',
      type: 'kritik_saran',
      title: 'Suara Anda, Layanan Kami',
      visible: true,
      order: 10,
      settings: {
        text: 'Bantu kami meningkatkan kualitas layanan dengan memberikan kritik, saran, atau pengaduan secara transparan.',
        buttonText: 'Kirim Kritik & Saran',
        buttonLink: '/kritik-saran'
      }
    },
    {
      id: 'sec-microsites',
      type: 'microsites',
      title: 'Microsite',
      visible: true,
      order: 11,
      settings: {
        subtitle: 'Akses cepat portal khusus, program kesehatan tematik, dan informasi kampanye puskesmas.'
      }
    },
    {
      id: 'sec-kontak',
      type: 'kontak',
      title: 'Hubungi Kami',
      visible: true,
      order: 12,
      settings: {
        showSocials: true
      }
    },
    {
      id: 'sec-lokasi',
      type: 'lokasi',
      title: 'Lokasi Puskesmas',
      visible: true,
      order: 13,
      settings: {
        height: '400px'
      }
    },
    {
      id: 'sec-cta',
      type: 'cta',
      title: 'Butuh Pelayanan Kesehatan Darurat?',
      visible: true,
      order: 14,
      settings: {
        subtitle: 'Layanan UGD dan Bersalin Puskesmas Mandiri Sejahtera buka 24 jam sehari, 7 hari seminggu.',
        buttonText: 'Telepon UGD Sekarang',
        buttonLink: 'tel:0215550199'
      }
    }
  ]
};

const DEFAULT_CATEGORIES = [
  { name: 'Umum', description: 'Portal informasi umum, layanan harian, dan tautan serbaguna Puskesmas.' },
  { name: 'Layanan Puskesmas', description: 'Akses cepat portal utama layanan rawat jalan, gawat darurat, pendaftaran online, dan jadwal poliklinik.' },
  { name: 'Program Kesehatan', description: 'Portal tematik program khusus kesehatan masyarakat seperti PIN Polio, pencegahan stunting, dan imunisasi.' },
  { name: 'Informasi Publik', description: 'Kumpulan regulasi, Standar Pelayanan Publik (SPP), maklumat, serta laporan akuntabilitas kinerja.' },
  { name: 'Kampanye & Edukasi', description: 'Materi penyuluhan kesehatan, infografis pencegahan penyakit, dan sosialisasi program hidup sehat.' }
];

/** Item microsite bawaan (seed). */
interface DefaultMicrosite {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  logoUrl: string;
  profileImageUrl: string;
  status: string;
  [k: string]: unknown;
}

const DEFAULT_FULL_MICROSITES: DefaultMicrosite[] = [
  {
    id: 'm-1',
    name: 'Puskesmas Mandiri Sejahtera - Portal Cepat',
    slug: 'portal-cepat',
    description: 'Akses cepat semua layanan kesehatan, pengaduan masyarakat, serta jadwal operasional dalam satu genggaman.',
    category: 'Layanan Puskesmas',
    logoUrl: '',
    profileImageUrl: '',
    status: 'published',
    active: true,
    passwordProtected: false,
    password: '',
    links: [
      { id: 'ml-1', label: 'Daftar Layanan Utama', url: '/layanan', type: 'internal', displayOrder: 1 },
      { id: 'ml-2', label: 'Formulir Kritik, Saran, & Pengaduan', url: '/kritik-saran', type: 'internal', displayOrder: 2 },
      { id: 'ml-3', label: 'Pusat Berita & Edukasi', url: '/berita', type: 'internal', displayOrder: 3 },
      { id: 'ml-4', label: 'Hubungi Kami (WhatsApp)', url: 'https://wa.me/628123456789', type: 'external', displayOrder: 4 }
    ],
    socialMedia: {
      facebook: 'https://facebook.com/puskesmas.mandiri',
      instagram: 'https://instagram.com/puskesmas.mandiri',
      youtube: 'https://youtube.com/c/PuskesmasMandiri'
    },
    phone: '(021) 555-0199',
    email: 'kontak@puskesmas.go.id',
    website: 'https://puskesmas-mandiri.go.id',
    address: 'Jl. Kesehatan No. 123, Kelurahan Sejahtera',
    mapUrl: 'https://maps.google.com',
    themeCustomization: {
      theme: 'emerald',
      template: 'modern_majestic',
      backgroundAnimation: 'aurora_flow',
      buttonStyle: 'rounded',
      accentColor: '#10b981'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const CONTACT_SETTINGS_FILE = path.join(process.cwd(), "data_store_contact.json");
const DATA_STORE_DIR = path.join(process.cwd(), "data_store");
if (!fs.existsSync(DATA_STORE_DIR)) {
  try {
    fs.mkdirSync(DATA_STORE_DIR, { recursive: true });
  } catch {}
}

const SINGLE_DOCUMENT_COLLECTIONS = new Set([
  'site_settings',
  'contact_settings',
  'theme',
  'homepage',
  'theme_draft',
  'homepage_draft'
]);

const HEALTHCARE_IMAGE_LIBRARY: Record<string, string[]> = {
  posyandu: [
    "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  vaksin: [
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1632053002928-19593a207212?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  dokter: [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  lansia: [
    "https://images.unsplash.com/photo-1576765608622-067973a79f53?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  gizi: [
    "https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  darurat: [
    "https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  farmasi: [
    "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  laboratorium: [
    "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  gigi: [
    "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&h=630&q=80"
  ],
  edukasi: [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&h=630&q=80",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&h=630&q=80"
  ]
};

// -------------------------------------------------------------
// AI Image Generation & Provider Integration Engine
// -------------------------------------------------------------

const HEALTH_TERMS_MAP: Record<string, string> = {
  "posyandu": "Posyandu maternal and child health post in Indonesian community",
  "dacin": "traditional hanging baby balance scale dacin with colorful batik cloth sling",
  "timbang": "weighing infant toddler gently on scale",
  "penimbangan": "baby weighing monitoring session",
  "balita": "Indonesian toddler under five years old",
  "kader": "female Indonesian community health worker wearing uniform and neat hijab",
  "berkerudung": "wearing neat hijab",
  "stunting": "child growth monitoring and stunting nutrition prevention",
  "imunisasi": "child immunization vaccination administered by gentle nurse",
  "vaksin": "vaccine dose injection",
  "vaksinasi": "vaccination procedure",
  "suntik": "gentle medical injection",
  "bidan": "Indonesian certified midwife in clinic uniform and hijab",
  "dokter gigi": "Indonesian dentist examining patient teeth in dental clinic with dental chair",
  "dokter": "Indonesian doctor wearing white lab coat and stethoscope",
  "perawat": "Indonesian nurse in medical scrubs and hijab",
  "apotek": "clinic pharmacy dispensing medicine prescriptions",
  "farmasi": "clinic pharmacy dispensing medicine prescriptions",
  "obat": "pharmaceutical medicine prescription packaging",
  "lansia": "elderly Indonesian senior citizen",
  "posbindu": "elderly health screening and checkup",
  "tensi": "checking blood pressure with arm cuff sphygmomanometer",
  "tekanan darah": "checking blood pressure with arm cuff",
  "gula darah": "blood glucose testing with finger prick meter",
  "kolesterol": "cholesterol screening test",
  "puskesmas": "clean modern Indonesian community health clinic Puskesmas",
  "ugd": "emergency room UGD in clinic with medical staff",
  "igd": "emergency department in clinic with medical staff",
  "ambulans": "Indonesian Puskesmas emergency ambulance vehicle with emergency beacon lights",
  "lab": "medical laboratory with microscope and test tubes",
  "laboratorium": "medical laboratory with microscope and test tubes",
  "usg": "ultrasound examination for pregnant mother with monitor screen",
  "ibu hamil": "Indonesian pregnant mother receiving healthcare checkup",
  "kia": "maternal and child health KIA consultation room",
  "konseling": "health counseling and education session",
  "gizi": "nutritionist providing healthy fresh food and fruit dietary advice",
  "gigi": "dental examination and oral healthcare",
  "ruang tunggu": "bright clean clinic waiting room with patient seating",
  "senam": "healthy morning gymnastics exercise session for community",
  "phbs": "clean and healthy living behavior education",
  "cuci tangan": "washing hands with clean soap and water technique"
};

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  posyandu: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  balita: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  anak: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  kia: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  ibu: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  polio: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=75',
  vaksin: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=75',
  imunisasi: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=75',
  darurat: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=1200&h=630&q=75',
  siaga: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=1200&h=630&q=75',
  ambulans: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=1200&h=630&q=75',
  lansia: 'https://images.unsplash.com/photo-1576765608622-067973a79f53?auto=format&fit=crop&w=1200&h=630&q=75',
  gizi: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1200&h=630&q=75',
  stunting: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1200&h=630&q=75',
  layanan: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&h=630&q=75',
  klinik: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&h=630&q=75',
  portal: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&h=630&q=75',
  farmasi: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1200&h=630&q=75',
  obat: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1200&h=630&q=75',
  lab: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&h=630&q=75',
  gigi: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&h=630&q=75',
  dokumen: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&h=630&q=75',
};


export {
  publicDir, uploadsDir,
  CONFIG_FILE, LOGS_FILE,
  AI_CONFIG_FILE, AI_PROVIDER_PRESETS, IMAGE_PROVIDER_PRESETS,
  SITE_SETTINGS_FILE, MICROSITES_META_FILE, MICROSITES_DATA_FILE, MICROSITES_CATEGORIES_FILE,
  THEME_PUBLISHED_FILE, THEME_DRAFT_FILE, HOMEPAGE_PUBLISHED_FILE, HOMEPAGE_DRAFT_FILE,
  POSTS_META_FILE,
  DEFAULT_MICROSITES, DEFAULT_POSTS, DEFAULT_THEME, DEFAULT_HOMEPAGE,
  DEFAULT_CATEGORIES, DEFAULT_FULL_MICROSITES,
  CONTACT_SETTINGS_FILE, DATA_STORE_DIR, SINGLE_DOCUMENT_COLLECTIONS,
  HEALTHCARE_IMAGE_LIBRARY, HEALTH_TERMS_MAP, CATEGORY_DEFAULT_IMAGES,
};
