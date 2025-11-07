import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  VideoCall,
  AccessTime,
  TrendingUp,
  Speed,
  Login,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { generateConsistentValue, getTestScenarioValues } from '../utils/consistentValues';
import { useState, useEffect } from 'react';
import { 
  fetchPredictions, 
  PipelineResponse,
  burnoutRiskToPercentage,
  getBurnoutColor,
  getWellbeingColor,
  getEfficiencyColor
} from '../services/pipelineService';

interface UserAnalytics {
  taskCompletionRate?: number;
  loggedHours?: number;
  wellbeingScore?: number;
  meetingHours?: number;
  meetingCount?: number;
  messagesSent?: number;
  messagesReceived?: number;
  earlyStarts?: number;
  lateExits?: number;
  lateStarts?: number;
  earlyExits?: number;
  burnoutRisk?: number;
  efficiency?: number;
  stressLevel?: 'low' | 'medium' | 'high';
  trend?: 'up' | 'down' | 'stable';
  lastActive?: string;
}

export const WellbeingProfile = () => {
  const { user } = useAuth();
  
  const email = user?.email || '';
  
  // State for pipeline predictions
  const [pipelineData, setPipelineData] = useState<PipelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check for test scenario values first
  const testScenario = getTestScenarioValues(email);
  
  // Generate consistent dummy values based on email hash (same as TeamOverview)
  const generateValue = (seed: number, min: number, max: number): number => {
    return generateConsistentValue(email, seed, min, max);
  };

  // Fetch predictions from pipeline
  useEffect(() => {
    const loadPredictions = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch from pipeline API
        const predictions = await fetchPredictions(user.id, ['microsoft', 'slack', 'jira'], 14);
        setPipelineData(predictions);
        console.log('Pipeline predictions loaded:', predictions);
      } catch (err) {
        console.error('Error loading predictions:', err);
        setError('Could not load predictions. Using fallback data.');
        // Fall back to dummy data on error
      } finally {
        setIsLoading(false);
      }
    };

    loadPredictions();
  }, [user?.id]);

  // TODO: Fetch real analytics data from Firestore
  // For now, use consistent dummy values based on email
  const getUserAnalytics = (): UserAnalytics | null => {
    // In the future, this would fetch from Firestore: doc(db, 'analytics', user.id)
    // For now, return null to use dummy values
    return null;
  };
  
  const analytics = getUserAnalytics();
  
  // Use pipeline data first, then test scenario, then analytics, then generate consistent dummy values
  const taskCompletionRate = testScenario?.taskCompletionRate ?? analytics?.taskCompletionRate ?? generateValue(1, 60, 100);
  const loggedHours = analytics?.loggedHours ?? generateValue(2, 30, 45);
  
  // Get scores from pipeline or fallback to dummy data
  const wellbeingScore = pipelineData?.predictions?.wellbeing?.score 
    ?? testScenario?.wellbeingScore 
    ?? analytics?.wellbeingScore 
    ?? generateValue(3, 50, 90);
    
  const burnoutRisk = pipelineData?.predictions?.burnout_risk?.score 
    ? burnoutRiskToPercentage(pipelineData.predictions.burnout_risk.score)
    : analytics?.burnoutRisk 
    ?? Math.min(100, Math.max(0, 100 - wellbeingScore + (generateValue(5, 8, 18) > 15 ? 20 : 0)));

  const efficiency = pipelineData?.predictions?.efficiency?.score 
    ?? analytics?.efficiency 
    ?? Math.round((taskCompletionRate + Math.min(100, (loggedHours / 40) * 100)) / 2);
  
  const meetingHours = analytics?.meetingHours ?? generateValue(5, 8, 18);
  const meetingCount = analytics?.meetingCount ?? generateValue(6, 12, 25);
  const earlyStarts = analytics?.earlyStarts ?? generateValue(9, 0, 4);
  const lateExits = analytics?.lateExits ?? generateValue(10, 0, 3);
  const lateStarts = analytics?.lateStarts ?? generateValue(11, 0, 2);
  const earlyExits = analytics?.earlyExits ?? generateValue(12, 0, 1);

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Error notification */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Analyzing your wellbeing data...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Running 3 ML models in parallel
            </Typography>
          </Box>
        </Box>
      )}

      {/* Pipeline info banner */}
      {pipelineData && !isLoading && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                🤖 Real-time ML Predictions
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Data completeness: {pipelineData.feature_info?.data_completeness} • 
                Processed in {Math.round(pipelineData.performance?.total_pipeline_time_ms || 0)}ms
              </Typography>
            </Box>
            {pipelineData.overall_assessment && (
              <Chip
                label={pipelineData.overall_assessment.message}
                sx={{
                  bgcolor: pipelineData.overall_assessment.color,
                  color: 'white',
                  fontWeight: 600,
                }}
                size="small"
              />
            )}
          </Box>
        </Paper>
      )}

      {!isLoading && (
        <>
      {/* Score Cards - Square boxes with circular progress */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr', lg: 'repeat(3, 1fr)' },
          gap: 4,
          mb: 4,
        }}
      >
        {/* Wellbeing Score Card */}
        <Card sx={{ boxShadow: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={120}
                  thickness={4}
                  sx={{
                    color: '#e0e0e0',
                  }}
                />
                <CircularProgress
                  variant="determinate"
                  value={wellbeingScore}
                  size={120}
                  thickness={4}
                  sx={{
                    color: wellbeingScore >= 80 ? '#4caf50' : wellbeingScore >= 60 ? '#ff9800' : '#f44336',
                    position: 'absolute',
                    left: 0,
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    },
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
                    {wellbeingScore}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: 'center', color: '#2c3e50' }}>
                Wellbeing Score
              </Typography>
              {pipelineData?.predictions?.wellbeing?.category && (
                <Chip
                  label={pipelineData.predictions.wellbeing.category}
                  size="small"
                  sx={{
                    bgcolor: wellbeingScore >= 80 ? '#e8f5e9' : wellbeingScore >= 60 ? '#fff3e0' : '#ffebee',
                    color: wellbeingScore >= 80 ? '#2e7d32' : wellbeingScore >= 60 ? '#e65100' : '#c62828',
                    fontWeight: 600,
                    mb: 1,
                  }}
                />
              )}
              <Typography variant="body2" sx={{ color: '#7f8c8d', textAlign: 'center' }}>
                {pipelineData?.predictions?.wellbeing?.description || 'Overall wellness based on work-life balance'}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Burnout Risk Score Card */}
        <Card sx={{ boxShadow: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={120}
                  thickness={4}
                  sx={{
                    color: '#e0e0e0',
                  }}
                />
                <CircularProgress
                  variant="determinate"
                  value={burnoutRisk}
                  size={120}
                  thickness={4}
                  sx={{
                    color: burnoutRisk > 70 ? '#f44336' : burnoutRisk > 40 ? '#ff9800' : '#4caf50',
                    position: 'absolute',
                    left: 0,
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    },
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
                    {burnoutRisk}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: 'center', color: '#2c3e50' }}>
                Burnout Risk
              </Typography>
              <Chip 
                label={pipelineData?.predictions?.burnout_risk?.category || (burnoutRisk < 40 ? 'Low Risk' : burnoutRisk < 70 ? 'Moderate Risk' : 'High Risk')}
                size="small"
                sx={{ 
                  bgcolor: burnoutRisk < 40 ? '#e8f5e9' : burnoutRisk < 70 ? '#fff3e0' : '#ffebee',
                  color: burnoutRisk < 40 ? '#2e7d32' : burnoutRisk < 70 ? '#e65100' : '#c62828',
                  fontWeight: 600,
                  mb: 1,
                }}
              />
              {pipelineData?.predictions?.burnout_risk?.description && (
                <Typography variant="body2" sx={{ color: '#7f8c8d', textAlign: 'center', mt: 1 }}>
                  {pipelineData.predictions.burnout_risk.description}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Efficiency Score Card */}
        <Card sx={{ boxShadow: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={120}
                  thickness={4}
                  sx={{
                    color: '#e0e0e0',
                  }}
                />
                <CircularProgress
                  variant="determinate"
                  value={efficiency}
                  size={120}
                  thickness={4}
                  sx={{
                    color: efficiency >= 80 ? '#4caf50' : efficiency >= 60 ? '#ff9800' : '#f44336',
                    position: 'absolute',
                    left: 0,
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    },
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
                    {efficiency}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: 'center', color: '#2c3e50' }}>
                Efficiency Score
              </Typography>
              {pipelineData?.predictions?.efficiency?.category && (
                <Chip
                  label={pipelineData.predictions.efficiency.category}
                  size="small"
                  sx={{
                    bgcolor: efficiency >= 80 ? '#e8f5e9' : efficiency >= 60 ? '#fff3e0' : '#ffebee',
                    color: efficiency >= 80 ? '#2e7d32' : efficiency >= 60 ? '#e65100' : '#c62828',
                    fontWeight: 600,
                    mb: 1,
                  }}
                />
              )}
              <Typography variant="body2" sx={{ color: '#7f8c8d', textAlign: 'center' }}>
                {pipelineData?.predictions?.efficiency?.description || 'Based on task completion and hours'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Productivity Metrics Grid */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
        Weekly Breakdown
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
          gap: 3,
          mb: 4,
        }}
      >
          {[
            {
              title: 'Meeting Hours',
              value: meetingHours,
              unit: 'hrs/week',
              icon: <VideoCall />,
              color: '#1976d2',
              bgColor: '#e3f2fd',
              description: 'Time in meetings',
            },
            {
              title: 'Meeting Count',
              value: meetingCount,
              unit: 'meetings/week',
              icon: <VideoCall />,
              color: '#1976d2',
              bgColor: '#e3f2fd',
              description: 'Meetings attended',
            },
            {
              title: 'Logged Hours',
              value: loggedHours,
              unit: 'hrs/week',
              icon: <AccessTime />,
              color: '#7b1fa2',
              bgColor: '#f3e5f5',
              description: 'Hours logged',
            },
            {
              title: 'Early Starts',
              value: earlyStarts,
              unit: 'days/week',
              icon: <Login />,
              color: '#388e3c',
              bgColor: '#e8f5e9',
              description: 'Started early',
            },
            {
              title: 'Late Exits',
              value: lateExits,
              unit: 'days/week',
              icon: <Logout />,
              color: '#7b1fa2',
              bgColor: '#f3e5f5',
              description: 'Left late',
            },
            {
              title: 'Late Starts',
              value: lateStarts,
              unit: 'days/week',
              icon: <TrendingUp />,
              color: '#e67e22',
              bgColor: '#e67e2215',
              description: 'Started late',
            },
            {
              title: 'Early Exits',
              value: earlyExits,
              unit: 'days/week',
              icon: <Speed />,
              color: '#c0392b',
              bgColor: '#c0392b15',
              description: 'Left early',
            },
            {
              title: 'Performance Score',
              value: 85,
              unit: '/100',
              icon: <TrendingUp />,
              color: '#8e44ad',
              bgColor: '#8e44ad15',
              description: 'Overall performance',
            },
          ].map((metric, index) => (
            <Paper
              key={index}
              sx={{
                p: 2.5,
                borderRadius: 3,
                boxShadow: 2,
                background: metric.bgColor,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-6px)',
                },
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    color: metric.color,
                    boxShadow: 2,
                  }}
                >
                  {metric.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                    {metric.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.5 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: metric.color,
                      }}
                    >
                      {metric.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                      {metric.unit}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#95a5a6', display: 'block', mt: 0.5 }}>
                    {metric.description}
                  </Typography>
                </Box>
              </Box>
            </Paper>
        ))}
      </Box>

      {/* Summary Cards */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Summary & Insights
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 2,
        }}
      >
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Communication Activity
              </Typography>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2">Messages Sent</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    245
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2">Messages Received</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    187
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Net Ratio</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    1.31x
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ boxShadow: 1, border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Time Management
              </Typography>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2">Logged Hours</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    38.5h
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2">Meeting Hours</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    12.5h (32%)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Deep Work Time</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>
                    26h (68%)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ boxShadow: 1, border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Attendance Patterns
              </Typography>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2">Early Starts</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>
                    3 days
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2">Late Starts</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ff9800' }}>
                    1 day
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">On-Time %</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>
                    80%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
      </Box>

      {/* Model Recommendations Section */}
      {pipelineData?.predictions && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
            🎯 AI-Powered Recommendations
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            {/* Burnout Risk Recommendations */}
            {pipelineData.predictions.burnout_risk?.recommendations && (
              <Card sx={{ border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#f44336' }}>
                    🔥 Burnout Risk
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    {pipelineData.predictions.burnout_risk.description}
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    {pipelineData.predictions.burnout_risk.recommendations.map((rec, idx) => (
                      <Typography key={idx} component="li" variant="body2" sx={{ mb: 1 }}>
                        {rec}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Wellbeing Recommendations */}
            {pipelineData.predictions.wellbeing?.recommendations && (
              <Card sx={{ border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#4caf50' }}>
                    ❤️ Wellbeing
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    {pipelineData.predictions.wellbeing.description}
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    {pipelineData.predictions.wellbeing.recommendations.map((rec, idx) => (
                      <Typography key={idx} component="li" variant="body2" sx={{ mb: 1 }}>
                        {rec}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Efficiency Recommendations */}
            {pipelineData.predictions.efficiency?.recommendations && (
              <Card sx={{ border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#1976d2' }}>
                    ⚡ Efficiency
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    {pipelineData.predictions.efficiency.description}
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    {pipelineData.predictions.efficiency.recommendations.map((rec, idx) => (
                      <Typography key={idx} component="li" variant="body2" sx={{ mb: 1 }}>
                        {rec}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      )}
      </>
      )}
    </Box>
  );
};