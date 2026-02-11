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
    const remainingSlots = 2 - taskImages.length;
    
    if (files.length > remainingSlots) {
      const plural = remainingSlots === 1 ? 'photo' : 'photos';
      alert(`You can only add ${remainingSlots} more ${plural} (max 2 total)`);
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
                    {uploading ? 'Uploading...' : `Take Photo (${taskImages.length}/2)`}
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" disabled={uploading} />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase italic text-slate-900">Hi {techName}</h1>
              <p className="text-sm text-slate-500 font-bold uppercase mt-2">We see you. Thank you for your work 💙</p>
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
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-black uppercase text-sm hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Active Jobs</p>
            <p className="text-3xl font-black text-blue-600">{jobs.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Completed</p>
            <p className="text-3xl font-black text-green-600">{completedJobs.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Issues</p>
            <p className="text-3xl font-black text-orange-600">{totalIssues}</p>
          </div>
          <div className={`bg-gradient-to-br rounded-2xl p-4 shadow-sm border text-white font-black ${
            totalIssues > 5 ? 'from-red-500 to-red-600 border-red-200' : 'from-green-500 to-green-600 border-green-200'
          }`}>
            <p className="text-xs uppercase mb-2 opacity-90">Status</p>
            <p className="text-2xl">{totalIssues > 5 ? 'Busy!' : 'On Track'}</p>
          </div>
        </div>

        {/* Tabs and Search */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 md:flex-initial px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all font-bold ${
                activeTab === 'active' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              🔥 Active ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 md:flex-initial px-6 py-3 rounded-2xl text-xs font-black uppercase transition-all font-bold ${
                activeTab === 'completed' 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              ✓ History ({completedJobs.length})
            </button>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Search by unit..."
            className="w-full p-4 rounded-2xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-blue-500 focus:shadow-md transition-all bg-white"
          />
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-400 uppercase">Loading jobs...</p>
          </div>
        ) : (activeTab === 'active' ? jobs : completedJobs).length === 0 ? (
          <div className="text-center py-24">
            <div className="mb-4">
              {activeTab === 'active' ? (
                <div className="text-6xl mb-4">🎉</div>
              ) : (
                <div className="text-6xl mb-4">📋</div>
              )}
            </div>
            <p className="text-lg font-black text-slate-900 mb-2">
              {activeTab === 'active' ? 'All caught up!' : 'No history yet'}
            </p>
            <p className="text-sm text-slate-500 font-bold">
              {activeTab === 'active' ? 'Check back soon for new jobs' : 'Your completed jobs will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(activeTab === 'active' ? jobs : completedJobs)
              .filter((job) => {
                if (!searchTerm) return true;
                const value = searchTerm.toLowerCase();
                const unit = (job.unit || '').toLowerCase();
                const displayId = (job.displayId || '').toLowerCase();
                return unit.includes(value) || displayId.includes(value);
              })
              .map(job => {
                const progress = job.tasks?.filter(t => t.done).length || 0;
                const total = job.tasks?.length || 0;
                const progressPercent = total > 0 ? (progress / total) * 100 : 0;
                const isComplete = progress === total && total > 0;

                return (
                  <button
                    key={job.id}
                    onClick={() => setActiveJob(job)}
                    className={`group rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all text-left ${
                      activeTab === 'completed'
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
                        : 'bg-white border-2 border-slate-100 hover:border-blue-300'
                    }`}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-black uppercase italic text-slate-900 group-hover:text-blue-600 transition-colors">{job.unit}</h3>
                          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wide">{job.displayId}</p>
                        </div>
                        <div className={`px-3 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ml-3 ${
                          job.priority === 'High' ? 'bg-red-100 text-red-700 font-black' : 
                          job.priority === 'Low' ? 'bg-green-100 text-green-700 font-black' : 
                          'bg-orange-100 text-orange-700 font-black'
                        }`}>
                          {activeTab === 'active' ? `🔴 ${job.priority}` : '✅ Done'}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {activeTab === 'active' && (
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-black text-slate-600 uppercase">Progress</p>
                            <p className="text-sm font-black text-slate-900">{progress}/{total}</p>
                          </div>
                          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="text-left">
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Tasks</p>
                          <p className="text-lg font-black text-slate-900">{progress}/{total}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all group-hover:shadow-lg ${
                          activeTab === 'completed'
                            ? 'bg-slate-200 text-slate-700'
                            : isComplete ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {activeTab === 'completed' ? 'Review' : isComplete ? 'View' : 'Start'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechView;
