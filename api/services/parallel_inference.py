"""
Parallel Model Inference Service
Runs three ML models (burnout risk, wellbeing, efficiency) in parallel
"""
import asyncio
import logging
from typing import Dict, Any, List, Tuple
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import sys

logger = logging.getLogger(__name__)

# Add model directory to path
model_dir = Path(__file__).parent.parent.parent / "model" / "models" / "inference"
sys.path.insert(0, str(model_dir))

try:
    from predict import WorkforceAnalyticsPredictor
    MODELS_AVAILABLE = True
    logger.info("✅ Model inference module loaded successfully")
except ImportError as e:
    logger.warning(f"⚠️ Could not load model inference module: {e}")
    MODELS_AVAILABLE = False


class ParallelModelInference:
    """
    Service for running three models in parallel and aggregating results
    """
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        if MODELS_AVAILABLE:
            try:
                # Initialize the predictor
                models_path = Path(__file__).parent.parent.parent / "model" / "models" / "model_realistic"
                self.predictor = WorkforceAnalyticsPredictor(models_dir=str(models_path))
                self.models_loaded = True
                logger.info("✅ Three ML models loaded and ready for parallel inference")
            except Exception as e:
                logger.error(f"❌ Error loading models: {e}")
                self.models_loaded = False
                self.predictor = None
        else:
            self.models_loaded = False
            self.predictor = None
    
    def _predict_burnout_risk(self, features: Dict) -> Dict[str, Any]:
        """Run burnout risk model"""
        try:
            start_time = datetime.utcnow()
            
            score = self.predictor.predict_burnout_risk(features)
            category, description = self.predictor.get_risk_category(score)
            
            end_time = datetime.utcnow()
            inference_time = (end_time - start_time).total_seconds()
            
            # Generate recommendations
            recommendations = []
            if score > 0.7:
                recommendations = [
                    "🚨 URGENT: Schedule immediate one-on-one meeting",
                    "Reduce workload and redistribute tasks",
                    "Encourage time off and provide mental health resources",
                    "Monitor daily for stress indicators"
                ]
            elif score > 0.5:
                recommendations = [
                    "⚠️ Schedule check-in within the week",
                    "Review recent workload changes",
                    "Encourage work-life balance practices",
                    "Provide stress management resources"
                ]
            elif score > 0.3:
                recommendations = [
                    "Monitor workload patterns",
                    "Maintain regular check-ins",
                    "Recognize achievements and contributions"
                ]
            else:
                recommendations = [
                    "Continue current support level",
                    "Maintain healthy work patterns",
                    "Share best practices with team"
                ]
            
            return {
                "model": "burnout_risk",
                "score": float(score),
                "score_range": "0-1 (higher is worse)",
                "category": category,
                "description": description,
                "risk_level": self._get_risk_level(score),
                "recommendations": recommendations,
                "inference_time_ms": inference_time * 1000,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Error in burnout risk prediction: {e}")
            return {
                "model": "burnout_risk",
                "status": "error",
                "error": str(e)
            }
    
    def _predict_wellbeing(self, features: Dict) -> Dict[str, Any]:
        """Run wellbeing model"""
        try:
            start_time = datetime.utcnow()
            
            score = self.predictor.predict_wellbeing(features)
            category, description = self.predictor.get_wellbeing_category(score)
            
            end_time = datetime.utcnow()
            inference_time = (end_time - start_time).total_seconds()
            
            # Generate recommendations
            recommendations = []
            if score < 40:
                recommendations = [
                    "🚨 Provide immediate wellbeing support",
                    "Connect with employee assistance program",
                    "Review work conditions and stressors",
                    "Consider temporary workload reduction"
                ]
            elif score < 60:
                recommendations = [
                    "⚠️ Offer wellness program enrollment",
                    "Check for work-life balance issues",
                    "Provide flexible working options",
                    "Schedule wellbeing check-ins"
                ]
            elif score < 80:
                recommendations = [
                    "Maintain current wellness initiatives",
                    "Continue regular team engagement",
                    "Recognize positive contributions"
                ]
            else:
                recommendations = [
                    "✅ Employee thriving - continue support",
                    "Share success patterns with team",
                    "Maintain healthy work environment"
                ]
            
            return {
                "model": "wellbeing",
                "score": float(score),
                "score_range": "0-100 (higher is better)",
                "category": category,
                "description": description,
                "health_status": self._get_health_status(score),
                "recommendations": recommendations,
                "inference_time_ms": inference_time * 1000,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Error in wellbeing prediction: {e}")
            return {
                "model": "wellbeing",
                "status": "error",
                "error": str(e)
            }
    
    def _predict_efficiency(self, features: Dict) -> Dict[str, Any]:
        """Run efficiency model"""
        try:
            start_time = datetime.utcnow()
            
            score = self.predictor.predict_efficiency(features)
            category, description = self.predictor.get_efficiency_category(score)
            
            end_time = datetime.utcnow()
            inference_time = (end_time - start_time).total_seconds()
            
            # Generate recommendations
            recommendations = []
            if score < 40:
                recommendations = [
                    "⚠️ Review task assignments and priorities",
                    "Identify and remove blockers",
                    "Provide additional training or mentorship",
                    "Clarify expectations and goals"
                ]
            elif score < 60:
                recommendations = [
                    "Optimize task allocation",
                    "Address skill gaps with training",
                    "Reduce context switching",
                    "Improve tool and process efficiency"
                ]
            elif score < 80:
                recommendations = [
                    "Continue current productivity patterns",
                    "Look for optimization opportunities",
                    "Recognize efficient work habits"
                ]
            else:
                recommendations = [
                    "✅ Excellent efficiency - maintain momentum",
                    "Share productivity best practices",
                    "Consider stretch assignments"
                ]
            
            return {
                "model": "efficiency",
                "score": float(score),
                "score_range": "0-100 (higher is better)",
                "category": category,
                "description": description,
                "performance_level": self._get_performance_level(score),
                "recommendations": recommendations,
                "inference_time_ms": inference_time * 1000,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Error in efficiency prediction: {e}")
            return {
                "model": "efficiency",
                "status": "error",
                "error": str(e)
            }
    
    def _get_risk_level(self, score: float) -> str:
        """Map burnout score to risk level"""
        if score >= 0.7:
            return "critical"
        elif score >= 0.5:
            return "high"
        elif score >= 0.3:
            return "moderate"
        else:
            return "low"
    
    def _get_health_status(self, score: float) -> str:
        """Map wellbeing score to health status"""
        if score >= 80:
            return "excellent"
        elif score >= 60:
            return "good"
        elif score >= 40:
            return "fair"
        else:
            return "poor"
    
    def _get_performance_level(self, score: float) -> str:
        """Map efficiency score to performance level"""
        if score >= 80:
            return "excellent"
        elif score >= 60:
            return "good"
        elif score >= 40:
            return "moderate"
        else:
            return "needs_improvement"
    
    async def predict_parallel(
        self, 
        features: Dict[str, Any],
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        Run all three models in parallel and aggregate results
        
        Args:
            features: Preprocessed feature dictionary
            user_id: Optional user ID for tracking
            
        Returns:
            Dictionary with predictions from all three models plus summary
        """
        if not self.models_loaded:
            return {
                "status": "error",
                "error": "Models not loaded. Please ensure model files are available.",
                "models_available": False
            }
        
        logger.info(f"🚀 Starting parallel inference for user {user_id or 'unknown'}")
        start_time = datetime.utcnow()
        
        # Get imputation summary
        imputation_info = self.predictor.get_imputed_summary(features)
        
        # Run all three models in parallel using asyncio
        loop = asyncio.get_event_loop()
        
        burnout_task = loop.run_in_executor(
            self.executor,
            self._predict_burnout_risk,
            features
        )
        
        wellbeing_task = loop.run_in_executor(
            self.executor,
            self._predict_wellbeing,
            features
        )
        
        efficiency_task = loop.run_in_executor(
            self.executor,
            self._predict_efficiency,
            features
        )
        
        # Wait for all three to complete
        burnout_result, wellbeing_result, efficiency_result = await asyncio.gather(
            burnout_task,
            wellbeing_task,
            efficiency_task
        )
        
        end_time = datetime.utcnow()
        total_time = (end_time - start_time).total_seconds()
        
        # Calculate overall risk assessment
        overall_assessment = self._calculate_overall_assessment(
            burnout_result,
            wellbeing_result,
            efficiency_result
        )
        
        # Generate aggregate recommendations
        priority_actions = self._generate_priority_actions(
            burnout_result,
            wellbeing_result,
            efficiency_result
        )
        
        logger.info(
            f"✅ Parallel inference complete in {total_time:.3f}s "
            f"(avg {total_time/3:.3f}s per model)"
        )
        
        return {
            "status": "success",
            "user_id": user_id,
            "timestamp": end_time.isoformat(),
            "predictions": {
                "burnout_risk": burnout_result,
                "wellbeing": wellbeing_result,
                "efficiency": efficiency_result
            },
            "overall_assessment": overall_assessment,
            "priority_actions": priority_actions,
            "feature_info": {
                "total_features": imputation_info["total_features"],
                "provided_features": imputation_info["provided_features"],
                "imputed_features": imputation_info["imputed_features"],
                "data_completeness": imputation_info["data_completeness"]
            },
            "performance": {
                "total_inference_time_ms": total_time * 1000,
                "parallel_speedup": f"{(sum([
                    burnout_result.get('inference_time_ms', 0),
                    wellbeing_result.get('inference_time_ms', 0),
                    efficiency_result.get('inference_time_ms', 0)
                ]) / (total_time * 1000)):.2f}x",
                "models_executed": 3
            }
        }
    
    def _calculate_overall_assessment(
        self,
        burnout: Dict,
        wellbeing: Dict,
        efficiency: Dict
    ) -> Dict[str, Any]:
        """Calculate overall employee status assessment"""
        
        # Check for errors
        if any(r.get("status") == "error" for r in [burnout, wellbeing, efficiency]):
            return {
                "status": "error",
                "message": "One or more models failed to produce predictions"
            }
        
        burnout_score = burnout.get("score", 0.5)
        wellbeing_score = wellbeing.get("score", 50)
        efficiency_score = efficiency.get("score", 50)
        
        # Determine overall status
        if burnout_score >= 0.7:
            status = "critical"
            priority = "urgent"
            message = "🚨 CRITICAL: Employee shows high burnout risk - immediate intervention required"
            color = "#d32f2f"
        elif burnout_score >= 0.5 or wellbeing_score < 40:
            status = "at_risk"
            priority = "high"
            message = "⚠️ AT RISK: Employee needs support and monitoring"
            color = "#f57c00"
        elif wellbeing_score >= 70 and efficiency_score >= 70 and burnout_score < 0.3:
            status = "thriving"
            priority = "maintain"
            message = "✅ THRIVING: Employee performing well with good wellbeing"
            color = "#388e3c"
        elif wellbeing_score >= 60 and efficiency_score >= 60:
            status = "stable"
            priority = "normal"
            message = "➡️ STABLE: Employee in good condition, continue monitoring"
            color = "#1976d2"
        else:
            status = "needs_attention"
            priority = "moderate"
            message = "⚠️ NEEDS ATTENTION: Some metrics require improvement"
            color = "#f57c00"
        
        # Calculate composite health score (0-100)
        health_score = (
            (1 - burnout_score) * 40 +  # Burnout contributes 40%
            (wellbeing_score / 100) * 40 +  # Wellbeing contributes 40%
            (efficiency_score / 100) * 20  # Efficiency contributes 20%
        ) * 100
        
        return {
            "status": status,
            "priority": priority,
            "message": message,
            "color": color,
            "composite_health_score": round(health_score, 1),
            "breakdown": {
                "burnout_impact": round((1 - burnout_score) * 100, 1),
                "wellbeing_impact": round(wellbeing_score, 1),
                "efficiency_impact": round(efficiency_score, 1)
            }
        }
    
    def _generate_priority_actions(
        self,
        burnout: Dict,
        wellbeing: Dict,
        efficiency: Dict
    ) -> List[Dict[str, str]]:
        """Generate prioritized action items"""
        
        actions = []
        
        # Check for critical issues first
        if burnout.get("score", 0) >= 0.7:
            actions.append({
                "priority": "urgent",
                "category": "burnout",
                "action": "Schedule immediate intervention meeting",
                "icon": "🚨"
            })
        
        if wellbeing.get("score", 50) < 40:
            actions.append({
                "priority": "urgent",
                "category": "wellbeing",
                "action": "Provide mental health and wellbeing support",
                "icon": "❤️"
            })
        
        # High priority
        if burnout.get("score", 0) >= 0.5:
            actions.append({
                "priority": "high",
                "category": "burnout",
                "action": "Review and reduce workload",
                "icon": "⚠️"
            })
        
        if wellbeing.get("score", 50) < 60:
            actions.append({
                "priority": "high",
                "category": "wellbeing",
                "action": "Offer wellness program enrollment",
                "icon": "💚"
            })
        
        if efficiency.get("score", 50) < 40:
            actions.append({
                "priority": "high",
                "category": "efficiency",
                "action": "Identify and remove productivity blockers",
                "icon": "🔧"
            })
        
        # Medium priority
        if efficiency.get("score", 50) < 60:
            actions.append({
                "priority": "medium",
                "category": "efficiency",
                "action": "Provide training and development opportunities",
                "icon": "📚"
            })
        
        # If no issues, add positive actions
        if not actions:
            actions.append({
                "priority": "maintain",
                "category": "recognition",
                "action": "Recognize strong performance and maintain support",
                "icon": "⭐"
            })
        
        return actions


# Global inference service instance
_inference_service = None


def get_inference_service() -> ParallelModelInference:
    """Get or create the global parallel inference service instance"""
    global _inference_service
    
    if _inference_service is None:
        _inference_service = ParallelModelInference()
    
    return _inference_service
