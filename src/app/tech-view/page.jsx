"use client";
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../Config/firebaseConfig';
import { FaCheckCircle, FaCamera, FaTimes, FaTools, FaClock } from 'react-icons/fa';
import { BiTask } from 'react-icons/bi';

const TechView = () => {
  const [techName, setTechName] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [contractors, setContractors] = useState([]);
  const [loadingContractors, setLoadingContractors] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taskImages, setTaskImages] = useState([]);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  const allowedContractors = ['Rasta', 'Johannes', 'Other'];
  const contractorStyles = {
    Rasta: 'bg-red-100 text-red-700 border-red-200',
    Johannes: 'bg-blue-100 text-blue-700 border-blue-200',
    Other: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const loadContractors = async () => {
    setLoadingContractors(true);
    try {
      const q = query(
        collection(db, 'maintenance'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const map = new Map();
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const name = (data.contractor || '').trim();
        if (!name) return;
        if (!allowedContractors.includes(name)) return;
        const issuesCount = Array.isArray(data.tasks) ? data.tasks.length : 0;
        const current = map.get(name) || 0;
        map.set(name, current + issuesCount);
      });
      const list = allowedContractors.map((name) => ({
        name,
        issueCount: map.get(name) || 0
      }));
      setContractors(list);
    } catch (error) {
      console.error('Error loading contractors:', error);
    }
    setLoadingContractors(false);
  };

  useEffect(() => {
    loadContractors();
  }, []);

  const fetchJobs = async (name) => {
    if (!name) return;
    setLoading(true);
    try {
      const activeQuery = query(
        collection(db, 'maintenance'),
        where('contractor', '==', name),
        where('status', '==', 'active')
      );
      const completedQuery = query(
        collection(db, 'maintenance'),
        where('contractor', '==', name),
        where('status', '==', 'completed')
      );
      const [activeSnap, completedSnap] = await Promise.all([
        getDocs(activeQuery),
        getDocs(completedQuery)
      ]);
      const jobsList = activeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const completedList = completedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(jobsList);
      setCompletedJobs(completedList);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
    setLoading(false);
  };

  const handleTaskClick = async (taskId) => {
    const task = activeJob.tasks.find(t => t.id === taskId);
    if (task.done) return;

    setCurrentTaskId(taskId);
    setTaskImages([]);
    setShowImagePrompt(true);
  };

  const completeTaskWithImages = async () => {
    try {
      setUploading(true);
      let imageUrls = [];

      if (taskImages.length > 0) {
        imageUrls = await Promise.all(
          taskImages.map(async (imgData) => {
            const file = imgData.file || imgData;
            const timestamp = Date.now();
            const fileName = `maintenance/${activeJob.id}/${currentTaskId}_${timestamp}_${Math.random().toString(36).slice(2)}.jpg`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
          })
        );
      }

      const updatedTasks = activeJob.tasks.map(task => {
        if (task.id === currentTaskId && !task.done) {
          return {
            ...task,
            done: true,
            completedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            images: imageUrls
          };
        }
        return task;
      });

      setActiveJob({ ...activeJob, tasks: updatedTasks });
      await updateDoc(doc(db, 'maintenance', activeJob.id), { tasks: updatedTasks });

      setShowImagePrompt(false);
      setTaskImages([]);
      setCurrentTaskId(null);

      // Check if all tasks are now complete
      const allDone = updatedTasks.every(t => t.done);
      if (allDone) {
        await updateDoc(doc(db, 'maintenance', activeJob.id), {
          tasks: updatedTasks,
          completedBy: techName,
          completedAt: new Date().toLocaleString(),
          status: 'completed'
        });
        alert('Job completed successfully! 🎉');
        setActiveJob(null);
        fetchJobs(techName);
        loadContractors();
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Error completing task');
    } finally {
      setUploading(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 800;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (taskImages.length + files.length > 2) {
      alert('Maximum 2 images per task');
      return;
    }

    const compressed = await Promise.all(files.map(f => compressImage(f)));
    const newImages = compressed.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setTaskImages([...taskImages, ...newImages]);
  };



  const allTasksDone = activeJob?.tasks?.every(t => t.done);
  const isCompletedJob = activeJob?.status === 'completed';
  const totalIssues = jobs.reduce((sum, job) => {
    const count = Array.isArray(job.tasks) ? job.tasks.length : 0;
    return sum + count;
  }, 0);
  const selectedContractor = contractors.find(c => c.name === selectedName);
  const initials = selectedName
    ? selectedName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join('')
    : '?';

  if (!techName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-4xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaTools className="text-white text-3xl" />
            </div>
            <h1 className="text-3xl font-black uppercase italic text-slate-900">Tech Portal</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">OC Pulse</p>
          </div>
          <p className="block text-xs font-bold uppercase text-slate-500 mb-3">Who are you?</p>

          {loadingContractors ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm font-bold text-slate-400 uppercase">Loading your team...</p>
            </div>
          ) : (
          <div className="space-y-3">
            {contractors.map((c) => (
              <div
                key={c.name}
                className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${contractorStyles[c.name] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/80 text-slate-900 flex items-center justify-center text-lg">
                    👤
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase">
                      {c.name}
                    </p>
                    <p className="text-[11px] font-bold uppercase opacity-80">
                      ({c.issueCount})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedName(c.name);
                    setTechName(c.name);
                    fetchJobs(c.name);
                  }}
                  className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-black uppercase shadow-sm"
                >
                  Access
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    );
  }

  if (activeJob) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-4xl shadow-lg p-6 mb-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black uppercase italic text-slate-900">{activeJob.unit}</h2>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">{activeJob.displayId}</p>
              </div>
              <button onClick={() => setActiveJob(null)} className="bg-slate-100 p-3 rounded-xl text-slate-600 hover:bg-slate-200">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3">
              {activeJob.tasks?.map((task) => (
                <div
                  key={task.id}
                  onClick={() => !task.done && handleTaskClick(task.id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    task.done 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-slate-200 hover:border-blue-500 active:scale-95 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      task.done ? 'bg-green-500' : 'bg-slate-200'
                    }`}>
                      {task.done && <FaCheckCircle className="text-white" size={16} />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold uppercase ${task.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {task.desc}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{task.area}</p>
                      {task.completedAt && (
                        <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                          <FaClock size={10} /> {task.completedAt}
                        </p>
                      )}
                      {task.images && task.images.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {task.images.map((url, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingImage(url);
                              }}
                              className="w-12 h-12 rounded-lg overflow-hidden border border-green-200 cursor-pointer hover:border-green-400 transition-all"
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isCompletedJob && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                  <p className="text-sm font-black uppercase text-green-700">✓ Job Completed</p>
                  <p className="text-xs text-green-600 mt-1">{activeJob.completedAt}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showImagePrompt && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-4xl p-8 max-w-md w-full">
              <h3 className="text-xl font-black uppercase italic text-slate-900 mb-4">Add Photos?</h3>
              <p className="text-sm text-slate-600 mb-6">Upload photos for this task (Max 2 images - optional)</p>
              
              {taskImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {taskImages.map((imgData, idx) => (
                    <div key={idx} className="relative">
                      <img src={imgData.preview || imgData} alt="" className="w-full h-32 object-cover rounded-xl" />
                      <button
                        onClick={() => setTaskImages(taskImages.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                {taskImages.length < 2 && (
                  <label className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs text-center cursor-pointer transition-all ${
                    uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}>
                    <FaCamera className="inline mr-2" />
                    {uploading ? 'Uploading...' : 'Add Photo'}
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
                <button
                  onClick={completeTaskWithImages}
                  disabled={uploading}
                  className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs transition-all ${
                    uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {uploading ? 'Saving...' : 'Done'}
                </button>
              </div>
              <button
                onClick={() => {
                  setShowImagePrompt(false);
                  setTaskImages([]);
                  setCurrentTaskId(null);
                }}
                disabled={uploading}
                className="w-full mt-3 text-slate-400 text-xs font-bold uppercase"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {viewingImage && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={() => setViewingImage(null)}>
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 bg-white text-slate-900 rounded-full p-3 hover:bg-slate-100"
            >
              <FaTimes size={20} />
            </button>
            <img
              src={viewingImage}
              alt="Full view"
              className="max-w-full max-h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-4xl shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black uppercase italic text-slate-900">Hi, {techName}</h1>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">We see you. Thank you for your work 💙</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-full shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span className="text-xs font-black uppercase text-slate-700">Issues</span>
                <span className="text-xs font-black text-slate-900">{totalIssues}</span>
              </div>
              <button
                onClick={() => {
                  setTechName('');
                  setSelectedName('');
                  setJobs([]);
                  setCompletedJobs([]);
                  setActiveTab('active');
                  setSearchTerm('');
                }}
                className="text-sm text-slate-400 font-bold uppercase"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-4xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase transition-all ${
                activeTab === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Active ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase transition-all ${
                activeTab === 'completed' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Completed ({completedJobs.length})
            </button>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search unit (auto filter)"
            className="w-full p-4 rounded-2xl border-2 border-slate-200 text-sm font-bold uppercase outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-400 uppercase">Loading jobs...</p>
          </div>
        ) : (activeTab === 'active' ? jobs : completedJobs).length === 0 ? (
          <div className="text-center py-20">
            <BiTask size={60} className="text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase">No jobs here yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(activeTab === 'active' ? jobs : completedJobs)
              .filter((job) => {
                if (!searchTerm) return true;
                const value = searchTerm.toLowerCase();
                const unit = (job.unit || '').toLowerCase();
                const displayId = (job.displayId || '').toLowerCase();
                return unit.includes(value) || displayId.includes(value);
              })
              .map(job => (
              <button
                key={job.id}
                onClick={() => setActiveJob(job)}
                className="w-full bg-white rounded-4xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all text-left group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-900">{job.unit}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">{job.displayId}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    job.priority === 'High' ? 'bg-red-100 text-red-600' : 
                    job.priority === 'Low' ? 'bg-green-100 text-green-600' : 
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {activeTab === 'active' ? job.priority : 'Completed'}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600 font-bold">
                    {job.tasks?.filter(t => t.done).length || 0} / {job.tasks?.length || 0} tasks done
                  </p>
                  <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${
                    activeTab === 'completed'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {activeTab === 'completed' ? 'View Report' : 'Start'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechView;
