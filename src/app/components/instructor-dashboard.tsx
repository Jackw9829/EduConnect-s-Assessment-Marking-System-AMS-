import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Upload, Download, FileText, LogOut, PlusCircle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface InstructorDashboardProps {
  accessToken: string;
  userProfile: any;
  onLogout: () => void;
}

export function InstructorDashboard({ accessToken, userProfile, onLogout }: InstructorDashboardProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Material upload state
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');
  const [materialCourse, setMaterialCourse] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Assessment creation state
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDesc, setAssessmentDesc] = useState('');
  const [assessmentCourse, setAssessmentCourse] = useState('');
  const [assessmentDue, setAssessmentDue] = useState('');
  const [assessmentMarks, setAssessmentMarks] = useState('100');
  const [isCreating, setIsCreating] = useState(false);
  
  // Course creation state
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  
  // Grading state
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch courses
      const coursesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/courses`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          },
        }
      );
      const coursesData = await coursesRes.json();
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      // Fetch materials
      const materialsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/materials`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          },
        }
      );
      const materialsData = await materialsRes.json();
      setMaterials(Array.isArray(materialsData) ? materialsData : []);

      // Fetch assessments
      const assessmentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/assessments`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          },
        }
      );
      const assessmentsData = await assessmentsRes.json();
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);

      // Fetch submissions
      const submissionsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/submissions`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          },
        }
      );
      const submissionsData = await submissionsRes.json();
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleUploadMaterial = async () => {
    if (!materialFile || !materialTitle || !materialCourse) {
      toast.error('Please fill all fields');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', materialFile);
      formData.append('title', materialTitle);
      formData.append('description', materialDesc);
      formData.append('courseId', materialCourse);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/materials/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error('Failed to upload');

      toast.success('Material uploaded successfully!');
      setMaterialTitle('');
      setMaterialDesc('');
      setMaterialCourse('');
      setMaterialFile(null);
      fetchData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload material');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!assessmentTitle || !assessmentCourse || !assessmentDue || !assessmentMarks) {
      toast.error('Please fill all fields');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/assessments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          },
          body: JSON.stringify({
            title: assessmentTitle,
            description: assessmentDesc,
            courseId: assessmentCourse,
            dueDate: assessmentDue,
            totalMarks: parseInt(assessmentMarks),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to create assessment');

      toast.success('Assessment created successfully!');
      setAssessmentTitle('');
      setAssessmentDesc('');
      setAssessmentCourse('');
      setAssessmentDue('');
      setAssessmentMarks('100');
      fetchData();
    } catch (error: any) {
      console.error('Create error:', error);
      toast.error(error.message || 'Failed to create assessment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!courseName || !courseDesc) {
      toast.error('Please fill all fields');
      return;
    }

    setIsCreatingCourse(true);

    try {
      console.log('Creating course with data:', { name: courseName, description: courseDesc });
      console.log('Using access token:', accessToken ? 'Token present' : 'No token');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/courses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          },
          body: JSON.stringify({
            name: courseName,
            description: courseDesc,
          }),
        }
      );

      const responseData = await response.json();
      console.log('Response:', response.status, responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create course');
      }

      toast.success('Course created successfully!');
      setCourseName('');
      setCourseDesc('');
      fetchData();
    } catch (error: any) {
      console.error('Create course error:', error);
      toast.error(error.message || 'Failed to create course');
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !gradeScore || !gradeFeedback) {
      toast.error('Please provide grade and feedback');
      return;
    }

    setIsGrading(true);

    try {
      const assessment = assessments.find(a => a.id === selectedSubmission.assessmentId);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/grades`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          },
          body: JSON.stringify({
            submissionId: selectedSubmission.id,
            grade: parseInt(gradeScore),
            totalMarks: assessment?.totalMarks || 100,
            feedback: gradeFeedback,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to grade submission');

      toast.success('Submission graded successfully!');
      setSelectedSubmission(null);
      setGradeScore('');
      setGradeFeedback('');
      fetchData();
    } catch (error: any) {
      console.error('Grading error:', error);
      toast.error(error.message || 'Failed to grade submission');
    } finally {
      setIsGrading(false);
    }
  };

  const handleDownloadSubmission = async (submissionId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/submissions/${submissionId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      window.open(data.url, '_blank');
      toast.success(`Downloading ${data.fileName}`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download');
    }
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'submitted');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EduConnect AMS - Instructor</h1>
            <p className="text-sm text-gray-600">Welcome, {userProfile.name}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{materials.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Grading
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSubmissions.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="materials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="grading">
              Grading
              {pendingSubmissions.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingSubmissions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Course</CardTitle>
                <CardDescription>Add a new course to the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Course Name</Label>
                  <Input
                    placeholder="e.g., Business Strategy 101"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course Description</Label>
                  <Textarea
                    placeholder="Describe the course..."
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateCourse}
                  disabled={isCreatingCourse}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {isCreatingCourse ? 'Creating...' : 'Create Course'}
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Courses you've created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courses.filter(c => c.instructorId === userProfile.id).length === 0 ? (
                    <p className="text-sm text-gray-500">No courses created yet. Create your first course above!</p>
                  ) : (
                    courses
                      .filter(c => c.instructorId === userProfile.id)
                      .map((course) => (
                        <div key={course.id} className="p-4 border rounded-lg">
                          <h3 className="font-medium">{course.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Created {new Date(course.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Learning Material</CardTitle>
                <CardDescription>Share resources with students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Business Strategy Report – Week 4"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of the material"
                    value={materialDesc}
                    onChange={(e) => setMaterialDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={materialCourse}
                    onChange={(e) => setMaterialCourse(e.target.value)}
                  >
                    <option value="">Select a course...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>File</Label>
                  <input
                    type="file"
                    onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <Button
                  onClick={handleUploadMaterial}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload Material'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uploaded Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materials.filter(m => m.uploadedBy === userProfile.id).length === 0 ? (
                    <p className="text-sm text-gray-500">No materials uploaded yet</p>
                  ) : (
                    materials
                      .filter(m => m.uploadedBy === userProfile.id)
                      .map((material) => (
                        <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <div>
                              <h3 className="font-medium">{material.title}</h3>
                              <p className="text-sm text-gray-600">{material.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(material.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Assessment</CardTitle>
                <CardDescription>Set up a new assessment for students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Marketing Strategy Assignment"
                    value={assessmentTitle}
                    onChange={(e) => setAssessmentTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Assessment instructions and requirements"
                    value={assessmentDesc}
                    onChange={(e) => setAssessmentDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={assessmentCourse}
                      onChange={(e) => setAssessmentCourse(e.target.value)}
                    >
                      <option value="">Select a course...</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      value={assessmentMarks}
                      onChange={(e) => setAssessmentMarks(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={assessmentDue}
                    onChange={(e) => setAssessmentDue(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateAssessment}
                  disabled={isCreating}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : 'Create Assessment'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessments.filter(a => a.instructorId === userProfile.id).length === 0 ? (
                    <p className="text-sm text-gray-500">No assessments created yet</p>
                  ) : (
                    assessments
                      .filter(a => a.instructorId === userProfile.id)
                      .map((assessment) => (
                        <div key={assessment.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium">{assessment.title}</h3>
                            <Badge>{assessment.totalMarks} marks</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                          <p className="text-xs text-gray-500">
                            Due: {new Date(assessment.dueDate).toLocaleString()}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grading" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Submissions</CardTitle>
                <CardDescription>Review and grade student submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingSubmissions.length === 0 ? (
                    <p className="text-sm text-gray-500">No pending submissions</p>
                  ) : (
                    pendingSubmissions.map((submission) => (
                      <div key={submission.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium">{submission.studentName}</h3>
                            <p className="text-sm text-gray-600">{submission.fileName}</p>
                            <p className="text-xs text-gray-500">
                              Submitted: {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge>{submission.status}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadSubmission(submission.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => setSelectedSubmission(submission)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Grade
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Grade Submission</DialogTitle>
                                <DialogDescription>
                                  Provide score and feedback for {submission.studentName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Score</Label>
                                  <Input
                                    type="number"
                                    placeholder="Enter marks"
                                    value={gradeScore}
                                    onChange={(e) => setGradeScore(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Feedback</Label>
                                  <Textarea
                                    placeholder="Provide detailed feedback..."
                                    value={gradeFeedback}
                                    onChange={(e) => setGradeFeedback(e.target.value)}
                                    rows={5}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={handleGradeSubmission}
                                  disabled={isGrading}
                                >
                                  {isGrading ? 'Submitting...' : 'Submit Grade'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
