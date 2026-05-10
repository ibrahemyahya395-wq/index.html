import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileImage, CheckCircle2, Loader2, Download, X,
  ChevronRight, Search, FolderOpen, AlertCircle, Plus,
  Users, UserX, FileText, ChevronLeft, Trash2, ArrowRight, CloudUpload
} from 'lucide-react';
import JSZip from 'jszip';
import Markdown from 'react-markdown';
import { CATEGORIES, Category } from './constants';
import { classifyFile, generateGapAnalysis } from './services/classifier';
import { cn } from './lib/utils';

// Replace with your Google Apps Script Web App URL
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwozRUlCyolywyGKPz6JlPHoz-HEmGoPioTSk3Rmm4ye4cQ4ZMJwEOcgXkni1D0Y24uIw/exec";

interface FileState {
  id: string;
  file?: File;
  preview?: string;
  originalName: string;
  suggestedName?: string;
  tags?: { categoryId: number; subCategoryName: string }[];
  status: 'pending' | 'processing' | 'completed' | 'error' | 'uploaded';
  base64?: string;
}

interface SavedClassification {
  originalName: string;
  suggestedName: string;
  tags: { categoryId: number; subCategoryName: string }[];
}

interface Teacher {
  id: string;
  name: string;
  link: string;
  savedClassifications: SavedClassification[];
  analysisReport?: string;
}

type View = 'home' | 'add-teacher' | 'teacher-dashboard' | 'sort-evidences' | 'analyze-report';

