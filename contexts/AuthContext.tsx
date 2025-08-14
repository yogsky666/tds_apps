import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User, Role, Gender, Kelas, Tingkat, Sanksi, JenisSanksi, Introspeksi, JenisPerbaikan, Siswa, Pelanggaran, Bimbingan, Log, LogAction, LogEntity } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  users: User[];
  kelas: Kelas[];
  sanksi: Sanksi[];
  introspeksi: Introspeksi[];
  siswa: Siswa[];
  pelanggaran: Pelanggaran[];
  bimbingan: Bimbingan[];
  logs: Log[];
  addLog: (action: LogAction, entity: LogEntity, details: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (username: string, currentPassword: string, newPassword: string) => Promise<void>;
  adminResetPassword: (username: string) => Promise<void>;
  addUser: (user: Omit<User, 'photo'> & { password?: string }) => Promise<void>;
  addUsers: (users: Omit<User, 'photo'>[]) => Promise<{ successCount: number; errors: string[] }>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (username: string) => Promise<void>;
  updateUserPhoto: (username: string, photo: string) => Promise<void>;
  addKelas: (kelas: Omit<Kelas, 'id'>) => Promise<void>;
  updateKelas: (kelas: Kelas) => Promise<void>;
  deleteKelas: (id: number) => Promise<void>;
  addSanksi: (sanksi: Omit<Sanksi, 'id'>) => Promise<void>;
  updateSanksi: (sanksi: Sanksi) => Promise<void>;
  deleteSanksi: (id: number) => Promise<void>;
  addIntrospeksi: (introspeksi: Omit<Introspeksi, 'id'>) => Promise<void>;
  updateIntrospeksi: (introspeksi: Introspeksi) => Promise<void>;
  deleteIntrospeksi: (id: number) => Promise<void>;
  addSiswa: (siswa: Siswa) => Promise<void>;
  updateSiswa: (siswa: Siswa) => Promise<void>;
  deleteSiswa: (nipd: string) => Promise<void>;
  assignSiswaToKelasBulk: (assignments: { nipd: string, id_kelas: number }[]) => Promise<{ successCount: number; errors: string[] }>;
  addPelanggaran: (pelanggaran: Omit<Pelanggaran, 'id'>) => Promise<void>;
  updatePelanggaran: (pelanggaran: Pelanggaran) => Promise<void>;
  deletePelanggaran: (id: number) => Promise<void>;
  addBimbingan: (bimbingan: Omit<Bimbingan, 'id'>) => Promise<void>;
  updateBimbingan: (bimbingan: Bimbingan) => Promise<void>;
  deleteBimbingan: (id: number) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

const MOCK_USERS_DATA: User[] = [
  // Super Admin (1)
  { nama: 'Super Admin', username: 'superadmin', jenis_kelamin: Gender.MALE, role: Role.SUPER_ADMIN },

  // Admins (3)
  { nama: 'Admin Utama', username: 'admin', photo: 'https://i.pravatar.cc/150?u=admin', jenis_kelamin: Gender.FEMALE, role: Role.ADMIN },
  { nama: 'Admin Cadangan', username: 'admin02', jenis_kelamin: Gender.MALE, role: Role.ADMIN }, // No photo
  { nama: 'Admin Sistem', username: 'admin03', photo: 'https://i.pravatar.cc/150?u=admin03', jenis_kelamin: Gender.FEMALE, role: Role.ADMIN },

  // TDS User (1)
  { nama: 'Tim Disiplin Siswa', username: 'tds', jenis_kelamin: Gender.MALE, role: Role.TDS },

  // Gurus (8)
  { nama: 'Dr. John Doe', username: '199001012020121001', photo: 'https://i.pravatar.cc/150?u=199001012020121001', jenis_kelamin: Gender.MALE, role: Role.GURU },
  { nama: 'Siti Aminah, S.Pd.', username: '198505102015032002', photo: 'https://i.pravatar.cc/150?u=198505102015032002', jenis_kelamin: Gender.FEMALE, role: Role.GURU },
  { nama: 'Budi Hartono, M.Kom.', username: '199208152018011003', jenis_kelamin: Gender.MALE, role: Role.GURU }, // No photo
  { nama: 'Dewi Lestari, S.S.', username: '198811202017062004', photo: 'https://i.pravatar.cc/150?u=198811202017062004', jenis_kelamin: Gender.FEMALE, role: Role.GURU },
  { nama: 'Agus Santoso, S.T.', username: '199503252019021005', photo: 'https://i.pravatar.cc/150?u=199503252019021005', jenis_kelamin: Gender.MALE, role: Role.GURU },
  { nama: 'Rina Marlina, M.Pd.', username: '198007122010102006', jenis_kelamin: Gender.FEMALE, role: Role.GURU }, // No photo
  { nama: 'Eko Prasetyo, S.Kom.', username: '199309012021011007', photo: 'https://i.pravatar.cc/150?u=199309012021011007', jenis_kelamin: Gender.MALE, role: Role.GURU },
  { nama: 'Fitri Handayani, S.Psi.', username: '198704182016052008', jenis_kelamin: Gender.FEMALE, role: Role.GURU }, // No photo
  
  // Siswa (20)
  { nama: 'Jane Smith', username: '0012345678', photo: 'https://i.pravatar.cc/150?u=0012345678', jenis_kelamin: Gender.FEMALE, role: Role.SISWA },
  { nama: 'Ahmad Faisal', username: '0023456789', photo: 'https://i.pravatar.cc/150?u=0023456789', jenis_kelamin: Gender.MALE, role: Role.SISWA },
  { nama: 'Citra Kirana', username: '0034567890', jenis_kelamin: Gender.FEMALE, role: Role.SISWA }, // No photo
  { nama: 'Doni Saputra', username: '0045678901', photo: 'https://i.pravatar.cc/150?u=0045678901', jenis_kelamin: Gender.MALE, role: Role.SISWA },
  { nama: 'Eka Putri', username: '0056789012', jenis_kelamin: Gender.FEMALE, role: Role.SISWA }, // No photo
  { nama: 'Fajar Nugraha', username: '0067890123', photo: 'https://i.pravatar.cc/150?u=0067890123', jenis_kelamin: Gender.MALE, role: Role.SISWA },
  { nama: 'Gita Amelia', username: '0078901234', photo: 'https://i.pravatar.cc/150?u=0078901234', jenis_kelamin: Gender.FEMALE, role: Role.SISWA },
  { nama: 'Hendra Wijaya', username: '0089012345', jenis_kelamin: Gender.MALE, role: Role.SISWA }, // No photo
  { nama: 'Indah Permata', username: '0090123456', photo: 'https://i.pravatar.cc/150?u=0090123456', jenis_kelamin: Gender.FEMALE, role: Role.SISWA },
  { nama: 'Joko Susilo', username: '0090123457', photo: 'https://i.pravatar.cc/150?u=0090123457', jenis_kelamin: Gender.MALE, role: Role.SISWA },
  { nama: 'Kartika Sari', username: '0090123458', jenis_kelamin: Gender.FEMALE, role: Role.SISWA }, // No photo
  { nama: 'Leo Wijaya', username: '0090123459', photo: 'https://i.pravatar.cc/150?u=0090123459', jenis_kelamin: Gender.MALE, role: Role.SISWA },
  { nama: 'Maya Dewi', username: '0090123460', photo: 'https://i.pravatar.cc/150?u=0090123460', jenis_kelamin: Gender.FEMALE, role: Role.SISWA },
  { nama: 'Naufal Zaki', username: '0090123461', jenis_kelamin: Gender.MALE, role: Role.SISWA }, // No photo
  { nama: 'Olivia Putri', username: '0090123462', photo: 'https://i.pravatar.cc/150?u=0090123462', jenis_kelamin: Gender.FEMALE, role: Role.SISWA },
  { nama: 'Putra Perkasa', username: '0090123463', photo: 'https://i.pravatar.cc/150?u=0090123463', jenis_kelamin: Gender.MALE, role: Role.SISWA },
  { nama: 'Qonita Aulia', username: '0090123464', jenis_kelamin: Gender.FEMALE, role: Role.SISWA }, // No photo
  { nama: 'Rizky Ananda', username: '0090123465', photo: 'https://i.pravatar.cc/150?u=0090123465', jenis_kelamin: Gender.MALE, role: Role.SISWA },
  { nama: 'Siska Amelia', username: '0090123466', photo: 'https://i.pravatar.cc/150?u=0090123466', jenis_kelamin: Gender.FEMALE, role: Role.SISWA },
  { nama: 'Taufik Hidayat', username: '0090123467', jenis_kelamin: Gender.MALE, role: Role.SISWA }, // No photo
];

const MOCK_KELAS_DATA: Kelas[] = [
    { id: 1, kelas: 'X IPA 1', tingkat: Tingkat.X, id_guru: '199001012020121001' },
    { id: 2, kelas: 'X IPA 2', tingkat: Tingkat.X, id_guru: '198505102015032002' },
    { id: 3, kelas: 'X IPS 1', tingkat: Tingkat.X, id_guru: null },
    { id: 4, kelas: 'XI IPA 1', tingkat: Tingkat.XI, id_guru: '199208152018011003' },
    { id: 5, kelas: 'XI IPS 1', tingkat: Tingkat.XI, id_guru: '198811202017062004' },
    { id: 6, kelas: 'XII IPA 1', tingkat: Tingkat.XII, id_guru: '199503252019021005' },
    { id: 7, kelas: 'XII IPA 2', tingkat: Tingkat.XII, id_guru: null },
    { id: 8, kelas: 'XII IPS 1', tingkat: Tingkat.XII, id_guru: '198007122010102006' },
];

const MOCK_SISWA_DATA: Siswa[] = MOCK_USERS_DATA
    .filter(u => u.role === Role.SISWA)
    .slice(0, 15) // Leave some students unassigned
    .map((s, index) => ({
        nipd: s.username,
        id_kelas: MOCK_KELAS_DATA[index % MOCK_KELAS_DATA.length].id, // Assign students to classes in a round-robin fashion
    }));


const MOCK_SANKSI_DATA: Sanksi[] = [
    { id: 1, desk_kesalahan: 'Terlambat masuk sekolah', jenis_sanksi: JenisSanksi.RINGAN, point_pelanggar: 5 },
    { id: 2, desk_kesalahan: 'Tidak mengerjakan PR', jenis_sanksi: JenisSanksi.RINGAN, point_pelanggar: 10 },
    { id: 3, desk_kesalahan: 'Memakai seragam tidak lengkap', jenis_sanksi: JenisSanksi.RINGAN, point_pelanggar: 5 },
    { id: 4, desk_kesalahan: 'Membolos saat jam pelajaran', jenis_sanksi: JenisSanksi.SEDANG, point_pelanggar: 25 },
    { id: 5, desk_kesalahan: 'Merokok di area sekolah', jenis_sanksi: JenisSanksi.BERAT, point_pelanggar: 75 },
    { id: 6, desk_kesalahan: 'Tidak mengikuti upacara bendera', jenis_sanksi: JenisSanksi.SEDANG, point_pelanggar: 15 },
    { id: 7, desk_kesalahan: 'Berkelahi dengan siswa lain', jenis_sanksi: JenisSanksi.BERAT, point_pelanggar: 100 },
    { id: 8, desk_kesalahan: 'Mencoret-coret fasilitas sekolah', jenis_sanksi: JenisSanksi.SEDANG, point_pelanggar: 30 },
];

const MOCK_INTROSPEKSI_DATA: Introspeksi[] = [
    { id: 1, desk_perbaikan: 'Membersihkan papan tulis setelah digunakan', jenis_perbaikan: JenisPerbaikan.MUDAH, point_perbaikan: 5 },
    { id: 2, desk_perbaikan: 'Membantu guru membawa buku ke ruang guru', jenis_perbaikan: JenisPerbaikan.MUDAH, point_perbaikan: 10 },
    { id: 3, desk_perbaikan: 'Menjadi petugas upacara', jenis_perbaikan: JenisPerbaikan.CUKUP, point_perbaikan: 20 },
    { id: 4, desk_perbaikan: 'Mengikuti lomba antar sekolah', jenis_perbaikan: JenisPerbaikan.SULIT, point_perbaikan: 50 },
    { id: 5, desk_perbaikan: 'Membuat rangkuman materi pelajaran', jenis_perbaikan: JenisPerbaikan.CUKUP, point_perbaikan: 15 },
    { id: 6, desk_perbaikan: 'Menjuarai kompetisi tingkat nasional', jenis_perbaikan: JenisPerbaikan.SULIT, point_perbaikan: 100 },
    { id: 7, desk_perbaikan: 'Merawat tanaman di taman sekolah', jenis_perbaikan: JenisPerbaikan.MUDAH, point_perbaikan: 5 },
];

const MOCK_PELANGGARAN_DATA: Pelanggaran[] = Array.from({ length: 40 }, (_, index) => {
    const siswaList = MOCK_SISWA_DATA;
    const sanksiList = MOCK_SANKSI_DATA;

    const randomSiswa = siswaList[Math.floor(Math.random() * siswaList.length)];
    const randomSanksi = sanksiList[Math.floor(Math.random() * sanksiList.length)];
    
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 180)); // Random date in the last 6 months

    return {
        id: index + 1,
        nipd: randomSiswa.nipd,
        id_sanksi: randomSanksi.id,
        tanggal: date.toISOString().split('T')[0], // Format YYYY-MM-DD
    };
});

