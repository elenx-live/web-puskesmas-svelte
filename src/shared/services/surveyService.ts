import type { SurveyEntity, SurveyResponse, SurveyStatus, SurveyQuestion, SurveyAnswer, AppUser } from '../types/index.js';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { registrationService } from './registrationService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const SURVEYS_STORAGE_KEY = 'puskesmas_surveys';
const RESPONSES_STORAGE_KEY = 'puskesmas_survey_responses';
const SURVEY_RATE_LIMIT_KEY = 'puskesmas_survey_rate_limit';

const SURVEYS_COLLECTION = 'surveys';
const RESPONSES_COLLECTION = 'survey_responses';

// Standard rating scale label helper
export const DEFAULT_SCALE_LABELS = [
  { score: 1, label: 'Sangat Tidak Puas' },
  { score: 2, label: 'Tidak Puas' },
  { score: 3, label: 'Puas' },
  { score: 4, label: 'Sangat Puas' }
];

// Seed initial active survey for immediate previewing
const INITIAL_SURVEYS: SurveyEntity[] = [
  {
    id: 'srv-kepuasan-01',
    title: 'Survei Kepuasan Masyarakat (SKM) Triwulan III - 2026',
    description: 'Survei berkala untuk mengukur indeks kepuasan pelayanan Puskesmas demi peningkatan kualitas pelayanan publik secara berkelanjutan.',
    status: 'published',
    version: 1,
    slug: 'kepuasan-pelayanan-umum',
    startDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0], // 10 days ago
    endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0], // 60 days from now
    isLinkedToRegistration: false,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    questions: [
      {
        id: 'q-kualitas',
        type: 'rating',
        text: 'Bagaimana kualitas pelayanan medis dan penunjang yang Anda terima di Puskesmas?',
        required: true,
        scaleLabels: DEFAULT_SCALE_LABELS
      },
      {
        id: 'q-kecepatan',
        type: 'rating',
        text: 'Bagaimana kecepatan waktu pelayanan dari pendaftaran hingga selesai dilayani?',
        required: true,
        scaleLabels: DEFAULT_SCALE_LABELS
      },
      {
        id: 'q-kemudahan',
        type: 'rating',
        text: 'Bagaimana kemudahan alur prosedur pendaftaran dan rujukan?',
        required: true,
        scaleLabels: DEFAULT_SCALE_LABELS
      },
      {
        id: 'q-kejelasan',
        type: 'rating',
        text: 'Bagaimana kejelasan petunjuk arah dan informasi alur pelayanan di Puskesmas?',
        required: true,
        scaleLabels: DEFAULT_SCALE_LABELS
      },
      {
        id: 'q-keramahan',
        type: 'rating',
        text: 'Bagaimana sikap keramahan, kesopanan, dan kepedulian petugas?',
        required: true,
        scaleLabels: DEFAULT_SCALE_LABELS
      },
      {
        id: 'q-fasilitas',
        type: 'rating',
        text: 'Bagaimana kenyamanan ruang tunggu, kebersihan toilet, dan pendingin ruangan?',
        required: true,
        scaleLabels: DEFAULT_SCALE_LABELS
      },
      {
        id: 'q-kesesuaian',
        type: 'rating',
        text: 'Apakah pelayanan yang Anda peroleh sesuai dengan standar yang dipublikasikan?',
        required: true,
        scaleLabels: DEFAULT_SCALE_LABELS
      },
      {
        id: 'q-penanganan',
        type: 'rating',
        text: 'Seberapa responsif petugas dalam menanggapi keluhan atau pertanyaan Anda?',
        required: false,
        scaleLabels: DEFAULT_SCALE_LABELS
      }
    ]
  },
  {
    id: 'srv-kepuasan-kia',
    title: 'Evaluasi Khusus Pelayanan Poli Ibu & Anak (KIA)',
    description: 'Survei evaluasi kepuasan khusus bagi pasien atau keluarga yang mendapatkan pelayanan di Poli KIA.',
    status: 'draft',
    version: 1,
    slug: 'evaluasi-poli-kia',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    isLinkedToRegistration: true, // Requires registration code
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'kia-q1',
        type: 'rating',
        text: 'Kenyamanan pemeriksaan kehamilan dan ruang laktasi?',
        required: true,
        scaleLabels: DEFAULT_SCALE_LABELS
      },
      {
        id: 'kia-q2',
        type: 'multiple_choice',
        text: 'Apakah Anda diberikan Buku KIA secara gratis dan lengkap?',
        required: true,
        options: ['Ya, Gratis & Lengkap', 'Ya, tapi ada bagian kurang', 'Tidak Diberikan']
      }
    ]
  }
];

