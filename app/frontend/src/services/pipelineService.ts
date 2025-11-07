/**
 * Pipeline Service
 * Connects to the backend ML pipeline for real-time predictions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface PipelinePredictions {
  burnout_risk: {
    score: number; // 0-1 scale
    category: string;
    description: string;
    risk_level: string;
    recommendations: string[];
    status: string;
  };
  wellbeing: {
    score: number; // 0-100 scale
    category: string;
    description: string;
    health_status: string;
    recommendations: string[];
    status: string;
  };
  efficiency: {
    score: number; // 0-100 scale
    category: string;
    description: string;
    performance_level: string;
    recommendations: string[];
    status: string;
  };
}

export interface OverallAssessment {
  status: string;
  priority: string;
  message: string;
  color: string;
  composite_health_score: number;
  breakdown: {
    burnout_impact: number;
    wellbeing_impact: number;
    efficiency_impact: number;
  };
}

export interface PriorityAction {
  priority: string;
  category: string;
  action: string;
  icon: string;
}

export interface PipelineResponse {
  status: string;
  user_id: string;
  timestamp: string;
  predictions: PipelinePredictions;
  overall_assessment: OverallAssessment;
  priority_actions: PriorityAction[];
  feature_info: {
    total_features: number;
    provided_features: number;
    imputed_features: number;
    data_completeness: string;
  };
  performance: {
    total_pipeline_time_ms: number;
    preprocessing_time_ms: number;
    inference_time_ms: number;
    models_executed: number;
  };
}

/**
 * Fetch predictions from the ML pipeline
 */
export async function fetchPredictions(
  userId: string,
  providers: string[] = ['microsoft', 'slack', 'jira'],
  daysBack: number = 14
): Promise<PipelineResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/pipeline/predict?user_id=${userId}&days_back=${daysBack}&${providers.map(p => `providers=${p}`).join('&')}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Pipeline API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    throw error;
  }
}

/**
 * Fetch predictions with custom features (skip API data fetching)
 */
export async function fetchPredictionsWithCustomFeatures(
  userId: string,
  features: Record<string, any>
): Promise<PipelineResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/pipeline/predict/custom`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          features: features,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Pipeline API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching predictions with custom features:', error);
    throw error;
  }
}

/**
 * Check pipeline health
 */
export async function checkPipelineHealth(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/pipeline/health`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Pipeline health check failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking pipeline health:', error);
    throw error;
  }
}

/**
 * Convert burnout risk score (0-1) to percentage for display
 */
export function burnoutRiskToPercentage(score: number): number {
  return Math.round(score * 100);
}

/**
 * Get color for burnout risk
 */
export function getBurnoutColor(score: number): string {
  const percentage = burnoutRiskToPercentage(score);
  if (percentage >= 70) return '#f44336'; // Red - High risk
  if (percentage >= 50) return '#ff9800'; // Orange - Moderate risk
  if (percentage >= 30) return '#ffc107'; // Yellow - Low-moderate risk
  return '#4caf50'; // Green - Low risk
}

/**
 * Get color for wellbeing score
 */
export function getWellbeingColor(score: number): string {
  if (score >= 80) return '#4caf50'; // Green - Excellent
  if (score >= 60) return '#8bc34a'; // Light green - Good
  if (score >= 40) return '#ff9800'; // Orange - Fair
  return '#f44336'; // Red - Poor
}

/**
 * Get color for efficiency score
 */
export function getEfficiencyColor(score: number): string {
  if (score >= 80) return '#4caf50'; // Green - Excellent
  if (score >= 60) return '#8bc34a'; // Light green - Good
  if (score >= 40) return '#ff9800'; // Orange - Moderate
  return '#f44336'; // Red - Needs improvement
}