const MOCK_BIMBINGAN_DATA: Bimbingan[] = Array.from({ length: 25 }, (_, index) => {
    const siswaList = MOCK_SISWA_DATA;
    const perbaikanList = MOCK_INTROSPEKSI_DATA;

    const randomSiswa = siswaList[Math.floor(Math.random() * siswaList.length)];
    const randomPerbaikan = perbaikanList[Math.floor(Math.random() * perbaikanList.length)];
    
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 180));

    return {
        id: index + 1,
        nipd: randomSiswa.nipd,
        id_perbaikan: randomPerbaikan.id,
        tanggal: date.toISOString().split('T')[0],
    };
});


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>(MOCK_USERS_DATA);
  const [kelas, setKelas] = useState<Kelas[]>(MOCK_KELAS_DATA);
  const [sanksi, setSanksi] = useState<Sanksi[]>(MOCK_SANKSI_DATA);
  const [introspeksi, setIntrospeksi] = useState<Introspeksi[]>(MOCK_INTROSPEKSI_DATA);
  const [siswa, setSiswa] = useState<Siswa[]>(MOCK_SISWA_DATA);
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>(MOCK_PELANGGARAN_DATA);
  const [bimbingan, setBimbingan] = useState<Bimbingan[]>(MOCK_BIMBINGAN_DATA);
  const [logs, setLogs] = useState<Log[]>([]);

  const addLog = useCallback((action: LogAction, entity: LogEntity, details: string) => {
    // This function relies on the `user` state. However, `user` might not be set yet during login,
    // or it might be cleared during logout before this is called. So we get it from localStorage as a fallback.
    const currentUser = user || JSON.parse(localStorage.getItem('user') || 'null');
    
    if (currentUser) {
        setLogs(prev => {
            const newLog: Log = {
                id: prev.length + 1,
                timestamp: new Date().toISOString(),
                username: currentUser.username,
                action,
                entity,
                details
            };
            return [newLog, ...prev]; // Prepend new log to the beginning
        });
    }
  }, [user]);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        setUsers(prevUsers => {
            const index = prevUsers.findIndex(u => u.username === parsedUser.username);
            if (index !== -1) {
                const newUsers = [...prevUsers];
                newUsers[index] = parsedUser;
                return newUsers;
            }
            return prevUsers;
        });
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    setLoading(true);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const foundUser = users.find(u => u.username === username);
        if (foundUser && password === 'password') {
          if (foundUser.role === Role.SUPER_ADMIN || foundUser.role === Role.ADMIN || foundUser.role === Role.TDS || foundUser.role === Role.GURU || foundUser.role === Role.SISWA) {
            setUser(foundUser);
            localStorage.setItem('user', JSON.stringify(foundUser));
            addLog(LogAction.LOGIN, LogEntity.AUTH, `Pengguna ${foundUser.nama} berhasil login.`);
            resolve();
          } else {
            reject(new Error('Anda tidak memiliki hak akses untuk masuk ke dashboard.'));
          }
        } else {
          reject(new Error('Invalid username or password. (Hint: use password "password")'));
        }
        setLoading(false);
      }, 1000);
    });
  }, [users, addLog]);

  const logout = useCallback(() => {
    if (user) {
        addLog(LogAction.LOGOUT, LogEntity.AUTH, `Pengguna ${user.nama} berhasil logout.`);
    }
    setUser(null);
    localStorage.removeItem('user');
  }, [user, addLog]);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    setLoading(true);
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`Password reset request for ${email}`);
            setLoading(false);
            resolve();
        }, 1000);
    });
  }, []);
  
  const changePassword = useCallback(async (username: string, currentPassword: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (currentPassword === 'password') {
                addLog(LogAction.UBAH, LogEntity.PROFIL, `Pengguna ${username} mengubah kata sandi.`);
                resolve();
            } else {
                reject(new Error('Kata sandi saat ini salah.'));
            }
        }, 500);
    });
  }, [addLog]);

  const adminResetPassword = useCallback(async (username: string): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const userToReset = users.find(u => u.username === username);
            if (userToReset) {
                addLog(LogAction.UBAH, LogEntity.PENGGUNA, `Mereset kata sandi untuk pengguna: ${userToReset.nama} (${username})`);
            }
            // In a real app, you would update the password here.
            // Since it's a mock, we just resolve.
            resolve();
        }, 500);
    });
  }, [users, addLog]);

  const addUser = useCallback(async (newUser: Omit<User, 'photo'>): Promise<void> => {
      if (users.some(u => u.username === newUser.username)) {
          throw new Error('Username already exists.');
      }
      addLog(LogAction.TAMBAH, LogEntity.PENGGUNA, `Menambahkan pengguna baru: ${newUser.nama} (${newUser.username})`);
      setUsers(prev => [...prev, newUser]);
  }, [users, addLog]);
  
  const addUsers = useCallback(async (newUsers: Omit<User, 'photo'>[]): Promise<{ successCount: number, errors: string[] }> => {
    const errors: string[] = [];
    const validNewUsers: User[] = [];
    const existingUsernames = new Set(users.map(u => u.username));
    const batchUsernames = new Set<string>();

    for (const newUser of newUsers) {
        if (!newUser.username || !newUser.nama || !newUser.role || !newUser.jenis_kelamin) {
            errors.push(`Data tidak lengkap untuk: ${newUser.nama || 'Tanpa Nama'} (Username: ${newUser.username || 'Tanpa Username'})`);
            continue;
        }

        if (existingUsernames.has(newUser.username) || batchUsernames.has(newUser.username)) {
            errors.push(`Username sudah ada: ${newUser.username}`);
            continue;
        }

        batchUsernames.add(newUser.username);
        validNewUsers.push(newUser);
    }
    
    if (validNewUsers.length > 0) {
        addLog(LogAction.IMPORT, LogEntity.PENGGUNA, `Mengimpor ${validNewUsers.length} pengguna baru.`);
        setUsers(prev => [...prev, ...validNewUsers]);
    }

    return { successCount: validNewUsers.length, errors };
  }, [users, addLog]);

  const updateUser = useCallback(async (updatedUser: User): Promise<void> => {
      addLog(LogAction.UBAH, LogEntity.PENGGUNA, `Memperbarui pengguna: ${updatedUser.nama} (${updatedUser.username})`);
      setUsers(prev => prev.map(u => u.username === updatedUser.username ? updatedUser : u));
      if (user?.username === updatedUser.username) {
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
      }
  }, [user, addLog]);

  const deleteUser = useCallback(async (username: string): Promise<void> => {
      const userToDelete = users.find(u => u.username === username);
      if(userToDelete) addLog(LogAction.HAPUS, LogEntity.PENGGUNA, `Menghapus pengguna: ${userToDelete.nama} (${userToDelete.username})`);

      setUsers(prev => prev.filter(u => u.username !== username));
      // Also delete from related tables
      setSiswa(prev => prev.filter(s => s.nipd !== username));
      setPelanggaran(prev => prev.filter(p => p.nipd !== username));
      setBimbingan(prev => prev.filter(b => b.nipd !== username));
  }, [users, addLog]);

  const updateUserPhoto = useCallback(async (username: string, photo: string): Promise<void> => {
    addLog(LogAction.UBAH, LogEntity.PROFIL, `Memperbarui foto profil untuk ${username}.`);
    setUsers(prev => prev.map(u => u.username === username ? { ...u, photo } : u));
    if (user?.username === username) {
        const updatedUser = { ...user, photo };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  }, [user, addLog]);
  
  const addKelas = useCallback(async (newKelas: Omit<Kelas, 'id'>): Promise<void> => {
    addLog(LogAction.TAMBAH, LogEntity.KELAS, `Menambahkan kelas baru: ${newKelas.kelas}`);
    setKelas(prev => {
        const newId = prev.length > 0 ? Math.max(...prev.map(k => k.id)) + 1 : 1;
        return [...prev, { ...newKelas, id: newId }];
    });
  }, [addLog]);

  const updateKelas = useCallback(async (updatedKelas: Kelas): Promise<void> => {
    addLog(LogAction.UBAH, LogEntity.KELAS, `Memperbarui kelas: ${updatedKelas.kelas}`);
    setKelas(prev => prev.map(k => k.id === updatedKelas.id ? updatedKelas : k));
  }, [addLog]);

  const deleteKelas = useCallback(async (id: number): Promise<void> => {
    const k = kelas.find(k => k.id === id);
    if(k) addLog(LogAction.HAPUS, LogEntity.KELAS, `Menghapus kelas: ${k.kelas}`);

    setKelas(prev => prev.filter(k => k.id !== id));
    // Also unassign students from the deleted class
    setSiswa(prev => prev.map(s => s.id_kelas === id ? { ...s, id_kelas: null } : s));
  }, [kelas, addLog]);

  const addSanksi = useCallback(async (newSanksi: Omit<Sanksi, 'id'>): Promise<void> => {
    addLog(LogAction.TAMBAH, LogEntity.SANKSI, `Menambahkan sanksi baru: "${newSanksi.desk_kesalahan}"`);
    setSanksi(prev => {
        const newId = prev.length > 0 ? Math.max(...prev.map(s => s.id)) + 1 : 1;
        return [...prev, { ...newSanksi, id: newId }];
    });
  }, [addLog]);

  const updateSanksi = useCallback(async (updatedSanksi: Sanksi): Promise<void> => {
    addLog(LogAction.UBAH, LogEntity.SANKSI, `Memperbarui sanksi: "${updatedSanksi.desk_kesalahan}"`);
    setSanksi(prev => prev.map(s => s.id === updatedSanksi.id ? updatedSanksi : s));
  }, [addLog]);

  const deleteSanksi = useCallback(async (id: number): Promise<void> => {
    const s = sanksi.find(s => s.id === id);
    if(s) addLog(LogAction.HAPUS, LogEntity.SANKSI, `Menghapus sanksi: "${s.desk_kesalahan}"`);

    setSanksi(prev => prev.filter(s => s.id !== id));
    // Also remove reference from any existing violations
    setPelanggaran(prev => prev.filter(p => p.id_sanksi !== id));
  }, [sanksi, addLog]);

  const addIntrospeksi = useCallback(async (newIntrospeksi: Omit<Introspeksi, 'id'>): Promise<void> => {
    addLog(LogAction.TAMBAH, LogEntity.INTROSPEKSI, `Menambahkan introspeksi baru: "${newIntrospeksi.desk_perbaikan}"`);
    setIntrospeksi(prev => {
        const newId = prev.length > 0 ? Math.max(...prev.map(i => i.id)) + 1 : 1;
        return [...prev, { ...newIntrospeksi, id: newId }];
    });
  }, [addLog]);

  const updateIntrospeksi = useCallback(async (updatedIntrospeksi: Introspeksi): Promise<void> => {
    addLog(LogAction.UBAH, LogEntity.INTROSPEKSI, `Memperbarui introspeksi: "${updatedIntrospeksi.desk_perbaikan}"`);
    setIntrospeksi(prev => prev.map(i => i.id === updatedIntrospeksi.id ? updatedIntrospeksi : i));
  }, [addLog]);

  const deleteIntrospeksi = useCallback(async (id: number): Promise<void> => {
    const i = introspeksi.find(i => i.id === id);
    if(i) addLog(LogAction.HAPUS, LogEntity.INTROSPEKSI, `Menghapus introspeksi: "${i.desk_perbaikan}"`);

    setIntrospeksi(prev => prev.filter(i => i.id !== id));
    // Also remove reference from any existing bimbingan
    setBimbingan(prev => prev.filter(b => b.id_perbaikan !== id));
  }, [introspeksi, addLog]);

  const addSiswa = useCallback(async (newSiswa: Siswa): Promise<void> => {
    if (siswa.some(s => s.nipd === newSiswa.nipd)) {
      throw new Error('Siswa ini sudah terdaftar di sebuah kelas.');
    }
    const student = users.find(u => u.username === newSiswa.nipd);
    addLog(LogAction.TAMBAH, LogEntity.SISWA, `Menambahkan relasi siswa-kelas untuk: ${student?.nama || newSiswa.nipd}`);
    setSiswa(prev => [...prev, newSiswa]);
  }, [siswa, users, addLog]);

  const updateSiswa = useCallback(async (updatedSiswa: Siswa): Promise<void> => {
    const student = users.find(u => u.username === updatedSiswa.nipd);
    addLog(LogAction.UBAH, LogEntity.SISWA, `Memperbarui relasi siswa-kelas untuk: ${student?.nama || updatedSiswa.nipd}`);
    setSiswa(prev => prev.map(s => s.nipd === updatedSiswa.nipd ? updatedSiswa : s));
  }, [users, addLog]);

  const deleteSiswa = useCallback(async (nipd: string): Promise<void> => {
      const student = users.find(u => u.username === nipd);
      addLog(LogAction.HAPUS, LogEntity.SISWA, `Menghapus relasi siswa-kelas untuk: ${student?.nama || nipd}`);
      setSiswa(prev => prev.filter(s => s.nipd !== nipd));
  }, [users, addLog]);
  
  const assignSiswaToKelasBulk = useCallback(async (assignments: { nipd: string, id_kelas: number }[]): Promise<{ successCount: number, errors: string[] }> => {
    addLog(LogAction.IMPORT, LogEntity.SISWA, `Mengimpor ${assignments.length} penugasan kelas siswa.`);
    setSiswa(prevSiswa => {
        const newSiswaState = [...prevSiswa];
        const siswaMap = new Map(newSiswaState.map((s, index) => [s.nipd, { ...s, index }]));

        for (const assignment of assignments) {
            const existing = siswaMap.get(assignment.nipd);
            if (existing) {
                // Update existing record
                newSiswaState[existing.index] = { ...existing, id_kelas: assignment.id_kelas };
            } else {
                // Add new record for a student who wasn't in the Siswa table
                newSiswaState.push({ nipd: assignment.nipd, id_kelas: assignment.id_kelas });
            }
        }
        return newSiswaState;
    });

    return { successCount: assignments.length, errors: [] };
  }, [addLog]);

  const addPelanggaran = useCallback(async (newPelanggaran: Omit<Pelanggaran, 'id'>): Promise<void> => {
    const student = users.find(u => u.username === newPelanggaran.nipd);
    addLog(LogAction.TAMBAH, LogEntity.PELANGGARAN, `Menambahkan pelanggaran untuk: ${student?.nama || newPelanggaran.nipd}`);
    setPelanggaran(prev => {
        const newId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
        return [...prev, { ...newPelanggaran, id: newId }];
    });
  }, [users, addLog]);

  const updatePelanggaran = useCallback(async (updatedPelanggaran: Pelanggaran): Promise<void> => {
      const student = users.find(u => u.username === updatedPelanggaran.nipd);
      addLog(LogAction.UBAH, LogEntity.PELANGGARAN, `Memperbarui pelanggaran untuk: ${student?.nama || updatedPelanggaran.nipd}`);
      setPelanggaran(prev => prev.map(p => p.id === updatedPelanggaran.id ? updatedPelanggaran : p));
  }, [users, addLog]);

  const deletePelanggaran = useCallback(async (id: number): Promise<void> => {
      const p = pelanggaran.find(p => p.id === id);
      if(p) {
        const student = users.find(u => u.username === p.nipd);
        addLog(LogAction.HAPUS, LogEntity.PELANGGARAN, `Menghapus pelanggaran untuk: ${student?.nama || p.nipd}`);
      }
      setPelanggaran(prev => prev.filter(p => p.id !== id));
  }, [pelanggaran, users, addLog]);

  const addBimbingan = useCallback(async (newBimbingan: Omit<Bimbingan, 'id'>): Promise<void> => {
    const student = users.find(u => u.username === newBimbingan.nipd);
    addLog(LogAction.TAMBAH, LogEntity.BIMBINGAN, `Menambahkan bimbingan untuk: ${student?.nama || newBimbingan.nipd}`);
    setBimbingan(prev => {
        const newId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
        return [...prev, { ...newBimbingan, id: newId }];
    });
  }, [users, addLog]);

  const updateBimbingan = useCallback(async (updatedBimbingan: Bimbingan): Promise<void> => {
      const student = users.find(u => u.username === updatedBimbingan.nipd);
      addLog(LogAction.UBAH, LogEntity.BIMBINGAN, `Memperbarui bimbingan untuk: ${student?.nama || updatedBimbingan.nipd}`);
      setBimbingan(prev => prev.map(p => p.id === updatedBimbingan.id ? updatedBimbingan : p));
  }, [users, addLog]);

  const deleteBimbingan = useCallback(async (id: number): Promise<void> => {
      const b = bimbingan.find(b => b.id === id);
      if(b) {
        const student = users.find(u => u.username === b.nipd);
        addLog(LogAction.HAPUS, LogEntity.BIMBINGAN, `Menghapus bimbingan untuk: ${student?.nama || b.nipd}`);
      }
      setBimbingan(prev => prev.filter(p => p.id !== id));
  }, [bimbingan, users, addLog]);

  const value = useMemo(() => ({
    user,
    loading,
    users,
    kelas,
    sanksi,
    introspeksi,
    siswa,
    pelanggaran,
    bimbingan,
    logs,
    addLog,
    login,
    logout,
    resetPassword,
    changePassword,
    adminResetPassword,
    addUser,
    addUsers,
    updateUser,
    deleteUser,
    updateUserPhoto,
    addKelas,
    updateKelas,
    deleteKelas,
    addSanksi,
    updateSanksi,
    deleteSanksi,
    addIntrospeksi,
    updateIntrospeksi,
    deleteIntrospeksi,
    addSiswa,
    updateSiswa,
    deleteSiswa,
    assignSiswaToKelasBulk,
    addPelanggaran,
    updatePelanggaran,
    deletePelanggaran,
    addBimbingan,
    updateBimbingan,
    deleteBimbingan,
  }), [user, loading, users, kelas, sanksi, introspeksi, siswa, pelanggaran, bimbingan, logs, addLog, login, logout, resetPassword, changePassword, adminResetPassword, addUser, addUsers, updateUser, deleteUser, updateUserPhoto, addKelas, updateKelas, deleteKelas, addSanksi, updateSanksi, deleteSanksi, addIntrospeksi, updateIntrospeksi, deleteIntrospeksi, addSiswa, updateSiswa, deleteSiswa, assignSiswaToKelasBulk, addPelanggaran, updatePelanggaran, deletePelanggaran, addBimbingan, updateBimbingan, deleteBimbingan]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};