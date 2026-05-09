import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileImage, CheckCircle2, Loader2, Download, CloudUpload, X,
  ChevronRight, Search, FolderOpen, AlertCircle, Plus,
  Users, UserX, FileText, ChevronLeft, Trash2, ArrowRight
} from 'lucide-react';
import JSZip from 'jszip';
import Markdown from 'react-markdown';
import { CATEGORIES, Category } from './constants';
import { classifyFile, generateGapAnalysis } from './services/classifier';

import { cn } from './lib/utils';
// Interfaces
interface FileState {
  id: string;
  file?: File;
  preview?: string;
  originalName: string;
  suggestedName?: string;
  tags?: { categoryId: number; subCategoryName: string }[];
  status: 'pending' | 'processing' | 'completed' | 'error';
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

  // Global State
  const [appsScriptUrl, setAppsScriptUrl] = useState(() => localStorage.getItem('appsScriptUrl') || '');
  const [teachers, setTeachers] = useState<Teacher[]>(() => {

    try {
      const saved = localStorage.getItem('smart-sorter-teachers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [view, setView] = useState<View>('home');
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);

  // Form State
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherLink, setNewTeacherLink] = useState('');

  // Sort State
  const [files, setFiles] = useState<FileState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortStep, setSortStep] = useState<'upload' | 'processing' | 'results'>('upload');

  // Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Upload to Drive State
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);



  useEffect(() => {
    localStorage.setItem('smart-sorter-teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('appsScriptUrl', appsScriptUrl);
  }, [appsScriptUrl]);


  const activeTeacher = useMemo(() => teachers.find(t => t.id === activeTeacherId), [teachers, activeTeacherId]);

  // Save Teacher
  const handleSaveTeacher = () => {
    if (!newTeacherName.trim()) return;
    const newId = Math.random().toString(36).substring(7);
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

  // Drag and drop setup
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

  // Processing logic
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
          suggestedName: result.suggestedName
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


  const extractFolderId = (link: string) => {
    const match = link.match(/folders\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const uploadToDrive = async () => {
    if (!appsScriptUrl) {
      alert("يرجى إدخال رابط Apps Script في القائمة الجانبية أولاً");
      return;
    }
    if (!activeTeacher?.link) {
      alert("لم يتم تحديد رابط مجلد درايف لهذا المعلم");
      return;
    }

    const folderId = extractFolderId(activeTeacher.link);
    if (!folderId) {
      alert("رابط المجلد غير صالح. يرجى التأكد من أنه رابط مجلد جوجل درايف.");
      return;
    }

    const filesToUpload = [];
    CATEGORIES.forEach(category => {
      const categoryFiles = files.filter(f => f.tags?.some(tag => tag.categoryId === category.id));
      if (categoryFiles.length > 0) {
        categoryFiles.forEach(f => {
          const relevantTags = f.tags?.filter(tag => tag.categoryId === category.id) || [];
          relevantTags.forEach(tag => {
            const subName = tag.subCategoryName || "عام";
            if (f.file && f.status === 'completed') {
               filesToUpload.push({
                   file: f.file,
                   suggestedName: f.suggestedName || 'ملف',
                   categoryName: category.folderName,
                   subCategoryName: subName
               });
            }
          });
        });
      }
    });

    const uncategorized = files.filter(f => (!f.tags || f.tags.length === 0) && f.status === 'completed');
    if (uncategorized.length > 0) {
      uncategorized.forEach(f => {
        if(f.file) {
           filesToUpload.push({
               file: f.file,
               suggestedName: f.originalName.split('.')[0],
               categoryName: 'غير_مصنف',
               subCategoryName: 'عام'
           });
        }
      });
    }

    if (filesToUpload.length === 0) {
        alert("لا توجد ملفات جاهزة للرفع");
        return;
    }

    setIsUploadingToDrive(true);
    setUploadProgress(0);

    let successCount = 0;
    for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(item.file);
            });
            const base64Data = await base64Promise;
            const extension = item.file.name.split('.').pop() || 'tmp';

            const payload = {
                action: "uploadFile",
                folderId: folderId,
                fileData: base64Data,
                mimeType: item.file.type,
                fileName: `${item.suggestedName}.${extension}`,
                categoryName: item.categoryName,
                subCategoryName: item.subCategoryName
            };

            const response = await fetch(appsScriptUrl, {
                method: "POST",
                body: JSON.stringify(payload),
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                }
            });

            const result = await response.json();
            if (result.success) {
                successCount++;
            } else {
                console.error("Upload failed for", item.suggestedName, result.error);
            }
        } catch (error) {
            console.error("Error uploading", item.suggestedName, error);
        }
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
    }

    setIsUploadingToDrive(false);
    alert(`تم رفع ${successCount} من أصل ${filesToUpload.length} ملفات إلى جوجل درايف بنجاح!`);
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

