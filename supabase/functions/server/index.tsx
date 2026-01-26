import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Client for auth (uses anon key for user token verification)
const supabaseAnon = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: ["https://jackw9829.github.io"],
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize storage buckets on startup
const initStorage = async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  
  const materialsExists = buckets?.some(bucket => bucket.name === 'make-f64b0eb2-materials');
  if (!materialsExists) {
    await supabase.storage.createBucket('make-f64b0eb2-materials', { public: false });
    console.log('Created materials bucket');
  }
  
  const submissionsExists = buckets?.some(bucket => bucket.name === 'make-f64b0eb2-submissions');
  if (!submissionsExists) {
    await supabase.storage.createBucket('make-f64b0eb2-submissions', { public: false });
    console.log('Created submissions bucket');
  }
};

// Initialize buckets
initStorage();

// Health check endpoint
app.get("/make-server-f64b0eb2/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ROUTES ====================

// Sign up route
app.post("/make-server-f64b0eb2/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    if (!email || !password || !name || !role) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    if (!['student', 'instructor', 'admin'].includes(role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }
    
    // Store user profile in KV
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role,
      createdAt: new Date().toISOString()
    });
    
    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Error in signup route: ${error}`);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// Get current user profile
app.get("/make-server-f64b0eb2/auth/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No authorization token' }, 401);
    }
    
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    
    if (!profile) {
      // Fallback to user metadata
      return c.json({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || '',
        role: user.user_metadata?.role || 'student'
      });
    }
    
    return c.json(profile);
  } catch (error) {
    console.log(`Error getting user profile: ${error}`);
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

// ==================== COURSE ROUTES ====================

// Create course (instructor/admin only)
app.post("/make-server-f64b0eb2/courses", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const { name, description } = await c.req.json();
    const courseId = `course:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const course = {
      id: courseId,
      name,
      description,
      instructorId: user.id,
      instructorName: profile.name,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(courseId, course);
    
    return c.json(course);
  } catch (error) {
    console.log(`Error creating course: ${error}`);
    return c.json({ error: 'Failed to create course' }, 500);
  }
});

// Get all courses
app.get("/make-server-f64b0eb2/courses", async (c) => {
  try {
    const courses = await kv.getByPrefix('course:');
    return c.json(courses || []);
  } catch (error) {
    console.log(`Error getting courses: ${error}`);
    return c.json({ error: 'Failed to get courses' }, 500);
  }
});

// ==================== MATERIAL ROUTES ====================

// Upload material
app.post("/make-server-f64b0eb2/materials/upload", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const courseId = formData.get('courseId') as string;
    
    if (!file || !title) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const fileName = `${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('make-f64b0eb2-materials')
      .upload(fileName, arrayBuffer, {
        contentType: file.type
      });
    
    if (uploadError) {
      console.log(`Error uploading material file: ${uploadError.message}`);
      return c.json({ error: 'Failed to upload file' }, 500);
    }
    
    const materialId = `material:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const material = {
      id: materialId,
      title,
      description,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      filePath: uploadData.path,
      courseId,
      uploadedBy: user.id,
      uploadedByName: profile.name,
      uploadedAt: new Date().toISOString()
    };
    
    await kv.set(materialId, material);
    
    return c.json(material);
  } catch (error) {
    console.log(`Error in material upload: ${error}`);
    return c.json({ error: 'Failed to upload material' }, 500);
  }
});

// Get all materials
app.get("/make-server-f64b0eb2/materials", async (c) => {
  try {
    const courseId = c.req.query('courseId');
    let materials = await kv.getByPrefix('material:');
    
    if (courseId) {
      materials = materials.filter((m: any) => m.courseId === courseId);
    }
    
    return c.json(materials || []);
  } catch (error) {
    console.log(`Error getting materials: ${error}`);
    return c.json({ error: 'Failed to get materials' }, 500);
  }
});

