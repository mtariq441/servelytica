import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import VideoUploadForm from "@/components/upload/VideoUploadForm";
import { uploadFileToStorage } from "@/services/uploadService";
import { AnalysisQuotaService } from "@/services/analysisQuotaService";
import { QuotaExceededDialog } from "@/components/profile/QuotaExceededDialog";

const UploadPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    focusArea: "",
    coachIds: [] as string[]
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [quotaExceededDialogOpen, setQuotaExceededDialogOpen] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    analysesUsed: number;
    analysesLimit: number;
    nextResetDate: Date | null;
  } | null>(null);

  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  const handleUploadSuccess = () => {
    toast({
      title: "Upload successful",
      description: "Your video has been uploaded.",
      variant: "default"
    });
    navigate("/upload/complete");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-tt-blue mb-2">Upload Your Game</h1>
            <p className="text-gray-600">
              Share your match video and get professional feedback from top coaches
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <VideoUploadForm
                uploading={uploading}
                setUploading={setUploading}
                videoFile={videoFile}
                setVideoFile={setVideoFile}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleUploadSuccess}
              />

            </CardContent>
          </Card>
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              By uploading your video, you agree to our <a href="/terms" className="text-tt-blue hover:underline">Terms of Service</a> and <a href="/privacy" className="text-tt-blue hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
      {/* Quota Exceeded Dialog */}
      {quotaInfo && (
        <QuotaExceededDialog
          isOpen={quotaExceededDialogOpen}
          onOpenChange={setQuotaExceededDialogOpen}
          quota={quotaInfo}
        />
      )}
    </div>
  );
};

export default UploadPage;
