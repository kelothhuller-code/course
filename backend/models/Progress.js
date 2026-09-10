import mongoose from 'mongoose';

const lessonProgressSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId
  },
  videoProgressSeconds: {
    type: Number,
    default: 0
  },
  videoDurationSeconds: {
    type: Number,
    default: 0
  },
  videoProgressPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  videoCompleted: {
    type: Boolean,
    default: false
  },
  materialOpened: {
    type: Boolean,
    default: false
  },
  materialOpenedAt: {
    type: Date
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  timesOpened: {
    type: Number,
    default: 0
  }
});

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  currentChapterId: {
    type: mongoose.Schema.Types.ObjectId
  },
  currentLessonId: {
    type: mongoose.Schema.Types.ObjectId
  },
  lastWatchedLessonId: {
    type: mongoose.Schema.Types.ObjectId
  },
  lastWatchedAt: {
    type: Date
  },
  completedLessons: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  lessonProgress: [lessonProgressSchema],
  completedChapters: [{
    type: String
  }],
  activeLanguage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
progressSchema.index({ userId: 1, 'lessonProgress.lastAccessedAt': -1 });
progressSchema.index({ courseId: 1, completed: 1 });

progressSchema.methods.calculateProgress = function(totalLessons) {
  if (!totalLessons || totalLessons === 0) return 0;
  const completedCount = this.completedLessons ? this.completedLessons.length : 0;
  const progress = Math.round((completedCount / totalLessons) * 100);
  this.progress = Math.min(progress, 100);
  return this.progress;
};

progressSchema.methods.isCompleted = function(totalLessons) {
  if (!totalLessons || totalLessons === 0) return false;
  return this.completedLessons.length >= totalLessons;
};

const Progress = mongoose.model('Progress', progressSchema);
export default Progress;