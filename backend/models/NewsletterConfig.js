import mongoose from 'mongoose';

const NewsletterConfigSchema = new mongoose.Schema({
  welcomeSubject: {
    type: String,
    default: '🎁 Your Free AI Starter Toolkit & Free Courses Access - WIDETECHNOS Academy',
  },
  welcomeHeadline: {
    type: String,
    default: 'Welcome to WIDETECHNOS Academy! Here is your Free AI Toolkit & Resources',
  },
  welcomeMessage: {
    type: String,
    default: 'Thank you for joining our community! We are thrilled to share our curated AI tools cheat sheet, prompt templates, and structured learning roadmap with you.',
  },
  freeCourseUrl: {
    type: String,
    default: 'https://widetech.in/#courses',
  },
  toolkitPdfUrl: {
    type: String,
    default: 'https://widetech.in/resources/ai-starter-toolkit.pdf',
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