const INITIAL_RESPONSES: SurveyResponse[] = [
  {
    id: 'resp-001',
    surveyId: 'srv-kepuasan-01',
    surveyVersion: 1,
    serviceId: 'srv-001',
    serviceName: 'Pelayanan Pemeriksaan Umum',
    answers: [
      { questionId: 'q-kualitas', answer: 4 },
      { questionId: 'q-kecepatan', answer: 3 },
      { questionId: 'q-kemudahan', answer: 4 },
      { questionId: 'q-kejelasan', answer: 3 },
      { questionId: 'q-keramahan', answer: 4 },
      { questionId: 'q-fasilitas', answer: 3 },
      { questionId: 'q-kesesuaian', answer: 4 },
      { questionId: 'q-penanganan', answer: 4 }
    ],
    saran: 'Pelayanan secara keseluruhan sudah sangat baik dan cepat. Terima kasih dokter.',
    saranStatus: 'approved',
    isAnonymous: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'resp-002',
    surveyId: 'srv-kepuasan-01',
    surveyVersion: 1,
    serviceId: 'srv-003',
    serviceName: 'Pelayanan Gigi & Mulut',
    answers: [
      { questionId: 'q-kualitas', answer: 2 },
      { questionId: 'q-kecepatan', answer: 1 },
      { questionId: 'q-kemudahan', answer: 3 },
      { questionId: 'q-kejelasan', answer: 2 },
      { questionId: 'q-keramahan', answer: 3 },
      { questionId: 'q-fasilitas', answer: 2 },
      { questionId: 'q-kesesuaian', answer: 2 },
      { questionId: 'q-penanganan', answer: 2 }
    ],
    saran: 'Antrean di poli gigi sangat lama, waktu pemeriksaan agak molor. Mohon ditingkatkan kecepatannya.',
    saranStatus: 'approved',
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'resp-003',
    surveyId: 'srv-kepuasan-01',
    surveyVersion: 1,
    serviceId: 'srv-002',
    serviceName: 'Pelayanan KIA-KB',
    answers: [
      { questionId: 'q-kualitas', answer: 4 },
      { questionId: 'q-kecepatan', answer: 4 },
      { questionId: 'q-kemudahan', answer: 4 },
      { questionId: 'q-kejelasan', answer: 4 },
      { questionId: 'q-keramahan', answer: 4 },
      { questionId: 'q-fasilitas', answer: 4 },
      { questionId: 'q-kesesuaian', answer: 4 },
      { questionId: 'q-penanganan', answer: 4 }
    ],
    saran: 'Bidan sangat ramah sekali, antrean rapi dan cepat.',
    saranStatus: 'approved',
    isAnonymous: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

function getStoredSurveys(): SurveyEntity[] {
  try {
    const data = localStorage.getItem(SURVEYS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(SURVEYS_STORAGE_KEY, JSON.stringify(INITIAL_SURVEYS));
      return INITIAL_SURVEYS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_SURVEYS;
  }
}

function saveStoredSurveys(items: SurveyEntity[]) {
  localStorage.setItem(SURVEYS_STORAGE_KEY, JSON.stringify(items));
}

function getStoredResponses(): SurveyResponse[] {
  try {
    const data = localStorage.getItem(RESPONSES_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(INITIAL_RESPONSES));
      return INITIAL_RESPONSES;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_RESPONSES;
  }
}

function saveStoredResponses(items: SurveyResponse[]) {
  localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(items));
}

function sanitizeText(str: string | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

function checkRateLimit(): boolean {
  try {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const maxSubmissions = 5;

    const raw = localStorage.getItem(SURVEY_RATE_LIMIT_KEY);
    let timestamps: number[] = raw ? JSON.parse(raw) : [];

    // Clean old
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= maxSubmissions) {
      return false;
    }

    timestamps.push(now);
    localStorage.setItem(SURVEY_RATE_LIMIT_KEY, JSON.stringify(timestamps));
    return true;
  } catch {
    return true;
  }
}

export const surveyService = {
  // --- Admin Methods ---
  async getSurveys(): Promise<SurveyEntity[]> {
    const list = await getCollectionData<SurveyEntity>(SURVEYS_COLLECTION, SURVEYS_STORAGE_KEY, INITIAL_SURVEYS);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getSurveyById(id: string): Promise<SurveyEntity | null> {
    const list = await this.getSurveys();
    return list.find(s => s.id === id) || null;
  },

  async getSurveyBySlug(slug: string): Promise<SurveyEntity | null> {
    const list = await this.getSurveys();
    return list.find(s => s.slug === slug.toLowerCase().trim()) || null;
  },

  async createSurvey(data: Omit<SurveyEntity, 'id' | 'version' | 'createdAt' | 'updatedAt'>, actor: { id: string; name: string; email: string }): Promise<SurveyEntity> {
    const list = await this.getSurveys();
    
    // Check unique slug
    const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    if (list.some(s => s.slug === cleanSlug)) {
      throw new Error(`Survey dengan URL slug "${cleanSlug}" sudah terdaftar.`);
    }

    const newSurvey: SurveyEntity = {
      ...data,
      id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      slug: cleanSlug,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(SURVEYS_COLLECTION, newSurvey.id, newSurvey, SURVEYS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'CREATE',
      module: 'SURVEYS',
      targetId: newSurvey.id,
      targetName: newSurvey.title,
      description: `Membuat survei kepuasan masyarakat baru: "${newSurvey.title}"`
    });

    return newSurvey;
  },

  async updateSurvey(id: string, data: Partial<SurveyEntity>, actor: { id: string; name: string; email: string }): Promise<SurveyEntity> {
    const list = await this.getSurveys();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Survei tidak ditemukan.');

    const current = list[idx];

    // Check slug change uniqueness
    if (data.slug && data.slug.toLowerCase().trim() !== current.slug) {
      const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
      if (list.some(s => s.id !== id && s.slug === cleanSlug)) {
        throw new Error(`Survey dengan URL slug "${cleanSlug}" sudah terdaftar.`);
      }
      data.slug = cleanSlug;
    }

    // Rules: If Published, Closed, or Archived, questions shouldn't be updated carelessly.
    let finalVersion = current.version;
    if (current.status !== 'draft' && data.questions) {
      finalVersion = current.version + 1;
    }

    const updatedSurvey: SurveyEntity = {
      ...current,
      ...data,
      version: finalVersion,
      updatedAt: new Date().toISOString()
    } as SurveyEntity;

    await saveDocumentData(SURVEYS_COLLECTION, id, updatedSurvey, SURVEYS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'UPDATE',
      module: 'SURVEYS',
      targetId: id,
      targetName: updatedSurvey.title,
      description: `Memperbarui survei: "${updatedSurvey.title}" (Versi: ${finalVersion})`
    });

    return updatedSurvey;
  },

  async updateSurveyStatus(id: string, status: SurveyStatus, actor: { id: string; name: string; email: string }): Promise<SurveyEntity> {
    const list = await this.getSurveys();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Survei tidak ditemukan.');

    const current = list[idx];
    const updatedSurvey: SurveyEntity = {
      ...current,
      status,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(SURVEYS_COLLECTION, id, updatedSurvey, SURVEYS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'UPDATE',
      module: 'SURVEYS',
      targetId: id,
      targetName: current.title,
      description: `Mengubah status survei "${current.title}" menjadi "${status.toUpperCase()}"`
    });

    return updatedSurvey;
  },

  async deleteSurvey(id: string, actor: { id: string; name: string; email: string }): Promise<void> {
    const list = await this.getSurveys();
    const current = list.find(s => s.id === id);
    if (!current) return;

    await deleteDocumentData(SURVEYS_COLLECTION, id, SURVEYS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'DELETE',
      module: 'SURVEYS',
      targetId: id,
      targetName: current.title,
      description: `Menghapus kuesioner survei: "${current.title}"`
    });
  },

  // --- Public Methods ---
  async getActiveSurveys(): Promise<SurveyEntity[]> {
    const list = await this.getSurveys();
    const todayStr = new Date().toISOString().split('T')[0];

    return list.filter(s => {
      if (s.status !== 'published') return false;
      // Date bounds check
      if (s.startDate && s.startDate > todayStr) return false;
      if (s.endDate && s.endDate < todayStr) return false;
      return true;
    });
  },

  // Submit response
  async submitResponse(input: {
    surveyId: string;
    answers: SurveyAnswer[];
    saran?: string;
    isAnonymous: boolean;
    registrationCode?: string; // used for verification if linked to registration
  }): Promise<SurveyResponse> {
    // 1. Anti-spam
    if (!checkRateLimit()) {
      throw new Error('Anda telah melakukan submit survei berkali-kali dalam waktu singkat. Silakan tunggu beberapa menit.');
    }

    // 2. Fetch survey config
    const survey = await this.getSurveyById(input.surveyId);
    if (!survey) {
      throw new Error('Survei tidak ditemukan.');
    }

    // Status bounds check
    const todayStr = new Date().toISOString().split('T')[0];
    if (survey.status !== 'published' || (survey.startDate && survey.startDate > todayStr) || (survey.endDate && survey.endDate < todayStr)) {
      throw new Error('Maaf, survei ini tidak aktif atau sudah ditutup dan tidak menerima tanggapan baru.');
    }

    // 3. Registration binding check
    let registrationContext: any = null;
    const responses = await this.getResponses();

    if (survey.isLinkedToRegistration) {
      if (!input.registrationCode) {
        throw new Error('Kuesioner ini memerlukan kode pendaftaran pelayanan yang valid.');
      }
      
      // Verify registration
      const code = input.registrationCode.trim();
      const allRegs = await registrationService.getRegistrations();
      const matched = allRegs.find(r => r.registrationNumber === code);
      if (!matched) {
        throw new Error('Nomor kode pendaftaran Anda tidak valid atau tidak terdaftar.');
      }

      // Check if already responded to this survey
      const alreadyResponded = responses.some(r => r.surveyId === input.surveyId && r.registrationNumber === code);
      if (alreadyResponded) {
        throw new Error('Anda telah mengisi kuesioner survei kepuasan ini untuk kode pendaftaran tersebut.');
      }

      registrationContext = matched;
    }

    // 4. Validate Answers
    for (const q of survey.questions) {
      const ans = input.answers.find(a => a.questionId === q.id);
      if (q.required && (!ans || ans.answer === undefined || ans.answer === '')) {
        throw new Error(`Pertanyaan wajib: "${q.text}" harus dijawab.`);
      }

      if (ans) {
        if (q.type === 'rating') {
          const score = Number(ans.answer);
          if (isNaN(score) || score < 1 || score > 4) {
            throw new Error('Nilai rating harus berada pada rentang 1-4.');
          }
        } else if (q.type === 'multiple_choice') {
          if (q.options && !q.options.includes(String(ans.answer))) {
            throw new Error(`Jawaban tidak valid untuk pertanyaan "${q.text}".`);
          }
        } else if (q.type === 'text') {
          ans.answer = sanitizeText(String(ans.answer)).slice(0, 500);
        }
      }
    }

    // 5. Construct Response entity
    const cleanSaran = sanitizeText(input.saran).slice(0, 1000);
    const responseId = `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Resolve service contexts
    let serviceId = registrationContext?.serviceId || undefined;
    let serviceName = registrationContext?.serviceName || undefined;

    const newResponse: SurveyResponse = {
      id: responseId,
      surveyId: input.surveyId,
      surveyVersion: survey.version,
      serviceId,
      serviceName,
      registrationId: registrationContext?.id || undefined,
      registrationNumber: registrationContext?.registrationNumber || undefined,
      answers: input.answers,
      saran: cleanSaran || undefined,
      saranStatus: 'approved',
      isAnonymous: input.isAnonymous,
      createdAt: new Date().toISOString()
    };

    await saveDocumentData(RESPONSES_COLLECTION, newResponse.id, newResponse, RESPONSES_STORAGE_KEY);

    // 6. Actionable low rating alerting threshold: rating <= 2
    const lowRatings = input.answers.filter(ans => {
      const question = survey.questions.find(q => q.id === ans.questionId);
      return question && question.type === 'rating' && Number(ans.answer) <= 2;
    });

    if (lowRatings.length > 0) {
      try {
        const worstScore = Math.min(...lowRatings.map(lr => Number(lr.answer)));
        await notificationService.triggerEvent(
          'survey_low_rating',
          'usr-superadmin-01',
          {
            surveyTitle: survey.title,
            score: worstScore.toString(),
            saran: cleanSaran || '(Tidak ada saran terbuka)'
          },
          'none',
          survey.id,
          `/admin/survei?tab=results&id=${survey.id}`
        );
      } catch (err) {
        console.error('Failed to trigger low rating alarm notification:', err);
      }
    }

    return newResponse;
  },

  // --- Statistics & Results Dashboard ---
  async getResponses(filters?: {
    surveyId?: string;
    serviceId?: string;
    startDate?: string;
    endDate?: string;
    saranStatus?: 'approved' | 'hidden' | 'flagged' | 'archived';
  }): Promise<SurveyResponse[]> {
    let list = await getCollectionData<SurveyResponse>(RESPONSES_COLLECTION, RESPONSES_STORAGE_KEY, INITIAL_RESPONSES);

    if (!filters) {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filters.surveyId) {
      list = list.filter(r => r.surveyId === filters.surveyId);
    }

    if (filters.serviceId) {
      list = list.filter(r => r.serviceId === filters.serviceId);
    }

    if (filters.saranStatus) {
      list = list.filter(r => r.saranStatus === filters.saranStatus);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      list = list.filter(r => new Date(r.createdAt).getTime() >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
      list = list.filter(r => new Date(r.createdAt).getTime() <= end);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async updateSaranStatus(id: string, status: 'approved' | 'hidden' | 'flagged' | 'archived', actor: { id: string; name: string; email: string }): Promise<SurveyResponse> {
    const list = getStoredResponses();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Respons tidak ditemukan.');

    const current = list[idx];
    const updated = {
      ...current,
      saranStatus: status
    };

    list[idx] = updated;
    saveStoredResponses(list);

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'UPDATE',
      module: 'SURVEYS',
      targetId: id,
      targetName: 'Saran Moderation',
      description: `Mengubah status moderasi saran respon survei ${id} menjadi "${status.toUpperCase()}"`
    });

    return updated;
  },

  // Helper calculation for analytical summary
  calculateStats(survey: SurveyEntity, responses: SurveyResponse[]) {
    const surveyResponses = responses.filter(r => r.surveyId === survey.id);
    const totalRespondents = surveyResponses.length;

    if (totalRespondents === 0) {
      return {
        totalRespondents: 0,
        averageScore: 0,
        questionsStats: [],
        serviceBreakdown: {},
        scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 }
      };
    }

    // 1. Overall Score Distribution & Average for Rating Questions
    let ratingSum = 0;
    let ratingCount = 0;
    const scoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };

    // Detailed breakdown per question
    const questionsStats = survey.questions.map(q => {
      const qAnswers = surveyResponses
        .map(r => r.answers.find(ans => ans.questionId === q.id)?.answer)
        .filter(ans => ans !== undefined && ans !== '');

      if (q.type === 'rating') {
        const numericAnswers = qAnswers.map(Number).filter(n => !isNaN(n));
        const totalAnswers = numericAnswers.length;
        const sum = numericAnswers.reduce((acc, curr) => acc + curr, 0);
        const avg = totalAnswers > 0 ? sum / totalAnswers : 0;

        // Count distribution
        const qDist = { 1: 0, 2: 0, 3: 0, 4: 0 };
        numericAnswers.forEach(score => {
          if (score === 1) qDist[1]++;
          else if (score === 2) qDist[2]++;
          else if (score === 3) qDist[3]++;
          else if (score === 4) qDist[4]++;

          // Also add to overall
          if (score >= 1 && score <= 4) {
            scoreDistribution[score as 1 | 2 | 3 | 4]++;
            ratingSum += score;
            ratingCount++;
          }
        });

        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          average: Number(avg.toFixed(2)),
          total: totalAnswers,
          distribution: qDist
        };
      } else if (q.type === 'multiple_choice') {
        const mcDist: Record<string, number> = {};
        if (q.options) {
          q.options.forEach(opt => { mcDist[opt] = 0; });
        }
        qAnswers.forEach(ans => {
          const optStr = String(ans);
          mcDist[optStr] = (mcDist[optStr] || 0) + 1;
        });

        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          average: 0,
          total: qAnswers.length,
          distribution: mcDist
        };
      } else {
        // Text questions
        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          average: 0,
          total: qAnswers.length,
          distribution: {}
        };
      }
    });

    // Calculate Overall SKM / IKM Index (converted standard scaled 100 if ratingCount > 0)
    const overallAverage = ratingCount > 0 ? ratingSum / ratingCount : 0;

    // Service Breakdown Average Rating
    const serviceBreakdown: Record<string, { sum: number; count: number; average: number }> = {};
    surveyResponses.forEach(r => {
      if (!r.serviceName) return;
      const sName = r.serviceName;
      if (!serviceBreakdown[sName]) {
        serviceBreakdown[sName] = { sum: 0, count: 0, average: 0 };
      }

      // Sum all ratings for this response
      r.answers.forEach(ans => {
        const q = survey.questions.find(qu => qu.id === ans.questionId);
        if (q && q.type === 'rating') {
          const val = Number(ans.answer);
          if (!isNaN(val) && val >= 1 && val <= 4) {
            serviceBreakdown[sName].sum += val;
            serviceBreakdown[sName].count++;
          }
        }
      });
    });

    Object.keys(serviceBreakdown).forEach(key => {
      const item = serviceBreakdown[key];
      item.average = item.count > 0 ? Number((item.sum / item.count).toFixed(2)) : 0;
    });

    return {
      totalRespondents,
      averageScore: Number(overallAverage.toFixed(2)),
      questionsStats,
      serviceBreakdown,
      scoreDistribution
    };
  }
};