// Download material
app.get("/make-server-f64b0eb2/materials/:id/download", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const materialId = c.req.param('id');
    const material = await kv.get(materialId);
    
    if (!material) {
      return c.json({ error: 'Material not found' }, 404);
    }
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('make-f64b0eb2-materials')
      .createSignedUrl(material.filePath, 3600); // 1 hour
    
    if (signedUrlError) {
      console.log(`Error creating signed URL for material: ${signedUrlError.message}`);
      return c.json({ error: 'Failed to generate download URL' }, 500);
    }
    
    return c.json({ url: signedUrlData.signedUrl, fileName: material.fileName });
  } catch (error) {
    console.log(`Error downloading material: ${error}`);
    return c.json({ error: 'Failed to download material' }, 500);
  }
});

// ==================== ASSESSMENT ROUTES ====================

// Create assessment
app.post("/make-server-f64b0eb2/assessments", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const { title, description, courseId, dueDate, totalMarks } = await c.req.json();
    const assessmentId = `assessment:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const assessment = {
      id: assessmentId,
      title,
      description,
      courseId,
      dueDate,
      totalMarks,
      instructorId: user.id,
      instructorName: profile.name,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(assessmentId, assessment);
    
    // Create notification for all students
    const notification = {
      type: 'new_assessment',
      message: `New assessment "${title}" has been posted`,
      assessmentId,
      timestamp: new Date().toISOString()
    };
    
    const notifId = `notification:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(notifId, notification);
    
    return c.json(assessment);
  } catch (error) {
    console.log(`Error creating assessment: ${error}`);
    return c.json({ error: 'Failed to create assessment' }, 500);
  }
});

// Get all assessments
app.get("/make-server-f64b0eb2/assessments", async (c) => {
  try {
    const courseId = c.req.query('courseId');
    let assessments = await kv.getByPrefix('assessment:');
    
    if (courseId) {
      assessments = assessments.filter((a: any) => a.courseId === courseId);
    }
    
    return c.json(assessments || []);
  } catch (error) {
    console.log(`Error getting assessments: ${error}`);
    return c.json({ error: 'Failed to get assessments' }, 500);
  }
});

// ==================== SUBMISSION ROUTES ====================

// Submit assessment
app.post("/make-server-f64b0eb2/submissions", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const assessmentId = formData.get('assessmentId') as string;
    
    if (!file || !assessmentId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const fileName = `${user.id}-${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('make-f64b0eb2-submissions')
      .upload(fileName, arrayBuffer, {
        contentType: file.type
      });
    
    if (uploadError) {
      console.log(`Error uploading submission file: ${uploadError.message}`);
      return c.json({ error: 'Failed to upload file' }, 500);
    }
    
    const submissionId = `submission:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const submission = {
      id: submissionId,
      assessmentId,
      studentId: user.id,
      studentName: profile?.name || user.email,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      filePath: uploadData.path,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };
    
    await kv.set(submissionId, submission);
    
    // Create notification for student
    const notifId = `notification:student:${user.id}:${Date.now()}`;
    await kv.set(notifId, {
      userId: user.id,
      type: 'submission_confirmed',
      message: 'Your submission has been received successfully',
      submissionId,
      read: false,
      timestamp: new Date().toISOString()
    });
    
    return c.json(submission);
  } catch (error) {
    console.log(`Error submitting assessment: ${error}`);
    return c.json({ error: 'Failed to submit assessment' }, 500);
  }
});

// Get submissions
app.get("/make-server-f64b0eb2/submissions", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const assessmentId = c.req.query('assessmentId');
    const studentId = c.req.query('studentId');
    
    let submissions = await kv.getByPrefix('submission:');
    
    if (assessmentId) {
      submissions = submissions.filter((s: any) => s.assessmentId === assessmentId);
    }
    
    if (studentId) {
      submissions = submissions.filter((s: any) => s.studentId === studentId);
    }
    
    return c.json(submissions || []);
  } catch (error) {
    console.log(`Error getting submissions: ${error}`);
    return c.json({ error: 'Failed to get submissions' }, 500);
  }
});

