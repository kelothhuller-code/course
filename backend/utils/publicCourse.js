/**
 * Strip paid-content links from a course before sending it to anonymous/unenrolled visitors.
 * Public endpoints (course list, featured course, sales page) used to return
 * content.chapters.driveLink / materials[].link — i.e. the download URLs of paid files.
 */
export const sanitizePublicCourse = (courseDoc) => {
  if (!courseDoc) return courseDoc;
  const course = typeof courseDoc.toObject === 'function' ? courseDoc.toObject() : { ...courseDoc };

  if (Array.isArray(course.content)) {
    course.content.forEach((lang) => {
      (lang.chapters || []).forEach((ch) => {
        delete ch.videoUrl;
        delete ch.driveLink;
        if (Array.isArray(ch.materials)) {
          ch.materials = ch.materials.map((m) => ({ _id: m._id, title: m.title, type: m.type }));
        }
      });
    });
  }

  if (Array.isArray(course.resourceBundles)) {
    course.resourceBundles = course.resourceBundles.map((b) => ({
      _id: b._id,
      title: b.title,
      description: b.description,
      fileType: b.fileType,
      fileSize: b.fileSize,
      isFreePreview: Boolean(b.isFreePreview),
      fileUrl: b.isFreePreview ? b.fileUrl : undefined,
    }));
  }

  return course;
};
