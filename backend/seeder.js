import Course from './models/Course.js';
import Event from './models/Event.js';
import TrialTutorial from './models/TrialTutorial.js';

export const seedDatabase = async () => {
  try {
    const courseCount = await Course.countDocuments({});
    if (courseCount === 0) {
      console.log('Seeding default AI courses...');
      await Course.create([
        {
          title: 'AI Development for Absolute Beginners',
          description: 'Learn to build modern websites, mobile apps, and interactive games using AI tools. Perfect for students aged 10+ and absolute beginners. No prior coding experience required!',
          category: 'AI Development',
          packageType: 'Starter',
          price: 499,
          thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
          languages: ['English', 'Hindi'],
          content: [
            {
              language: 'English',
              chapters: [
                {
                  title: 'Introduction to Generative AI Tools',
                  description: 'An overview of ChatGPT, Claude, and how to write effective prompts to get the best outputs.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '12:15'
                },
                {
                  title: 'Building Your First Webpage with AI',
                  description: 'Step-by-step tutorial on generating HTML, CSS, and JS using prompts and launching it live.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '25:40'
                },
                {
                  title: 'Building simple Games using Cursor & v0',
                  description: 'Learn to make a retro snake game without coding it by hand, using modern AI tools.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '32:10'
                }
              ]
            },
            {
              language: 'Hindi',
              chapters: [
                {
                  title: 'Generative AI Tools Ka Parichay',
                  description: 'Generative AI aur prompt writing ke fundamentals seekhein.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '14:20'
                },
                {
                  title: 'AI Ke Saath Pehli Website Banayein',
                  description: 'AI tools ki madad se bina coding ke fully working website banana seekhein.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '28:15'
                }
              ]
            }
          ]
        },
        {
          title: 'AI Daily Life & Productivity Mastery',
          description: 'Master ChatGPT, Midjourney, Claude, and automation tools to double your daily productivity. Suitable for students, professionals, and senior citizens seeking to become handy with AI.',
          category: 'AI in Daily Life',
          packageType: 'Professional',
          price: 999,
          thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80',
          languages: ['English'],
          content: [
            {
              language: 'English',
              chapters: [
                {
                  title: 'Mastering Chatbots for Research & Writing',
                  description: 'How to write essays, emails, resumes, and study materials in seconds.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '15:30'
                },
                {
                  title: 'AI Art & Graphic Design with Midjourney',
                  description: 'Creating stunning realistic images, logos, and digital art from text prompts.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '22:10'
                },
                {
                  title: 'Automating Daily Tasks and Email Workflows',
                  description: 'Hooking up AI to automate calendar schedules, summarize long documents, and manage inbox overload.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '18:40'
                }
              ]
            }
          ]
        },
        {
          title: 'Advanced AI Software & Agentic Architectures',
          description: 'Take your developer skills to the next level. Build custom LLM agents, integrate vector databases, and launch fully functional multiplayer games using AI development tools.',
          category: 'AI Development',
          packageType: 'Master',
          price: 1999,
          thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80',
          languages: ['English', 'Hindi'],
          content: [
            {
              language: 'English',
              chapters: [
                {
                  title: 'Setting up LLMs and Vector Search (RAG)',
                  description: 'Understand vector databases (Pinecone/Chroma) and semantic search architectures.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '30:15'
                },
                {
                  title: 'Building Autonomous AI Coding Agents',
                  description: 'Program multi-agent teams that can read files, write code, run terminal tests, and auto-debug.',
                  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                  duration: '42:50'
                }
              ]
            }
          ]
        }
      ]);
    }

    const eventCount = await Event.countDocuments({});
    if (eventCount === 0) {
      console.log('Seeding default webinars & workshops...');
      await Event.create([
        {
          title: 'Unlocking 1000 Job Opportunities in AI by 2027',
          description: 'A special roadmapping session by @videdreamer outlining the technical skills and portfolio projects needed to secure remote jobs, freelancing, and build AI startups.',
          type: 'webinar',
          isPaid: false,
          price: 0,
          dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days later
          meetingLink: 'https://meet.google.com/abc-defg-hij',
          duration: '1 Hour',
          thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80'
        },
        {
          title: 'Interactive Game Development with AI',
          description: 'Join this live coding workshop to see how we build, debug, and publish an arcade game in 90 minutes. Suitable for absolute beginners and kids.',
          type: 'workshop',
          isPaid: true,
          price: 199,
          dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days later
          meetingLink: 'https://meet.google.com/klm-nopq-rst',
          duration: '1.5 Hours',
          thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80'
        }
      ]);
    }

    const trialCount = await TrialTutorial.countDocuments({});
    if (trialCount === 0) {
      console.log('Seeding default trial tutorials...');
      await TrialTutorial.create([
        {
          title: 'Build a Website in 5 Minutes with AI',
          description: 'A quick, step-by-step introduction to making a beautiful website using AI website generators. Watch and follow along!',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          duration: '5 Mins',
          category: 'AI Development',
          thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80'
        },
        {
          title: 'ChatGPT Prompts Everyone Should Know',
          description: 'Three simple prompting frameworks that will save you hours of writing and researching every single day.',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          duration: '7 Mins',
          category: 'AI in Daily Life',
          thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80'
        }
      ]);
    }
    
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Seeder execution error:', error);
  }
};
