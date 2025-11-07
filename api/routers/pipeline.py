"""
Real-time Pipeline Router
API endpoints for data streaming, preprocessing, and parallel model inference
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging

from database import get_db
from services.stream_pipeline import get_stream_pipeline
from services.parallel_inference import get_inference_service
from routers.data import get_valid_token
from integrations.microsoft_graph import MicrosoftGraphAPI
from integrations.slack import SlackAPI
from integrations.jira import JiraAPI

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def pipeline_info():
    """Get information about the pipeline endpoints"""
    return {
        "service": "Real-time ML Pipeline",
        "version": "1.0.0",
        "description": "Process API data streams through validation, preprocessing, and parallel model inference",
        "endpoints": {
            "process_stream": "POST /pipeline/process",
            "process_and_predict": "POST /pipeline/predict",
            "health": "GET /pipeline/health"
        },
        "capabilities": [
            "Real-time data validation and cleaning",
            "Missing/corrupt data handling",
            "Data anonymization and preprocessing",
            "Feature extraction",
            "Parallel model inference (3 models)",
            "Comprehensive result aggregation"
        ],
        "models": [
            "Burnout Risk (0-1 scale)",
            "Wellbeing Score (0-100 scale)",
            "Efficiency Score (0-100 scale)"
        ]
    }


@router.get("/health")
async def pipeline_health():
    """Check pipeline health and model availability"""
    pipeline = get_stream_pipeline()
    inference = get_inference_service()
    
    return {
        "status": "healthy",
        "pipeline": {
            "validator": "operational",
            "preprocessor": "operational",
            "feature_extractor": "operational"
        },
        "models": {
            "loaded": inference.models_loaded,
            "count": 3 if inference.models_loaded else 0,
            "models": ["burnout_risk", "wellbeing", "efficiency"] if inference.models_loaded else []
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/process")
async def process_stream(
    raw_data: Dict[str, List[Dict]],
    user_id: str
):
    """
    Process raw data stream through validation and preprocessing pipeline
    
    Request body:
    {
        "raw_data": {
            "calendar_events": [...],
            "teams_messages": [...],
            "slack_messages": [...],
            "emails": [...],
            "jira_tasks": [...]
        },
        "user_id": "user_123"
    }
    
    Returns:
        Processed features and validation report
    """
    try:
        logger.info(f"🔄 Processing stream for user {user_id}")
        
        pipeline = get_stream_pipeline()
        result = await pipeline.process_stream(raw_data, user_id)
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
async def process_and_predict(
    user_id: str,
    providers: Optional[List[str]] = None,
    days_back: int = 14,
    custom_data: Optional[Dict[str, List[Dict]]] = None,
    db: Session = Depends(get_db)
):
    """
    Full pipeline: Fetch data → Validate → Preprocess → Extract features → Parallel inference
    
    Args:
        user_id: User ID to process
        providers: List of data providers to fetch from (e.g., ["microsoft", "slack", "jira"])
        days_back: Number of days of historical data to analyze
        custom_data: Optional custom data (skip API fetching if provided)
    
    Returns:
        Complete pipeline results with predictions from all three models
    """
    try:
        logger.info(f"🚀 Starting full pipeline for user {user_id}")
        pipeline_start = datetime.utcnow()
        
        # Step 1: Fetch or use custom data
        if custom_data:
            logger.info("Using custom data provided")
            raw_data = custom_data
            data_source = "custom"
        else:
            logger.info(f"Fetching data from providers: {providers}")
            raw_data = await _fetch_data_from_apis(
                user_id=user_id,
                providers=providers or ["microsoft", "slack", "jira"],
                days_back=days_back,
                db=db
            )
            data_source = "api"
        
        # Step 2: Process through pipeline
        logger.info("📋 Processing data through pipeline")
        pipeline = get_stream_pipeline()
        processed_result = await pipeline.process_stream(raw_data, user_id)
        
        if processed_result["status"] != "success":
            raise HTTPException(
                status_code=500,
                detail="Pipeline processing failed"
            )
        
        # Step 3: Parallel model inference
        logger.info("🎯 Running parallel model inference")
        inference = get_inference_service()
        predictions = await inference.predict_parallel(
            features=processed_result["features"],
            user_id=user_id
        )
        
        if predictions["status"] != "success":
            raise HTTPException(
                status_code=500,
                detail="Model inference failed"
            )
        
        pipeline_end = datetime.utcnow()
        total_time = (pipeline_end - pipeline_start).total_seconds()
        
        logger.info(f"✅ Full pipeline complete in {total_time:.2f}s")
        
        # Combine results
        return {
            "status": "success",
            "user_id": user_id,
            "timestamp": pipeline_end.isoformat(),
            "data_source": data_source,
            "pipeline_results": {
                "validation_report": processed_result["validation_report"],
                "features_extracted": len(processed_result["features"])
            },
            "predictions": predictions["predictions"],
            "overall_assessment": predictions["overall_assessment"],
            "priority_actions": predictions["priority_actions"],
            "feature_info": predictions["feature_info"],
            "performance": {
                "total_pipeline_time_ms": total_time * 1000,
                "preprocessing_time_ms": (
                    total_time * 1000 - 
                    predictions["performance"]["total_inference_time_ms"]
                ),
                "inference_time_ms": predictions["performance"]["total_inference_time_ms"],
                "models_executed": 3
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in full pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/custom")
async def predict_with_custom_features(
    user_id: str,
    features: Dict[str, Any]
):
    """
    Run parallel model inference with custom features (skip data fetching and preprocessing)
    
    Request body:
    {
        "user_id": "user_123",
        "features": {
            "age": 32,
            "experience_years": 5,
            "work_hours_per_day": 9.5,
            ...
        }
    }
    
    Returns:
        Predictions from all three models
    """
    try:
        logger.info(f"🎯 Running inference with custom features for user {user_id}")
        
        inference = get_inference_service()
        predictions = await inference.predict_parallel(
            features=features,
            user_id=user_id
        )
        
        return predictions
        
    except Exception as e:
        logger.error(f"Error in custom prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _fetch_data_from_apis(
    user_id: str,
    providers: List[str],
    days_back: int,
    db: Session
) -> Dict[str, List[Dict]]:
    """
    Fetch data from various API sources
    
    Returns:
        Dictionary with raw data from all sources
    """
    start_date = datetime.utcnow() - timedelta(days=days_back)
    end_date = datetime.utcnow()
    
    raw_data = {
        "calendar_events": [],
        "teams_messages": [],
        "slack_messages": [],
        "emails": [],
        "jira_tasks": []
    }
    
    # Fetch from Microsoft Graph
    if "microsoft" in providers:
        try:
            access_token = await get_valid_token(user_id, "microsoft", db)
            graph_api = MicrosoftGraphAPI(access_token)
            
            # Fetch calendar
            calendar_events = await graph_api.get_calendar_events(start_date, end_date)
            raw_data["calendar_events"] = calendar_events
            logger.info(f"Fetched {len(calendar_events)} calendar events")
            
            # Fetch Teams messages
            teams_messages = await graph_api.get_teams_messages(start_date, end_date)
            raw_data["teams_messages"] = teams_messages
            logger.info(f"Fetched {len(teams_messages)} Teams messages")
            
            # Fetch emails
            emails = await graph_api.get_emails(start_date, end_date)
            raw_data["emails"] = emails
            logger.info(f"Fetched {len(emails)} emails")
            
        except Exception as e:
            logger.warning(f"Error fetching Microsoft data: {e}")
    
    # Fetch from Slack
    if "slack" in providers:
        try:
            access_token = await get_valid_token(user_id, "slack", db)
            slack_api = SlackAPI(access_token)
            
            # Fetch Slack messages
            slack_messages = await slack_api.get_user_messages(start_date, end_date)
            raw_data["slack_messages"] = slack_messages
            logger.info(f"Fetched {len(slack_messages)} Slack messages")
            
        except Exception as e:
            logger.warning(f"Error fetching Slack data: {e}")
    
    # Fetch from Jira
    if "jira" in providers:
        try:
            from database import OAuthToken
            
            access_token = await get_valid_token(user_id, "jira", db)
            
            # Get cloud_id from token metadata
            token_record = db.query(OAuthToken).filter(
                OAuthToken.user_id == user_id,
                OAuthToken.provider == "jira"
            ).first()
            
            cloud_id = token_record.metadata.get("cloud_id") if token_record else None
            
            if cloud_id:
                jira_api = JiraAPI(access_token, cloud_id)
                
                # Get user info
                user_info = await jira_api.get_current_user()
                account_id = user_info["account_id"]
                
                # Fetch issues
                jira_tasks = await jira_api.get_user_issues(
                    account_id,
                    start_date,
                    end_date,
                    max_results=500
                )
                raw_data["jira_tasks"] = jira_tasks
                logger.info(f"Fetched {len(jira_tasks)} Jira tasks")
            
        except Exception as e:
            logger.warning(f"Error fetching Jira data: {e}")
    
    return raw_data
