import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { LogOut, PlusCircle, CheckCircle, XCircle, Users, BookOpen, FileCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Separator } from './ui/separator';

interface AdminDashboardProps {
  accessToken: string;
  userProfile: any;
  onLogout: () => void;
}

export function AdminDashboard({ accessToken, userProfile, onLogout }: AdminDashboardProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Course creation state
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  
  // Grade verification state
  const [selectedGrade, setSelectedGrade] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch courses
      const coursesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/courses`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const coursesData = await coursesRes.json();
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      // Fetch assessments
      const assessmentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/assessments`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const assessmentsData = await assessmentsRes.json();
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);

      // Fetch submissions
      const submissionsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/submissions`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const submissionsData = await submissionsRes.json();
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);

      // Fetch all grades
      const gradesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/grades`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const gradesData = await gradesRes.json();
      setGrades(Array.isArray(gradesData) ? gradesData : []);

      // Calculate stats
      const pendingGrades = Array.isArray(gradesData) ? gradesData.filter((g: any) => !g.verified) : [];
      setStats({
        totalCourses: Array.isArray(coursesData) ? coursesData.length : 0,
        totalAssessments: Array.isArray(assessmentsData) ? assessmentsData.length : 0,
        totalSubmissions: Array.isArray(submissionsData) ? submissionsData.length : 0,
        pendingVerification: pendingGrades.length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleCreateCourse = async () => {
    if (!courseName) {
      toast.error('Please enter a course name');
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

  const handleVerifyGrade = async (gradeId: string, verified: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/grades/${gradeId}/verify`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ verified }),
        }
      );

      if (!response.ok) throw new Error('Failed to verify grade');

      toast.success(verified ? 'Grade verified and released!' : 'Grade verification revoked');
      fetchData();
    } catch (error: any) {
      console.error('Verify grade error:', error);
      toast.error(error.message || 'Failed to verify grade');
    }
  };

  const pendingGrades = grades.filter(g => !g.verified);
  const verifiedGrades = grades.filter(g => g.verified);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EduConnect AMS - Exam Administrator</h1>
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
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Total Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Total Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAssessments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Pending Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pendingVerification}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="verification" className="space-y-4">
          <TabsList>
            <TabsTrigger value="verification">
              Grade Verification
              {pendingGrades.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingGrades.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="courses">Course Management</TabsTrigger>
            <TabsTrigger value="reports">System Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="verification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Grade Verification</CardTitle>
                <CardDescription>Review and officially release student grades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingGrades.length === 0 ? (
                    <p className="text-sm text-gray-500">No grades pending verification</p>
                  ) : (
                    pendingGrades.map((grade) => {
                      const submission = submissions.find(s => s.id === grade.submissionId);
                      const assessment = assessments.find(a => a.id === grade.assessmentId);
                      
                      return (
                        <div key={grade.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">
                                Student: {submission?.studentName || 'Unknown'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Assessment: {assessment?.title || 'Unknown'}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Grade: {grade.grade}/{grade.totalMarks} ({grade.percentage}%)
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Graded by {grade.gradedByName} on {new Date(grade.gradedAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant="secondary">Pending</Badge>
                          </div>
                          <Separator />
                          <div>
                            <h4 className="text-sm font-medium mb-1">Feedback:</h4>
                            <p className="text-sm text-gray-700">{grade.feedback}</p>
                          </div>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedGrade(grade)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Verify & Release
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Verify and Release Grade</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to verify and officially release this grade to the student?
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 py-4">
                                  <p className="text-sm"><strong>Student:</strong> {submission?.studentName}</p>
                                  <p className="text-sm"><strong>Assessment:</strong> {assessment?.title}</p>
                                  <p className="text-sm"><strong>Grade:</strong> {grade.grade}/{grade.totalMarks} ({grade.percentage}%)</p>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => {
                                      handleVerifyGrade(grade.id, true);
                                      setSelectedGrade(null);
                                    }}
                                  >
                                    Confirm Verification
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verified & Released Grades</CardTitle>
                <CardDescription>Grades that have been officially released to students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {verifiedGrades.length === 0 ? (
                    <p className="text-sm text-gray-500">No verified grades yet</p>
                  ) : (
                    verifiedGrades.slice(0, 5).map((grade) => {
                      const submission = submissions.find(s => s.id === grade.submissionId);
                      const assessment = assessments.find(a => a.id === grade.assessmentId);
                      
                      return (
                        <div key={grade.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">
                                {submission?.studentName || 'Unknown'} - {grade.grade}/{grade.totalMarks} ({grade.percentage}%)
                              </h3>
                              <p className="text-sm text-gray-600">
                                {assessment?.title || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Verified on {new Date(grade.verifiedAt || grade.gradedAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge className="bg-green-600">Verified</Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Course</CardTitle>
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
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Course description..."
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
                <CardTitle>All Courses</CardTitle>
                <CardDescription>Manage system courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courses.length === 0 ? (
                    <p className="text-sm text-gray-500">No courses created yet</p>
                  ) : (
                    courses.map((course) => (
                      <div key={course.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{course.name}</h3>
                            <p className="text-sm text-gray-600">{course.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Instructor: {course.instructorName}
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

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Key metrics and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Courses</p>
                      <p className="text-2xl font-bold">{stats?.totalCourses || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Assessments</p>
                      <p className="text-2xl font-bold">{stats?.totalAssessments || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Submissions</p>
                      <p className="text-2xl font-bold">{stats?.totalSubmissions || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Verified Grades</p>
                      <p className="text-2xl font-bold">{verifiedGrades.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