// Download submission
app.get("/make-server-f64b0eb2/submissions/:id/download", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const submissionId = c.req.param('id');
    const submission = await kv.get(submissionId);
    
    if (!submission) {
      return c.json({ error: 'Submission not found' }, 404);
    }
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('make-f64b0eb2-submissions')
      .createSignedUrl(submission.filePath, 3600);
    
    if (signedUrlError) {
      console.log(`Error creating signed URL for submission: ${signedUrlError.message}`);
      return c.json({ error: 'Failed to generate download URL' }, 500);
    }
    
    return c.json({ url: signedUrlData.signedUrl, fileName: submission.fileName });
  } catch (error) {
    console.log(`Error downloading submission: ${error}`);
    return c.json({ error: 'Failed to download submission' }, 500);
  }
});

// ==================== GRADING ROUTES ====================

// Grade submission
app.post("/make-server-f64b0eb2/grades", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const { submissionId, grade, feedback, totalMarks } = await c.req.json();
    
    const submission = await kv.get(submissionId);
    if (!submission) {
      return c.json({ error: 'Submission not found' }, 404);
    }
    
    const gradeId = `grade:${submissionId}`;
    
    const gradeData = {
      id: gradeId,
      submissionId,
      assessmentId: submission.assessmentId,
      studentId: submission.studentId,
      grade,
      totalMarks,
      percentage: Math.round((grade / totalMarks) * 100),
      feedback,
      gradedBy: user.id,
      gradedByName: profile.name,
      gradedAt: new Date().toISOString(),
      verified: false, // Grades start as unverified
    };
    
    await kv.set(gradeId, gradeData);
    
    // Update submission status
    submission.status = 'graded';
    await kv.set(submissionId, submission);
    
    // Create notification for student
    const notifId = `notification:student:${submission.studentId}:${Date.now()}`;
    await kv.set(notifId, {
      userId: submission.studentId,
      type: 'grade_posted',
      message: 'Your assessment has been graded and is pending verification',
      gradeId,
      read: false,
      timestamp: new Date().toISOString()
    });
    
    return c.json(gradeData);
  } catch (error) {
    console.log(`Error grading submission: ${error}`);
    return c.json({ error: 'Failed to grade submission' }, 500);
  }
});

// Verify grade (Admin only)
app.put("/make-server-f64b0eb2/grades/:id/verify", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || profile.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions - Admin only' }, 403);
    }
    
    const gradeId = c.req.param('id');
    const { verified } = await c.req.json();
    
    const grade = await kv.get(gradeId);
    if (!grade) {
      return c.json({ error: 'Grade not found' }, 404);
    }
    
    grade.verified = verified;
    grade.verifiedAt = new Date().toISOString();
    grade.verifiedBy = user.id;
    grade.verifiedByName = profile.name;
    
    await kv.set(gradeId, grade);
    
    // Create notification for student when grade is verified and released
    if (verified) {
      const notifId = `notification:student:${grade.studentId}:${Date.now()}`;
      await kv.set(notifId, {
        userId: grade.studentId,
        type: 'grade_released',
        message: 'Your grade has been officially verified and released',
        gradeId,
        read: false,
        timestamp: new Date().toISOString()
      });
    }
    
    return c.json(grade);
  } catch (error) {
    console.log(`Error verifying grade: ${error}`);
    return c.json({ error: 'Failed to verify grade' }, 500);
  }
});

// Get grades
app.get("/make-server-f64b0eb2/grades", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const studentId = c.req.query('studentId');
    const assessmentId = c.req.query('assessmentId');
    
    let grades = await kv.getByPrefix('grade:');
    
    if (studentId) {
      grades = grades.filter((g: any) => g.studentId === studentId);
    }
    
    if (assessmentId) {
      grades = grades.filter((g: any) => g.assessmentId === assessmentId);
    }
    
    return c.json(grades || []);
  } catch (error) {
    console.log(`Error getting grades: ${error}`);
    return c.json({ error: 'Failed to get grades' }, 500);
  }
});

