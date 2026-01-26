import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { Upload, Download, FileText, Bell, Award, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface StudentDashboardProps {
  accessToken: string;
  userProfile: any;
  onLogout: () => void;
}

export function StudentDashboard({ accessToken, userProfile, onLogout }: StudentDashboardProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch materials
      const materialsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/materials`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          }
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
          }
        }
      );
      const assessmentsData = await assessmentsRes.json();
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);

      // Fetch submissions
      const submissionsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/submissions?studentId=${userProfile.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          }
        }
      );
      const submissionsData = await submissionsRes.json();
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);

      // Fetch grades
      const gradesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/grades?studentId=${userProfile.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          }
        }
      );
      const gradesData = await gradesRes.json();
      setGrades(Array.isArray(gradesData) ? gradesData : []);

      // Fetch notifications
      const notificationsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/notifications`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          }
        }
      );
      const notificationsData = await notificationsRes.json();
      setNotifications(Array.isArray(notificationsData) ? notificationsData : []);

      // Fetch student report
      const reportRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/reports/student/${userProfile.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          }
        }
      );
      const reportData = await reportRes.json();
      setReport(reportData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleDownloadMaterial = async (materialId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/materials/${materialId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to download');
      }

      // Open download URL in new tab
      window.open(data.url, '_blank');
      toast.success(`Downloading ${data.fileName}`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download material');
    }
  };

  const handleSubmitAssessment = async () => {
    if (!selectedFile || !selectedAssessment) {
      toast.error('Please select an assessment and upload a file');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assessmentId', selectedAssessment);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f64b0eb2/submissions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': publicAnonKey,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      toast.success('Assessment submitted successfully!');
      setSelectedFile(null);
      setSelectedAssessment('');
      fetchData();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EduConnect AMS</h1>
            <p className="text-sm text-gray-600">Welcome, {userProfile.name}</p>
          </div>
          <div className="flex gap-4 items-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Notifications</DialogTitle>
                  <DialogDescription>Recent updates and announcements</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500">No notifications</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id || notif.timestamp} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notif.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Performance Overview */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Assessments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.totalAssessments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Graded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.gradedAssessments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.pendingAssessments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Average Grade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.averageGrade}%</div>
                <Progress value={report.averageGrade} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="materials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="materials">Learning Materials</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="submissions">My Submissions</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
          </TabsList>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Materials</CardTitle>
                <CardDescription>Download course materials and resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materials.length === 0 ? (
                    <p className="text-sm text-gray-500">No materials available</p>
                  ) : (
                    materials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <h3 className="font-medium">{material.title}</h3>
                            <p className="text-sm text-gray-600">{material.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Uploaded by {material.uploadedByName} • {new Date(material.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadMaterial(material.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
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
                <CardTitle>Submit Assessment</CardTitle>
                <CardDescription>Upload your completed assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Assessment</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedAssessment}
                    onChange={(e) => setSelectedAssessment(e.target.value)}
                  >
                    <option value="">Choose an assessment...</option>
                    {assessments.map((assessment) => (
                      <option key={assessment.id} value={assessment.id}>
                        {assessment.title} (Due: {new Date(assessment.dueDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border rounded-md"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
                  )}
                </div>
                <Button
                  onClick={handleSubmitAssessment}
                  disabled={isSubmitting || !selectedFile || !selectedAssessment}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Assessments</CardTitle>
                <CardDescription>View all assessments and their details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessments.length === 0 ? (
                    <p className="text-sm text-gray-500">No assessments available</p>
                  ) : (
                    assessments.map((assessment) => (
                      <div key={assessment.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{assessment.title}</h3>
                          <Badge>{assessment.totalMarks} marks</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Instructor: {assessment.instructorName}</span>
                          <span>Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Submissions</CardTitle>
                <CardDescription>Track your submitted assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissions.length === 0 ? (
                    <p className="text-sm text-gray-500">No submissions yet</p>
                  ) : (
                    submissions.map((submission) => (
                      <div key={submission.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{submission.fileName}</h3>
                            <p className="text-sm text-gray-600">
                              Submitted: {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                            {submission.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Grades</CardTitle>
                <CardDescription>View your assessment results and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {grades.length === 0 ? (
                    <p className="text-sm text-gray-500">No grades yet</p>
                  ) : (
                    grades.map((grade) => (
                      <div key={grade.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-yellow-600" />
                              <h3 className="font-medium">
                                Grade: {grade.grade}/{grade.totalMarks} ({grade.percentage}%)
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Graded by {grade.gradedByName} on {new Date(grade.gradedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium mb-1">Feedback:</h4>
                          <p className="text-sm text-gray-700">{grade.feedback}</p>
                        </div>
                        <Progress value={grade.percentage} className="mt-2" />
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