  // Utility Stats
  const sortStats = useMemo(() => {
    return {
      total: files.length,
      completed: files.filter(f => f.status === 'completed').length,
      processing: files.filter(f => f.status === 'processing').length,
      pending: files.filter(f => f.status === 'pending').length,
      error: files.filter(f => f.status === 'error').length,
    };
  }, [files]);

  // --- Views ---

  const renderHome = () => (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">مرحباً بك في الفارز الذكي</h1>
          <p className="text-slate-500 mt-2">إدارة سريعة لملفات وتقييمات المعلمين</p>
        </div>
        <button
          onClick={() => setView('add-teacher')}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة معلم جديد</span>
        </button>
      </div>

      <h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2">
        <Users className="w-5 h-5 text-indigo-500" />
        المعلمين الحاليين
      </h3>

      {teachers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <UserX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600">لا يوجد معلمين مضافين</h3>
          <p className="text-slate-400 mt-1">ابدأ بإضافة معلم جديد لإدارة وتنظيم شواهده</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map(teacher => (
            <div
              key={teacher.id}
              onClick={() => { setActiveTeacherId(teacher.id); setView('teacher-dashboard'); }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
                  {teacher.name.charAt(0)}
                </div>
                <button
                  onClick={(e) => handleDeleteTeacher(teacher.id, e)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{teacher.name}</h4>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {teacher.savedClassifications.length} شواهد مدرجة
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAddTeacher = () => (
    <div className="flex-1 p-8 overflow-y-auto w-full max-w-2xl mx-auto">
      <button
        onClick={() => setView('home')}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-8 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        الرجوع
      </button>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
            <Plus className="w-5 h-5" />
          </div>
          إضافة معلم جديد
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">اسم المعلم</label>
            <input
              type="text"
              value={newTeacherName}
              onChange={e => setNewTeacherName(e.target.value)}
              placeholder="مثال: يوسف أحمد"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">رابط مشاركة المجلد (مثال: Drive)</label>
            <input
              type="text"
              value={newTeacherLink}
              onChange={e => setNewTeacherLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={handleSaveTeacher}
            disabled={!newTeacherName.trim()}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            حفظ واستمرار
          </button>
        </div>
      </div>
    </div>
  );

  const renderTeacherDashboard = () => (
    <div className="flex-1 p-8 overflow-y-auto">
      <button
        onClick={() => setView('home')}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-8 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        الرجوع
      </button>

      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{activeTeacher?.name}</h1>
          {activeTeacher?.link ? (
            <a href={activeTeacher.link} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-sm font-medium mt-1 flex items-center gap-1">
              مجلد المعلم المشترك
              <ChevronLeft className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-slate-500 text-sm mt-1">لا يوجد رابط مجلد مشترك</p>
          )}
        </div>
        <button
          onClick={() => handleDeleteTeacher(activeTeacher!.id)}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          حذف المعلم
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => { setSortStep('upload'); setFiles([]); setView('sort-evidences'); }}
          className="bg-white border text-center border-slate-200 rounded-3xl p-10 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Upload className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">فرز الشواهد</h3>
          <p className="text-slate-500">ارفع الصور أو البي دي اف وسيقوم الذكاء بتصنيفها وفرزها وإعادة تسميتها في مجلدات.</p>
        </div>

        <div
          onClick={() => setView('analyze-report')}
          className="bg-white border text-center border-slate-200 rounded-3xl p-10 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <FileText className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">تحليل الملف</h3>
          <p className="text-slate-500">الحصول على تقرير ذكي متكامل بنواقص المعلم ونقاط قوته مقارنة بمعايير الأداء.</p>
        </div>
      </div>
    </div>
  );

  const renderSortEvidences = () => (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setView('teacher-dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          عودة لملف المعلم
        </button>
        {sortStep !== 'upload' && (
          <button
            onClick={() => { setSortStep('upload'); setFiles([]); }}
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            إفراغ والبدء من جديد
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {sortStep === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight mb-2">فرز شواهد: {activeTeacher?.name}</h2>
              <p className="text-slate-500">ارفع الملفات هنا، وسيتم تسميتها وفرزها وفق مجلدات المعايير الـ 11 المعتمدة.</p>
            </div>

            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 transition-all duration-300 cursor-pointer text-center",
                isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <Upload className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-slate-900">اسحب وأفلت الملفات والصور هنا</p>
                  <p className="text-slate-400 mt-2">يدعم صور (JPG/PNG) وملفات (PDF)</p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-slate-700">
                  <FileImage className="w-5 h-5 text-indigo-600" />
                  الملفات المستعدة ({files.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {files.map((f) => (
                    <motion.div layout key={f.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center relative">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                          <FileText className="w-8 h-8 mb-1" />
                          <span className="text-[10px] w-20 truncate text-center">{f.originalName}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={(e) => removeFile(f.id, e)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <button onClick={processFiles} className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3">
                    بدء الفرز وإعادة التسمية
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {sortStep === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto space-y-8 py-12">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <Loader2 className="w-20 h-20 text-indigo-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold">{Math.round((sortStats.completed / sortStats.total) * 100)}%</span>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">جاري تحليل وفرز الشواهد...</h2>
                <p className="text-slate-500 mt-2">يتم الآن قراءة المحتوى والتصنيف لأفضل فئة ممكنة.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                <span>التقدم</span>
                <span>{sortStats.completed} / {sortStats.total}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(sortStats.completed / sortStats.total) * 100}%` }} className="h-full bg-indigo-500" />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {files.filter(f => f.status === 'processing' || f.status === 'completed').reverse().map((f) => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded flex items-center justify-center overflow-hidden border border-slate-200">
                      {f.preview ? <img src={f.preview} alt="" className="w-full h-full object-cover" /> : <FileText className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-slate-700">{f.status === 'completed' && f.suggestedName ? f.suggestedName : f.originalName}</p>
                      <p className="text-[10px] text-slate-500">{f.status === 'processing' ? 'يتم التحليل...' : `${f.tags?.length || 0} مجلد`}</p>
                    </div>
                    {f.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {sortStep === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  اكتمل الفرز وإعادة التسمية!
                </h2>
                <p className="text-slate-500 mt-2">تم تجهيز {sortStats.completed} ملف، يمكنك تحميلها الآن في هيكل جاهز ومنظم.</p>
              </div>
              <button
                onClick={uploadToDrive}
                disabled={isUploadingToDrive}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {isUploadingToDrive ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الرفع ({uploadProgress}%)
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-5 h-5" />
                    الرفع إلى جوجل درايف
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CATEGORIES.filter(cat => files.some(f => f.tags?.some(tag => tag.categoryId === cat.id))).map(group => {
                const groupFiles = files.filter(f => f.tags?.some(tag => tag.categoryId === group.id));
                return (
                  <motion.div key={group.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-start gap-3">
                      <FolderOpen className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm leading-tight text-slate-800">{group.name}</h4>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 block">{groupFiles.length} ملفات مدرجة</span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-2 bg-white max-h-48 overflow-y-auto">
                      {groupFiles.map(f => {
                        const tagsInGroup = f.tags?.filter(t => t.categoryId === group.id) || [];
                        return (
                          <div key={f.id} className="flex flex-col gap-1 text-xs border border-slate-100 p-2 rounded-lg bg-slate-50/30">
                            <span className="font-medium text-slate-700 truncate line-clamp-1">{f.suggestedName || f.originalName}</span>
                            <div className="flex flex-wrap gap-1">
                              {tagsInGroup.map(t => (
                                <span key={t.subCategoryName} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-600">{t.subCategoryName}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex justify-center mt-12 pb-12">
              <button onClick={() => setView('analyze-report')} className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-2 transition-colors">
                الانتقال لتحليل ملف المعلم واستخراج التقرير
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderAnalyzeReport = () => (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setView('teacher-dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          عودة لملف المعلم
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">تقرير الفاعلية والنواقص</h2>
            <p className="text-slate-500">للمعلم: {activeTeacher?.name}</p>
            <p className="text-slate-400 text-sm mt-1">إجمالي الشواهد المحفوظة: {activeTeacher?.savedClassifications.length}</p>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport || !activeTeacher?.savedClassifications.length}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {isGeneratingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : 'توليد / تحديث التقرير'}
          </button>
        </div>

        {activeTeacher?.analysisReport ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm prose prose-indigo prose-headings:font-bold prose-h1:text-2xl max-w-none">
            <Markdown>{activeTeacher.analysisReport}</Markdown>
          </div>
        ) : (
          <div className="text-center py-24 bg-slate-50 border border-slate-200 rounded-3xl border-dashed">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-600">لا يوجد تقرير حالي</h3>
            <p className="text-slate-400 mt-2">اضغط على زر توليد التقرير لتحليل شواهد المعلم وتقييمه.</p>
          </div>
        )}
      </div>
    </div>
  );

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
          <div className="mt-8 pt-6 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-500 mb-2 px-4 uppercase tracking-wider">رابط Apps Script</label>
            <input
              type="text"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-left dir-ltr"
              dir="ltr"
            />
          </div>
        </nav>


        <div className="p-6">
          <div className="bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
            <div className="relative z-10">
              <p className="text-xs text-slate-400 mb-1">البيانات المحلية</p>
              <p className="text-sm font-bold mb-3">{teachers.length} معلمين مسجلين</p>
              <div className="w-full bg-slate-700 h-1.5 rounded-full">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min((teachers.length / 50) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="البحث في النظام..." className="w-full bg-slate-100 border-none rounded-xl py-2.5 pr-12 pl-4 focus:ring-2 focus:ring-indigo-500 text-sm outline-none transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center font-bold text-indigo-600">
              م
            </div>
          </div>
        </header>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {view === 'home' && renderHome()}
            {view === 'add-teacher' && renderAddTeacher()}
            {view === 'teacher-dashboard' && renderTeacherDashboard()}
            {view === 'sort-evidences' && renderSortEvidences()}
            {view === 'analyze-report' && renderAnalyzeReport()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
