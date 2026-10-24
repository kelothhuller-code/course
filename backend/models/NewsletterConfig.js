import mongoose from 'mongoose';

const NewsletterConfigSchema = new mongoose.Schema({
  welcomeSubject: {
    type: String,
    default: 'Welcome to WideTech',
  },
  welcomeHeadline: {
    type: String,
    default: 'Thanks for subscribing to WideTech updates',
  },
  welcomeMessage: {
    type: String,
    default: 'Thank you for subscribing. We will occasionally email you about new courses, software and services from WideTech. You can unsubscribe at any time.',
  },
  freeCourseUrl: {
    type: String,
    default: 'https://widetech.in/all-courses',
  },
  toolkitPdfUrl: {
    type: String,
    default: '',
  },
  additionalResources: [{
    title: String,
    url: String,
    description: String,
  }],
  autoSendWelcome: {
    type: Boolean,
    default: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('NewsletterConfig', NewsletterConfigSchema);