// Get grade for specific submission
app.get("/make-server-f64b0eb2/grades/submission/:submissionId", async (c) => {
  try {
    const submissionId = c.req.param('submissionId');
    const gradeId = `grade:${submissionId}`;
    
    const grade = await kv.get(gradeId);
    
    if (!grade) {
      return c.json({ error: 'Grade not found' }, 404);
    }
    
    return c.json(grade);
  } catch (error) {
    console.log(`Error getting grade: ${error}`);
    return c.json({ error: 'Failed to get grade' }, 500);
  }
});

// ==================== NOTIFICATION ROUTES ====================

// Get notifications for user
app.get("/make-server-f64b0eb2/notifications", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get user-specific notifications
    const userNotifications = await kv.getByPrefix(`notification:student:${user.id}:`);
    
    // Get global notifications
    const globalNotifications = await kv.getByPrefix('notification:');
    const filteredGlobal = globalNotifications.filter((n: any) => !n.userId);
    
    const allNotifications = [...userNotifications, ...filteredGlobal]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return c.json(allNotifications);
  } catch (error) {
    console.log(`Error getting notifications: ${error}`);
    return c.json({ error: 'Failed to get notifications' }, 500);
  }
});

// Mark notification as read
app.put("/make-server-f64b0eb2/notifications/:id/read", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const notifId = c.req.param('id');
    const notification = await kv.get(notifId);
    
    if (notification) {
      notification.read = true;
      await kv.set(notifId, notification);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error marking notification as read: ${error}`);
    return c.json({ error: 'Failed to update notification' }, 500);
  }
});

// ==================== REPORTING ROUTES ====================

// Get student performance report
app.get("/make-server-f64b0eb2/reports/student/:studentId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const studentId = c.req.param('studentId');
    
    // Get all grades for student
    const grades = await kv.getByPrefix('grade:');
    const studentGrades = grades.filter((g: any) => g.studentId === studentId);
    
    // Get all submissions for student
    const submissions = await kv.getByPrefix('submission:');
    const studentSubmissions = submissions.filter((s: any) => s.studentId === studentId);
    
    // Calculate statistics
    const totalAssessments = studentSubmissions.length;
    const gradedAssessments = studentGrades.length;
    const pendingAssessments = totalAssessments - gradedAssessments;
    
    const averageGrade = studentGrades.length > 0
      ? studentGrades.reduce((sum: number, g: any) => sum + g.percentage, 0) / studentGrades.length
      : 0;
    
    const report = {
      studentId,
      totalAssessments,
      gradedAssessments,
      pendingAssessments,
      averageGrade: Math.round(averageGrade),
      grades: studentGrades,
      submissions: studentSubmissions
    };
    
    return c.json(report);
  } catch (error) {
    console.log(`Error generating student report: ${error}`);
    return c.json({ error: 'Failed to generate report' }, 500);
  }
});

// Get course statistics (instructor/admin only)
app.get("/make-server-f64b0eb2/reports/course/:courseId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    const courseId = c.req.param('courseId');
    
    // Get all assessments for course
    const assessments = await kv.getByPrefix('assessment:');
    const courseAssessments = assessments.filter((a: any) => a.courseId === courseId);
    
    // Get all submissions
    const submissions = await kv.getByPrefix('submission:');
    const courseSubmissions = submissions.filter((s: any) => 
      courseAssessments.some((a: any) => a.id === s.assessmentId)
    );
    
    // Get all grades
    const grades = await kv.getByPrefix('grade:');
    const courseGrades = grades.filter((g: any) => 
      courseAssessments.some((a: any) => a.id === g.assessmentId)
    );
    
    const report = {
      courseId,
      totalAssessments: courseAssessments.length,
      totalSubmissions: courseSubmissions.length,
      totalGraded: courseGrades.length,
      averageGrade: courseGrades.length > 0
        ? Math.round(courseGrades.reduce((sum: number, g: any) => sum + g.percentage, 0) / courseGrades.length)
        : 0
    };
    
    return c.json(report);
  } catch (error) {
    console.log(`Error generating course report: ${error}`);
    return c.json({ error: 'Failed to generate report' }, 500);
  }
});

Deno.serve(app.fetch);