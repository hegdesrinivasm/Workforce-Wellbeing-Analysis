"""
Real-time Data Stream Pipeline
Handles incoming API data streams with preprocessing and model inference
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import pandas as pd
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import json

from utils.preprocessing import DataPreprocessor, DataAnonymizer
from services.feature_extraction import FeatureExtractor

logger = logging.getLogger(__name__)


class DataValidator:
    """
    Validates and cleans incoming data streams for missing/corrupt data
    """
    
    @staticmethod
    def validate_and_clean_stream(
        raw_data: Dict[str, Any],
        data_type: str
    ) -> Tuple[Dict[str, Any], List[str]]:
        """
        Validate and clean incoming data stream
        
        Args:
            raw_data: Raw data from API
            data_type: Type of data (calendar, messages, tasks, etc.)
            
        Returns:
            Tuple of (cleaned_data, list_of_issues)
        """
        issues = []
        cleaned = raw_data.copy()
        
        # Type-specific validation
        if data_type == "calendar_events":
            cleaned, event_issues = DataValidator._clean_calendar_events(cleaned)
            issues.extend(event_issues)
            
        elif data_type == "teams_messages" or data_type == "slack_messages":
            cleaned, msg_issues = DataValidator._clean_messages(cleaned)
            issues.extend(msg_issues)
            
        elif data_type == "jira_tasks":
            cleaned, task_issues = DataValidator._clean_tasks(cleaned)
            issues.extend(task_issues)
            
        elif data_type == "emails":
            cleaned, email_issues = DataValidator._clean_emails(cleaned)
            issues.extend(email_issues)
        
        return cleaned, issues
    
    @staticmethod
    def _clean_calendar_events(events: List[Dict]) -> Tuple[List[Dict], List[str]]:
        """Clean calendar events data"""
        issues = []
        cleaned_events = []
        
        for idx, event in enumerate(events):
            try:
                # Check required fields
                if not event.get("start") or not event.get("end"):
                    issues.append(f"Event {idx}: Missing start/end time - SKIPPED")
                    continue
                
                # Validate date formats
                start = event.get("start", {})
                end = event.get("end", {})
                
                if isinstance(start, dict) and "dateTime" not in start:
                    issues.append(f"Event {idx}: Invalid start time format")
                    continue
                    
                if isinstance(end, dict) and "dateTime" not in end:
                    issues.append(f"Event {idx}: Invalid end time format")
                    continue
                
                # Add default values for missing fields
                if "subject" not in event:
                    event["subject"] = "Untitled Meeting"
                    issues.append(f"Event {idx}: Missing subject - using default")
                
                if "attendees" not in event:
                    event["attendees"] = []
                
                cleaned_events.append(event)
                
            except Exception as e:
                issues.append(f"Event {idx}: Corrupt data - {str(e)} - SKIPPED")
                continue
        
        return cleaned_events, issues
    
    @staticmethod
    def _clean_messages(messages: List[Dict]) -> Tuple[List[Dict], List[str]]:
        """Clean message data"""
        issues = []
        cleaned_messages = []
        
        for idx, msg in enumerate(messages):
            try:
                # Check required fields
                if not msg.get("id"):
                    issues.append(f"Message {idx}: Missing ID - generating one")
                    msg["id"] = f"generated_{idx}_{datetime.utcnow().timestamp()}"
                
                if not msg.get("createdDateTime") and not msg.get("ts"):
                    issues.append(f"Message {idx}: Missing timestamp - SKIPPED")
                    continue
                
                # Validate body/content
                if not msg.get("body") and not msg.get("text"):
                    issues.append(f"Message {idx}: Empty message body")
                    msg["body"] = {"content": "", "contentType": "text"}
                
                cleaned_messages.append(msg)
                
            except Exception as e:
                issues.append(f"Message {idx}: Corrupt data - {str(e)} - SKIPPED")
                continue
        
        return cleaned_messages, issues
    
    @staticmethod
    def _clean_tasks(tasks: List[Dict]) -> Tuple[List[Dict], List[str]]:
        """Clean task/issue data"""
        issues = []
        cleaned_tasks = []
        
        for idx, task in enumerate(tasks):
            try:
                # Check required fields
                if not task.get("key") and not task.get("id"):
                    issues.append(f"Task {idx}: Missing ID - generating one")
                    task["key"] = f"TASK-{idx}"
                
                # Add defaults for missing fields
                if not task.get("status"):
                    task["status"] = "Unknown"
                    issues.append(f"Task {idx}: Missing status - using default")
                
                if not task.get("created"):
                    issues.append(f"Task {idx}: Missing creation date")
                
                cleaned_tasks.append(task)
                
            except Exception as e:
                issues.append(f"Task {idx}: Corrupt data - {str(e)} - SKIPPED")
                continue
        
        return cleaned_tasks, issues
    
    @staticmethod
    def _clean_emails(emails: List[Dict]) -> Tuple[List[Dict], List[str]]:
        """Clean email data"""
        issues = []
        cleaned_emails = []
        
        for idx, email in enumerate(emails):
            try:
                # Check timestamps
                if not email.get("receivedDateTime") and not email.get("sentDateTime"):
                    issues.append(f"Email {idx}: Missing timestamp - SKIPPED")
                    continue
                
                # Validate sender
                if not email.get("from"):
                    issues.append(f"Email {idx}: Missing sender info")
                    email["from"] = {"emailAddress": {"address": "unknown@unknown.com"}}
                
                cleaned_emails.append(email)
                
            except Exception as e:
                issues.append(f"Email {idx}: Corrupt data - {str(e)} - SKIPPED")
                continue
        
        return cleaned_emails, issues


class StreamPipeline:
    """
    Main pipeline for processing incoming data streams
    Handles: validation → preprocessing → feature extraction → model preparation
    """
    
    def __init__(self):
        self.validator = DataValidator()
        self.preprocessor = DataPreprocessor()
        self.feature_extractor = FeatureExtractor()
        self.anonymizer = DataAnonymizer()
        
        logger.info("✅ Stream Pipeline initialized")
    
    async def process_stream(
        self,
        raw_data: Dict[str, List[Dict]],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Process incoming data stream through the pipeline
        
        Args:
            raw_data: Dictionary with data from different sources
                {
                    "calendar_events": [...],
                    "teams_messages": [...],
                    "slack_messages": [...],
                    "emails": [...],
                    "jira_tasks": [...]
                }
            user_id: User ID for tracking
            
        Returns:
            Dictionary with processed features and validation report
        """
        pipeline_start = datetime.utcnow()
        
        logger.info(f"🚀 Starting stream pipeline for user {user_id}")
        
        validation_report = {
            "user_id": user_id,
            "timestamp": pipeline_start.isoformat(),
            "stages": {},
            "total_issues": 0,
            "data_quality_score": 100.0
        }
        
        # Stage 1: Validate and Clean
        logger.info("📋 Stage 1: Validating and cleaning data")
        cleaned_data = {}
        all_issues = []
        
        for data_type, data_list in raw_data.items():
            if data_list:
                cleaned, issues = self.validator.validate_and_clean_stream(
                    data_list, 
                    data_type
                )
                cleaned_data[data_type] = cleaned
                
                validation_report["stages"][data_type] = {
                    "original_count": len(data_list),
                    "cleaned_count": len(cleaned),
                    "issues": issues,
                    "quality_score": (len(cleaned) / len(data_list) * 100) if data_list else 100
                }
                
                all_issues.extend(issues)
                
                logger.info(
                    f"  {data_type}: {len(data_list)} → {len(cleaned)} items "
                    f"({len(issues)} issues)"
                )
        
        validation_report["total_issues"] = len(all_issues)
        
        # Calculate overall data quality score
        quality_scores = [
            stage["quality_score"] 
            for stage in validation_report["stages"].values()
        ]
        if quality_scores:
            validation_report["data_quality_score"] = sum(quality_scores) / len(quality_scores)
        
        # Stage 2: Preprocess and Anonymize
        logger.info("🔐 Stage 2: Preprocessing and anonymizing")
        
        preprocessed_data = await asyncio.to_thread(
            self.preprocessor.preprocess_all_data,
            calendar_events=cleaned_data.get("calendar_events"),
            teams_messages=cleaned_data.get("teams_messages"),
            slack_messages=cleaned_data.get("slack_messages"),
            emails=cleaned_data.get("emails"),
            jira_issues=cleaned_data.get("jira_tasks")
        )
        
        validation_report["preprocessing"] = {
            "calendar_events": len(preprocessed_data.get("calendar_events", [])),
            "teams_messages": len(preprocessed_data.get("teams_messages", [])),
            "slack_messages": len(preprocessed_data.get("slack_messages", [])),
            "emails": len(preprocessed_data.get("emails", [])),
            "jira_issues": len(preprocessed_data.get("jira_issues", []))
        }
        
        # Stage 3: Extract Features
        logger.info("🔧 Stage 3: Extracting features")
        
        # Determine primary message source
        message_source = "teams"
        if preprocessed_data.get("slack_messages") and not preprocessed_data.get("teams_messages"):
            message_source = "slack"
        
        # Combine messages for extraction
        messages = preprocessed_data.get("teams_messages") or preprocessed_data.get("slack_messages")
        
        features = await asyncio.to_thread(
            self.feature_extractor.extract_all_features,
            calendar_events=preprocessed_data.get("calendar_events"),
            messages=messages,
            tasks=preprocessed_data.get("jira_issues"),
            worklogs=None,  # Can be added if available
            message_source=message_source,
            task_source="jira"
        )
        
        validation_report["feature_extraction"] = {
            "total_features": len(features),
            "feature_completeness": self._calculate_feature_completeness(features)
        }
        
        # Stage 4: Prepare for Model Inference
        logger.info("🎯 Stage 4: Preparing features for model inference")
        
        # Convert features to model-ready format
        model_ready_features = self._prepare_for_models(features)
        
        pipeline_end = datetime.utcnow()
        processing_time = (pipeline_end - pipeline_start).total_seconds()
        
        validation_report["pipeline_summary"] = {
            "status": "success",
            "processing_time_seconds": processing_time,
            "ready_for_inference": True
        }
        
        logger.info(f"✅ Pipeline complete in {processing_time:.2f}s")
        
        return {
            "status": "success",
            "user_id": user_id,
            "features": model_ready_features,
            "validation_report": validation_report,
            "processed_at": pipeline_end.isoformat()
        }
    
    def _calculate_feature_completeness(self, features: Dict) -> float:
        """Calculate what percentage of expected features are present"""
        if not features:
            return 0.0
        
        # Count non-zero and non-null features
        valid_features = sum(
            1 for v in features.values() 
            if v is not None and v != 0
        )
        
        return (valid_features / len(features)) * 100 if features else 0.0
    
    def _prepare_for_models(self, features: Dict) -> Dict:
        """
        Prepare extracted features for model inference
        Handles missing values and format conversion
        """
        # Ensure all numeric values
        model_features = {}
        
        for key, value in features.items():
            try:
                if value is None:
                    model_features[key] = 0.0
                elif isinstance(value, (int, float)):
                    model_features[key] = float(value)
                else:
                    # Try to convert to float
                    model_features[key] = float(value)
            except (ValueError, TypeError):
                # If conversion fails, use 0
                model_features[key] = 0.0
                logger.warning(f"Could not convert feature {key} with value {value} to numeric")
        
        return model_features


# Global pipeline instance
_stream_pipeline = None


def get_stream_pipeline() -> StreamPipeline:
    """Get or create the global stream pipeline instance"""
    global _stream_pipeline
    
    if _stream_pipeline is None:
        _stream_pipeline = StreamPipeline()
    
    return _stream_pipeline