export default function App() {
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem('smart-sorter-teachers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [view, setView] = useState<View>('home');
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);

  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherLink, setNewTeacherLink] = useState('');

  const [files, setFiles] = useState<FileState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [sortStep, setSortStep] = useState<'upload' | 'processing' | 'results'>('upload');

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    localStorage.setItem('smart-sorter-teachers', JSON.stringify(teachers));
  }, [teachers]);

  const activeTeacher = useMemo(() => teachers.find(t => t.id === activeTeacherId), [teachers, activeTeacherId]);

  const handleSaveTeacher = async () => {
    if (!newTeacherName.trim()) return;
    const newId = Math.random().toString(36).substring(7);

    // Create base folder in Google Drive for this teacher
    try {
      await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ folderName: newTeacherName, isBaseTeacherFolder: true }),
        headers: { "Content-Type": "text/plain;charset=utf-8" }
      });
    } catch (e) {
      console.warn("Could not create drive folder initially", e);
    }

    setTeachers(prev => [{
      id: newId,
      name: newTeacherName,
      link: newTeacherLink,
      savedClassifications: []
    }, ...prev]);
    setNewTeacherName('');
    setNewTeacherLink('');
    setActiveTeacherId(newId);
    setView('teacher-dashboard');
  };

  const handleDeleteTeacher = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا المعلم وجميع بياناته؟')) {
      setTeachers(prev => prev.filter(t => t.id !== id));
      if (activeTeacherId === id) {
        setView('home');
        setActiveTeacherId(null);
      }
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      originalName: file.name,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending' as const
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': ['.pdf'] },
    multiple: true
  } as any);

  const removeFile = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0 || !activeTeacher) return;
    setIsProcessing(true);
    setSortStep('processing');

    const updatedFiles = [...files];
    const newClassifications: SavedClassification[] = [];

    for (let i = 0; i < updatedFiles.length; i++) {
      const fileState = updatedFiles[i];
      if (fileState.status === 'completed' || !fileState.file) continue;

      try {
        updatedFiles[i] = { ...fileState, status: 'processing' };
        setFiles([...updatedFiles]);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(fileState.file!);
        });

        const base64 = await base64Promise;
        const result = await classifyFile(base64, fileState.file.type, fileState.file.name);

        updatedFiles[i] = {
          ...fileState,
          status: 'completed',
          tags: result.tags,
          suggestedName: result.suggestedName,
          base64: base64
        };
        setFiles([...updatedFiles]);

        newClassifications.push({
          originalName: fileState.originalName,
          suggestedName: result.suggestedName,
          tags: result.tags
        });
      } catch (error) {
        updatedFiles[i] = { ...fileState, status: 'error' };
        setFiles([...updatedFiles]);
      }
    }

    if (newClassifications.length > 0) {
      setTeachers(prev => prev.map(t =>
        t.id === activeTeacher.id
          ? { ...t, savedClassifications: [...t.savedClassifications, ...newClassifications] }
          : t
      ));
    }

    setIsProcessing(false);
    setSortStep('results');
  };

  const uploadToGoogleDrive = async () => {
    if (!activeTeacher) return;
    setIsUploadingToDrive(true);

    const filesToUpload = files.filter(f => f.status === 'completed' && f.base64);

    for (const f of filesToUpload) {
       const primaryTag = f.tags?.[0];
       let folderStructure = "غير_مصنف";

       if (primaryTag) {
          const category = CATEGORIES.find(c => c.id === primaryTag.categoryId);
          if (category) {
              folderStructure = `${category.folderName}/${primaryTag.subCategoryName}`;
          }
       }

       const extension = f.originalName.split('.').pop() || 'tmp';
       const fileName = `${f.suggestedName || 'ملف'}.${extension}`;

       try {
           await fetch(GOOGLE_APPS_SCRIPT_URL, {
               method: "POST",
               body: JSON.stringify({
                   teacherName: activeTeacher.name,
                   targetPath: folderStructure,
                   fileName: fileName,
                   fileData: f.base64,
                   mimeType: f.file?.type || "application/octet-stream",
                   isUploadFile: true
               }),
               headers: { "Content-Type": "text/plain;charset=utf-8" }
           });

           setFiles(prev => prev.map(fi => fi.id === f.id ? { ...fi, status: 'uploaded' } : fi));
       } catch (error) {
           console.error("Failed to upload file to drive", error);
       }
    }

    setIsUploadingToDrive(false);
    alert("تم رفع الشواهد إلى Google Drive بنجاح!");
  };

  const handleGenerateReport = async () => {
    if(!activeTeacher) return;
    setIsGeneratingReport(true);

    const contextStr = activeTeacher.savedClassifications.map(c =>
      `الملف "${c.suggestedName}" (أصلي: ${c.originalName}) -> فرز إلى: ${c.tags.map(t => `الفئة ${t.categoryId} - ${t.subCategoryName}`).join('، ')}`
    ).join('\n');

    const report = await generateGapAnalysis(activeTeacher.name, contextStr);

    setTeachers(prev => prev.map(t =>
      t.id === activeTeacher.id ? { ...t, analysisReport: report } : t
    ));
    setIsGeneratingReport(false);
  };

  const sortStats = useMemo(() => {
    return {
      total: files.length,
      completed: files.filter(f => f.status === 'completed' || f.status === 'uploaded').length,
      processing: files.filter(f => f.status === 'processing').length,
      pending: files.filter(f => f.status === 'pending').length,
      error: files.filter(f => f.status === 'error').length,
    };
  }, [files]);

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden select-none" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <FolderOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">الفارز الذكي</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <div
            onClick={() => setView('home')}
            className={cn(
              "px-4 py-3 rounded-xl flex items-center gap-3 font-medium cursor-pointer transition-colors",
              view === 'home' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Users className="w-5 h-5" />
            <span>قائمة المعلمين</span>
          </div>
          <div
            onClick={() => setView('add-teacher')}
            className={cn(
              "px-4 py-3 rounded-xl flex items-center gap-3 font-medium cursor-pointer transition-colors",
              view === 'add-teacher' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Plus className="w-5 h-5" />
            <span>إضافة معلم</span>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col h-full overflow-hidden">
            {view === 'home' && (
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">مرحباً بك في الفارز الذكي</h1>
                    <p className="text-slate-500 mt-2">إدارة سريعة لملفات وتقييمات المعلمين</p>
                  </div>
                  <button onClick={() => setView('add-teacher')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                    <Plus className="w-5 h-5" />
                    <span>إضافة معلم جديد</span>
                  </button>
                </div>

                {teachers.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <UserX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">لا يوجد معلمين مضافين</h3>
                    <p className="text-slate-400 mt-1">ابدأ بإضافة معلم جديد لإدارة وتنظيم شواهده</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teachers.map(teacher => (
                      <div key={teacher.id} onClick={() => { setActiveTeacherId(teacher.id); setView('teacher-dashboard'); }} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">{teacher.name.charAt(0)}</div>
                          <button onClick={(e) => handleDeleteTeacher(teacher.id, e)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{teacher.name}</h4>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-slate-500 flex items-center gap-1"><FileText className="w-4 h-4" />{teacher.savedClassifications.length} شواهد مدرجة</span>
                          <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'add-teacher' && (
              <div className="flex-1 p-8 overflow-y-auto w-full max-w-2xl mx-auto">
                <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-8 transition-colors"><ArrowRight className="w-4 h-4" />الرجوع</button>
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3"><div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Plus className="w-5 h-5" /></div>إضافة معلم جديد</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">اسم المعلم</label>
                      <input type="text" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="مثال: يوسف أحمد" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">رابط مشاركة المجلد (مثال: Drive)</label>
                      <input type="text" value={newTeacherLink} onChange={e => setNewTeacherLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button onClick={handleSaveTeacher} disabled={!newTeacherName.trim()} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">حفظ وإنشاء ملف</button>
                  </div>
                </div>
              </div>
            )}

            {view === 'teacher-dashboard' && (
              <div className="flex-1 p-8 overflow-y-auto">
                <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-8 transition-colors"><ArrowRight className="w-4 h-4" />الرجوع</button>
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">{activeTeacher?.name}</h1>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div onClick={() => { setSortStep('upload'); setFiles([]); setView('sort-evidences'); }} className="bg-white border text-center border-slate-200 rounded-3xl p-10 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Upload className="w-10 h-10" /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">فرز الشواهد</h3>
                  </div>
                  <div onClick={() => setView('analyze-report')} className="bg-white border text-center border-slate-200 rounded-3xl p-10 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><FileText className="w-10 h-10" /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">تحليل الملف</h3>
                  </div>
                </div>
              </div>
            )}

            {view === 'sort-evidences' && (
              <div className="flex-1 p-8 overflow-y-auto">
                <button onClick={() => setView('teacher-dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-8"><ArrowRight className="w-4 h-4" />عودة لملف المعلم</button>
                {sortStep === 'upload' && (
                  <div className="space-y-8 max-w-4xl mx-auto">
                    <div {...getRootProps()} className="border-2 border-dashed rounded-3xl p-16 cursor-pointer text-center bg-white hover:border-indigo-400">
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600"><Upload className="w-10 h-10" /></div>
                        <p className="text-xl font-semibold">اسحب وأفلت الملفات هنا</p>
                      </div>
                    </div>
                    {files.length > 0 && (
                      <div className="flex justify-center pt-8">
                        <button onClick={processFiles} className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-bold">بدء الفرز وإعادة التسمية</button>
                      </div>
                    )}
                  </div>
                )}

                {sortStep === 'processing' && (
                  <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
                    <Loader2 className="w-20 h-20 text-indigo-600 animate-spin mx-auto" />
                    <h2 className="text-2xl font-bold">جاري تحليل وفرز الشواهد...</h2>
                  </div>
                )}

                {sortStep === 'results' && (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200">
                      <h2 className="text-2xl font-bold flex items-center gap-3"><CheckCircle2 className="w-6 h-6 text-emerald-500"/> اكتمل الفرز!</h2>
                      <button
                         onClick={uploadToGoogleDrive}
                         disabled={isUploadingToDrive}
                         className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isUploadingToDrive ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                        رفع المجلدات لـ Google Drive
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'analyze-report' && (
              <div className="flex-1 p-8 overflow-y-auto">
                <button onClick={() => setView('teacher-dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-8"><ArrowRight className="w-4 h-4" />عودة لملف المعلم</button>
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white border rounded-3xl p-8 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">تقرير الفاعلية والنواقص: {activeTeacher?.name}</h2>
                    <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold">
                      {isGeneratingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : 'توليد التقرير'}
                    </button>
                  </div>
                  {activeTeacher?.analysisReport && (
                    <div className="bg-white border rounded-3xl p-10 prose prose-indigo max-w-none">
                      <Markdown>{activeTeacher.analysisReport}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
