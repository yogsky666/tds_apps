
export enum Role {
  SUPER_ADMIN = 'superadmin',
  ADMIN = 'admin',
  TDS = 'tds',
  GURU = 'guru',
  SISWA = 'siswa',
}

export enum Gender {
  MALE = 'laki-laki',
  FEMALE = 'perempuan',
}

export interface User {
  nama: string;
  username: string; // NIP/NIK/NIPD/NISN
  photo?: string;
  jenis_kelamin: Gender;
  role: Role;
}

export enum Tingkat {
  X = 'X',
  XI = 'XI',
  XII = 'XII',
}

export interface Kelas {
  id: number;
  kelas: string;
  tingkat: Tingkat;
  id_guru: string | null; // Corresponds to User['username'], can be null
}

export enum JenisSanksi {
  RINGAN = 'Ringan',
  SEDANG = 'Sedang',
  BERAT = 'Berat',
}

export interface Sanksi {
    id: number;
    desk_kesalahan: string;
    jenis_sanksi: JenisSanksi;
    point_pelanggar: number;
}

export enum JenisPerbaikan {
    MUDAH = 'Mudah',
    CUKUP = 'Cukup',
    SULIT = 'Sulit',
}

export interface Introspeksi {
    id: number;
    desk_perbaikan: string;
    jenis_perbaikan: JenisPerbaikan;
    point_perbaikan: number;
}

export interface Siswa {
  nipd: string; // FK to User['username']
  id_kelas: number | null; // FK to Kelas['id']
}

export interface Pelanggaran {
  id: number;
  nipd: string; // FK to Siswa['nipd']
  id_sanksi: number; // FK to Sanksi['id']
  tanggal: string; // ISO date string e.g., "2023-10-27"
}

export interface Bimbingan {
  id: number;
  nipd: string; // FK to Siswa['nipd']
  id_perbaikan: number; // FK to Introspeksi['id']
  tanggal: string; // ISO date string e.g., "2023-10-27"
}

export interface AppSettings {
  appName: string;
  appLogo: string | null; // Base64 string for the logo
  pointThresholds: {
    aman: number;
    perhatian: number;
  };
  kopSurat: {
    logo: string | null;
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    line6: string;
    line7: string;
    line8: string;
  };
  spSignatoryUsername: string | null;
}

export enum LogAction {
  TAMBAH = 'Tambah',
  UBAH = 'Ubah',
  HAPUS = 'Hapus',
  LOGIN = 'Login',
  LOGOUT = 'Logout',
  IMPORT = 'Import',
  EXPORT = 'Export',
}

export enum LogEntity {
  PENGGUNA = 'Pengguna',
  SISWA = 'Siswa',
  KELAS = 'Kelas',
  SANKSI = 'Sanksi',
  INTROSPEKSI = 'Introspeksi',
  BIMBINGAN = 'Bimbingan',
  PELANGGARAN = 'Pelanggaran',
  PROFIL = 'Profil',
  PENGATURAN = 'Pengaturan',
  AUTH = 'Autentikasi',
  LAPORAN = 'Laporan',
}

export interface Log {
  id: number;
  timestamp: string; // ISO string
  username: string;
  action: LogAction;
  entity: LogEntity;
  details: string;
}
