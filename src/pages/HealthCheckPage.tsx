import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GeminiAnalysisService } from '@/services/geminiAnalysisService';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const HealthCheckPage = () => {
  const [checks, setChecks] = useState({
    geminiAPI: { status: 'checking', message: '' },
    supabase: { status: 'checking', message: '' },
    geminiService: { status: 'checking', message: '' },
  });

  useEffect(() => {
    const runChecks = async () => {
      // Check Gemini API Key
      const geminiConfigured = GeminiAnalysisService.isConfigured();
      setChecks(prev => ({
        ...prev,
        geminiAPI: {
          status: geminiConfigured ? 'success' : 'error',
          message: geminiConfigured 
            ? 'Gemini API key is configured' 
            : 'Gemini API key not found in environment'
        }
      }));

      // Check Supabase Connection
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setChecks(prev => ({
          ...prev,
          supabase: {
            status: 'success',
            message: `Supabase connected${session ? ' (User logged in)' : ' (No active session)'}`
          }
        }));
      } catch (error) {
        setChecks(prev => ({
          ...prev,
          supabase: {
            status: 'error',
            message: `Supabase connection failed: ${error}`
          }
        }));
      }

      // Check Gemini Service
      if (geminiConfigured) {
        setChecks(prev => ({
          ...prev,
          geminiService: {
            status: 'success',
            message: 'Gemini service ready to analyze videos'
          }
        }));
      } else {
        setChecks(prev => ({
          ...prev,
          geminiService: {
            status: 'error',
            message: 'Gemini service cannot be initialized without API key'
          }
        }));
      }
    };

    runChecks();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-tt-blue mb-2">System Health Check</h1>
            <p className="text-gray-600">Verify all components are working correctly</p>
          </div>

          <div className="space-y-4">
            {Object.entries(checks).map(([key, check]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {check.status === 'checking' && (
                      <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                    )}
                    {check.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {check.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-sm ${
                    check.status === 'success' ? 'text-green-600' :
                    check.status === 'error' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {check.message}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-8 bg-blue-50">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Application:</strong> Servelytica AI</div>
              <div><strong>Environment:</strong> Development</div>
              <div><strong>API Model:</strong> Gemini 2.0 Flash</div>
              <div><strong>Database:</strong> Supabase</div>
              <div><strong>Framework:</strong> React + TypeScript</div>
              <div className="pt-4">
                <p className="text-gray-700">
                  If all checks are green, the application is ready for use. 
                  Visit <code className="bg-white px-2 py-1 rounded">/motion-analysis</code> to start analyzing videos.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 flex gap-4">
            <Button 
              onClick={() => window.location.href = '/motion-analysis'}
              className="bg-tt-orange hover:bg-orange-600 text-white"
            >
              Go to Motion Analysis
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Refresh Checks
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HealthCheckPage;
